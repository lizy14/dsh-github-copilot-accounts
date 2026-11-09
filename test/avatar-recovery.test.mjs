import { test } from "node:test";
import assert from "node:assert/strict";
import { createAvatarRecovery, createProfileRequester } from "../src/avatar-recovery.mjs";

const oldUrl = "https://company.ghe.com/avatars/u/1?opaque=unchanged";
const newUrl = "https://company.ghe.com/avatars/u/1?opaque=replacement";
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
const setup = (request) => {
  const recovery = createAvatarRecovery(request);
  recovery.configure("account-a", oldUrl);
  return recovery;
};

test("image error makes one refresh and keeps fallback while pending and after retry failure", async () => {
  const result = deferred();
  let requests = 0, syncs = 0;
  const recovery = setup(() => { requests++; return result.promise; });
  const original = recovery.snapshot();
  const pending = recovery.fail(original.revision, () => { syncs++; });
  assert.equal(recovery.snapshot().failed, true);
  await recovery.fail(original.revision);
  assert.equal(requests, 1);
  result.resolve(newUrl);
  await pending;
  const retried = recovery.snapshot();
  assert.equal(retried.source, newUrl);
  assert.equal(retried.failed, false);
  assert.ok(retried.revision > original.revision);
  assert.equal(syncs, 1);
  await recovery.fail(retried.revision);
  assert.equal(recovery.snapshot().failed, true);
  assert.equal(requests, 1);
});

test("same returned URL forces one image remount without cachebuster or URL changes", async () => {
  let requests = 0;
  const recovery = setup(async () => { requests++; return oldUrl; });
  const before = recovery.snapshot();
  await recovery.fail(before.revision);
  assert.equal(recovery.snapshot().source, oldUrl);
  assert.ok(recovery.snapshot().revision > before.revision);
  assert.equal(recovery.snapshot().failed, false);
  await recovery.fail(recovery.snapshot().revision);
  assert.equal(recovery.snapshot().failed, true);
  assert.equal(requests, 1);
});

test("parent source catches up to recovered URL without resetting the retry budget", async () => {
  let requests = 0;
  const recovery = setup(async () => { requests++; return newUrl; });
  await recovery.fail(recovery.snapshot().revision);
  recovery.configure("account-a", newUrl);
  await recovery.fail(recovery.snapshot().revision);
  recovery.configure("account-a", newUrl);
  assert.equal(recovery.snapshot().failed, true);
  assert.equal(requests, 1);
});

test("external source and account-id changes reset fallback and permit a new one-shot recovery", async () => {
  let requests = 0;
  const recovery = setup(async () => { requests++; throw new Error("do not log sensitive request details"); });
  await recovery.fail(recovery.snapshot().revision);
  assert.equal(recovery.snapshot().failed, true);
  recovery.configure("account-a", newUrl);
  assert.equal(recovery.snapshot().source, newUrl);
  assert.equal(recovery.snapshot().failed, false);
  await recovery.fail(recovery.snapshot().revision);
  recovery.configure("account-b", newUrl);
  assert.equal(recovery.snapshot().failed, false);
  await recovery.fail(recovery.snapshot().revision);
  assert.equal(requests, 3);
});

test("stale image error cannot trigger recovery or fallback for a changed source", async () => {
  let requests = 0;
  const recovery = setup(async () => { requests++; return newUrl; });
  const stale = recovery.snapshot().revision;
  recovery.configure("account-b", newUrl);
  await recovery.fail(stale);
  assert.equal(requests, 0);
  assert.equal(recovery.snapshot().failed, false);
});

test("stale pending response after id/source change is ignored and does not notify parent", async () => {
  for (const next of [["account-b", oldUrl], ["account-a", newUrl]]) {
    const result = deferred();
    let syncs = 0;
    const recovery = setup(() => result.promise);
    const pending = recovery.fail(recovery.snapshot().revision, () => { syncs++; });
    recovery.configure(...next);
    const current = recovery.snapshot();
    result.resolve("https://company.ghe.com/old-account-response");
    await pending;
    assert.deepEqual(recovery.snapshot(), current);
    assert.equal(syncs, 0);
  }
});

