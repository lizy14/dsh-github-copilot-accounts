import { test } from "node:test";
import assert from "node:assert/strict";
import { createAccountFreshness } from "../src/account-freshness.mjs";

const A = "copilot-auth/account-a", B = "copilot-auth/account-b";
const START = 2_000_000_000_000;
const copy = (value) => value === undefined ? undefined : structuredClone(value);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const grant = (letter) => ({ kind: "grant", payload: { type: "oauth", refresh: `FAKE_${letter}_REFRESH`, access: `FAKE_${letter}_ACCESS`, expires: START + 8 * 3600000, enterpriseUrl: `company-${letter.toLowerCase()}.ghe.com`, availableModelIds: ["model-one"], extra: { retained: true }, account: { login: "alice", name: "Alice", domain: `company-${letter.toLowerCase()}.ghe.com`, avatarUrl: "https://example.invalid/avatar", customMetadata: { retained: true } } } });
function memory() {
  const records = new Map([[A, grant("A")], [B, grant("B")]]), tails = new Map();
  const queued = [], writes = [], reads = [];
  const service = { records, queued, writes, reads,
    async readRecord(key) { reads.push(key); return copy(records.get(key)); },
    modifyRecord(key, mutate) {
      queued.push(key);
      const op = (tails.get(key) ?? Promise.resolve()).then(async () => {
        const next = await mutate(copy(records.get(key)));
        if (next !== undefined) { records.set(key, copy(next)); writes.push(key); }
        return copy(records.get(key));
      });
      tails.set(key, op.catch(() => {})); return op;
    },
    async barrier(key) { await (tails.get(key) ?? Promise.resolve()); },
  };
  return service;
}
function fixture(options = {}) {
  const credentials = options.credentials ?? memory(), calls = [];
  const clock = { value: START };
  const refreshAccess = options.refreshAccess ?? (async (request) => {
    calls.push(request);
    const letter = request.accountId === A ? "A" : "B";
    return { access: `FAKE_${letter}_NEW_${calls.length}`, expires: clock.value + 8 * 3600000, refreshIn: 1500 };
  });
  const ensure = createAccountFreshness({ credentials, refreshAccess, now: () => clock.value, ...options });
  return { credentials, calls, clock, ensure, refreshAccess };
}
const invoke = (f, accountId = A, signal) => f.ensure({ accountId, signal });

test("unknown freshness refreshes once; persisted metadata suppresses concurrent ordinary calls", async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 10 }, () => invoke(f)));
  assert.equal(f.calls.length, 1);
  assert.equal(results.filter((value) => value.refreshed).length, 1);
  assert.ok(results.every((value) => value.nextRefreshAt === START + 25 * 60000));
  const saved = f.credentials.records.get(A).payload;
  assert.equal(saved.access, "FAKE_A_NEW_1");
  assert.equal(saved.account.accessRefreshAfter, START + 25 * 60000);
  assert.match(saved.account.accessRefreshFor, /^sha256:[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(saved.account).includes("FAKE_A"));
  assert.deepEqual(f.credentials.writes, [A]);
  const another = createAccountFreshness({ credentials: f.credentials, refreshAccess: f.refreshAccess, now: () => f.clock.value });
  assert.equal((await another({ accountId: A })).refreshed, false);
  assert.equal(f.calls.length, 1);
});

test("known-fresh B bypasses A held behind a document-global writer lock", async () => {
  const credentials = memory(), original = credentials.modifyRecord.bind(credentials);
  let documentTail = Promise.resolve();
  credentials.modifyRecord = (key, mutate) => { const result = documentTail.then(() => original(key, mutate)); documentTail = result.catch(() => {}); return result; };
  const entered = deferred(), gate = deferred(), calls = [];
  const f = fixture({ credentials, refreshAccess: async (request) => {
    calls.push(request.accountId);
    if (request.accountId === A) { entered.resolve(); await gate.promise; }
    return { access: `FAKE_${request.accountId}_FRESH`, expires: START + 3600000 };
  } });
  await invoke(f, B);
  const queuedB = credentials.queued.filter((key) => key === B).length;
  const pendingA = invoke(f, A); await entered.promise;
  const result = await Promise.race([invoke(f, B), new Promise((resolve) => setImmediate(() => resolve("blocked")))]);
  assert.notEqual(result, "blocked");
  assert.equal(result.refreshed, false);
  assert.equal(credentials.queued.filter((key) => key === B).length, queuedB);
  gate.resolve(); await pendingA;
  assert.deepEqual(calls, [B, A]);
});

test("ordinary calls honor cancellation before a fresh optimistic read completes", async () => {
  const f = fixture(); await invoke(f, B);
  const read = f.credentials.readRecord.bind(f.credentials), gate = deferred(), entered = deferred(), controller = new AbortController();
  f.credentials.readRecord = async (key) => { entered.resolve(); await gate.promise; return read(key); };
  const pending = invoke(f, B, controller.signal); await entered.promise;
  controller.abort(new Error("cancelled fresh read"));
  await assert.rejects(pending, /cancelled fresh read/);
  gate.resolve(); f.credentials.readRecord = read;
  assert.equal(f.calls.length, 1);
});

test("invalid account, missing slot and disabled policy fail closed before refresh", async () => {
  const f = fixture();
  await assert.rejects(f.ensure({ accountId: "bad" }), { code: "INVALID_ACCOUNT_ID" });
  f.credentials.records.delete(A);
  await assert.rejects(invoke(f), { code: "ACCOUNT_UNAVAILABLE" });
  assert.equal(f.calls.length, 0);
  const disabled = fixture({ isEnabled: () => false });
  await assert.rejects(invoke(disabled), { code: "ACCOUNT_UNAVAILABLE" });
  assert.equal(disabled.calls.length, 0);
});

test("invalid refresh result never persists access/models and enters ordinary cooldown", async () => {
  const f = fixture({ refreshAccess: async () => ({ access: "", expires: START + 3600000, availableModelIds: ["model-two"] }) });
  const before = copy(f.credentials.records.get(A));
  await assert.rejects(invoke(f), { code: "ACCOUNT_REFRESH_INVALID" });
  const after = f.credentials.records.get(A);
  assert.equal(after.payload.access, before.payload.access);
  assert.deepEqual(after.payload.availableModelIds, before.payload.availableModelIds);
  await assert.rejects(invoke(f), { code: "ACCOUNT_REFRESH_COOLDOWN" });
});

test("post-refresh reassignment prevents a stale slot from being persisted", async () => {
  const f = fixture({ refreshAccess: async () => {
    f.credentials.records.set(A, grant("REASSIGNED"));
    return { access: "FAKE_LATE", expires: START + 3600000 };
  } });
  await assert.rejects(invoke(f), { code: "ACCOUNT_CHANGED" });
  assert.equal(f.credentials.records.get(A).payload.access, "FAKE_REASSIGNED_ACCESS");
});

test("caller cancellation after refresh starts does not discard bounded successful persistence", async () => {
  const entered = deferred(), gate = deferred(), controller = new AbortController();
  const f = fixture({ refreshAccess: async (request) => {
    entered.resolve(request.signal); await gate.promise;
    return { access: "FAKE_LATE_SUCCESS", expires: START + 3600000 };
  } });
  const pending = invoke(f, A, controller.signal); const signal = await entered.promise;
  controller.abort(new Error("caller stopped"));
  await assert.rejects(pending, /caller stopped/);
  assert.equal(signal.aborted, false);
  gate.resolve(); await f.credentials.barrier(A);
  assert.equal(f.credentials.records.get(A).payload.access, "FAKE_LATE_SUCCESS");
});
