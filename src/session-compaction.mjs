// Namespace-preserving compaction policy for native Copilot Session routes.
// Original Basic entry stays active/private and owns schema/config-editor state.
// Only the documented summarize() hook is customized; no history is rewritten.
import { isDeepStrictEqual } from "node:util";
import { isManagedCopilotRoute, isAccountRoute, accountRouteId, GLOBAL_COPILOT_ROUTE } from "./account-route-id.mjs";

export const name = "copilot-session-compaction";
export const inject = ["loader", "llm", "tokenMeter", "sessions", "credentials"];
export const COMPACTION_CONTROLS = "copilotCompactionControls";
export const COMPACTION_POLICY = "copilotSessionCompaction";
const ENTRY = "compaction-basic", MODULE = "@deepseek-ai/dsh-compaction-basic";
const RESTART = Symbol.for("copilot-auth.compaction-restart-boundaries.v1");
const copy = (value) => structuredClone(value);
const route = (value) => typeof value?.provider === "string" && value.provider !== "" && typeof value?.model === "string" && value.model !== ""
  ? { provider: value.provider, model: value.model } : undefined;
const key = (value) => JSON.stringify(value ?? {}, (_name, member) => member && typeof member === "object" && !Array.isArray(member)
  ? Object.fromEntries(Object.keys(member).sort().map((name) => [name, member[name]])) : member);
const originalOf = (value) => {
  const seen = new Set(), symbol = Symbol.for("cordis.original");
  while (value && (typeof value === "object" || typeof value === "function") && !seen.has(value)) {
    seen.add(value); const next = value[symbol]; if (!next || next === value) return value; value = next;
  }
  return value;
};
const hasGate = (value) => Array.isArray(value) ? value.includes(COMPACTION_CONTROLS)
  : value && typeof value === "object" && Object.hasOwn(value, COMPACTION_CONTROLS);
export class SessionCompactionError extends Error {
  constructor(message = "Copilot Session compaction policy is unavailable", code = "COPILOT_COMPACTION_UNAVAILABLE") { super(message); this.name = "SessionCompactionError"; this.code = code; }
}
const restart = () => new SessionCompactionError("Compaction policy/control changes require a full DSH restart", "COPILOT_RESTART_REQUIRED");

// A fresh Context makes native defaults/validation authoritative without reaching
// any application service, user Session, filesystem config or model endpoint.
export async function resolveSessionCompactionControls({ Context, BasicCompactionEngine, raw = {} }) {
  const root = new Context();
  try {
    for (const service of ["llm", "sessions", "tokenMeter", "compaction"]) if (root.get(service) !== undefined) throw new SessionCompactionError();
    const parsed = BasicCompactionEngine.Config(copy(raw));
    // Auto hooks in this throwaway root are never dispatched and are disposed.
    const native = new BasicCompactionEngine(root, parsed);
    return copy(native.config);
  } finally { await root.fiber.dispose(); }
}

// Native provider/model rules historically covered every Copilot account. Copy
// them into detached managed routes before native constructor validation/pricing;
// exact managed fields override family fields rather than replacing them wholesale.
export function expandSessionCompactionPolicies(controls, providers = []) {
  const config = copy(controls), known = new Set([GLOBAL_COPILOT_ROUTE, ...providers.filter(isAccountRoute)]);
  for (const policy of config.modelPolicies) if (isAccountRoute(policy.provider)) known.add(policy.provider);
  const native = config.modelPolicies.filter((policy) => policy.provider === "github-copilot");
  for (const provider of known) for (const family of native) {
    const index = config.modelPolicies.findIndex((policy) => policy.provider === provider && policy.model === family.model);
    if (index < 0) config.modelPolicies.push({ ...copy(family), provider });
    else config.modelPolicies[index] = { ...copy(family), ...Object.fromEntries(Object.entries(config.modelPolicies[index]).filter(([, value]) => value !== undefined)), provider };
  }
  return Object.freeze({ config, supportsRoute(selection) {
    const provider = selection?.provider, model = selection?.model;
    if (typeof provider !== "string" || provider === "") return false;
    if (!isAccountRoute(provider) || known.has(provider)) return true;
    // Provider-only discovery must not advertise an unpriced policy-sensitive
    // warm route; a model-specific check can still admit unaffected models.
    return model === undefined ? native.length === 0 : typeof model === "string" && !native.some((policy) => policy.model === model);
  } });
}

