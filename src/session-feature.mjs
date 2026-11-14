// Optional Host feature assembly. Peer/runtime modules load only through the
// running Host. One public hub owns managed+bound routes; auth stays per account.
import { loadAccountRuntime } from "./account-runtime.mjs";
import { createAccountRegistry } from "./account-registry.mjs";
import { createAccountFreshness } from "./account-freshness.mjs";
import { createAccountRefreshHttp } from "./account-refresh-http.mjs";
import { createSessionRequestState } from "./session-request-state.mjs";
import { isUsableAccountRecord } from "./account-adapter.mjs";
import { createCopilotRouteHub } from "./copilot-route-hub.mjs";
import { createManagedGlobalAdapter } from "./managed-global-adapter.mjs";
import { createSubagentAccountPolicy } from "./subagent-account-policy.mjs";
import { createSessionAccountController } from "./session-account-controller.mjs";
import { createSessionRemoteService } from "./session-remote.mjs";
import { accountRouteId, GLOBAL_COPILOT_ROUTE, isAccountRoute, isManagedCopilotRoute } from "./account-route-id.mjs";
import { normalizeDomain } from "./shared.mjs";

export class SessionAccountFeatureError extends Error {
  constructor(code = "POLICY_UNAVAILABLE") { super("Session account feature is unavailable"); this.name = "SessionAccountFeatureError"; this.code = code; }
}
const MAIN = "llm-pi-ai/github-copilot", SLOT = /^copilot-auth\/account-[a-z0-9-]+$/;
const AUTH_HEADERS = new Set(["authorization", "proxy-authorization", "x-api-key", "api-key", "cookie"]);
const copy = (value) => structuredClone(value === undefined ? {} : value);
const domainOf = (payload) => normalizeDomain(payload.enterpriseUrl) ?? normalizeDomain(payload.account?.domain) ?? "github.com";
const validEpoch = (value) => typeof value === "string" && value !== "" || Number.isSafeInteger(value) && value >= 0;
const signature = (value) => JSON.stringify(value, (_key, member) => member && typeof member === "object" && !Array.isArray(member)
  ? Object.fromEntries(Object.keys(member).sort().map((key) => [key, member[key]])) : member);
const publicRow = (value) => {
  const row = { id: value.id };
  for (const key of ["login", "name", "domain", "avatarUrl", "label", "plan"]) if (typeof value[key] === "string") row[key] = value[key];
  if (value.usage && typeof value.usage === "object") {
    row.usage = {};
    for (const key of ["percentUsed", "entitlement", "remaining"]) if (Number.isFinite(value.usage[key]) && !Object.is(value.usage[key], -0)) row.usage[key] = value.usage[key];
    if (typeof value.usage.unlimited === "boolean") row.usage.unlimited = value.usage.unlimited;
    if (typeof value.usage.resets === "string") row.usage.resets = value.usage.resets;
  }
  if (value.usageError !== undefined) row.usageError = "Usage is unavailable";
  return row;
};

