// DSH 0.2.2 exposes providers as one volatile form. Read effective values from
// Settings.describe, but use the public composed entry for explicit-key provenance:
// schema-generated models:[] is not the same as an explicit user-owned empty list.
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const literal = value => object(value) && !Object.hasOwn(value, "__jsExpr");
export class AccountConfigError extends Error {
  constructor() { super("Copilot model configuration is unavailable"); this.code = "ACCOUNT_PROFILE_INVALID"; }
}
const original = value => {
  const seen = new Set();
  while (value && (typeof value === "object" || typeof value === "function") && !seen.has(value)) {
    seen.add(value); const next = value[Symbol.for("cordis.original")];
    if (!next || next === value) return value;
    value = next;
  }
  return value;
};
export function readAccountConfig(settings, configEditor, expectedLlm) {
  try {
    if (typeof settings?.describe !== "function" || typeof configEditor?.entries !== "function") throw new AccountConfigError();
    const entries = configEditor.entries();
    const matchedEntries = Array.isArray(entries) ? entries.filter(entry => entry?.options?.id === "llm-pi-ai" && entry.options.name === "@deepseek-ai/dsh-llm-pi-ai") : [];
    if (matchedEntries.length !== 1) throw new AccountConfigError();
    const entry = matchedEntries[0];
    if (expectedLlm !== undefined && (!expectedLlm || typeof entry.ctx?.get !== "function"
      || original(entry.ctx.get("llm")) !== original(expectedLlm))) throw new AccountConfigError();
    const raw = entry.options.config ?? {};
    if (!literal(raw) || !literal(raw.providers ?? {})) throw new AccountConfigError();
    const source = raw.providers?.["github-copilot"] ?? {};
    if (!literal(source)) throw new AccountConfigError();
    const rows = settings.describe();
    const matches = Array.isArray(rows) ? rows.filter(row => row?.ns === "llm-pi-ai") : [];
    if (matches.length !== 1) throw new AccountConfigError();
    const row = matches[0];
    if (!Number.isSafeInteger(row.revision) || row.revision < 0 || !object(row.value) || !object(row.value.providers)) throw new AccountConfigError();
    const effective = row.value.providers["github-copilot"] ?? {};
    if (!object(effective)) throw new AccountConfigError();
    // Only explicit top-level keys are passed back to the native profile compiler;
    // it applies its own defaults. Field-level expressions use resolved values.
    const profile = {};
    for (const key of Object.keys(source)) {
      if (source[key] === undefined) continue;
      if (!Object.hasOwn(effective, key)) throw new AccountConfigError();
      Object.defineProperty(profile, key, { value: structuredClone(effective[key]), enumerable: true, writable: true, configurable: true });
    }
    return { profile, revision: row.revision };
  } catch { throw new AccountConfigError(); }
}
export async function fillMissingAccountModels(settings, ids, configEditor, expectedLlm) {
  const {profile, revision} = readAccountConfig(settings, configEditor, expectedLlm);
  if (profile.models !== undefined || profile.modelOverrides !== undefined) return false;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== "string" || !id)) return false;
  await settings.mutate("llm-pi-ai", [{ op: "set", path: ["providers", "github-copilot", "models"], value: [...new Set(ids)].map(id => ({id})) }], revision);
  return true;
}