const effectiveSummary = (config, target) => {
  const exact = config.modelPolicies.find((item) => item.provider === target.provider && item.model === target.model);
  // The managed logical default replaces the builtin route, preserving its exact
  // per-model summary policy. Account aliases remain independently configurable.
  const inherited = exact ?? (target.provider === GLOBAL_COPILOT_ROUTE
    ? config.modelPolicies.find((item) => item.provider === "github-copilot" && item.model === target.model) : undefined);
  const provider = inherited?.summarizationProvider ?? config.summarizationProvider;
  const model = inherited?.summarizationModel ?? config.summarizationModel;
  return { provider: provider === "" ? target.provider : provider, model: provider === "" ? target.model : model,
    maxTokens: inherited?.maxTokens ?? config.maxTokens };
};

/** Only native summarize() is overridden. Pin from public step/request payloads,
 * never from a mutable pending model while a different step is already running. */
export function createSessionCompactionEngine({ BasicCompactionEngine, Context, assertRoute = () => {} }) {
  if (typeof BasicCompactionEngine !== "function" || typeof Context !== "function") throw new SessionCompactionError();
  return class SessionCompactionEngine extends BasicCompactionEngine {
    constructor(ctx, config) {
      const captures = new WeakMap();
      const expected = Object.fromEntries(["llm", "sessions", "tokenMeter"].map((service) => [service, originalOf(ctx.get(service))]));
      const sameScope = (agent) => {
        try { return typeof agent?.ctx?.get === "function" && typeof expected.sessions?.get === "function"
          && expected.sessions.get(agent.session?.id) === agent.session
          && Object.keys(expected).every((service) => originalOf(ctx.get(service)) === expected[service] && originalOf(agent.ctx.get(service)) === expected[service]); }
        catch { return false; }
      };
      ctx.on("agent/pre-step", (payload, next) => {
        if (!sameScope(payload?.agent)) return next();
        const selected = route(payload?.modelSelection);
        if (payload?.agent && selected) captures.set(payload.agent, selected);
        else if (payload?.agent) captures.delete(payload.agent);
        if (selected) assertRoute(selected);
        return next();
      }, { prepend: true });
      // Register BEFORE super: native request hook is prepend and therefore wraps
      // this inner observer, which sees B before native model-switch compaction.
      ctx.on("agent/request", async (payload, next) => {
        const proposed = await next(), selected = route(proposed);
        if (!sameScope(payload?.agent)) return proposed;
        if (payload?.agent && selected) captures.set(payload.agent, selected);
        if (selected) assertRoute(selected);
        return proposed;
      });
      ctx.on("agent/status", ({ agent, status }) => { if (status === "idle") captures.delete(agent); });
      super(ctx, config);
      this.copilotCaptures = captures;
      this.copilotSameScope = sameScope;
      this.copilotAssertRoute = assertRoute;
    }
    async summarize(input, agent, signal) {
      signal?.throwIfAborted();
      if (!this.copilotSameScope(agent)) throw new SessionCompactionError("Compaction Session service scope is unsupported");
      const selected = agent.status === "running" ? this.copilotCaptures.get(agent) : route(agent.model?.current?.());
      const previous = route(agent.session.requestHeader()?.config);
      if (!selected) {
        if (isManagedCopilotRoute(previous?.provider) || isManagedCopilotRoute(agent.model?.current?.()?.provider)) throw new SessionCompactionError();
        return super.summarize(input, agent, signal);
      }
      if (!isManagedCopilotRoute(selected.provider) && !isManagedCopilotRoute(previous?.provider)) return super.summarize(input, agent, signal);
      this.copilotAssertRoute(selected);
      const summary = effectiveSummary(this.config, selected);
      const controls = { ...copy(this.config), modelPolicies: [], auto: false,
        summarizationProvider: summary.provider, summarizationModel: summary.model, maxTokens: summary.maxTokens };
      // A child native helper preserves its own prompt, assembler/error/framing
      // behavior and exact reported route; no private summarizer is copied.
      let helper;
      const Base = BasicCompactionEngine;
      const helperFiber = this.ctx.plugin({ name: "copilot-private-native-summary", apply(child) {
        helper = new Base(child.isolate("compaction", Symbol("copilot-summary")), controls);
      } });
      try {
        await helperFiber.await();
        signal?.throwIfAborted();
        if (helperFiber.state !== 2 || !helper || !this.copilotSameScope(agent)) throw new SessionCompactionError();
        return await helper.summarize(input, agent, signal);
      } finally { await helperFiber.dispose(); await helperFiber.await(); }
    }
  };
}

