import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { build } from "esbuild";

// Exercise production apply(), not just rendered components. No browser, Host,
// network or app bootstrap. Locale ownership follows the public disposer contract.
async function subject(initialState = []) {
  const source = await readFile(new URL("../src/client.jsx", import.meta.url), "utf8");
  const built = await build({ stdin: { contents: source + "\nexport { CopilotBadge as testBadge };", loader: "jsx" },
    format: "cjs", platform: "browser", jsx: "automatic", write: false, logLevel: "silent" });
  const element = (type, props) => ({ type, props });
  const exports = {};
  const context = { module: { exports }, exports, console: { log() {}, warn() {} },
    require(name) {
      if (name === "react") return { useState: () => [initialState.shift(), () => {}], useEffect() {}, useRef: () => ({ current: null }) };
      if (name === "react-dom") return { createPortal: (node) => node };
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "fragment" };
      throw new Error("Unexpected client import: " + name);
    } };
  vm.runInNewContext(built.outputFiles[0].text, context, { timeout: 5000 });
  return context.module.exports;
}
function fixture() {
  const dictionaries = new Map(), slots = new Map();
  const locale = {
    register(namespace, values) {
      if (dictionaries.has(namespace)) throw new Error("duplicate locale");
      dictionaries.set(namespace, values);
      return () => { if (dictionaries.get(namespace) === values) dictionaries.delete(namespace); };
    },
    bind: (namespace) => (key) => dictionaries.get(namespace)?.en[key] ?? key,
  };
  function owner(failSlot = false) {
    const effects = [];
    const ctx = { locale, effect: (fn) => { const release = fn(); effects.push(release); return release; },
      slots: {
        inject: (_name, fn) => ctx.effect(fn),
        register(meta, component) {
          if (failSlot) throw new Error("synthetic slot failure");
          const key = meta.name + "/" + meta.id;
          assert.equal(slots.has(key), false); slots.set(key, { meta, component });
          return () => slots.delete(key);
        },
      } };
    return { ctx, dispose() { for (const release of effects.splice(0).reverse()) release?.(); } };
  }
  return { owner, locale, dictionaries, slots };
}
test("client apply/dispose/remount releases locale and both public slot registrations", async () => {
  const client = await subject(), f = fixture();
  for (let i = 0; i < 3; i++) {
    const instance = f.owner(); client.apply(instance.ctx);
    assert.equal(f.dictionaries.size, 1); assert.equal(f.slots.size, 2);
    instance.dispose(); assert.equal(f.dictionaries.size, 0); assert.equal(f.slots.size, 0);
  }
});
test("partial client startup failure releases its locale on owner disposal", async () => {
  const client = await subject(), f = fixture(), broken = f.owner(true);
  assert.throws(() => client.apply(broken.ctx), /synthetic slot failure/);
  broken.dispose(); assert.equal(f.dictionaries.size, 0);
  const next = f.owner(); assert.doesNotThrow(() => client.apply(next.ctx)); next.dispose();
});
test("another live locale owner is not swallowed or deleted on failed registration", async () => {
  const client = await subject(), f = fixture(), first = f.owner(), duplicate = f.owner();
  client.apply(first.ctx); assert.throws(() => client.apply(duplicate.ctx), /duplicate locale/);
  duplicate.dispose(); assert.equal(f.dictionaries.size, 1); assert.equal(f.slots.size, 2);
  first.dispose(); assert.equal(f.dictionaries.size, 0);
});
test("legacy dock visibly labels global quota instead of presenting it as Session-bound", async () => {
  const client = await subject([{ configured: true, login: "fixture", usagePercent: 25 }, [], false, null]);
  const tree = client.testBadge({ t: (key) => ({ badgeGlobalDefault: "GLOBAL_DEFAULT", badgeGlobalHint: "GLOBAL_ONLY_NOT_SESSION" }[key] ?? key) });
  const text = JSON.stringify(tree);
  assert.ok(text.includes("GLOBAL_DEFAULT")); assert.ok(text.includes("GLOBAL_ONLY_NOT_SESSION"));
});
