// Final cold-composition proof: real Loader/patch DSL/default+Host roles,
// real Feature/core/projections; synthetic service/controller/credential leaves.
// This does NOT start the app, bind HTTP, read user config, or run inference.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { installDefaultModelPolicy } from "../src/default-model.mjs";
import { installSessionCompaction } from "../src/session-compaction.mjs";
import { createSessionAccountFeature } from "../src/session-feature.mjs";
import { createProfiledAccountAdapter } from "../src/account-profiled-adapter.mjs";
import { accountRouteId, GLOBAL_COPILOT_ROUTE } from "../src/account-route-id.mjs";

const base = new URL("../../dsh-session-account-review/installed/dsh/node_modules/", import.meta.url);
const path = (value) => new URL(value, base);
const present = ["@deepseek-ai/cordis/lib/index.js", "@deepseek-ai/cordis-plugin-loader/lib/index.js", "@deepseek-ai/cordis-plugin-include/lib/index.js", "@deepseek-ai/dsh-compaction-basic/lib/index.js", "@deepseek-ai/schemastery/lib/index.mjs"].every((value) => existsSync(path(value)));
const load = (value) => import(path(value).href);
const A = "copilot-auth/account-compose-a", B = "copilot-auth/account-compose-b", MAIN = "llm-pi-ai/github-copilot";
const HOST = "dsh-github-copilot-accounts", DEFAULT = HOST + "/default-model", COMPACTION = HOST + "/session-compaction";
const NATIVE_DEFAULT = "@deepseek-ai/dsh-agent-default-model", NATIVE_CONTROLLER = "@deepseek-ai/dsh-api-session-controller", NATIVE_COMPACTION = "@deepseek-ai/dsh-compaction-basic", NATIVE_PI = "@deepseek-ai/dsh-llm-pi-ai";
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const original = (value, symbol) => value?.[symbol] ?? value;
const grant = (letter) => ({ kind: "grant", payload: { type: "oauth", refresh: "FAKE_COMPOSE_" + letter + "_REFRESH", access: "FAKE_COMPOSE_" + letter + "_ACCESS", expires: Date.now() + 3600000,
  enterpriseUrl: `compose-${letter.toLowerCase()}.ghe.com`, availableModelIds: ["gpt-5.4"], account: { login: "synthetic", domain: `compose-${letter.toLowerCase()}.ghe.com` } } });

