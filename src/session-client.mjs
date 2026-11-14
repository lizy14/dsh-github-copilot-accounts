// Browser-safe Session/Host-bound native Connection RPC caller. There is no
// localhost fetch fallback, token handling, automatic resend or global host.
const NAMESPACE = "copilotAccounts";
const ERRORS = Object.freeze({
  INVALID_ARGUMENT: [400, "Invalid Session account request"],
  OWNER_REQUIRED: [403, "Only the Host owner may manage Copilot accounts"],
  SESSION_FORBIDDEN: [403, "Session access denied"],
  SESSION_UNAVAILABLE: [404, "Session is unavailable"],
  POLICY_UNAVAILABLE: [503, "Session account policy is unavailable"],
  SESSION_BUSY: [409, "Wait for the Session to become idle before changing account"],
  NOT_COPILOT_SESSION: [409, "Select a Copilot model before binding an account"],
  STALE_SELECTION: [409, "Session model changed; reload account choices"],
  ACCOUNT_UNAVAILABLE: [404, "Selected account is unavailable"],
  ACCOUNT_MODEL_UNAVAILABLE: [409, "Selected account does not support the current model controls"],
  ACCOUNT_COMPACTION_RESTART_REQUIRED: [409, "Restart DSH to apply compaction policy for this account"],
  SELECTION_FAILED: [502, "Session account selection failed"],
  ACCOUNT_PROFILE_FAILED: [502, "Account profile refresh failed"],
  DEFAULT_ACCOUNT_FAILED: [502, "Global default account update failed"],
  REQUEST_CANCELLED: [499, "Session account request was cancelled"],
  INTERNAL_ERROR: [500, "Session account operation failed"],
  STALE_SESSION: [409, "Session or Host connection changed; reload account choices"],
  TRANSPORT_UNAVAILABLE: [503, "Session Host connection is unavailable"],
});
export class SessionAccountClientError extends Error {
  constructor(code) {
    if (typeof code !== "string" || !Object.hasOwn(ERRORS, code)) code = "INTERNAL_ERROR";
    const [status, message] = ERRORS[code];
    super(message);
    this.name = "SessionAccountClientError";
    this.code = code;
    this.status = status;
  }
}
const bad = () => new SessionAccountClientError("INVALID_ARGUMENT");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

export function createSessionAccountClient({ sessionId, connection, isCurrent }) {
  if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 256
    || typeof connection?.rpc?.call !== "function" || typeof connection?.generation?.getSnapshot !== "function"
    || typeof isCurrent !== "function") throw bad();
  const generation = connection.generation.getSnapshot();
  const lifetime = new AbortController();
  let disposed = false;
  const assertCurrent = (signal) => {
    let current = false;
    try { current = isCurrent() === true && connection.generation.getSnapshot() === generation; } catch { /* fail closed */ }
    if (disposed || !current) throw new SessionAccountClientError("STALE_SESSION");
    if (generation === undefined) throw new SessionAccountClientError("TRANSPORT_UNAVAILABLE");
    if (signal?.aborted) throw new SessionAccountClientError("REQUEST_CANCELLED");
  };
  const request = async (method, value = {}, signal) => {
    assertCurrent(signal);
    if (!plain(value) || Object.hasOwn(value, "sessionId") || signal !== undefined && (!(signal instanceof AbortSignal))) throw bad();
    const payload = { sessionId };
    if (method !== "catalog") {
      if (value.accountId !== null && (typeof value.accountId !== "string" || value.accountId.length === 0)
        || method !== "bind" && value.accountId === null) throw bad();
      payload.accountId = value.accountId;
    }
    if (method === "bind" && value.expected !== undefined) {
      if (!plain(value.expected) || typeof value.expected.provider !== "string" || typeof value.expected.model !== "string"
        || value.expected.reasoningEffort !== undefined && typeof value.expected.reasoningEffort !== "string") throw bad();
      payload.expected = { provider: value.expected.provider, model: value.expected.model,
        ...(value.expected.reasoningEffort === undefined ? {} : { reasoningEffort: value.expected.reasoningEffort }) };
    }
    const combined = signal === undefined ? lifetime.signal : AbortSignal.any([lifetime.signal, signal]);
    let result;
    try {
      result = await connection.rpc.call("/api", `${NAMESPACE}/${method}`, { args: { request: payload } }, combined);
    } catch {
      assertCurrent(combined);
      throw new SessionAccountClientError("TRANSPORT_UNAVAILABLE");
    }
    // Even successful old-host responses must never update a new Session view.
    assertCurrent(combined);
    if (result?.ok !== true) {
      let code = "INTERNAL_ERROR";
      try {
        if (typeof result?.error?.code === "string" && Object.hasOwn(ERRORS, result.error.code)) code = result.error.code;
      } catch { /* worker-local failures can be arbitrary objects; do not expose them */ }
      throw new SessionAccountClientError(code);
    }
    if (!plain(result.value)) throw new SessionAccountClientError("INTERNAL_ERROR");
    return result.value;
  };
  return Object.freeze({
    catalog(signal) { return request("catalog", {}, signal); },
    bind(value, signal) { return request("bind", value, signal); },
    profile(value, signal) { return request("profile", value, signal); },
    setDefault(value, signal) { return request("setDefault", value, signal); },
    dispose() { if (!disposed) { disposed = true; lifetime.abort(); } },
  });
}
