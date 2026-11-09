// 两半区共享的 HTTP API 契约。路由前缀固定、不做配置项：
// client 侧 fetch 硬编码同一路径，配置一旦漂移 client 即 404（见计划附录 B）。
// 多账号模型（参考 GitHub Copilot desktop Accounts 页）：
//   - 主凭据 llm-pi-ai/github-copilot 恒等于「当前激活账号」的 grant 镜像，
//     pi-ai 的请求路径只读它（llm-pi-ai/adapter 的 credentialStore 按
//     providerId 寻址），登录也只写它。
//   - 其余账号由本插件以自有 scope 存域名 + login 隔离的槽位记录，
//     payload = pi-ai grant + account 元数据；「激活」= 槽位 payload 写主 key。
export const CREDENTIAL_KEY = "llm-pi-ai/github-copilot";
export const ACCOUNT_SCOPE = "copilot-auth";
export const ROUTE_PREFIX = "/copilot-auth";

export const routes = () => ({
  start: `${ROUTE_PREFIX}/start`,
  state: `${ROUTE_PREFIX}/state`,
  accounts: `${ROUTE_PREFIX}/accounts`,
  profile: `${ROUTE_PREFIX}/profile`,
  activate: `${ROUTE_PREFIX}/activate`,
  logout: `${ROUTE_PREFIX}/logout`,
  cancel: `${ROUTE_PREFIX}/cancel`,
  open: `${ROUTE_PREFIX}/open`,
  whoami: `${ROUTE_PREFIX}/whoami`,
  refresh: `${ROUTE_PREFIX}/refresh`,
});

export const emptyState = () => ({
  status: "idle",
  notices: [],
  error: undefined,
  kind: undefined,
  domain: undefined,
});

// 与 pi-ai 同构的域名归一：接受裸域名或带协议 URL，回主机名；空/非法 → null。
// ghe.com 登录由此把用户输入折叠成设备码流可用的 host（getUrls 同款语义）。
export function normalizeDomain(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return null;
  }
}

// 新槽位由归一化域名 + login 唯一定址。UTF-8 hex 保证域名的点/连字符、
// EMU login 的下划线等不会因字符折叠碰撞，并满足 [a-z][a-z0-9-]*。
// 不传 domain 时保留旧格式，仅用于兼容旧槽位和 recovered-<n> 占位。
const hex = (value) => Array.from(new TextEncoder().encode(value), (byte) =>
  byte.toString(16).padStart(2, "0")).join("");

export function accountSlotId(login, domain) {
  if (domain !== undefined) {
    const host = normalizeDomain(domain);
    if (host === null) throw new Error("invalid account domain");
    return `account-v2-${hex(host)}-${hex(String(login).toLowerCase())}`;
  }
  const clean = String(login).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `account-${clean === "" ? "recovered" : clean}`;
}

export const accountKey = (login, domain) => `${ACCOUNT_SCOPE}/${accountSlotId(login, domain)}`;

// 身份/用量/token 刷新三端点同构于 api.<domain>（对齐 pi-ai getUrls：
// copilot_internal/v2/token 就在 api.<domain> 下；ghe.com 租户的 REST
// 基址同为 api.<域名>）。
export function isGitHubDomain(domain) {
  return typeof domain === "string" && (domain === "github.com"
    || (domain.length <= 253 && domain.endsWith(".ghe.com")
      && domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))));
}

export function apiBase(domain) {
  if (!isGitHubDomain(domain)) throw new Error("invalid GitHub domain");
  return `https://api.${domain}`;
}
