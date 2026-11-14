// host 半区：cordis 插件。参考 GitHub Copilot desktop 的 Accounts 设置页，
// 在内置 github-copilot OAuth 设备码流（ctx.authorization）之上提供多账号：
//   - 登录两种入口（github.com / ghe.com 企业域名），复用 llm-pi-ai 注册的
//     同一条 flow——pi-ai 登录固定写主凭据 key，ghe.com 与否只差对 Enterprise
//     提问的答复内容；
//   - 域名 + login 隔离的多账号槽位 + 单激活（槽位 payload 写主
//     key；pi-ai 请求路径只读主 key）；
//   - 用量展示（copilot_internal/user，access 过期/401 先刷新一次）。
// 登录成功/激活后把账号可用模型兜底填充为该路由的模型目录（目录保护不变）。
// 不提供模型目录手动刷新：桌面版（0.2.0-rc.1）pi-ai 目录位于只读 app.asar 内，
// 数据级目录补丁无法写入；上游新模型随 DSH 升级获得。
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { openVerificationLink, verificationLink } from "./external-link.mjs";
import { randomUUID } from "node:crypto";
import {
  ACCOUNT_SCOPE, CREDENTIAL_KEY, ROUTE_PREFIX, accountKey, apiBase, emptyState, normalizeDomain, routes,
} from "./shared.mjs";
import { isUsableAccountRecord } from "./account-adapter.mjs";
import { readAccountConfig, fillMissingAccountModels } from "./account-config.mjs";

export const name = "copilot-auth";
export const inject = ["webServer", "authorization", "credentials", "settings", "llm", "configEditor"];

