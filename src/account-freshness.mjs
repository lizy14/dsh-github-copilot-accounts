// Per-account access freshness. HTTP and credential persistence integrations are
// injected; this module never requests an endpoint, reads env, or uses shared auth.
import { createHash } from "node:crypto";
import { normalizeDomain } from "./shared.mjs";

const SLOT = /^copilot-auth\/account-[a-z0-9-]+$/;
const MIN_SECONDS = 5 * 60, MAX_SECONDS = 60 * 60, DEFAULT_SECONDS = 25 * 60;
const FAILURE_COOLDOWN_MS = 30 * 1000;
const REFRESH_BUDGET_MS = 15 * 1000;
const copy = (value) => structuredClone(value);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const abort = (signal) => { signal?.throwIfAborted(); };

export class AccountFreshnessError extends Error {
  constructor(message, code) { super(message); this.name = "AccountFreshnessError"; this.code = code; }
}
function waitFor(operation, signal) {
  const promise = Promise.resolve(operation);
  if (!signal) return promise;
  if (signal.aborted) { void promise.catch(() => {}); return Promise.reject(signal.reason); }
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => { cleanup(); reject(signal.reason); };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
    if (signal.aborted) onAbort();
  });
}
const domainOf = (payload) => normalizeDomain(payload.enterpriseUrl)
  ?? normalizeDomain(payload.account?.domain) ?? "github.com";