function installRestartGuard(ctx, Context, entry, realmName, label, configKey, disabled) {
  const root = ctx.root;
  let records = root[RESTART];
  if (!records) {
    records = new Map(); root[RESTART] = records;
    root.on("loader/patch-context", (target, next) => {
      const record = records.get(target.parent?.tree)?.get(target.options?.id);
      if (record && (target.options.name !== MODULE || Boolean(target.disabled) !== record.disabled || !hasGate(target.options.inject)
        || target.options.isolate?.compaction !== record.realmName || key(target.options.config) !== record.configKey)) throw restart();
      return next();
    }, { prepend: true, global: true });
  }
  let tree = records.get(entry.parent.tree);
  if (!tree) records.set(entry.parent.tree, tree = new Map());
  const old = tree.get(ENTRY);
  if (old && (old.realmName !== realmName || old.configKey !== configKey || old.disabled !== disabled)) throw restart();
  tree.set(ENTRY, { realmName, label, configKey, disabled });
}

/** Production composition role. Original entry MUST have the extra inject gate;
 * this role installs its synchronous config policy before releasing that gate. */
export function installSessionCompaction(ctx, { Context, BasicCompactionEngine, interpolate }) {
  const policyEntry = ctx.fiber?.entry, parent = policyEntry?.parent?.ctx, tree = policyEntry?.parent?.tree;
  const realmName = policyEntry?.options?.isolate?.compaction, label = ctx[Context.isolate]?.compaction;
  let original;
  try { original = tree.resolve(ENTRY); } catch { throw new SessionCompactionError(); }
  if (typeof interpolate !== "function" || typeof realmName !== "string" || typeof label !== "symbol"
    || original.options.name !== MODULE || original.options.isolate?.compaction !== realmName || !hasGate(original.options.inject)
    || parent?.[Context.isolate] === undefined || parent[Context.isolate].compaction === label) throw new SessionCompactionError();
  const configKey = key(original.options.config), disabled = Boolean(original.disabled);
  installRestartGuard(ctx, Context, original, realmName, label, configKey, disabled);
  if (disabled) {
    // The user disabled native compaction: keep it disabled, publish no engine,
    // and do not gate Session/Remote startup on an optional service.
    let active = true;
    ctx.effect(() => () => { active = false; }, "copilot disabled compaction policy");
    ctx.provide(COMPACTION_CONTROLS, Object.freeze({ version: 1 }));
    ctx.provide(COMPACTION_POLICY, Object.freeze({ version: 1, mode: "disabled", get active() { return active; },
      isReady: () => active && Boolean(original.disabled) && key(original.options.config) === configKey,
      supportsRoute: () => active && Boolean(original.disabled) }));
    return;
  }
  // Prepend sees the Loader's fully interpolated result, but cannot become async:
  // Fiber.resolveConfig and ConfigEditor validation are synchronous contracts.
  ctx.on("internal/config", (fiber, next) => {
    const config = next();
    if (fiber.entry !== original || fiber.parent?.fiber?.entry === original) return config;
    if (config?.auto !== undefined && typeof config.auto !== "boolean") throw new SessionCompactionError("Invalid compaction auto control");
    return { ...config, auto: false };
  }, { prepend: true, global: true });
  // With compaction enabled, never silently continue using a failed/old bridge.
  // Only execution is guarded; the account Remote and its catalog stay usable.
  let engineReady = () => false;
  const execution = ctx.extend({ fiber: ctx.fiber, [Context.isolate]: parent[Context.isolate] });
  const owns = (agent) => {
    try { return agent?.session && execution.get("sessions")?.get(agent.session.id) === agent.session
      && ["llm", "sessions", "tokenMeter"].every(service => originalOf(agent.ctx?.get(service)) === originalOf(execution.get(service))); }
    catch { return false; }
  };
  execution.on("agent/pre-step", (event, next) => {
    if (!original.disabled && owns(event?.agent) && isManagedCopilotRoute(event?.modelSelection?.provider) && !engineReady()) throw new SessionCompactionError();
    return next();
  }, { prepend: true, global: true });
  execution.on("agent/request", async (event, next) => {
    const proposed = await next();
    if (!original.disabled && owns(event?.agent) && isManagedCopilotRoute(proposed?.provider) && !engineReady()) throw new SessionCompactionError();
    return proposed;
  }, { prepend: true, global: true });
  ctx.provide(COMPACTION_CONTROLS, Object.freeze({ version: 1 }));
  return ctx.inject(["compaction"], async (bound) => {
    let active = true;
    const backing = bound.compaction;
    const raw = interpolate(original.ctx, copy(original.options.config ?? {}));
    const controls = await resolveSessionCompactionControls({ Context, BasicCompactionEngine, raw });
    if (key(original.options.config) !== configKey || backing.config?.auto !== false
      || !isDeepStrictEqual(backing.config, { ...controls, auto: false })) throw new SessionCompactionError("Original compaction backing controls are inconsistent");
    const records = await bound.get("credentials")?.listRecords?.();
    if (!Array.isArray(records)) throw new SessionCompactionError("Compaction account directory is unavailable");
    const routes = records.flatMap((record) => {
      if (record?.kind !== "grant" || typeof record.key !== "string") return [];
      try { return [accountRouteId(record.key)]; } catch { return []; }
    });
    const expanded = expandSessionCompactionPolicies(controls, routes);
    const Public = bound.extend({ fiber: bound.fiber, [Context.isolate]: parent[Context.isolate] });
    const assertSupported = (selection) => { if (!expanded.supportsRoute(selection)) throw restart(); };
    const Derived = createSessionCompactionEngine({ BasicCompactionEngine, Context, assertRoute: assertSupported });
    const fiber = Public.plugin(Derived, expanded.config);
    bound.effect(() => async () => { active = false; await fiber.dispose(); await fiber.await(); }, "copilot Session compaction ownership");
    await fiber.await();
    if (fiber.state !== 2) throw new SessionCompactionError("Public compaction engine did not activate");
    const provided = originalOf(Public.get("compaction"));
    if (!(provided instanceof Derived)) throw new SessionCompactionError("Public compaction engine ownership is unavailable");
    const isReady = () => {
      try { return active && fiber.state === 2 && originalOf(Public.get("compaction")) === provided
        && original.options.name === MODULE && !original.disabled && hasGate(original.options.inject)
        && original.options.isolate?.compaction === realmName && original.ctx[Context.isolate]?.compaction === label
        && key(original.options.config) === configKey && backing.config?.auto === false; }
      catch { return false; }
    };
    engineReady = isReady;
    const marker = Object.freeze({ version: 1, mode: "enabled", get active() { return active; }, isReady,
      supportsRoute(selection, model) { return isReady() && expanded.supportsRoute(typeof selection === "string" ? { provider: selection, model } : selection); },
      assertRoute(selection, model) { if (!isReady()) throw new SessionCompactionError(); assertSupported(typeof selection === "string" ? { provider: selection, model } : selection); } });
    bound.provide(COMPACTION_POLICY, marker);
  });
}

export async function apply(ctx) {
  const loader = ctx.get("loader");
  if (typeof loader?.import !== "function") throw new SessionCompactionError();
  const [cordis, basic, controls] = await Promise.all([
    loader.import("@deepseek-ai/cordis"), loader.import(MODULE), loader.import("@deepseek-ai/cordis-plugin-loader"),
  ]);
  if (!cordis.Context.is(ctx)) throw new SessionCompactionError();
  installSessionCompaction(ctx, { Context: cordis.Context, BasicCompactionEngine: basic.BasicCompactionEngine ?? basic.default, interpolate: controls.interpolate });
}