test("unmounted response and old image events are ignored, including after remount", async () => {
  const result = deferred();
  let syncs = 0, notifications = 0;
  const recovery = setup(() => result.promise);
  const stop = recovery.subscribe(() => { notifications++; });
  const pending = recovery.fail(recovery.snapshot().revision, () => { syncs++; });
  stop();
  recovery.unmount();
  const state = recovery.snapshot();
  recovery.mount();
  result.resolve(newUrl);
  await pending;
  assert.deepEqual(recovery.snapshot(), state);
  assert.equal(syncs, 0);
  assert.equal(notifications, 1);
});

test("remount invalidates old image events and publishes the new image revision", async () => {
  let count = 0, notifications = 0;
  const recovery = setup(async () => { count++; return newUrl; });
  const original = recovery.snapshot().revision;
  recovery.unmount();
  recovery.subscribe(() => { notifications++; });
  recovery.mount();
  assert.ok(recovery.snapshot().revision > original);
  assert.equal(notifications, 1);
  await recovery.fail(original);
  assert.equal(count, 0);
  assert.equal(recovery.snapshot().failed, false);
});

test("failed or empty profile response stays on fallback and does not loop", async () => {
  for (const request of [async () => undefined, async () => { throw new Error("failed"); }]) {
    let count = 0;
    const recovery = setup(() => { count++; return request(); });
    await recovery.fail(recovery.snapshot().revision);
    await recovery.fail(recovery.snapshot().revision);
    assert.equal(recovery.snapshot().failed, true);
    assert.equal(count, 1);
  }
});

test("missing id/source falls back without issuing a profile request", async () => {
  let count = 0;
  const recovery = createAvatarRecovery(async () => { count++; return newUrl; });
  for (const pair of [[undefined, oldUrl], ["", oldUrl], ["account-a", undefined]]) {
    recovery.configure(...pair);
    await recovery.fail(recovery.snapshot().revision);
  }
  assert.equal(count, 0);
});

test("request helper dedupes by id and sends only id to same-origin profile endpoint", async () => {
  const result = deferred();
  const calls = [];
  const request = createProfileRequester((url, init) => { calls.push({ url, init }); return result.promise; });
  const a = request("account-a"), b = request("account-a"), c = request("account-b");
  assert.equal(a, b);
  assert.notEqual(a, c);
  await Promise.resolve();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], { url: "/copilot-auth/profile", init: {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "account-a" }),
  } });
  result.resolve({ ok: true, json: async () => ({ ok: true, avatarUrl: newUrl }) });
  assert.equal(await a, newUrl);
  assert.equal(await c, newUrl);
  assert.equal(await request("account-a"), newUrl);
  assert.equal(calls.length, 3, "settled entries must be cleared");
});

test("two avatar controllers share one concurrent request but retain independent one-retry state", async () => {
  const result = deferred();
  let calls = 0;
  const requester = createProfileRequester(() => { calls++; return result.promise; });
  const first = setup(requester), second = setup(requester);
  const a = first.fail(first.snapshot().revision), b = second.fail(second.snapshot().revision);
  await Promise.resolve();
  assert.equal(calls, 1);
  result.resolve({ ok: true, json: async () => ({ ok: true, avatarUrl: newUrl }) });
  await Promise.all([a, b]);
  assert.equal(first.snapshot().source, newUrl);
  assert.equal(second.snapshot().source, newUrl);
  await first.fail(first.snapshot().revision);
  assert.equal(first.snapshot().failed, true);
  assert.equal(second.snapshot().failed, false);
  assert.equal(calls, 1);
});

test("request failures, malformed responses and invalid ids reject safely and clear pending entry", async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ ok: false }) }]) {
    let calls = 0;
    const request = createProfileRequester(async () => { calls++; return response; });
    await assert.rejects(request("account-a"), /Avatar profile refresh failed/);
    await assert.rejects(request("account-a"), /Avatar profile refresh failed/);
    await assert.rejects(request(undefined), /Account id required/);
    assert.equal(calls, 2);
  }
});