// pi-ai 目录数据文件定位层：从进程入口（dsh 可执行文件）逐级向上找
// node_modules/@earendil-works/pi-ai。
function findCatalogFile() {
  try {
    let dir = dirname(realpathSync(process.argv?.[1] ?? ""));
    for (let depth = 0; depth < 8; depth++) {
      const dataFile = join(dir, "node_modules", "@earendil-works", "pi-ai", "dist", "providers", "data", "github-copilot.json");
      if (existsSync(dataFile)) return dataFile;
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  } catch { /* 安装树结构变化时回退 */ }
  return null;
}

// 读取 pi-ai 内置目录的 github-copilot 模型 id → 协议映射。只读不改。
// 定位/解析失败返回 null（调用方回退 listModels 交集，见下）。
function readCatalogModelIds() {
  try {
    const dataFile = findCatalogFile();
    if (!dataFile) return null;
    const data = JSON.parse(readFileSync(dataFile, "utf8"));
    const byId = {};
    for (const [api, section] of Object.entries(data)) {
      for (const id of Object.keys(section ?? {})) byId[id] ??= api;
    }
    return byId;
  } catch { /* 安装树结构变化时回退 */ }
  return null;
}

// Read the effective providers form through the released Settings API. Unknown
// config must block initialization/writes, never silently become an empty route.
function readConfiguredRoute(ctx) {
  if (!ctx.llm) throw new Error("Copilot model configuration is unavailable");
  return readAccountConfig(ctx.settings, ctx.configEditor, ctx.llm).profile;
}

// 登录成功/激活后，把账号可用模型写入用户 settings 的模型目录
// （turnkey；目录保护，用户反馈 2026-09-05）。可写集合取交集：
// 凭据 payload.availableModelIds（账号可用）∩ 内置目录已描述。
// 目录快照外的 id 必须排除——catalog 路由校验要求模型的 wire 协议可解析，
// 目录外 id 三者皆空会被整体拒绝；pi-ai 目录更新后它们自然进入可写集合。
// 目录保护：该路由已配置模型目录（models 键存在，含空列表）或
// modelOverrides 时视作用户所有，同步直接让路。只有目录尚不存在时才填充。
async function syncAvailableModels(ctx) {
  const record = await ctx.credentials.readRecord(CREDENTIAL_KEY);
  const available = record?.payload?.availableModelIds;
  if (!Array.isArray(available) || available.length === 0) return;
  readConfiguredRoute(ctx); // Invalid/unavailable effective config never permits a write.
  const catalog = readCatalogModelIds();
  let ids;
  if (catalog) {
    ids = available.filter((id) => catalog[id] !== undefined);
  } else {
    // 回退：listModels 反映当前已配置列表，存在「已配置→只见已配置」自锁，
    // 仅作目录定位失败时的降级。
    const served = new Set((await ctx.llm.listModels("github-copilot")).map((m) => m?.id).filter(Boolean));
    ids = available.filter((id) => served.has(id));
  }
  if (ids.length === 0) return;
  // Catalogue lookup may await: re-read the current effective form, re-check
  // user ownership, and use its revision for native compare-and-set admission.
  await fillMissingAccountModels(ctx.settings, ids, ctx.configEditor, ctx.llm);
}

function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (origin === undefined || origin === null || origin === "") return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function json(res, code, payload) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function guard(req, res, method) {
  if (!sameOrigin(req)) {
    json(res, 403, { ok: false, error: "forbidden origin" });
    return false;
  }
  if (req.method !== method) {
    json(res, 405, { ok: false, error: "method not allowed" });
    return false;
  }
  return true;
}

// 请求体：真实 webServer 走 Node 流；测试/未来宿主可能直接预挂 body 对象。
// 空 body → {}（logout 幂等依赖这一点），超 64KB 或非法 JSON 拒绝。
const BODY_LIMIT = 64 * 1024;
function readJsonBody(req) {
  if (req?.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") return Promise.resolve(req.body);
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.reject(new Error("invalid JSON body"));
    }
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// ---------- 账号槽位 ----------

// grant 记录判定：payload 是对象才算，api-key 记录不进账号体系。
const isGrant = (record) =>
  record?.kind === "grant" && record.payload !== null && typeof record.payload === "object";

// 枚举本插件 scope 下的账号槽位，读出 payload（须带 refresh token）。
async function listAccountSlots(ctx) {
  const entries = await ctx.credentials.listRecords();
  const slots = [];
  for (const entry of entries) {
    const key = typeof entry?.key === "string" ? entry.key : undefined;
    if (key === undefined || !key.startsWith(`${ACCOUNT_SCOPE}/account-`)) continue;
    const record = await ctx.credentials.readRecord(key).catch(() => undefined);
    if (isGrant(record) && typeof record.payload.refresh === "string") {
      slots.push({ key, payload: record.payload });
    }
  }
  return slots;
}

// GitHub REST /user：身份来自长期 refresh token（设备流产出），短期
// Copilot access token 对它无效。
async function fetchIdentity(domain, refreshToken) {
  const res = await fetch(`${apiBase(domain)}/user`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${refreshToken}`,
      "user-agent": "GitHubCopilotChat/0.35.0",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`identity ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (typeof data?.login !== "string" || data.login === "") {
    throw new Error("identity response missing login");
  }
  return {
    login: data.login,
    name: typeof data.name === "string" && data.name !== "" ? data.name : data.login,
    ...(typeof data.avatar_url === "string" ? { avatarUrl: data.avatar_url } : {}),
  };
}

const accountDomain = (payload) => normalizeDomain(payload.enterpriseUrl)
  ?? normalizeDomain(payload.account?.domain) ?? "github.com";
const sameGrant = (a, b) => a.refresh === b.refresh && accountDomain(a) === accountDomain(b);

// 优先使用列表返回的 opaque id；旧 login 请求仅在唯一匹配时兼容。
// 不接受任意凭据 key：id 必须命中本插件枚举出的账号槽位。
function selectSlot(slots, body) {
  if (body?.id !== undefined) {
    if (typeof body.id !== "string" || body.id === "") {
      return { error: "account id required", code: 400 };
    }
    return { specified: true, slot: slots.find((s) => s.key === body.id) };
  }
  if (typeof body?.login !== "string" || body.login === "") return { specified: false };
  const login = body.login.toLowerCase();
  const domain = body.domain === undefined ? undefined : normalizeDomain(body.domain);
  if (domain === null) return { error: "invalid account domain", code: 400 };
  const matches = slots.filter((s) =>
    (typeof s.payload.account?.login === "string"
      ? s.payload.account.login.toLowerCase() === login
      : s.key === accountKey(login))
    && (domain === undefined || accountDomain(s.payload) === domain));
  if (matches.length > 1) return { error: "ambiguous login; specify account id or domain", code: 409 };
  return { specified: true, slot: matches[0] };
}

// 先按域名 + refresh 找既有 grant；重新授权按域名 + login 复用槽位。
// 旧格式槽位保留原 key，无需破坏性迁移。身份取不到时落 recovered 占位，
// identity:false 用于登录前快照，不做网络，也不会根据未验证的身份覆盖授权。
async function ensureSlot(ctx, payload, { identity = true } = {}) {
  const domain = accountDomain(payload);
  const slots = await listAccountSlots(ctx);
  const known = slots.find((s) => sameGrant(s.payload, payload));
  if (known !== undefined) {
    let next = payload;
    if (known.payload.account !== undefined) next = { ...payload, account: known.payload.account };
    if (known.payload.account === undefined && identity) {
      const who = await fetchIdentity(domain, payload.refresh).catch(() => undefined);
      if (who !== undefined) next = { ...payload, account: { ...who, domain } };
    }
    await ctx.credentials.modifyRecord(known.key, () => ({ kind: "grant", payload: next }));
    return known.key;
  }
  let login;
  if (identity) {
    const who = await fetchIdentity(domain, payload.refresh).catch(() => undefined);
    if (who !== undefined) {
      payload = { ...payload, account: { ...who, domain } };
      login = who.login;
    }
  }
  let key;
  if (login !== undefined) {
    const existing = slots.find((s) => accountDomain(s.payload) === domain
      && typeof s.payload.account?.login === "string"
      && s.payload.account.login.toLowerCase() === login.toLowerCase());
    if (existing !== undefined) {
      key = existing.key;
    } else {
      const base = accountKey(login, domain);
      key = base;
      // 旧 login 可恰好长得像 v2 编码；不能覆盖任何已占用 key。
      let n = 1;
      while (await ctx.credentials.readRecord(key) !== undefined) key = `${base}-${n++}`;
    }
  } else {
    const taken = new Set(slots.map((s) => s.key));
    let n = 1;
    while (taken.has(accountKey(`recovered-${n}`))) n++;
    key = accountKey(`recovered-${n}`);
  }
  await ctx.credentials.modifyRecord(key, () => ({ kind: "grant", payload }));
  return key;
}

// ---------- 用量（copilot_internal/user） ----------

// Copilot 客户端头：copilot_internal 端点按这些头识别客户端（对齐 pi-ai）。
const COPILOT_HEADERS = {
  "User-Agent": "GitHubCopilotChat/0.35.0",
  "Editor-Version": "vscode/1.107.0",
  "Editor-Plugin-Version": "copilot-chat/0.35.0",
  "Copilot-Integration-Id": "vscode-chat",
};
const USAGE_TTL_MS = 5 * 60 * 1000;

// 刷新短期 Copilot token（与 pi-ai refreshGitHubCopilotAccessToken 同一端点
// 同一换算），并回写主 key + 对应槽位的 access/expires。refresh token 本身不变。
// 为什么需要插件主动刷新：GitHub copilot_internal/v2/token 返回的 expires_at
// 是较长的有效期（8h+），但 access token 实际远早于此失效（实测 RefreshIn≈1500s）。
// pi-ai 按 expires_at 判断不刷新，导致显示还有效但请求 401。插件按 refresh_in
// 主动刷新，保证 access 始终新鲜。
async function persistRefresh(ctx, key, payload, domain) {
  const res = await fetch(`${apiBase(domain)}/copilot_internal/v2/token`, {
    headers: { accept: "application/json", authorization: `Bearer ${payload.refresh}`, ...COPILOT_HEADERS },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token refresh ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (typeof data?.token !== "string" || typeof data?.expires_at !== "number") {
    throw new Error("invalid token refresh response");
  }
  const access = data.token;
  const expires = data.expires_at * 1000 - 5 * 60 * 1000;
  // refresh_in 秒：GitHub 推荐的下次刷新间隔；缺省回退 25 分钟。
  const refreshIn = typeof data?.refresh_in === "number" ? data.refresh_in : 1500;
  // 回写主 key
  await ctx.credentials.modifyRecord(key, (current) =>
    isGrant(current) && sameGrant(current.payload, payload)
      ? { kind: "grant", payload: { ...current.payload, access, expires } }
      : undefined);
  // 同步回写槽位（按 refresh token 匹配），避免切换账号时把旧 access 写回主 key。
  try {
    const slots = await listAccountSlots(ctx);
    const slot = slots.find((s) => sameGrant(s.payload, payload));
    if (slot) {
      await ctx.credentials.modifyRecord(slot.key, (current) =>
        isGrant(current) && sameGrant(current.payload, payload)
          ? { kind: "grant", payload: { ...current.payload, access, expires } }
          : undefined);
    }
  } catch { /* 槽位回写失败不影响主 key 已生效 */ }
  return { access, expires, refreshIn };
}

const PLAN_LABELS = {
  enterprise: "Copilot Enterprise",
  business: "Copilot Business",
  team: "Copilot Business",
  pro: "Copilot Pro",
  pro_plus: "Copilot Pro+",
  individual: "Copilot Pro",
  free: "Copilot Free",
};

// 防御式映射：缺字段就让 UI 隐藏对应元素，绝不因响应形状抛错。
// copilot_internal/user 响应结构（实测）：
//   copilot_plan: "enterprise" | "business" | "pro" | ...
//   quota_reset_date: "2026-10-01"
//   quota_snapshots.premium_interactions:
//     percent_remaining: 64.0   // 剩余百分比（非 percent_used）
//     entitlement: 40000        // 总量
//     remaining: 25608          // 剩余量
//     unlimited: false
function summarizeUsage(data) {
  const planRaw = typeof data?.copilot_plan === "string" ? data.copilot_plan.toLowerCase() : undefined;
  const plan = planRaw === undefined ? undefined : PLAN_LABELS[planRaw] ?? planRaw;
  const snap = data?.quota_snapshots?.premium_interactions;
  const resets = typeof data?.quota_reset_date === "string" ? data.quota_reset_date : undefined;
  if (snap === null || typeof snap !== "object") return { plan, usage: { resets } };
  const percentRemaining = typeof snap.percent_remaining === "number" ? snap.percent_remaining : undefined;
  return {
    plan,
    usage: {
      percentUsed: percentRemaining !== undefined ? 100 - percentRemaining : undefined,
      entitlement: typeof snap.entitlement === "number" ? snap.entitlement : undefined,
      remaining: typeof snap.remaining === "number" ? snap.remaining : undefined,
      unlimited: snap.unlimited === true,
      resets,
    },
  };
}

// copilot_internal/user 用 GitHub 长期 refresh token（ghu_...）认证，
// 非短期 Copilot access token。实测：access token 返回 401 Bad credentials，
// refresh token 直接 200。无需先刷新 access token。
function fetchUsageEndpoint(domain, refreshToken) {
  return fetch(`${apiBase(domain)}/copilot_internal/user`, {
    headers: { accept: "application/json", authorization: `Bearer ${refreshToken}`, ...COPILOT_HEADERS },
    signal: AbortSignal.timeout(10_000),
  });
}

// 单账号用量：直接用 refresh token 调 copilot_internal/user；失败降级为
// error 字段，绝不拖垮整个列表。成功结果按槽位 key 缓存 5 分钟。
async function loadUsage(ctx, slot, domain) {
  try {
    const refresh = slot.payload.refresh;
    if (typeof refresh !== "string") throw new Error("no refresh token");
    const res = await fetchUsageEndpoint(domain, refresh);
    if (!res.ok) throw new Error(`usage ${res.status} ${res.statusText}`);
    return summarizeUsage(await res.json());
  } catch (err) {
    return { error: "usage is unavailable" };
  }
}

// ---------- 插件主体 ----------

// DSH 0.2.2's launcher owns outbound HTTP/proxy policy before plugins load.
// Ordinary fetch (including native pi-ai SDK calls) uses that policy. Never
// replace global fetch/dispatcher or print proxy URL values from this plugin.
export function apply(ctx) {
  const r = routes();
  // Route registration is owned by this plugin lifecycle, so HMR/reinstall
  // never leaves duplicate exact routes in a running Host.
  const register = (route) => ctx.effect(() => ctx.webServer.register(route), "copilot-auth route");
  let attempt = emptyState();
  let lastSyncError;
  let sessionFeature, hostDisposed = false, signInPending = false;
  let globalAccountMutations = Promise.resolve();
  const serializeGlobalAccountMutation = (operation) => {
    const result = globalAccountMutations.then(operation);
    globalAccountMutations = result.catch(() => {});
    return result;
  };
  const removedSessionAccounts = new Set(), reactivatedSessionAccounts = new Set();
  const notifySessionFeature = (operation, id) => {
    if (operation === "remove") { removedSessionAccounts.add(id); reactivatedSessionAccounts.delete(id); }
    if (operation === "reactivate") { removedSessionAccounts.delete(id); reactivatedSessionAccounts.add(id); }
    if (hostDisposed || !sessionFeature) return;
    try { return Promise.resolve(sessionFeature[operation]?.(id)).catch(() => ctx.logger?.warn?.("copilot-auth: Session account routes need reconciliation")); }
    catch { ctx.logger?.warn?.("copilot-auth: Session account routes need reconciliation"); }
  };
  // 资料缓存时间是刷新策略，不是对 GHE 头像 URL 签名有效期的假设。
  const PROFILE_TTL_MS = 5 * 60 * 1000;
  const PROFILE_FAILURE_TTL_MS = 60 * 1000;
  const PROFILE_RETRY_COOLDOWN_MS = 30 * 1000;
  const profileCache = new Map(); // 槽位 key → grant 绑定的尝试/并发状态
  const slotProfile = async (slot, { force = false } = {}) => {
    const cached = profileCache.get(slot.key);
    if (cached !== undefined && sameGrant(cached.grant, slot.payload)) {
      if (cached.pending !== undefined) return cached.pending;
      const ttl = force ? PROFILE_RETRY_COOLDOWN_MS
        : cached.ok ? PROFILE_TTL_MS : PROFILE_FAILURE_TTL_MS;
      if (Date.now() - cached.at < ttl) return { slot, error: cached.error, code: cached.code };
    }
    const entry = { grant: slot.payload, at: Date.now(), ok: false };
    profileCache.set(slot.key, entry);
    entry.pending = (async () => {
      try {
        const domain = accountDomain(slot.payload);
        const who = await fetchIdentity(domain, slot.payload.refresh);
        let next;
        // 只修改 account 元数据，不触碰授权字段；迟到请求不能重建已删槽位，
        // 或覆盖重新授权后的身份/头像。旧格式与 recovered 槽位 id 保持不变。
        await ctx.credentials.modifyRecord(slot.key, (current) => {
          if (profileCache.get(slot.key) !== entry
            || !isGrant(current) || !sameGrant(current.payload, slot.payload)) return undefined;
          const account = { ...current.payload.account, ...who, domain };
          if (who.avatarUrl === undefined) delete account.avatarUrl;
          const payload = { ...current.payload, account };
          next = { key: slot.key, payload };
          return { kind: "grant", payload };
        });
        if (next === undefined) {
          entry.error = "account changed during profile refresh";
          entry.code = 409;
          return { slot, error: entry.error, code: entry.code };
        }
        entry.ok = true;
        return { slot: next };
      } catch {
        // 不透传网络异常/URL，更不暴露凭据。失败保留旧资料及登录状态。
        entry.error = "profile refresh failed";
        entry.code = 502;
        return { slot, error: entry.error, code: entry.code };
      } finally {
        entry.at = Date.now();
        entry.pending = undefined;
      }
    })();
    return entry.pending;
  };
  const usageCache = new Map(); // 槽位 key → { at, grant, value }
  const slotUsage = async (slot) => {
    const cached = usageCache.get(slot.key);
    if (cached !== undefined && sameGrant(cached.grant, slot.payload)
      && Date.now() - cached.at < USAGE_TTL_MS) return cached.value;
    const value = await loadUsage(ctx, slot, accountDomain(slot.payload));
    // 缓存绑定 grant：旧请求晚到也不能让重新授权后的账号复用旧用量。
    usageCache.set(slot.key, { at: Date.now(), value,
      grant: { refresh: slot.payload.refresh, enterpriseUrl: accountDomain(slot.payload) } });
    return value;
  };

  // 模型目录同步只在登录成功/激活后执行（对齐 2026-09-05 结论：挂载不同步）。
  // 失败不静默：错误经 /accounts 的 syncError 字段暴露，便于诊断。
  const sync = () => syncAvailableModels(ctx).then(() => { lastSyncError = undefined; }).catch((err) => {
    lastSyncError = "model catalog sync failed";
    ctx.logger?.warn?.("copilot-auth: model sync failed: %s", lastSyncError);
  });

  // 登录成功收尾：主 key 已被 flow 写入新授权 → 建槽（含身份）→ 兜底目录。
  // 槽位写失败只记日志，登录本身照常报告成功。
  const finishLogin = async () => {
    try {
      const record = await ctx.credentials.readRecord(CREDENTIAL_KEY);
      if (isGrant(record) && typeof record.payload.refresh === "string") {
        const key = await ensureSlot(ctx, record.payload);
        usageCache.delete(key); // 重新授权后不沿用旧 grant 的套餐/用量缓存。
        profileCache.delete(key); // 同 grant 重新登录也应重新获取资料/头像 URL。
        await ctx.credentials.modifyRecord(CREDENTIAL_KEY, (current) =>
          isGrant(current) && sameGrant(current.payload, record.payload)
            ? { kind: "grant", payload: { ...current.payload, copilotDefaultEpoch: randomUUID() } } : undefined);
        await notifySessionFeature("reactivate", key);
      }
    } catch (err) {
      ctx.logger?.warn?.("copilot-auth: account slot persist failed");
    }
    void sync();
    // 新登录拿到 fresh token，重置刷新计时器。
    scheduleRefresh(25 * 60 * 1000);
  };

  // 主动刷新当前激活账号的 access token。
  // pi-ai 仅在 expires 到期时刷新，但 GitHub 的 expires_at 偏长、access 实际早失效。
  // 这里按 refresh_in（默认 25min）周期刷新，保证 pi-ai 读到的 access 始终有效。
  let refreshTimer = null;
  // Own cleanup BEFORE creating a timer or the first route. A later route
  // collision/initialization error must not leave a refresh task alive.
  ctx.effect(() => () => {
    hostDisposed = true;
    if (refreshTimer) clearTimeout(refreshTimer);
    profileCache.clear(); usageCache.clear();
    let cleanup;
    try { cleanup = sessionFeature?.dispose?.(); } catch { /* scoped feature revokes first */ }
    if (signInPending) { try { ctx.authorization?.cancel?.(CREDENTIAL_KEY); } catch { /* native cleanup owns commit */ } }
    return Promise.resolve(cleanup).catch(() => {});
  }, "copilot-auth lifecycle");
  // 统一排下一次刷新。unref() 让定时器不保活事件循环——node --test / CLI
  // 场景进程跑完即退；DSH 宿主常驻且有其他句柄，定时器照常触发。
  const scheduleRefresh = (delayMs) => {
    if (hostDisposed) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshActive, delayMs);
    refreshTimer.unref?.();
  };
  const refreshActive = async () => {
    try {
      const main = await ctx.credentials.readRecord(CREDENTIAL_KEY);
      if (!isGrant(main) || typeof main.payload.refresh !== "string") return;
      const domain = accountDomain(main.payload);
      const { refreshIn } = await persistRefresh(ctx, CREDENTIAL_KEY, main.payload, domain);
      // 按 GitHub 推荐间隔排下次刷新；最少 5 分钟，最多 60 分钟。
      const nextMs = Math.min(60 * 60 * 1000, Math.max(5 * 60 * 1000, refreshIn * 1000));
      ctx.logger?.info?.("copilot-auth: access token refreshed, next in %ds", Math.round(nextMs / 1000));
      scheduleRefresh(nextMs);
    } catch (err) {
      ctx.logger?.warn?.("copilot-auth: token refresh failed, retry in 5min");
      scheduleRefresh(5 * 60 * 1000);
    }
  };
  // 启动延迟刷新（登录时 pi-ai 已拿到 fresh token，不必立刻刷）。
  scheduleRefresh(25 * 60 * 1000);

  register({
    kind: "exact",
    path: r.start,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      if (attempt.status === "running" || signInPending) {
        json(res, 409, { ok: false, error: "already running" });
        return;
      }
      let body;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        json(res, 400, { ok: false, error: "invalid body" });
        return;
      }
      const kind = body?.kind;
      if (kind !== "github.com" && kind !== "ghe.com") {
        json(res, 400, { ok: false, error: 'kind must be "github.com" or "ghe.com"' });
        return;
      }
      let domain;
      if (kind === "ghe.com") {
        domain = normalizeDomain(body.domain);
        if (domain === null || !domain.endsWith(".ghe.com") || !domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
          json(res, 400, { ok: false, error: 'ghe.com sign-in needs a domain like "company.ghe.com"' });
          return;
        }
      }
      attempt = emptyState();
      attempt.status = "running";
      attempt.kind = kind;
      attempt.domain = domain;
      // flow 写主 key 前先快照：既有凭据若无槽位（v0.1.0 升级场景）先落袋，
      // 否则新登录会把它覆盖丢失。identity:false——快照只保 payload 不做网络。
      try {
        await serializeGlobalAccountMutation(async () => {
          const main = await ctx.credentials.readRecord(CREDENTIAL_KEY);
          if (isGrant(main) && typeof main.payload.refresh === "string") await ensureSlot(ctx, main.payload, { identity: false });
        });
      } catch {
        ctx.logger?.warn?.("copilot-auth: pre-login snapshot failed");
      }
      const myAttempt = attempt;
      const interaction = {
        notify: (notice) => {
          myAttempt.notices.push(notice);
          // 防呆：ghe.com 登录的首个链接必须指向企业域名——设备码端点随域名
          // 切换（pi-ai getUrls），host 不符说明域名答复未生效。无法中止已
          // 起的 flow，就地置败并向用户解释。
          if (myAttempt.kind === "ghe.com" && !myAttempt.verified && notice && typeof notice.url === "string") {
            myAttempt.verified = true;
            try {
              const host = new URL(notice.url).host;
              if (host !== myAttempt.domain) {
                myAttempt.status = "failed";
                myAttempt.error = `企业域名未生效：设备码链接指向 ${host}，请重新登录并检查域名`;
                try { ctx.authorization?.cancel?.(CREDENTIAL_KEY); } catch { /* abort wrong-domain flow if supported */ }
              }
            } catch { /* 非法 URL 交由后续流程自证 */ }
          }
        },
        prompt: (p) => {
          // pi-ai 登录固定先问企业域名：ghe.com 答域名，github.com 答空串；
          // 其余任何 prompt 都是未预期的，拒绝并使 attempt 失败。
          if (p && typeof p.message === "string" && p.message.includes("Enterprise")) {
            return Promise.resolve(myAttempt.kind === "ghe.com" ? myAttempt.domain : "");
          }
          return Promise.reject(Object.assign(new Error("unexpected prompt"), { code: "COPILOT_UNEXPECTED_PROMPT" }));
        },
      };
      // 响应先行：begin 以后台任务执行，handler 返回路径不得 await begin。
      signInPending = true;
      void Promise.resolve()
        .then(() => ctx.authorization.begin({ key: CREDENTIAL_KEY, method: "oauth", interaction }))
        .then(async (outcome) => {
          if (myAttempt.status !== "running") return; // 防呆已置败
          // AuthorizationOutcome.status: 'authorized' | 'cancelled'（types.d.ts L68-71）
          if (outcome && outcome.status === "authorized") {
            await finishLogin();
            myAttempt.status = "authorized";
          } else {
            myAttempt.status = "failed";
            myAttempt.error = "登录已取消";
          }
        })
        .catch((err) => {
          if (myAttempt.status !== "running") return;
          myAttempt.status = "failed";
          myAttempt.error = err?.code === "COPILOT_UNEXPECTED_PROMPT" ? "unexpected prompt" : "登录失败，请重新授权";
        })
        .finally(() => { signInPending = false; });
      json(res, 202, { ok: true });
    },
  });

  register({
    kind: "exact",
    path: r.state,
    handler: (req, res) => {
      if (!guard(req, res, "GET")) return;
      json(res, 200, attempt);
    },
  });

  const collectAccounts = async () => {
      // v0.1.0 升级遗留：主 key 有凭据但无槽位 → 先补建（含身份回填），
      // 让列表视图统一。写失败（只读库等）按空列表继续。
      try {
        const main = await ctx.credentials.readRecord(CREDENTIAL_KEY);
        if (isGrant(main) && typeof main.payload.refresh === "string") {
          const slots = await listAccountSlots(ctx);
          if (!slots.some((s) => sameGrant(s.payload, main.payload))) {
            await ensureSlot(ctx, main.payload);
          }
        }
      } catch (err) {
        ctx.logger?.warn?.("copilot-auth: legacy slot migration failed");
      }
      let slots = [];
      let mainPayload;
      try {
        slots = await listAccountSlots(ctx);
        const main = await ctx.credentials.readRecord(CREDENTIAL_KEY);
        mainPayload = isGrant(main) ? main.payload : undefined;
      } catch {
        slots = [];
        mainPayload = undefined;
      }
      const accounts = await Promise.all(slots.map(async (slot) => {
        const [profile, usage] = await Promise.all([slotProfile(slot), slotUsage(slot)]);
        const meta = profile.slot.payload.account !== null && typeof profile.slot.payload.account === "object"
          ? profile.slot.payload.account
          : {};
        return {
          id: slot.key,
          login: typeof meta.login === "string" ? meta.login : undefined,
          name: typeof meta.name === "string" ? meta.name : undefined,
          avatarUrl: typeof meta.avatarUrl === "string" ? meta.avatarUrl : undefined,
          domain: accountDomain(slot.payload),
          active: mainPayload !== undefined && sameGrant(slot.payload, mainPayload),
          plan: usage.plan,
          usage: usage.error === undefined ? usage.usage : undefined,
          usageError: usage.error,
        };
      }));
      // 激活的排最前，其余按 login 稳定排序。
      accounts.sort((a, b) =>
        Number(b.active) - Number(a.active) || String(a.login ?? "").localeCompare(String(b.login ?? ""))
        || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));
      return { accounts, signingIn: attempt.status === "running", syncError: lastSyncError };
  };
  register({
    kind: "exact",
    path: r.accounts,
    handler: async (req, res) => {
      if (!guard(req, res, "GET")) return;
      json(res, 200, await collectAccounts());
      notifySessionFeature("reconcile");
    },
  });

  const accountActionError = (message, code, status) => Object.assign(new Error(message), { code, status });
  const refreshProfileById = async (id) => {
    const { slot } = selectSlot(await listAccountSlots(ctx), { id });
    if (!slot) throw accountActionError("no such account", "ACCOUNT_UNAVAILABLE", 404);
    const result = await slotProfile(slot, { force: true });
    if (result.error !== undefined) throw accountActionError(result.error, "ACCOUNT_PROFILE_FAILED", result.code);
    const avatarUrl = result.slot.payload.account?.avatarUrl;
    return { ok: true, ...(typeof avatarUrl === "string" ? { avatarUrl } : {}) };
  };
  const setDefaultAccountById = (id) => serializeGlobalAccountMutation(async () => {
    if (attempt.status === "running" || signInPending) throw accountActionError("finish or cancel sign-in first", "SIGN_IN_PROGRESS", 409);
    const { slot } = selectSlot(await listAccountSlots(ctx), { id });
    if (!slot || !isUsableAccountRecord({ kind: "grant", payload: slot.payload })) throw accountActionError("no such account", "ACCOUNT_UNAVAILABLE", 404);
    if (removedSessionAccounts.has(id)) throw accountActionError("account was removed", "ACCOUNT_UNAVAILABLE", 404);
    try {
      await ctx.credentials.modifyRecord(CREDENTIAL_KEY, async () => {
        // Recheck under the credential writer lock. A stale selection must not
        // resurrect a removed/reauthorized account as the shared default.
        const live = await ctx.credentials.readRecord(id);
        if (removedSessionAccounts.has(id) || !isUsableAccountRecord(live) || !sameGrant(live.payload, slot.payload)) {
          throw accountActionError("account changed", "ACCOUNT_UNAVAILABLE", 409);
        }
        return { kind: "grant", payload: { ...live.payload, copilotDefaultEpoch: randomUUID() } };
      });
    } catch (error) {
      if (error?.code === "ACCOUNT_UNAVAILABLE") throw error;
      throw accountActionError("default account update failed", "DEFAULT_ACCOUNT_FAILED", 500);
    }
    void refreshActive();
    void sync();
    return { ok: true, defaultAccountId: id };
  });

  // 图片加载失败时按 id 请求一次新资料；没有 URL 参数，不能变成头像/认证代理。
  register({
    kind: "exact",
    path: r.profile,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        json(res, 400, { ok: false, error: "invalid JSON body" });
        return;
      }
      if (typeof body?.id !== "string" || body.id === "") {
        json(res, 400, { ok: false, error: "account id required" });
        return;
      }
      try {
        json(res, 200, await refreshProfileById(body.id));
        notifySessionFeature("reconcile");
      } catch (error) {
        json(res, Number.isInteger(error?.status) ? error.status : 500, { ok: false, error: error?.code === "ACCOUNT_UNAVAILABLE" ? "no such account" : "profile refresh failed" });
      }
    },
  });

  register({
    kind: "exact",
    path: r.activate,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      let body;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        json(res, 400, { ok: false, error: "invalid body" });
        return;
      }
      let selection;
      try {
        selection = selectSlot(await listAccountSlots(ctx), body);
      } catch (err) {
        json(res, 500, { ok: false, error: "account operation failed" });
        return;
      }
      if (selection.error || !selection.specified) {
        json(res, selection.code ?? 400, { ok: false, error: selection.error ?? "account id or login required" });
        return;
      }
      const slot = selection.slot;
      if (slot === undefined) {
        json(res, 404, { ok: false, error: "no such account" });
        return;
      }
      try {
        await setDefaultAccountById(slot.key);
        notifySessionFeature("reconcile");
        json(res, 200, { ok: true });
      } catch (error) {
        json(res, Number.isInteger(error?.status) ? error.status : 500, { ok: false, error: "default account update failed" });
      }
    },
  });

  register({
    kind: "exact",
    path: r.logout,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      // body 可空（旧语义兼容）；非法 body 不拒绝——注销尽力而为。
      let body = {};
      try {
        body = (await readJsonBody(req)) ?? {};
      } catch {
        body = {};
      }
      return serializeGlobalAccountMutation(async () => {
      if (attempt.status === "running" || signInPending) {
        json(res, 409, { ok: false, error: "finish or cancel sign-in first" });
        return;
      }
      try {
        const main = await ctx.credentials.readRecord(CREDENTIAL_KEY).catch(() => undefined);
        const mainPayload = isGrant(main) ? main.payload : undefined;
        const slots = await listAccountSlots(ctx);
        const selection = selectSlot(slots, body);
        if (selection.error) {
          json(res, selection.code, { ok: false, error: selection.error });
          return;
        }
        let slotKey;
        if (selection.specified) {
          // 指名注销但无此账号：幂等 no-op，绝不落入 legacy 分支删主 key。
          if (selection.slot === undefined) {
            json(res, 200, { ok: true });
            return;
          }
          slotKey = selection.slot.key;
        } else if (mainPayload !== undefined) {
          slotKey = slots.find((s) => sameGrant(s.payload, mainPayload))?.key;
        }
        if (slotKey !== undefined) {
          notifySessionFeature("remove", slotKey);
          const hit = slots.find((s) => s.key === slotKey);
          if (hit !== undefined && mainPayload !== undefined && sameGrant(hit.payload, mainPayload)) {
            // 注销的是激活账号：主 key 一并清除，Models 页该路由回到未配置。
            await ctx.credentials.deleteRecord(CREDENTIAL_KEY);
          }
          await ctx.credentials.deleteRecord(slotKey);
          usageCache.delete(slotKey);
          profileCache.delete(slotKey);
        } else if (mainPayload !== undefined) {
          // v0.1.0 升级前遗留主凭据且无槽位：直接清主 key。
          await ctx.credentials.deleteRecord(CREDENTIAL_KEY);
        }
        json(res, 200, { ok: true });
      } catch (err) {
        json(res, 500, { ok: false, error: "account removal failed" });
      }
      });
    },
  });

  // 取消正在进行的登录：重置 attempt + 通知 authorization 服务取消。
  // ctx.authorization.cancel(key) 会 abort 内部 AbortController，
  // 使 begin() 的 attempt() resolve 为 cancelled，finally 删除 running 条目，
  // 下次 begin() 不再报 ALREADY_IN_FLIGHT。
  register({
    kind: "exact",
    path: r.cancel,
    handler: (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        ctx.authorization?.cancel?.(CREDENTIAL_KEY);
      } catch { /* 无 running attempt 时 no-op */ }
      attempt = emptyState();
      json(res, 200, { ok: true });
    },
  });

  // OAuth verification link only: validated URL + argv-only OS opener.
  // No shell interpolation, arbitrary destination or diagnostic URL echo.
  register({
    kind: "exact",
    path: r.open,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      let url;
      try { url = verificationLink((await readJsonBody(req))?.url); }
      catch { json(res, 400, { ok: false, error: "invalid verification URL" }); return; }
      try { await openVerificationLink(url); json(res, 200, { ok: true }); }
      catch { json(res, 500, { ok: false, error: "verification link could not be opened" }); }
    },
  });

  // 工作区徽标查询：返回当前激活账号的身份 + token 过期时间。
  // pi-ai OAuthCredentials.expires 可能是毫秒或秒（不同版本），用启发式判断。
  // login/avatarUrl 不在 OAuth payload 里——它们存在插件槽位记录的
  // account.meta 中，whoami 交叉引用槽位补齐身份。
  register({
    kind: "exact",
    path: r.whoami,
    handler: async (req, res) => {
      if (!guard(req, res, "GET")) return;
      try {
        const record = await ctx.credentials.readRecord(CREDENTIAL_KEY);
        if (!record?.payload) {
          json(res, 200, { configured: false });
          return;
        }
        const p = record.payload;
        // 启发式：> 1e12 视为毫秒，统一转秒
        const nowSec = Math.floor(Date.now() / 1000);
        let expires = typeof p.expires === "number" ? p.expires : null;
        if (expires !== null && expires > 1e12) expires = Math.floor(expires / 1000);
        const remaining = expires !== null ? Math.max(0, expires - nowSec) : null;

        // 交叉引用槽位：用 refresh token 匹配激活账号，取其 meta 中的身份
        // + 用量。cache miss 或过期时主动调 loadUsage 一次（5 分钟内不重试，
        // 失败也写 cache 避免频繁打网络）。summarizeUsage 返回
        // { plan, usage: { percentUsed, resets, ... } } 或 { error }。
        let id = null, login = null, avatarUrl = null;
        let plan = null, usagePercent = null, usageResetDate = null;
        try {
          const slots = await listAccountSlots(ctx);
          const match = slots.find((s) => sameGrant(s.payload, p));
          if (match) {
            id = match.key;
            const [profile, u] = await Promise.all([slotProfile(match), slotUsage(match)]);
            const meta = profile.slot.payload.account
              && typeof profile.slot.payload.account === "object"
              ? profile.slot.payload.account : {};
            login = typeof meta.login === "string" ? meta.login : null;
            avatarUrl = typeof meta.avatarUrl === "string" ? meta.avatarUrl : null;
            if (u && u.error === undefined) {
              plan = u.plan ?? null;
              const usage = u.usage;
              if (usage && typeof usage.percentUsed === "number") {
                // 取整避免浮点误差（上游 69.200000...% 直接透传会显示长串小数）。
                usagePercent = Math.round(usage.percentUsed);
              }
              if (usage && typeof usage.resets === "string") {
                usageResetDate = usage.resets;
              }
            }
          }
        } catch { /* 槽位读取失败不影响 token 显示 */ }

        json(res, 200, {
          configured: true,
          id,
          login,
          avatarUrl,
          plan,
          expires,
          remaining,
          usagePercent,
          usageResetDate,
        });
      } catch {
        json(res, 200, { configured: false });
      }
    },
  });

  // 手动刷新 access token：用于 token 实际已失效但 expires 未到期时强制刷新。
  register({
    kind: "exact",
    path: r.refresh,
    handler: async (req, res) => {
      if (!guard(req, res, "POST")) return;
      try {
        await refreshActive();
        json(res, 200, { ok: true });
      } catch (err) {
        json(res, 500, { ok: false, error: "account operation failed" });
      }
    },
  });

  // DEBUG 路由：诊断代理/网络状态
  register({
    kind: "exact",
    path: `${ROUTE_PREFIX}/debug`,
    handler: async (req, res) => {
      if (!guard(req, res, "GET")) return;
      json(res, 200, { proxyPolicy: "host-managed",
        sessionFeature: sessionFeature?.status ?? { phase: "unavailable", errorCode: "POLICY_UNAVAILABLE" } });
    },
  });

  // Existing global/settings endpoints remain usable without optional Session
  // services. The feature mounts only in the Host that owns the requested Session.
  if (typeof ctx.inject === "function") ctx.inject(["loader", "sessionController", "copilotDefaultModelPolicy", "remoteAccess", "sessions", "agents", "sessionProjections", "sessionQuery"], async (child) => {
    let childClosed = false, feature;
    child.effect(() => () => {
      childClosed = true;
      if (sessionFeature === feature) sessionFeature = undefined;
      try { return Promise.resolve(feature?.dispose?.()).catch(() => {}); } catch { /* dependency removal must fail closed */ }
    }, "copilot-auth Session feature ownership");
    try {
      const { createSessionAccountFeature } = await import("./session-feature.mjs");
      if (childClosed || hostDisposed) return;
      feature = await createSessionAccountFeature(child, {
        listSlots: async () => (await listAccountSlots(ctx)).filter((slot) => !removedSessionAccounts.has(slot.key)),
        collectAccounts, refreshProfileById, setDefaultAccountById,
        getProfile: () => readConfiguredRoute(ctx),
      });
      if (childClosed || hostDisposed) { feature.dispose(); return; }
      sessionFeature = feature;
      for (const id of removedSessionAccounts) feature.remove(id);
      for (const id of reactivatedSessionAccounts) await feature.reactivate(id);
      if (!childClosed && !hostDisposed) await feature.reconcile();
    } catch {
      ctx.logger?.warn?.("copilot-auth: Session account feature is unavailable; global account management remains available");
    }
  });
}

export default { name, inject, apply };