function validAccess(value) {
  if (typeof value !== "string" || value.trim() === "" || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try { new Headers([["authorization", `Bearer ${value}`]]); return true; }
  catch { return false; } // Header TypeErrors can echo values, so never expose them.
}
function usable(record) {
  const payload = record?.payload;
  return record?.kind === "grant" && object(payload) && payload.type === "oauth"
    && typeof payload.refresh === "string" && payload.refresh !== ""
    && typeof payload.access === "string" && payload.access !== ""
    && typeof payload.expires === "number" && Number.isFinite(payload.expires)
    && record.disabled !== true && payload.disabled !== true
    && payload.account?.disabled !== true && payload.account?.enabled !== false;
}
// Binding timestamps to the exact access/grant/domain avoids inheriting a stale
// deadline after reauthorization or native refresh. Never duplicate a secret in
// public account metadata: only a one-way digest is stored with these timestamps.
const fingerprint = (payload) => "sha256:" + createHash("sha256")
  .update(JSON.stringify([1, domainOf(payload), payload.refresh, payload.access])).digest("hex");
const futureWithin = (value, at, maximum) => typeof value === "number" && Number.isFinite(value)
  && value > at && value <= at + maximum;

/**
 * Return a beforeDispatch-compatible callback: await ensureFresh({accountId,signal}).
 * refreshAccess({accountId,payload,domain,signal}) MUST only fetch/derive and return
 * {access,expires,refreshIn?,availableModelIds?}; it MUST NOT write credentials or reacquire this slot's
 * lock. expires is an absolute millisecond deadline; refreshIn is seconds.
 *
 * The credential service must serialize async modifyRecord callbacks per key.
 * Once refresh starts, caller cancellation only cancels the caller's wait: an
 * independent bounded signal lets a successful refresh persist before lock release.
 * refreshAccess must honor that budget signal, like pi-ai's OAuth refresh methods.
 */
export function createAccountFreshness({ credentials, refreshAccess, now = Date.now,
  isEnabled = () => true, LlmError = AccountFreshnessError } = {}) {
  const errors = new WeakSet();
  const fail = (message, code) => { const error = new LlmError(message, code); errors.add(error); return error; };
  if (!credentials || typeof credentials.readRecord !== "function" || typeof credentials.modifyRecord !== "function"
    || typeof refreshAccess !== "function" || typeof now !== "function" || typeof isEnabled !== "function") {
    throw fail("Account freshness integrations are unavailable", "ACCOUNT_RUNTIME_UNAVAILABLE");
  }
  const time = () => {
    const value = now();
    if (typeof value !== "number" || !Number.isFinite(value)) throw fail("Account freshness clock is unavailable", "ACCOUNT_REFRESH_FAILED");
    return value;
  };
  const enabled = async (accountId, signal) => {
    abort(signal);
    let allowed;
    try { allowed = await waitFor(Promise.resolve().then(() => isEnabled(accountId)), signal); }
    catch { abort(signal); throw fail("Copilot account is unavailable", "ACCOUNT_UNAVAILABLE"); }
    abort(signal);
    if (allowed !== true) throw fail("Copilot account is unavailable", "ACCOUNT_UNAVAILABLE");
  };
  async function ensureAccountFresh({ accountId, signal } = {}) {
    if (typeof accountId !== "string" || !SLOT.test(accountId)) throw fail("Invalid Copilot account slot", "INVALID_ACCOUNT_ID");
    await enabled(accountId, signal);
    const cachedOutcome = (record, at) => {
      const payload = record.payload;
      const account = object(payload.account) ? payload.account : {};
      const identity = fingerprint(payload);
      if (payload.expires > at && account.accessRefreshFor === identity
        && futureWithin(account.accessRefreshAfter, at, MAX_SECONDS * 1000)) {
        return { refreshed: false, nextRefreshAt: account.accessRefreshAfter };
      }
      if (account.accessRefreshFailureFor === identity
        && futureWithin(account.accessRefreshRetryAfter, at, FAILURE_COOLDOWN_MS)) {
        return { error: fail("Copilot account refresh is cooling down; retry shortly", "ACCOUNT_REFRESH_COOLDOWN") };
      }
      return undefined;
    };
    // Scheduling-only optimistic path: known-fresh B must not queue behind A's
    // refresh on a document-global store lock. This returns no auth value; the
    // account-bound adapter independently revalidates the slot for actual auth.
    let initial;
    try { initial = await waitFor(credentials.readRecord(accountId), signal); }
    catch { abort(signal); throw fail("Copilot account freshness is unavailable", "ACCOUNT_REFRESH_FAILED"); }
    await enabled(accountId, signal);
    if (!usable(initial)) throw fail("Copilot account is missing, disabled, or not signed in", "ACCOUNT_UNAVAILABLE");
    const quick = cachedOutcome(initial, time());
    if (quick?.error) throw quick.error;
    if (quick) return quick;
    let outcome;
    const operation = Promise.resolve().then(() => credentials.modifyRecord(accountId, async (current) => {
      // A caller cancelled while waiting for the lock must not start work later.
      await enabled(accountId, signal);
      if (!usable(current)) throw fail("Copilot account is missing, disabled, or not signed in", "ACCOUNT_UNAVAILABLE");
      const at = time(), payload = current.payload;
      const identity = fingerprint(payload);
      // A caller which observed unknown/due state may find another refresh won
      // the lock. Recheck authoritative grant-bound metadata before any HTTP.
      const locked = cachedOutcome(current, at);
      if (locked) { outcome = locked; return undefined; }
      abort(signal);
      let result, failure;
      try {
        // Deliberately independent of the caller once the refresh has started.
        result = await refreshAccess({ accountId, payload: copy(payload), domain: domainOf(payload),
          signal: AbortSignal.timeout(REFRESH_BUDGET_MS) });
      } catch {
        // Do not surface original error messages/URLs/response bodies or causes.
        failure = fail("Copilot account access refresh failed", "ACCOUNT_REFRESH_FAILED");
      }
      const completedAt = time();
      if (!failure && (!object(result) || !validAccess(result.access)
        || typeof result.expires !== "number" || !Number.isFinite(result.expires) || result.expires <= completedAt
        || (result.refreshIn !== undefined && (typeof result.refreshIn !== "number" || !Number.isFinite(result.refreshIn)))
        || (result.availableModelIds !== undefined && (!Array.isArray(result.availableModelIds)
          || result.availableModelIds.some((id) => typeof id !== "string" || id.length === 0))))) {
        failure = fail("Invalid Copilot access refresh result", "ACCOUNT_REFRESH_INVALID");
      }
      // Normally serialized writers cannot alter this key while its lock is held.
      // Still guard external/reload/reassigned state and merge the latest metadata.
      let latest;
      try { latest = await credentials.readRecord(accountId); }
      catch { throw fail("Copilot account changed during refresh", "ACCOUNT_CHANGED"); }
      if (!usable(latest) || fingerprint(latest.payload) !== identity) {
        throw fail("Copilot account changed during refresh", "ACCOUNT_CHANGED");
      }
      const latestAccount = object(latest.payload.account) ? copy(latest.payload.account) : {};
      if (failure) {
        outcome = { error: failure };
        return { ...latest, payload: { ...latest.payload, account: { ...latestAccount,
          accessRefreshFailureFor: identity, accessRefreshRetryAfter: completedAt + FAILURE_COOLDOWN_MS } } };
      }
      const seconds = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, result.refreshIn ?? DEFAULT_SECONDS));
      const next = { ...latest.payload, access: result.access, expires: result.expires,
        ...(result.availableModelIds === undefined ? {} : { availableModelIds: [...new Set(result.availableModelIds)] }) };
      const nextRefreshAt = completedAt + seconds * 1000;
      delete latestAccount.accessRefreshFailureFor;
      delete latestAccount.accessRefreshRetryAfter;
      next.account = { ...latestAccount, accessRefreshAfter: nextRefreshAt, accessRefreshFor: fingerprint(next) };
      outcome = { refreshed: true, nextRefreshAt };
      return { ...latest, payload: next };
    }));
    try {
      await waitFor(operation, signal);
    } catch (error) {
      abort(signal);
      if (errors.has(error)) throw error;
      throw fail("Copilot account freshness is unavailable", "ACCOUNT_REFRESH_FAILED");
    }
    if (outcome?.error) throw outcome.error;
    // Disabling the feature while a successful refresh was underway must not
    // discard the refreshed grant, but must still prevent request dispatch.
    await enabled(accountId, signal);
    if (!outcome) throw fail("Copilot account freshness is unavailable", "ACCOUNT_REFRESH_FAILED");
    return outcome;
  }
  return ensureAccountFresh;
}