export async function createSessionAccountFeature(ctx, { listSlots, collectAccounts, refreshProfileById,
  setDefaultAccountById, getProfile = () => ({}), runtimeLoader = loadAccountRuntime, refreshAccess,
  forkProviderName = "fork", requestStateFactory = createSessionRequestState } = {}) {
  if (typeof ctx?.effect !== "function" || typeof ctx?.get !== "function" || typeof ctx?.plugin !== "function"
    || typeof ctx?.on !== "function" || [listSlots, collectAccounts, refreshProfileById, setDefaultAccountById, getProfile, runtimeLoader, requestStateFactory].some((value) => typeof value !== "function")) {
    throw new TypeError("Session feature requires explicit Host capabilities and callbacks");
  }
  let closed = false, assembled = false, registry, runtime, hub, managed, managedRegistration, remoteFiber, watcher, createdWatcher, markerDisposer, cleanupPromise, llm, requestState;
  let status = Object.freeze({ phase: "starting", errorCode: null });
  let currentProfile, profileSignature, profileReadable = false, profileTicket = 0;
  let knownDefault, mainAuthUnsupported = false, defaultResolutionTicket = 0;
  const removed = new Set(), lifecycle = new AbortController();
  const policyMarker = () => { try { return ctx.get("copilotDefaultModelPolicy"); } catch { return undefined; } };
  // Session account routing is independent from optional automatic-compaction
  // policy. A compaction add-on must never make this Host's account Remote vanish.
  const enabled = () => {
    if (closed) return false;
    try {
      const policy = policyMarker();
      return policy?.version === 1 && policy.active !== false && policy.isControllerProtected?.() === true && typeof policy.withSessionSelectionOnly === "function";
    } catch { return false; }
  };
  const report = (errorCode) => {
    if (closed) return;
    if (status.errorCode !== errorCode) { try { ctx.logger?.warn?.("copilot-auth: Session account feature is unavailable"); } catch { /* no diagnostic payload */ } }
    status = Object.freeze({ phase: "unavailable", errorCode });
  };
  const requireEnabled = () => { if (!enabled()) { if (!closed) report("POLICY_UNAVAILABLE"); throw new SessionAccountFeatureError(); } };
  const ready = () => { if (!closed) status = Object.freeze({ phase: "ready", errorCode: null }); };
  const original = (value) => {
    const symbol = runtime?.symbols?.original ?? Symbol.for("cordis.original"), seen = new Set();
    while (value && (typeof value === "object" || typeof value === "function") && !seen.has(value)) {
      seen.add(value); const next = value[symbol]; if (!next || next === value) return value; value = next;
    }
    return value;
  };
  const unsupportedProfile = () => {
    if (!profileReadable || currentProfile === null || typeof currentProfile !== "object" || Array.isArray(currentProfile)) return false; // Unknown/model-invalid config never exposes builtin recovery.
    return currentProfile.api !== undefined || currentProfile.baseURL !== undefined || currentProfile.apiKeyEnv !== undefined
      || Object.keys(currentProfile.headers ?? {}).some((name) => AUTH_HEADERS.has(name.toLowerCase()));
  };
  // READY is engine ownership, NOT account availability. Missing/unknown/deleted
  // defaults still normalize to managed so no unsafe builtin fallback is exposed.
  const managedReady = () => {
    try { return assembled && enabled() && managed !== undefined && hub?.has(GLOBAL_COPILOT_ROUTE) === true
      && original(ctx.get("llm")) === original(llm) && !unsupportedProfile() && !mainAuthUnsupported; }
    catch { return false; }
  };
  const managedAvailable = () => managedReady() && knownDefault !== undefined && managed.defaultError === undefined
    && registry?.account(knownDefault.accountId)?.routeAvailable === true && !removed.has(knownDefault.accountId);
  const managedMarker = Object.freeze({ version: 1, provider: GLOBAL_COPILOT_ROUTE, isReady: managedReady, isAvailable: managedAvailable });
  const safeEmit = (route) => { try { ctx.emit("llm/models-updated", route); } catch { /* observers cannot veto topology */ } };
  const dispose = () => {
    if (closed) return cleanupPromise;
    closed = true; assembled = false; profileTicket++; defaultResolutionTicket++; lifecycle.abort(); knownDefault = undefined;
    let stateCleanup;
    try { stateCleanup = Promise.resolve(requestState?.dispose?.()).catch(() => {}); } catch { stateCleanup = Promise.resolve(); }
    status = Object.freeze({ phase: "disposed", errorCode: null });
    for (const release of [watcher, createdWatcher]) { try { release?.(); } catch { /* already disposed */ } }
    managed?.invalidateDefault();
    try { managedRegistration?.(); } catch { /* hub final withdrawal below remains authoritative */ }
    managed?.dispose();
    registry?.dispose();
    try { hub?.dispose(); } catch { /* revoke every remaining service as well */ }
    try { markerDisposer?.(); } catch { /* retained marker still reports closed */ }
    try { cleanupPromise = Promise.all([stateCleanup, Promise.resolve(remoteFiber?.dispose?.()).catch(() => {})]).then(() => {}); }
    catch { cleanupPromise = stateCleanup; }
    return cleanupPromise;
  };
  // Before the FIRST await/import: no late route, marker or Remote may outlive its owner.
  ctx.effect(() => dispose, "copilot-session-accounts feature lifetime");
  if (typeof ctx.provide === "function") markerDisposer = ctx.provide("copilotManagedDefault", managedMarker);
  const readProfile = () => { const profile = copy(getProfile()); return { profile, key: signature(profile) }; };
  const denyDefault = (ticket, unsupported = false) => {
    if (ticket === defaultResolutionTicket) { knownDefault = undefined; mainAuthUnsupported = unsupported; }
    return undefined;
  };
  const resolveDefault = async () => {
    const ticket = ++defaultResolutionTicket;
    if (!enabled() || !profileReadable || unsupportedProfile() || !registry) return denyDefault(ticket);
    try {
      const main = await ctx.get("credentials").readRecord(MAIN); requireEnabled();
      if (main?.kind === "api-key") return denyDefault(ticket, true);
      if (ticket === defaultResolutionTicket) mainAuthUnsupported = false;
      if (!isUsableAccountRecord(main)) return denyDefault(ticket);
      const slots = await listSlots(); requireEnabled();
      const matches = slots.filter((slot) => typeof slot.key === "string" && SLOT.test(slot.key) && !removed.has(slot.key)
        && isUsableAccountRecord({ kind: "grant", payload: slot.payload })
        && slot.payload.refresh === main.payload.refresh && domainOf(slot.payload) === domainOf(main.payload));
      if (matches.length !== 1) return denyDefault(ticket); // No recovered/first-slot guessing or ambiguous duplicate choice.
      const slot = matches[0], row = registry.account(slot.key), adapter = registry.delegateForAccount(slot.key);
      if (!row || row.routeAvailable !== true || !adapter || removed.has(slot.key)) return denyDefault(ticket);
      const epoch = main.payload.copilotDefaultEpoch ?? `initial:${accountRouteId(slot.key)}:${domainOf(slot.payload)}`;
      if (!validEpoch(epoch)) return denyDefault(ticket);
      const defaultEpoch = typeof epoch === "number" ? String(epoch) : epoch; // Normative cache metadata uses optional strings.
      return { accountId: slot.key, routeId: row.routeId, adapter, defaultEpoch };
    } catch { return denyDefault(ticket); }
  };
  const nativeScope = (agent) => {
    try {
      const agents = ctx.get("agents"), sessions = ctx.get("sessions");
      if (typeof agents?.get !== "function" || typeof sessions?.get !== "function"
        || typeof agent?.ctx?.get !== "function" || agent.session?.header?.version !== 4
        || typeof agent.model?.current !== "function" || typeof agent.model.select !== "function"
        || agents.get(agent.id) !== agent || sessions.get(agent.session.id) !== agent.session) return false;
      return ["agents", "sessions", "llm"].every((name) => original(agent.ctx.get(name)) === original(ctx.get(name)))
        && original(ctx.get("llm")) === original(llm);
    } catch { return false; }
  };
  const rootScope = (agent) => {
    try { return nativeScope(agent) && agent.session.header.origin !== "subagent" && ctx.get("agents").isOwnedBy?.(agent.id, undefined) === true; }
    catch { return false; }
  };
  const migrateRoot = (agent, signal) => {
    signal?.throwIfAborted();
    if (!managedReady() || !rootScope(agent)) return false;
    const selected = agent.model.current(); // Read AFTER async work; never overwrite a newly bound alias.
    if (selected?.provider !== "github-copilot" || typeof selected.model !== "string" || selected.model === "") return false;
    agent.model.select({ provider: GLOBAL_COPILOT_ROUTE, model: selected.model,
      ...(selected.reasoningEffort === undefined ? {} : { reasoningEffort: selected.reasoningEffort }) });
    return true; // Released next-step control only; no frozen request/header mutation.
  };
  const migrateRoots = async () => {
    if (!managedReady()) return;
    let roots;
    try { const agents = ctx.get("agents"); roots = agents?.roots?.() ?? agents?.list?.() ?? []; } catch { return; }
    for (const agent of roots) {
      if (!enabled()) return;
      try { migrateRoot(agent, lifecycle.signal); } catch { /* another root may be draining/read-only */ }
    }
  };
  const refreshDefault = async ({ scan = true } = {}) => {
    requireEnabled();
    if (!managed) return false;
    const result = await managed.refreshDefault(); requireEnabled();
    if (scan) await migrateRoots();
    return result;
  };
  const reconcile = async () => {
    requireEnabled();
    if (!registry) throw new SessionAccountFeatureError("ACCOUNT_RUNTIME_UNAVAILABLE");
    try {
      const result = await registry.reconcile(); requireEnabled();
      if (result.some((row) => row.routeAvailable === false)) report("ACCOUNT_PROFILE_INVALID"); else ready();
      if (managed) await refreshDefault();
      return result;
    } catch {
      if (!enabled()) throw new SessionAccountFeatureError();
      report("ACCOUNT_PROFILE_INVALID");
      if (managed) { try { await refreshDefault(); } catch { /* static status already recorded */ } }
      throw new SessionAccountFeatureError("ACCOUNT_PROFILE_INVALID");
    }
  };
  const reconcileForRead = async () => { try { await reconcile(); } catch { requireEnabled(); } };
  const liveSlot = async (id, allowRemoved = false) => {
    requireEnabled();
    if (typeof id !== "string" || !SLOT.test(id) || !allowRemoved && removed.has(id)) throw new SessionAccountFeatureError("ACCOUNT_UNAVAILABLE");
    const slots = await listSlots(); requireEnabled();
    if (!allowRemoved && removed.has(id) || !slots.some((slot) => slot.key === id && isUsableAccountRecord({ kind: "grant", payload: slot.payload }))) throw new SessionAccountFeatureError("ACCOUNT_UNAVAILABLE");
    return id;
  };
  const updateProfile = async (profile) => {
    requireEnabled();
    const next = copy(profile), key = signature(next);
    if (profileReadable && key === profileSignature) return false;
    currentProfile = next; profileSignature = key; profileReadable = true;
    const ticket = ++profileTicket;
    if (!registry) return false;
    try {
      await registry.updateProfile(next);
      if (closed || ticket !== profileTicket) return false;
      await reconcile(); return ticket === profileTicket;
    } catch {
      if (closed || ticket !== profileTicket) return false;
      report("ACCOUNT_PROFILE_INVALID");
      try { await refreshDefault(); } catch { /* metadata remains fail closed */ }
      return false;
    }
  };
  const handle = Object.freeze({
    get registry() { return registry; }, get hub() { return hub; }, get managed() { return managed; }, get requestState() { return requestState; },
    get status() { return status; }, get managedDefault() { return managedMarker; },
    reconcile, refreshDefault,
    async reactivate(id) { await liveSlot(id, true); removed.delete(id); requireEnabled(); if (!registry) throw new SessionAccountFeatureError("ACCOUNT_RUNTIME_UNAVAILABLE"); const rows = await registry.reactivate(id); requireEnabled(); if (managed) await refreshDefault(); return rows; },
    remove(id) {
      accountRouteId(id); removed.add(id); knownDefault = knownDefault?.accountId === id ? undefined : knownDefault;
      managed?.invalidateDefault(id); // MUST precede account disposal/root hub metadata replacement.
      if (!closed && registry) registry.remove(id);
      if (!closed && managed) void refreshDefault().catch(() => {});
    },
    updateProfile, dispose,
  });
  if (!enabled()) { report("POLICY_UNAVAILABLE"); return handle; }
  try { const initial = readProfile(); currentProfile = initial.profile; profileSignature = initial.key; profileReadable = true; }
  catch { report("ACCOUNT_PROFILE_INVALID"); }
  try {
    watcher = ctx.on("loader/volatile-update", () => {
      if (!enabled()) return;
      try { const next = readProfile(); if (!profileReadable || next.key !== profileSignature) return updateProfile(next.profile).catch(() => report(enabled() ? "ACCOUNT_PROFILE_INVALID" : "POLICY_UNAVAILABLE")); }
      catch { profileReadable = false; knownDefault = undefined; managed?.invalidateDefault(); report("ACCOUNT_PROFILE_INVALID"); }
    }, { global: true });
    runtime = await runtimeLoader({ loader: ctx.get("loader"), signal: lifecycle.signal });
    if (closed) return handle; requireEnabled();
    try { const latest = readProfile(); currentProfile = latest.profile; profileSignature = latest.key; profileReadable = true; }
    catch { profileReadable = false; report("ACCOUNT_PROFILE_INVALID"); }
    if (typeof runtime?.Context?.is !== "function" || !runtime.Context.is(ctx) || typeof runtime.createAdapter !== "function" || typeof runtime.LlmAdapter !== "function"
      || ["TypertRemoteService", "Remote", "RemoteError", "principalOf"].some((key) => typeof runtime.remoteProtocol?.[key] !== "function")) throw new SessionAccountFeatureError("ACCOUNT_RUNTIME_UNAVAILABLE");
    const credentialService = ctx.get("credentials"); llm = ctx.get("llm");
    requestState = await requestStateFactory({ sessionProjections: ctx.get("sessionProjections"), Schema: runtime.Schema,
      resolveSession: (id) => ctx.get("sessions")?.get(id), lastAssistantStreamChunk: runtime.lastAssistantStreamChunk });
    if (closed) { await requestState?.dispose?.(); return handle; }
    requireEnabled();
    if (["scopeForRequest", "notice", "observeFailures", "dispose"].some((method) => typeof requestState?.[method] !== "function")) throw new SessionAccountFeatureError("ACCOUNT_RUNTIME_UNAVAILABLE");
    hub = createCopilotRouteHub({ LlmAdapter: runtime.LlmAdapter, LlmError: runtime.LlmError, llm });
    const fresh = createAccountFreshness({ credentials: credentialService, refreshAccess: refreshAccess ?? createAccountRefreshHttp({ deriveAuth: runtime.deriveAuth }),
      isEnabled: (id) => enabled() && !removed.has(id), ...(runtime.LlmError === undefined ? {} : { LlmError: runtime.LlmError }) });
    const guardedHub = { registerAdapter(routes, adapter) {
      requireEnabled(); const registered = hub.registerAdapter(routes, adapter);
      const release = () => registered(); release.replace = (next) => { requireEnabled(); return registered.replace(next); }; return release;
    } };
    registry = createAccountRegistry({ llm: guardedHub, listSlots,
      createAdapter: async (options) => {
        requireEnabled(); if (!profileReadable) throw new SessionAccountFeatureError("ACCOUNT_PROFILE_INVALID");
        const adapter = await runtime.createAdapter(options);
        if (!enabled()) { try { await adapter?.dispose?.(); } catch { /* no late publication */ } throw new SessionAccountFeatureError(); }
        return adapter;
      },
      adapterOptions: { credentials: credentialService, profile: currentProfile, isEnabled: () => enabled(),
        requestScope: async (request) => { requireEnabled(); const scope = await requestState.scopeForRequest(request); requireEnabled(); return scope; },
        beforeDispatch: async (request) => { requireEnabled(); const outcome = await fresh(request); requireEnabled(); if (outcome.refreshed) await reconcileForRead(); requireEnabled(); return outcome; },
        resolveAttachments: () => ctx.get("attachments"),
        resolveImageAccess: (attachments, ref) => runtime.resolveImageAccess(attachments, (path) => ctx.get("fs")?.processPathFromHostPath(path), ref),
        prepareHeaders: (request, headers) => ctx.waterfall("llm-pi-ai/request-headers", request, headers, () => headers),
        onReplayDegrade: () => { try { ctx.logger?.warn?.("copilot-auth: unusable account replay was sent as provider-neutral history"); } catch { /* no raw replay diagnostic */ } },
      },
      emitModelsUpdated: (route) => safeEmit(route),
    });
    try { await reconcile(); } catch { /* Remote/managed logical route remain available for profile repair. */ }
    if (closed) return handle; requireEnabled();
    managed = await createManagedGlobalAdapter({ LlmAdapter: runtime.LlmAdapter, LlmError: runtime.LlmError, resolveDefault,
      onPublish(event) {
        requireEnabled(); const previous = knownDefault;
        knownDefault = event.available ? { accountId: event.accountId, defaultEpoch: event.defaultEpoch } : undefined;
        try { managedRegistration?.replace([GLOBAL_COPILOT_ROUTE]); }
        catch (error) { knownDefault = previous; throw error; }
        safeEmit(GLOBAL_COPILOT_ROUTE);
      } });
    if (closed) { managed.dispose(); return handle; } requireEnabled();
    managedRegistration = hub.registerAdapter([GLOBAL_COPILOT_ROUTE], managed);
    await refreshDefault();
    if (closed) return handle; requireEnabled();
    requestState.observeFailures(ctx, { isManagedProvider: isManagedCopilotRoute, ownsAgent: nativeScope });
    let forkPolicy;
    if (["agents", "sessions", "sessionQuery"].every((name) => ctx.get(name) !== undefined)) {
      forkPolicy = createSubagentAccountPolicy({ context: ctx, isAccountRoute: (provider) => provider === GLOBAL_COPILOT_ROUTE || isAccountRoute(provider),
        ownsRoute: (provider) => provider === GLOBAL_COPILOT_ROUTE ? hub.has(provider) : registry.accountForRoute(provider) !== undefined,
        forkProviderName, originalSymbol: runtime.symbols?.original, LlmError: runtime.LlmError });
    }
    createdWatcher = ctx.on("agent/created", async (event) => {
      if (!enabled()) return;
      await forkPolicy?.(event);
      if (event?.source !== "startup" && event?.source !== "resume" || !rootScope(event.agent)) return;
      await refreshDefault({ scan: false }); requireEnabled();
      migrateRoot(event.agent, event.signal);
    }, { global: true });
    const policy = { get version() { return policyMarker()?.version; }, get active() { return enabled(); }, isControllerProtected: enabled,
      withSessionSelectionOnly(operation) { requireEnabled(); return policyMarker().withSessionSelectionOnly(operation); } };
    const RemoteClass = createSessionRemoteService({ ...runtime.remoteProtocol,
      createCoordinator(authorizeSession) {
        const coordinator = createSessionAccountController({ sessionController: ctx.get("sessionController"), llm, registry, policy, authorizeSession });
        return {
          async read(request) { if (await authorizeSession(request?.sessionId, "read") !== true) throw new SessionAccountFeatureError("SESSION_FORBIDDEN"); requireEnabled(); await reconcileForRead(); return coordinator.read(request); },
          async bind(request) { if (await authorizeSession(request?.sessionId, "write") !== true) throw new SessionAccountFeatureError("SESSION_FORBIDDEN"); requireEnabled(); await reconcileForRead(); return coordinator.bind(request); },
        };
      },
      handlers: {
        async catalog({ sessionId } = {}) {
          requireEnabled(); const result = await collectAccounts(); requireEnabled(); await reconcileForRead();
          const slots = await listSlots(); requireEnabled();
          const live = new Set(slots.filter((slot) => typeof slot.key === "string" && SLOT.test(slot.key) && !removed.has(slot.key)).map((slot) => slot.key));
          const source = Array.isArray(result) ? result : result?.accounts;
          if (!Array.isArray(source)) throw new SessionAccountFeatureError("ACCOUNT_RUNTIME_UNAVAILABLE");
          const actualGlobal = managedAvailable() ? knownDefault.accountId : undefined;
          const accounts = source.filter((row) => live.has(row?.id)).map((row) => {
            const metadata = registry.account(row.id), active = row.id === actualGlobal;
            return { ...publicRow(row), ...(metadata === undefined ? {} : metadata), routeId: metadata?.routeId ?? accountRouteId(row.id),
              active, globalActive: active, available: true, routeAvailable: metadata?.routeAvailable === true };
          });
          let notice = null;
          try { notice = requestState.notice(sessionId); } catch { /* optional safe notice is not routing authority */ }
          return { accounts, notice, ...(typeof result?.signingIn === "boolean" ? { signingIn: result.signingIn } : {}) };
        },
        async profile(request) { await liveSlot(request.accountId); const result = await refreshProfileById(request.accountId); requireEnabled(); await reconcileForRead(); await liveSlot(request.accountId); return result; },
        async setDefault(request) { await liveSlot(request.accountId); const result = await setDefaultAccountById(request.accountId); requireEnabled(); await liveSlot(request.accountId); await reconcileForRead(); if (managed) await refreshDefault(); return result; },
      },
    });
    requireEnabled(); remoteFiber = ctx.plugin(RemoteClass);
    if (typeof remoteFiber?.await === "function") await remoteFiber.await();
    else await remoteFiber;
    if (typeof remoteFiber?.state === "number" && remoteFiber.state !== 2) throw new SessionAccountFeatureError("ACCOUNT_RUNTIME_UNAVAILABLE");
    if (closed) return handle; requireEnabled();
    assembled = true;
    await migrateRoots();
  } catch {
    if (!closed) {
      const errorCode = enabled() ? "ACCOUNT_RUNTIME_UNAVAILABLE" : "POLICY_UNAVAILABLE";
      report(errorCode); await dispose(); status = Object.freeze({ phase: "unavailable", errorCode });
    }
  }
  return handle;
}