for (const disabled of [false, true]) for (const order of ["native-first", "roles-first"]) test(`actual all-role cold composition ${order}, compaction disabled=${disabled}: Remote remains ready`, { skip: present ? false : "optional complete extracted native fixture absent", timeout: 10000 }, async (t) => {
  const previous = globalThis.fetch; globalThis.fetch = async () => assert.fail("Network forbidden in all-role composition proof");
  t.after(() => { globalThis.fetch = previous; });
  const [cordis, loaderModule, include, nativeDefault, basic, core, session, agent, projection, query, schema, protocol] = await Promise.all([
    load("@deepseek-ai/cordis/lib/index.js"), load("@deepseek-ai/cordis-plugin-loader/lib/index.js"), load("@deepseek-ai/cordis-plugin-include/lib/index.js"),
    load("@deepseek-ai/dsh-agent-default-model/lib/index.js"), load("@deepseek-ai/dsh-compaction-basic/lib/index.js"), load("@deepseek-ai/dsh-llm/lib/index.js"),
    load("@deepseek-ai/dsh-session/lib/index.js"), load("@deepseek-ai/dsh-agent/lib/index.js"), load("@deepseek-ai/dsh-session-projection/lib/index.js"),
    load("@deepseek-ai/dsh-session-query/lib/index.js"), load("@deepseek-ai/schemastery/lib/index.mjs"), load("@deepseek-ai/dsh-typert-protocol/lib/index.js"),
  ]);
  const { Context, Service } = cordis, NativeDefault = nativeDefault.default, NativeBasic = basic.BasicCompactionEngine ?? basic.default;
  const root = new Context(), state = { completed: deferred(), feature: undefined }, writes = [], records = new Map([[A, grant("A")], [B, grant("B")], [MAIN, grant("A")]]);
  records.get(MAIN).payload.copilotDefaultEpoch = "compose-epoch-a";
  t.after(async () => { await state.feature?.dispose(); await root.fiber.dispose(); });
  root.provide("webServer", {}); root.provide("authorization", {}); root.provide("settings", { configure() {} }); root.provide("remoteAccess", { allows: () => true });
  root.provide("tokenMeter", { measure: () => ({ totalTokens: 0 }) });
  root.provide("credentials", { async listRecords() { return [...records].map(([key, value]) => ({ key, ...structuredClone(value) })); },
    async readRecord(id) { return structuredClone(records.get(id)); }, async modifyRecord() { assert.fail("composition metadata must not refresh/write credentials"); } });
  root.provide("configEditor", { async edit(entry, change) { writes.push(entry.options.id); await entry.update({ config: change(structuredClone(entry.options.config)) }); } });
  new session.SessionStore(root); new agent.AgentRegistry(root); new projection.default(root); new query.SessionQueryEngine(root);
  const llm = new core.LlmRuntime(root);
  class Builtin extends core.LlmAdapter {
    providerInfo(provider) { return { id: provider, name: "Synthetic native Copilot" }; }
    async listModels(provider) { return [{ provider, id: "gpt-5.4", name: "Synthetic model" }]; }
    async resolveModel(provider, model) { return { provider, id: model, name: "Synthetic model", context: { contextWindow: 100000 } }; }
    async *stream() { assert.fail("No inference in cold composition proof"); }
  }
  llm.registerAdapter(["github-copilot"], new Builtin());
  class Controller extends Service {
    static inject = ["agentDefaultModel", "llm"];
    constructor(ctx) { super(ctx, "sessionController"); this.commands = { ctx }; }
    resolveAgent() { return Promise.resolve({ error: { code: "session/not-found" } }); }
    selectModel() { assert.fail("No actor/controller mutation in cold composition proof"); }
    selectedDefault() { return this.commands.ctx.agentDefaultModel.currentSelection(); }
    providers() { return this.commands.ctx.llm.listProviders(); }
    models(provider) { return this.commands.ctx.llm.listModels(provider); }
  }
  const runtime = { Context, LlmAdapter: core.LlmAdapter, LlmError: core.LlmError, Schema: schema.default, symbols: cordis.symbols,
    lastAssistantStreamChunk: core.lastAssistantStreamChunk, remoteProtocol: protocol, deriveAuth() { assert.fail("No auth derivation in composition proof"); },
    resolveImageAccess() { assert.fail("No image request in composition proof"); },
    async createAdapter(options) {
      return createProfiledAccountAdapter({ LlmAdapter: core.LlmAdapter, LlmError: core.LlmError, accountId: options.accountId, routeId: options.routeId, initialProfile: options.profile, onPublish: options.onPublish,
        async createDelegate() {
          state.delegateBuilds = (state.delegateBuilds ?? 0) + 1;
          return { accountId: options.accountId, routeId: options.routeId, providerInfo: (provider) => ({ id: provider, name: "Synthetic account" }), providerRetryPolicy: () => undefined,
            async listModels(provider) { return [{ provider, id: "gpt-5.4", name: "Synthetic model" }]; },
            async resolveModel(provider, model) { return { provider, id: model, name: "Synthetic model", context: { contextWindow: 100000 } }; },
            async prepareCall(provider, model) { return { model: await this.resolveModel(provider, model), stream: this.stream }; },
            async *stream() { assert.fail("No account inference in composition proof"); }, dispose() {} };
        } });
    } };
  // Use the exact current Host optional-service list, not a drift-prone test list.
  const hostSource = await readFile(new URL("../src/host.mjs", import.meta.url), "utf8");
  const hostInject = hostSource.match(/ctx\.inject\((\["loader", "sessionController"[^\]]*\]), async \(child\)/);
  assert.ok(hostInject); const optional = JSON.parse(hostInject[1]);
  assert.ok(!optional.includes("copilotSessionCompaction"));
  class MemoryLoader extends (loaderModule.Loader ?? loaderModule.default) {
    commit() {} // Never persist user configuration.
    import(name, outer) {
      if (name === NATIVE_DEFAULT) return Promise.resolve({ default: NativeDefault });
      if (name === NATIVE_CONTROLLER) return Promise.resolve({ default: Controller });
      if (name === NATIVE_COMPACTION) return Promise.resolve({ default: NativeBasic });
      if (name === NATIVE_PI) return Promise.resolve({ apply() {} }); // Wire boundary only, not a second LLM.
      if (name === DEFAULT) return Promise.resolve({ apply(ctx) { state.defaultFiber = installDefaultModelPolicy(ctx, Context); } });
      if (name === COMPACTION) return Promise.resolve({ inject: ["loader", "llm", "tokenMeter", "sessions", "credentials"], apply(ctx) {
        state.compactionFiber = installSessionCompaction(ctx, { Context, BasicCompactionEngine: NativeBasic, interpolate: loaderModule.interpolate });
      } });
      if (name === HOST) return Promise.resolve({ inject: ["webServer", "authorization", "credentials", "settings", "llm"], apply(ctx) {
        // Mirror the production Host's public optional injection/lifetime contract;
        // actual REST/webServer/auth workflow bodies are intentionally not started.
        state.featureFiber = ctx.inject(optional, async (child) => {
          state.boundServices = Object.fromEntries(["llm", "credentials", "sessionController", "sessionProjections", "remoteAccess", "copilotDefaultModelPolicy"].map((name) => [name, child.get(name) !== undefined]));
          let closed = false, feature;
          child.effect(() => () => { closed = true; return feature?.dispose(); });
          try {
            feature = await createSessionAccountFeature(child, {
              listSlots: async () => [...records].filter(([id]) => id !== MAIN).map(([key, value]) => ({ key, payload: structuredClone(value.payload) })),
              collectAccounts: async () => ({ accounts: [{ id: A }, { id: B }] }), refreshProfileById: async () => ({ ok: true }), setDefaultAccountById: async () => ({ ok: true }),
              getProfile: () => ({}), runtimeLoader: async () => runtime, refreshAccess: async () => assert.fail("No refresh in cold metadata composition"),
            });
            if (closed) { await feature.dispose(); return; }
            state.feature = feature; state.completed.resolve(feature);
          } catch (error) { state.completed.reject(error); throw error; }
        });
      } });
      return super.import(name, outer);
    }
  }
  const loaderFiber = root.plugin(MemoryLoader); await loaderFiber.await(); assert.equal(loaderFiber.state, 2);
  const originalEntries = [
    { id: "agent-default-model", name: NATIVE_DEFAULT, config: { provider: "github-copilot", model: "gpt-5.4" } },
    { id: "compaction-basic", name: NATIVE_COMPACTION, disabled, config: { auto: true, modelPolicies: [{ provider: "github-copilot", model: "gpt-5.4", headroomTokens: 1234, maxTokens: 456 }] } },
    { id: "session-controller", name: NATIVE_CONTROLLER }, { id: "llm-pi-ai", name: NATIVE_PI },
  ];
  const patch = parseYaml(await readFile(new URL("../cordis.patch.yml", import.meta.url), "utf8")), warnings = [];
  const composed = include.applyEntryPatches(originalEntries, patch, (...args) => warnings.push(args));
  assert.deepEqual(warnings, []);
  const roles = composed.filter((entry) => [HOST, DEFAULT, COMPACTION].includes(entry.name)), nativeEntries = composed.filter((entry) => ![HOST, DEFAULT, COMPACTION].includes(entry.name));
  const entries = order === "native-first" ? [...nativeEntries, ...roles] : [...roles, ...nativeEntries];
  assert.equal([HOST, DEFAULT, COMPACTION].includes(entries[0].name), order === "roles-first");
  await root.loader.root.update(entries); await root.loader.await();
  await state.defaultFiber?.await(); await state.compactionFiber?.await();
  assert.equal(root.get("copilotDefaultModelPolicy")?.isControllerProtected(), true, "actual patched controller realm must match policy realms");
  const feature = await state.completed.promise; await state.featureFiber.await();
  assert.equal(state.featureFiber.state, 2); assert.equal(feature.status.phase, "ready", JSON.stringify({ status: feature.status, bound: state.boundServices, delegates: state.delegateBuilds ?? 0 }));
  assert.equal(root.get("copilotManagedDefault").isReady(), true); assert.equal(root.get("copilotManagedDefault").isAvailable(), true);
  const nativeCompaction = root.loader.resolve("compaction-basic"), bridge = root.get("copilotSessionCompaction");
  assert.equal(bridge?.isReady(), true);
  assert.equal(bridge.mode, disabled ? "disabled" : "enabled");
  assert.equal(Boolean(nativeCompaction.disabled), disabled);
  assert.deepEqual(nativeCompaction.options.config, originalEntries[1].config);
  if (disabled) {
    assert.equal(root.get("compaction"), undefined, "disabled native compaction must stay disabled");
  } else {
    assert.equal(nativeCompaction.fiber.state, 2);
    assert.equal(nativeCompaction.fiber.runtime.Config, NativeBasic.Config);
    const backing = nativeCompaction.ctx.get("compaction"), publicEngine = root.get("compaction");
    assert.notEqual(original(backing, cordis.symbols.original), original(publicEngine, cordis.symbols.original));
    assert.equal(backing.config.auto, false); assert.equal(publicEngine.config.auto, true);
    for (const provider of [GLOBAL_COPILOT_ROUTE, accountRouteId(A), accountRouteId(B)]) {
      assert.equal(publicEngine.config.modelPolicies.find((item) => item.provider === provider && item.model === "gpt-5.4").headroomTokens, 1234);
    }
  }
  const controller = root.get("sessionController");
  assert.equal(root.get("agentDefaultModel").currentSelection().provider, "github-copilot", "native public namespace remains untouched");
  assert.equal(controller.selectedDefault().provider, GLOBAL_COPILOT_ROUTE);
  assert.equal(root.get("llm").listProviders().some((value) => value.id === "github-copilot"), true);
  assert.equal(controller.providers().some((value) => value.id === "github-copilot"), false);
  assert.equal((await controller.models(GLOBAL_COPILOT_ROUTE))[0].provider, GLOBAL_COPILOT_ROUTE);
  assert.equal((await controller.models(accountRouteId(A)))[0].provider, accountRouteId(A));
  assert.deepEqual(writes, []); assert.equal(root.get("copilotAccounts") !== undefined, true);
  await feature.dispose(); assert.equal(root.get("copilotManagedDefault"), undefined);
});
