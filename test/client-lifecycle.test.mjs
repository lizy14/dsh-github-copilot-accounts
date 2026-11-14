import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { build } from "esbuild";
import * as recovery from "../src/avatar-recovery.mjs";

// Run the real plugin entry, not only its React components. All integrations are
// synthetic; no DOM, browser profile, credentials, network or account is used.
async function subject() {
  const source = await readFile(new URL("../src/client.jsx", import.meta.url), "utf8");
  const built = await build({ stdin: { contents: source, loader: "jsx" }, format: "cjs", platform: "browser", jsx: "automatic", write: false, logLevel: "silent" });
  const element = (type, props) => ({ type, props }), exports = {};
  const context = { module: { exports }, exports, console: { log() {}, warn() {} }, require(name) {
    if (name === "react") return { useState() {}, useEffect() {}, useRef() {} };
    if (name === "react-dom") return { createPortal: (node) => node };
    if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "fragment" };
    if (name === "./avatar-recovery.mjs") return recovery;
    throw new Error("Unexpected client dependency");
  } };
  vm.runInNewContext(built.outputFiles[0].text, context, { timeout: 5000 });
  return context.module.exports;
}
function fixture() {
  const dictionaries = new Map(), slots = new Map();
  const locale = { register(namespace, values) {
    if (dictionaries.has(namespace)) throw new Error("duplicate locale");
    dictionaries.set(namespace, values);
    return () => { if (dictionaries.get(namespace) === values) dictionaries.delete(namespace); };
  }, bind: (namespace) => (key) => dictionaries.get(namespace)?.en[key] ?? key };
  function owner(failSlot = false) {
    const effects = [];
    const ctx = { locale, effect: (fn) => { const release = fn(); effects.push(release); return release; }, slots: {
      inject: (_name, fn) => ctx.effect(fn),
      register(meta, component) {
        if (failSlot) throw new Error("synthetic slot failure");
        const key = meta.name + "/" + meta.id; assert.equal(slots.has(key), false); slots.set(key, { meta, component });
        return () => slots.delete(key);
      },
    } };
    return { ctx, dispose() { for (const release of effects.splice(0).reverse()) release?.(); } };
  }
  return { owner, dictionaries, slots };
}
test("avatar client apply/dispose/remount releases locale and both slots", async () => {
  const client = await subject(), f = fixture();
  for (let i = 0; i < 3; i++) {
    const instance = f.owner(); client.apply(instance.ctx);
    assert.equal(f.dictionaries.size, 1); assert.equal(f.slots.size, 2);
    instance.dispose(); assert.equal(f.dictionaries.size, 0); assert.equal(f.slots.size, 0);
  }
});
test("partial avatar UI mount does not strand a locale registration", async () => {
  const client = await subject(), f = fixture(), broken = f.owner(true);
  assert.throws(() => client.apply(broken.ctx), /synthetic slot failure/);
  broken.dispose(); assert.equal(f.dictionaries.size, 0);
  const next = f.owner(); assert.doesNotThrow(() => client.apply(next.ctx)); next.dispose();
});
test("duplicate active locale owner remains a real error and is not deleted", async () => {
  const client = await subject(), f = fixture(), first = f.owner(), second = f.owner();
  client.apply(first.ctx); assert.throws(() => client.apply(second.ctx), /duplicate locale/);
  second.dispose(); assert.equal(f.dictionaries.size, 1); first.dispose(); assert.equal(f.dictionaries.size, 0);
});
