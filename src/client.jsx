// client 半区：浏览器侧 cordis 插件。通过 settings.section 插槽注册
// 「Copilot 账号」页（order 11，紧挨 Models 的 order 10），样式对齐 GitHub
// Copilot desktop 的 Accounts 设置页：账号卡片列表（头像 / Default 徽标 /
// … 菜单 / Plan + AI credits 进度条）+「Add account」下拉两种登录入口
// （GitHub.com / GitHub Enterprise Cloud）。
// 文案走 locale 服务（en/zh 词典，随系统语言切换）；
// 侧栏图标：壳的 navIcon(id) 对未知 id 回落齿轮且不开放注册，故用
// MutationObserver 把本节导航行的齿轮替换为单色 Copilot 图标
// （octicons copilot-16，fill=currentColor，浅/深主题自动一致）。
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createAvatarRecovery } from "./avatar-recovery.mjs";

export const name = "copilot-auth-ui";
export const inject = ["slots", "locale"];

const DICTS = {
  en: {
    nav: "Copilot Accounts",
    title: "Accounts",
    intro: "Projects use the default account for GitHub Copilot unless changed here.",
    addAccount: "Add account",
    optGithub: "GitHub.com",
    optGithubDesc: "Personal and enterprise accounts",
    optGhe: "GitHub Enterprise Cloud",
    optGheDesc: "Accounts on your company's ghe.com domain",
    domainLabel: "Company ghe.com domain",
    domainPlaceholder: "company.ghe.com",
    continue: "Continue",
    cancel: "Cancel",
    defaultBadge: "Default",
    setDefault: "Set as default",
    signOut: "Remove account",
    updateAuth: "Update authorization",
    managePlan: "Manage plan",
    plan: "Plan",
    credits: "AI credits (resets monthly)",
    creditsNote: "AI credits are consumed based on model and token usage.",
    resetsOn: "Resets on",
    unlimited: "Unlimited quota",
    noAccounts: "No connected accounts yet. Use “Add account” to sign in.",
    loading: "…",
    signingIn: "Signing in to",
    signingInDone: "Signed in",
    codeHint: "Open the link below and enter this code to finish signing in:",
    copy: "Copy",
    copied: "Copied ✓",
    unknown: "Unknown error",
    usageFailed: "Usage unavailable",
    legacyAccount: "GitHub Copilot account",
    menu: "More actions",
    authFailed: "Authorization failed",
    authFailedDesc: "Sign in to {target} using a device code.",
    tryAgain: "Try again",
    errorNetwork: "Network connection failed. Please check your network settings and try again.",
    errorTimeout: "The request timed out. Please try again.",
    errorCancelled: "Sign-in was cancelled.",
    errorDomainMismatch: "The device code link did not match the enterprise domain. Please verify the domain and try again.",
    errorDefault: "Sign-in failed. Please try again.",
    cancelSignIn: "Cancel sign-in",
    signInTimeout: "Sign-in timed out after 5 minutes of inactivity. Please try again.",
    addGithubTitle: "Add GitHub account",
    addGithubDesc: "Authorize with GitHub.com using a device code.",
    addGheDesc: "Authorize with {domain} using a device code.",
    stepCopied: "Code copied to clipboard",
    stepOpened: "Opened {target}",
    stepWaiting: "Waiting for authorization…",
    openSite: "Open {target}",
    copyLink: "Copy link",
    badgeNotSignedIn: "Not signed in",
    badgeClickToSignIn: "Click to sign in",
    badgeSwitchAccount: "Switch account",
    badgeSwitching: "Switching…",
    badgeUsage: "Usage",
    badgeUsed: "used",
    badgeResets: "resets",
    badgeQuotaRemaining: "Quota left",
  },
  zh: {
    nav: "Copilot 账号",
    title: "账号",
    intro: "对话默认使用标记为默认的 GitHub Copilot 账号，可在此切换。",
    addAccount: "添加账号",
    optGithub: "GitHub.com",
    optGithubDesc: "个人与企业组织账号",
    optGhe: "GitHub Enterprise Cloud",
    optGheDesc: "贵公司 ghe.com 域名下的账号",
    domainLabel: "公司 ghe.com 域名",
    domainPlaceholder: "company.ghe.com",
    continue: "继续",
    cancel: "取消",
    defaultBadge: "默认",
    setDefault: "设为默认",
    signOut: "移除账号",
    updateAuth: "更新授权",
    managePlan: "管理套餐",
    plan: "套餐",
    credits: "AI 额度（按月重置）",
    creditsNote: "AI 额度消耗取决于模型与 token 用量。",
    resetsOn: "重置日期",
    unlimited: "不限量",
    noAccounts: "还没有已登录账号。点「添加账号」开始登录。",
    loading: "…",
    signingIn: "正在登录",
    signingInDone: "已登录",
    codeHint: "在浏览器打开下面的链接，输入这串代码完成授权：",
    copy: "复制",
    copied: "已复制 ✓",
    unknown: "未知错误",
    usageFailed: "用量不可用",
    legacyAccount: "GitHub Copilot 账号",
    menu: "更多操作",
    authFailed: "授权失败",
    authFailedDesc: "使用设备码授权登录 {target}。",
    tryAgain: "重试",
    errorNetwork: "网络连接失败，请检查网络设置后重试。",
    errorTimeout: "请求超时，请重试。",
    errorCancelled: "登录已取消。",
    errorDomainMismatch: "设备码链接与企业域名不匹配，请检查域名后重试。",
    errorDefault: "登录失败，请重试。",
    cancelSignIn: "取消登录",
    signInTimeout: "登录超时（5 分钟无操作），请重试。",
    addGithubTitle: "添加 GitHub 账号",
    addGithubDesc: "使用设备码授权登录 GitHub.com。",
    addGheDesc: "使用设备码授权登录 {domain}。",
    stepCopied: "代码已复制到剪贴板",
    stepOpened: "已打开 {target}",
    stepWaiting: "等待授权中…",
    openSite: "打开 {target}",
    copyLink: "复制链接",
    badgeNotSignedIn: "未登录",
    badgeClickToSignIn: "点击登录",
    badgeSwitchAccount: "切换账号",
    badgeSwitching: "切换中…",
    badgeUsage: "额度",
    badgeUsed: "已使用",
    badgeResets: "重置",
    badgeQuotaRemaining: "剩余额度",
  },
};

const NAV_TEXTS = Object.keys(DICTS).map((locale) => DICTS[locale].nav);

// 原始错误 → 用户友好文案。技术细节（fetch failed/timeout/abort）翻译成
// 可理解的网络/超时/取消语义；含中文的 host mismatch 错误用专门文案。
function friendlyError(raw, t) {
  const msg = String(raw ?? "");
  const lower = msg.toLowerCase();
  if (lower.includes("fetch failed") || lower.includes("econnrefused") || lower.includes("network")) {
    return t("errorNetwork");
  }
  if (lower.includes("unexpected token") || lower.includes("is not valid json")) {
    return t("errorNetwork");
  }
  if (lower.includes("timeout") || lower.includes("abort")) {
    return t("errorTimeout");
  }
  if (lower.includes("取消")) {
    return t("errorCancelled");
  }
  if (lower.includes("企业域名未生效") || lower.includes("domain")) {
    return t("errorDomainMismatch");
  }
  return `${t("errorDefault")} (${msg})`;
}

// octicons copilot-16（MIT，github/primer）——单色 currentColor，随主题变色
const COPILOT_ICON_SVG =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="flex:none">' +
  '<path d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.128-1.769.693-2.484.579-.733 1.494-1.124 2.724-1.261 1.206-.134 2.262.034 2.944.765.05.053.096.108.139.165.044-.057.094-.112.143-.165.682-.731 1.738-.899 2.944-.765 1.23.137 2.145.528 2.724 1.261.566.715.693 1.614.693 2.484 0 .572-.053 1.148-.254 1.656.066.228.098.429.126.612.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795Zm0-1.485c2.28 0 4.584-1.11 5.002-1.433V7.862l-.023-.116c-.49.21-1.075.291-1.727.291-1.146 0-2.059-.327-2.71-.991A3.222 3.222 0 0 1 8 6.303a3.24 3.24 0 0 1-.544.743c-.65.664-1.563.991-2.71.991-.652 0-1.236-.081-1.727-.291l-.023.116v4.255c.419.323 2.722 1.433 5.002 1.433ZM6.762 2.83c-.193-.206-.637-.413-1.682-.297-1.019.113-1.479.404-1.713.7-.247.312-.369.789-.369 1.554 0 .793.129 1.171.308 1.371.162.181.519.379 1.442.379.853 0 1.339-.235 1.638-.54.315-.322.527-.827.617-1.553.117-.935-.037-1.395-.241-1.614Zm4.155-.297c-1.044-.116-1.488.091-1.681.297-.204.219-.359.679-.242 1.614.091.726.303 1.231.618 1.553.299.305.784.54 1.638.54.922 0 1.28-.198 1.442-.379.179-.2.308-.578.308-1.371 0-.765-.123-1.242-.37-1.554-.233-.296-.693-.587-1.713-.7Z"/>' +
  '<path d="M6.25 9.037a.75.75 0 0 1 .75.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 .75-.75Zm4.25.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 1.5 0Z"/></svg>';

// octicons plus-16（MIT，github/primer）——Add account 按钮左侧图标
const PLUS_SVG =
  '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="flex:none;margin-right:6px;vertical-align:middle">' +
  '<path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>';

// octicons check-16（MIT，github/primer）——状态列表已完成步骤
const CHECK_SVG =
  '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none;color:#2ea44f">' +
  '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';

// octicons globe-16（MIT，github/primer）——状态列表"已打开"步骤
const GLOBE_SVG =
  '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none;opacity:0.6">' +
  '<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm5.93-4.26a7.3 7.3 0 0 0-.52.8c-.35.65-.66 1.44-.85 2.34h2.4l.7-2.51a4.53 4.53 0 0 0-1.73-.63Zm2.8-.31-.52 1.87h2.15A6.52 6.52 0 0 0 8 1.55c-.61 0-1.2.09-1.77.25l.7 2.51h2.4c.16-.66.27-1.34.32-2.04a6.53 6.53 0 0 0-1.42-.25Zm-4.86 8.32c.19.9.5 1.69.85 2.34.16.3.34.56.52.8a4.53 4.53 0 0 0 1.73-.63l-.7-2.51h-2.4Zm5.66 2.51c.35-.65.66-1.44.85-2.34.17-.86.26-1.77.26-2.71h-2.4l-.7 2.51c.61.36 1.27.61 1.99.74.01.6.01 1.2 0 1.8Z"/></svg>';

// 旋转加载动画（CSS @keyframes spin）
const SPINNER_SVG =
  '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex:none;animation:copilot-spin 0.8s linear infinite">' +
  '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28 12" stroke-linecap="round" opacity="0.6"/></svg>';

// 内联 keyframes（注入一次，避免多次嵌入）
const SPINNER_STYLE = '<style>@keyframes copilot-spin{to{transform:rotate(360deg)}}</style>';

// octicons chevron-down-16（MIT，github/primer）——替代字符 ⌄，风格统一
const CHEVRON_DOWN_SVG =
  '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="flex:none;margin-left:4px;vertical-align:middle">' +
  '<path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"/></svg>';

// 壳的导航行 button 结构固定为 [<svg class=navIcon*>, <span class=navLabel*>]，
// 按 label 文本找到本节那一行：隐藏齿轮 svg、紧随其后插入 Copilot svg
//（继承原 svg 的 class 以复用尺寸/主题样式；不删除 React 管理的节点）。
function enforceNavIcon(labelText) {
  if (!labelText) return;
  for (const cell of document.querySelectorAll("button")) {
    const spans = cell.querySelectorAll("span");
    const labelSpan = spans[spans.length - 1];
    if (!labelSpan || labelSpan.textContent !== labelText) continue;
    if (cell.dataset.copilotIcon === "1") continue;
    const gear = cell.querySelector("svg");
    if (!gear) continue;
    gear.style.display = "none";
    const holder = document.createElement("span");
    holder.innerHTML = COPILOT_ICON_SVG;
    const svg = holder.firstElementChild;
    const cls = gear.className && typeof gear.className === "object" ? gear.className.baseVal : gear.className;
    if (cls) svg.setAttribute("class", cls);
    cell.dataset.copilotIcon = "1";
    gear.after(svg);
  }
}

function startNavIconEnforcer(getLabelText) {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  let queued = false;
  const run = () => {
    queued = false;
    try {
      enforceNavIcon(getLabelText());
    } catch { /* DOM 未就绪时等下一次 mutation 再试 */ }
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(run);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}

const styles = {
  section: { maxWidth: 720, display: "flex", flexDirection: "column", gap: 12, fontFamily: "inherit" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: "24px" },
  intro: { margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.75 },
  button: { height: 32, padding: "0 14px", fontSize: 14, borderRadius: 16, border: "none",
    cursor: "pointer", fontFamily: "inherit" },
  primary: { background: "#4c6ef5", color: "#fff" },
  secondary: { background: "transparent", color: "inherit", border: "1px solid currentColor", opacity: 0.8 },
  addButton: { height: 32, padding: "0 14px", fontSize: 14, borderRadius: 16, cursor: "pointer",
    fontFamily: "inherit", background: "transparent", color: "inherit", border: "1px solid rgba(128,128,128,0.45)" },
  card: { border: "1px solid rgba(128,128,128,0.35)", borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column", gap: 10 },
  cardTop: { display: "flex", alignItems: "center", gap: 12 },
  avatar: { borderRadius: "50%", flex: "none", objectFit: "cover", background: "rgba(128,128,128,0.25)" },
  avatarFallback: { borderRadius: "50%", flex: "none", display: "flex", alignItems: "center",
    justifyContent: "center", background: "rgba(128,128,128,0.25)", color: "inherit", fontWeight: 600 },
  who: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
  nameRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  name: { fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: { flex: "none", fontSize: 12, lineHeight: "18px", padding: "0 8px", borderRadius: 9,
    background: "rgba(128,128,128,0.18)" },
  sub: { margin: 0, fontSize: 13, lineHeight: "20px", opacity: 0.7 },
  dots: { flex: "none", width: 32, height: 32, borderRadius: "50%", border: "none", background: "transparent",
    color: "inherit", fontSize: 16, cursor: "pointer", opacity: 0.75 },
  menu: { position: "absolute", right: 0, top: 36, zIndex: 10, minWidth: 200, padding: 4,
    background: "var(--background, #fff)", color: "var(--foreground, #1a1a1a)",
    border: "1px solid rgba(128,128,128,0.4)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    display: "flex", flexDirection: "column", gap: 2 },
  menuItem: { display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: 14,
    border: "none", borderRadius: 8, background: "transparent", color: "inherit", cursor: "pointer",
    fontFamily: "inherit" },
  menuItemDisabled: { opacity: 0.45, cursor: "default" },
  menuItemDanger: { color: "#e03131" },
  backdrop: { position: "fixed", inset: 0, zIndex: 9, background: "transparent" },
  menuDesc: { fontSize: 12, lineHeight: "18px", opacity: 0.7, marginTop: 2 },
  planBlock: { display: "flex", flexDirection: "column", gap: 6, paddingTop: 4,
    borderTop: "1px solid rgba(128,128,128,0.25)" },
  planTitle: { fontSize: 13, lineHeight: "20px", opacity: 0.7 },
  planValue: { fontSize: 14, lineHeight: "22px", fontWeight: 500 },
  creditsRow: { display: "flex", alignItems: "center", justifyContent: "space-between",
    fontSize: 13, lineHeight: "20px" },
  barTrack: { height: 6, borderRadius: 3, background: "rgba(128,128,128,0.25)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, background: "#4c6ef5" },
  muted: { margin: 0, fontSize: 12, lineHeight: "18px", opacity: 0.6 },
  codeHint: { margin: 0, fontSize: 13, lineHeight: "20px", opacity: 0.85 },
  codeRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  code: { fontSize: 24, fontWeight: 700, letterSpacing: 2, fontVariantNumeric: "tabular-nums" },
  link: { fontSize: 13, color: "#4c6ef5" },
  error: { margin: 0, fontSize: 13, lineHeight: "20px", color: "#e03131" },
  // 错误卡片（参考 GitHub Copilot desktop Authorization failed 样式）
  errorCard: { border: "1px solid rgba(128,128,128,0.35)", borderRadius: 12, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 14 },
  errorCardTitle: { margin: 0, fontSize: 16, fontWeight: 600, lineHeight: "24px" },
  errorCardDesc: { margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.7 },
  alertBox: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
    borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA",
    color: "#991B1B", fontSize: 13, lineHeight: "20px" },
  alertIcon: { flex: "none", width: 16, height: 16, borderRadius: "50%",
    background: "#DC2626", color: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 11, fontWeight: 700, marginTop: 2 },
  errorActions: { display: "flex", alignItems: "center", gap: 10 },
  input: { flex: 1, minWidth: 180, height: 32, padding: "0 10px", fontSize: 14, borderRadius: 8,
    border: "1px solid rgba(128,128,128,0.45)", background: "transparent", color: "inherit",
    fontFamily: "inherit" },
};

// Both avatar views use the same one-shot profile recovery. URL changes reset
// failed state; the returned URL is retried unchanged, including its signature.
function useAvatarRecovery(id, src, onRecovered) {
  const controllerRef = useRef(null);
  if (controllerRef.current === null) controllerRef.current = createAvatarRecovery();
  const controller = controllerRef.current;
  controller.configure(id, src);
  const callbackRef = useRef(onRecovered);
  callbackRef.current = onRecovered;
  const [, rerender] = useState(0);
  useEffect(() => {
    const unsubscribe = controller.subscribe(() => rerender((value) => value + 1));
    controller.mount();
    // A cached image can fail before the passive effect subscribes. Synchronize
    // the current snapshot once, including any error/recovery in that gap.
    rerender((value) => value + 1);
    return () => { unsubscribe(); controller.unmount(); };
  }, [controller]);
  const state = controller.snapshot();
  return { ...state, onError: () => { void controller.fail(state.revision, () => callbackRef.current?.()); } };
}

// Loading failures keep the initial-letter fallback while one refresh is pending.
function Avatar({ id, src, name, size = 36, onRecovered }) {
  const image = useAvatarRecovery(id, src, onRecovered);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  if (!image.source || image.failed) {
    return (
      <div style={{ ...styles.avatarFallback, width: size, height: size, fontSize: Math.round(size * 0.45) }}>
        {initial}
      </div>
    );
  }
  return (
    <img key={image.revision} src={image.source} alt="" width={size} height={size} style={styles.avatar}
      referrerPolicy="no-referrer" onError={image.onError} />
  );
}

// Plan + AI credits 块：plan / 进度条 / 重置日期全部缺字段即隐藏对应元素。
function UsageBlock({ t, plan, usage, usageError }) {
  if (usageError) {
    return <p style={styles.muted}>{t("usageFailed")}：{usageError}</p>;
  }
  if (!plan && !usage) return null;
  const percent = usage?.unlimited ? undefined : usage?.percentUsed;
  return (
    <div style={styles.planBlock}>
      {plan !== undefined && (
        <>
          <div style={styles.planTitle}>{t("plan")}</div>
          <div style={styles.planValue}>{plan}</div>
        </>
      )}
      {usage?.unlimited === true && <div style={styles.muted}>{t("unlimited")}</div>}
      {typeof percent === "number" && (
        <>
          <div style={styles.creditsRow}>
            <span>{t("credits")}</span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, percent))}%` }} />
          </div>
        </>
      )}
      {usage?.resets !== undefined && (
        <div style={styles.muted}>{t("resetsOn")} {usage.resets}</div>
      )}
      <div style={styles.muted}>{t("creditsNote")}</div>
    </div>
  );
}

function AccountCard({ t, account, busy, menuOpen, onToggleMenu, onActivate, onLogout, onUpdateAuth, onManagePlan, onAvatarRecovered }) {
  const title = account.name ?? account.login ?? t("legacyAccount");
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <Avatar id={account.id} src={account.avatarUrl} name={account.name ?? account.login} onRecovered={onAvatarRecovered} />
        <div style={styles.who}>
          <div style={styles.nameRow}>
            <span style={styles.name}>{title}</span>
            {account.active && <span style={styles.badge}>{t("defaultBadge")}</span>}
          </div>
          <p style={styles.sub}>
            {[account.login, account.domain].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div style={{ position: "relative", flex: "none" }}>
          <button type="button" style={styles.dots} aria-label={t("menu")} onClick={onToggleMenu}>…</button>
          {menuOpen && (
            <div style={styles.menu}>
              <button
                type="button"
                style={{ ...styles.menuItem, ...(account.active || busy ? styles.menuItemDisabled : null) }}
                disabled={account.active || busy}
                onClick={onActivate}
              >
                {t("setDefault")}
              </button>
              <button
                type="button"
                style={{ ...styles.menuItem, ...(busy ? styles.menuItemDisabled : null) }}
                disabled={busy}
                onClick={onUpdateAuth}
              >
                {t("updateAuth")}
              </button>
              <button
                type="button"
                style={{ ...styles.menuItem, ...(busy ? styles.menuItemDisabled : null) }}
                disabled={busy}
                onClick={onManagePlan}
              >
                {t("managePlan")}
              </button>
              <button
                type="button"
                style={{ ...styles.menuItem, ...styles.menuItemDanger, ...(busy ? styles.menuItemDisabled : null) }}
                disabled={busy}
                onClick={onLogout}
              >
                {t("signOut")}
              </button>
            </div>
          )}
        </div>
      </div>
      <UsageBlock t={t} plan={account.plan} usage={account.usage} usageError={account.usageError} />
    </div>
  );
}

function CopilotSection({ t = (key) => DICTS.en[key] ?? key }) {
  const [accounts, setAccounts] = useState(null); // null = 加载中
  const [signing, setSigning] = useState(null); // 进行中的 attempt（/state 快照）
  const [error, setError] = useState(undefined);
  const [syncError, setSyncError] = useState(undefined);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkOpened, setLinkOpened] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [enterpriseStep, setEnterpriseStep] = useState(false);
  const [domain, setDomain] = useState("");
  const [menuFor, setMenuFor] = useState(null); // 打开了 … 菜单的账号 id（不透明槽位标识）
  const [busy, setBusy] = useState(false);
  const [lastStart, setLastStart] = useState(null); // {kind, domain} 最近一次失败的登录参数
  const [countdown, setCountdown] = useState(0); // 登录剩余秒数（到 0 自动取消）
  const timer = useRef(null);
  const timeoutTimer = useRef(null);

  // 停止轮询和超时计时器
  const stopTimers = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (timeoutTimer.current) { clearInterval(timeoutTimer.current); timeoutTimer.current = null; }
  };

  // 启动 5 分钟无操作超时：每秒倒计时，到 0 自动取消登录
  const startTimeout = () => {
    if (timeoutTimer.current) clearInterval(timeoutTimer.current);
    setCountdown(300);
    timeoutTimer.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          // 超时：停止计时，通知 host 重置，置失败
          if (timeoutTimer.current) { clearInterval(timeoutTimer.current); timeoutTimer.current = null; }
          if (timer.current) { clearInterval(timer.current); timer.current = null; }
          fetch("/copilot-auth/cancel", { method: "POST" }).catch(() => {});
          setSigning(null);
          setError(t("signInTimeout"));
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  // 取消登录：通知 host 重置 attempt，停止计时，清状态。
  // host 侧 background begin() 无法 abort，但 attempt 被替换为 idle 后，
  // 下次 /start 不再返回 409 already running。
  const cancelSignIn = () => {
    stopTimers();
    fetch("/copilot-auth/cancel", { method: "POST" }).catch(() => {});
    setSigning(null);
    setLastStart(null);
    setCountdown(0);
    setError(undefined);
  };

  const refreshAccounts = async () => {
    try {
      const d = await fetch("/copilot-auth/accounts").then((r) => r.json());
      setAccounts(Array.isArray(d.accounts) ? d.accounts : []);
      setSyncError(d.syncError);
    } catch {
      if (accounts === null) setAccounts([]);
    }
  };

  useEffect(() => {
    let alive = true;
    // 未结束的登录 attempt 要恢复轮询（设置面板往返导致的重挂载不丢进度）。
    fetch("/copilot-auth/state")
      .then((r) => r.json())
      .then((s) => {
        if (!alive) return;
        if (s.status === "running") {
          setSigning(s);
          poll();
        } else if (s.status === "failed") {
          setError(s.error ?? t("unknown"));
        }
      })
      .catch(() => { /* 列表以下一步查询为准 */ });
    refreshAccounts();
    return () => {
      alive = false;
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const poll = () => {
    if (timer.current) clearInterval(timer.current);
    startTimeout();
    // 立即首次轮询，不等 1 秒——begin() 快速失败时立刻显示错误
    const tick = () => {
      fetch("/copilot-auth/state")
        .then((r) => r.json())
        .then((s) => {
          if (s.status === "running") {
            setSigning(s);
            return;
          }
          stopTimers();
          setSigning(null);
          if (s.status === "authorized") {
            setCopied(false);
            setLastStart(null);
            setError(void 0);
            setCountdown(0);
            refreshAccounts();
          } else {
            setError(s.error ?? t("unknown"));
          }
        })
        .catch(() => { /* 网络抖动时继续下一轮轮询 */ });
    };
    tick();
    timer.current = setInterval(tick, 1000);
  };

  const start = async (kind, domainValue) => {
    setAddOpen(false);
    setEnterpriseStep(false);
    setError(undefined);
    setCopied(false);
    setLinkCopied(false);
    setLinkOpened(false);
    setLastStart({ kind, domain: domainValue });
    try {
      const res = await fetch("/copilot-auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, domain: domainValue }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `HTTP ${res.status}`);
        return;
      }
      setSigning({ status: "running", notices: [], kind, domain: domainValue });
      poll();
    } catch (err) {
      setError(String(err?.message ?? err));
    }
  };

  // 重试上次失败的登录
  const retry = () => {
    if (lastStart === null) return;
    start(lastStart.kind, lastStart.domain);
  };

  // 取消错误状态
  const cancelError = () => {
    setError(undefined);
    setLastStart(null);
  };

  const activate = async (id) => {
    if (typeof id !== "string" || id === "") return;
    setMenuFor(null);
    setBusy(true);
    try {
      const res = await fetch("/copilot-auth/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setError(String(err?.message ?? err));
    }
    await refreshAccounts();
    setBusy(false);
  };

  const logout = async (id) => {
    if (typeof id !== "string" || id === "") return;
    setMenuFor(null);
    setBusy(true);
    try {
      const res = await fetch("/copilot-auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setError(String(err?.message ?? err));
    }
    await refreshAccounts();
    setBusy(false);
  };

  // 更新授权：保留槽位并触发同域名登录；后端按域名 + login 复用原 id。
  // 不预先注销，避免登录取消/失败时丢失仍可用的授权。
  const updateAuth = async (account) => {
    setMenuFor(null);
    const kind = account.domain === "github.com" ? "github.com" : "ghe.com";
    const domainValue = account.domain === "github.com" ? undefined : account.domain;
    await start(kind, domainValue);
  };

  // 管理套餐：打开 GitHub 设置页。
  const managePlan = (account) => {
    setMenuFor(null);
    const base = account.domain === "github.com" ? "https://github.com" : `https://${account.domain}`;
    window.open(`${base}/settings/copilot`, "_blank", "noopener");
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* 剪贴板不可用时静默 */ }
  };

  // 打开授权链接：调 host 端 /open 路由，用 OS 默认浏览器打开。
  // Electron 中 window.open 和 <a target="_blank"> 不可靠——主进程可能拦截。
  const openSite = async (url) => {
    if (!url) return;
    try {
      const r = await fetch("/copilot-auth/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (r.ok) setLinkOpened(true);
    } catch { /* 网络错误时静默 */ }
  };

  // 复制授权链接（参考截图：次按钮 Copy link，点击后短暂变 ✓ 已复制）
  const copyLinkUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* 剪贴板不可用时静默 */ }
  };

  const closeMenus = () => {
    setAddOpen(false);
    setMenuFor(null);
  };
  // dsh-llm-pi-ai 的 relay() 把 pi-ai device_code 事件映射为
  // { message, url, code } 格式（login.ts L60-66）
  const codeNotice = signing ? [...(signing.notices ?? [])].reverse()
    .find((n) => n && typeof n.code === "string" && n.code !== "") : undefined;
  const codeUrl = codeNotice?.url;

  // 参考GitHub Copilot desktop：设备码一出现就自动用系统浏览器打开授权页，
  // 无需手动点击。以设备码字符串为键，每条新码只自动开一次（重试生成新码会再开）；
  // 自动打开失败（如被拦截）时仍保留手动 Open 按钮兜底。
  const autoOpenedRef = useRef(null);
  useEffect(() => {
    if (!codeUrl || !codeNotice?.code || autoOpenedRef.current === codeNotice.code) return;
    autoOpenedRef.current = codeNotice.code;
    setLinkOpened(false);
    void openSite(codeUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeUrl, codeNotice?.code]);
  const signInTarget = signing?.kind === "ghe.com" && signing?.domain
    ? `${t("optGhe")}（${signing.domain}）`
    : t("optGithub");

  return (
    <div style={styles.section}>
      {(addOpen || menuFor !== null) && <div style={styles.backdrop} onClick={closeMenus} />}
      <div style={styles.headerRow}>
        <h3 style={styles.title}>{t("title")}</h3>
        <div style={{ position: "relative", flex: "none" }}>
          <button type="button" style={styles.addButton} onClick={() => { setMenuFor(null); setAddOpen((v) => !v); }}>
            <span dangerouslySetInnerHTML={{ __html: PLUS_SVG }} />
            {t("addAccount")}
            <span dangerouslySetInnerHTML={{ __html: CHEVRON_DOWN_SVG }} />
          </button>
          {addOpen && (
            <div style={styles.menu}>
              <button type="button" style={styles.menuItem} onClick={() => start("github.com")}>
                {t("optGithub")}
                <div style={styles.menuDesc}>{t("optGithubDesc")}</div>
              </button>
              <button
                type="button"
                style={styles.menuItem}
                onClick={() => { setAddOpen(false); setEnterpriseStep(true); }}
              >
                {t("optGhe")}
                <div style={styles.menuDesc}>{t("optGheDesc")}</div>
              </button>
            </div>
          )}
        </div>
      </div>
      <p style={styles.intro}>{t("intro")}</p>

      {enterpriseStep && (
        <div style={styles.card}>
          <label style={styles.sub} htmlFor="ghc-domain">{t("domainLabel")}</label>
          <div style={styles.codeRow}>
            <input
              id="ghc-domain"
              style={styles.input}
              placeholder={t("domainPlaceholder")}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <button
              type="button"
              style={{ ...styles.button, ...styles.primary }}
              disabled={domain.trim() === ""}
              onClick={() => start("ghe.com", domain.trim())}
            >
              {t("continue")}
            </button>
            <button type="button" style={{ ...styles.button, ...styles.secondary }} onClick={() => setEnterpriseStep(false)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {signing?.status === "running" && (
        <div style={styles.card}>
          <span dangerouslySetInnerHTML={{ __html: SPINNER_STYLE }} />
          <div>
            <h4 style={{ ...styles.title, fontSize: 16 }}>{t("addGithubTitle")}</h4>
            <p style={{ ...styles.intro, marginTop: 4 }}>
              {(signing.domain && signing.domain !== "github.com"
                ? t("addGheDesc") : t("addGithubDesc")).replace("{domain}", signing.domain).replace("{target}", signing.domain ?? t("optGithub"))}
            </p>
          </div>
          {codeNotice && (
            <div style={{ ...styles.codeRow, cursor: "pointer" }} onClick={() => copyCode(codeNotice.code)} role="button" tabIndex={0}>
              <span style={styles.code}>{codeNotice.code}</span>
              <span dangerouslySetInnerHTML={{ __html: copied ? CHECK_SVG : '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="flex:none;opacity:0.5"><rect x="5" y="5" width="9" height="9" rx="2"/><rect x="2" y="2" width="9" height="9" rx="2"/></svg>' }} />
            </div>
          )}
          {/* 三步状态指示器 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: "20px", opacity: copied ? 1 : 0.5 }}>
              <span dangerouslySetInnerHTML={{ __html: copied ? CHECK_SVG : '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none;opacity:0.4"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' }} />
              <span>{t("stepCopied")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: "20px", opacity: linkOpened ? 1 : 0.5 }}>
              <span dangerouslySetInnerHTML={{ __html: linkOpened ? CHECK_SVG : GLOBE_SVG }} />
              <span>{t("stepOpened").replace("{target}", signing.domain ?? t("optGithub"))}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: "20px" }}>
              <span dangerouslySetInnerHTML={{ __html: SPINNER_SVG }} />
              <span>{t("stepWaiting")}</span>
              {countdown > 0 && <span style={{ opacity: 0.4, fontSize: 12 }}>({Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")})</span>}
            </div>
          </div>
          {/* 按钮组：Open 调 host 端 /open 路由→系统默认浏览器。
              Electron 中 <a target="_blank"> 和 window.open 不可靠。 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {codeUrl && (
              <button type="button"
                style={{ ...styles.button, background: "#2ea44f", color: "#fff", border: "none" }}
                onClick={() => openSite(codeUrl)}>
                {t("openSite").replace("{target}", signing.domain ?? t("optGithub"))}
              </button>
            )}
            {codeUrl && (
              <button type="button" style={{ ...styles.button, ...styles.secondary }} onClick={() => copyLinkUrl(codeUrl)}>
                {linkCopied ? t("copied") : t("copyLink")}
              </button>
            )}
          </div>
          <div>
            <button type="button" style={{ ...styles.button, ...styles.secondary, opacity: 0.7 }} onClick={cancelSignIn}>
              {t("cancelSignIn")}
            </button>
          </div>
        </div>
      )}

      {error && lastStart !== null && (
        <div style={styles.errorCard}>
          <h4 style={styles.errorCardTitle}>{t("authFailed")}</h4>
          <p style={styles.errorCardDesc}>
            {t("authFailedDesc").replace("{target}",
              lastStart.kind === "ghe.com" && lastStart.domain ? lastStart.domain : t("optGithub"))}
          </p>
          <div style={styles.alertBox}>
            <span style={styles.alertIcon}>!</span>
            <span>{friendlyError(error, t)}</span>
          </div>
          <div style={styles.errorActions}>
            <button type="button" style={{ ...styles.button, ...styles.secondary }} onClick={cancelError}>
              {t("cancel")}
            </button>
            <button type="button" style={{ ...styles.button, ...styles.primary }} onClick={retry}>
              {t("tryAgain")}
            </button>
          </div>
        </div>
      )}
      {error && lastStart === null && (
        <p style={styles.error}>{error}</p>
      )}

      {accounts === null ? (
        <p style={styles.sub}>{t("loading")}</p>
      ) : accounts.length === 0 && signing === null ? (
        <p style={styles.sub}>{t("noAccounts")}</p>
      ) : (
        accounts.map((account) => (
          <AccountCard
            key={account.id}
            t={t}
            account={account}
            busy={busy}
            menuOpen={menuFor !== null && menuFor === account.id}
            onToggleMenu={() => setMenuFor((v) => (v === account.id ? null : account.id))}
            onActivate={() => activate(account.id)}
            onLogout={() => logout(account.id)}
            onUpdateAuth={() => updateAuth(account)}
            onManagePlan={() => managePlan(account)}
            onAvatarRecovered={refreshAccounts}
          />
        ))
      )}

      {syncError && <p style={styles.muted}>sync: {syncError}</p>}
    </div>
  );
}

// 简化版 Copilot 图标（16x16，currentColor）
const BADGE_COPILOT_SVG =
  '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none">' +
  '<path d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.128-1.769.693-2.484.579-.733 1.494-1.124 2.724-1.261 1.206-.134 2.262.034 2.944.765.05.053.096.108.139.165.044-.057.094-.112.143-.165.682-.731 1.738-.899 2.944-.765 1.23.137 2.145.528 2.724 1.261.566.715.693 1.614.693 2.484 0 .572-.053 1.148-.254 1.656.066.228.098.429.126.612.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795Zm0-1.485c2.28 0 4.584-1.11 5.002-1.433V7.862l-.023-.116c-.49.21-1.075.291-1.727.291-1.146 0-2.059-.327-2.71-.991A3.222 3.222 0 0 1 8 6.303a3.24 3.24 0 0 1-.544.743c-.65.664-1.563.991-2.71.991-.652 0-1.236-.081-1.727-.291l-.023.116v4.255c.419.323 2.722 1.433 5.002 1.433ZM6.762 2.83c-.193-.206-.637-.413-1.682-.297-1.019.113-1.479.404-1.713.7-.247.312-.369.789-.369 1.554 0 .793.129 1.171.308 1.371.162.181.519.379 1.442.379.853 0 1.339-.235 1.638-.54.315-.322.527-.827.617-1.553.117-.935-.037-1.395-.241-1.614Zm4.155-.297c-1.044-.116-1.488.091-1.681.297-.204.219-.358.679-.242 1.614.091.726.303 1.231.618 1.553.299.305.784.54 1.638.54.922 0 1.28-.198 1.442-.379.179-.2.308-.578.308-1.371 0-.765-.123-1.242-.37-1.554-.233-.296-.693-.587-1.713-.7Z"/>' +
  '<path d="M6.25 9.037a.75.75 0 0 1 .75.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 .75-.75Zm4.25.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 1.5 0Z"/></svg>';

// 打开 DSH 设置页并定位到 Copilot section。
// DSH desktop 没有公开 API 让外部组件打开设置页（SettingsRoot 的 open 状态
// 是 component-local React state，不在任何 store 里），所以只能走 DOM：
// 1. 点击侧栏「账号菜单」trigger（aria-haspopup="menu"，宽栏文字「更多」）
// 2. 在 portal 菜单里点 button[role="menuitem"]「设置」
// 3. 等 [role="dialog"] 设置面板渲染，再点 nav 里文本含 "copilot" 的 section
// 全程输出 console.log/warn，便于在 DevTools 排查 DOM 选择器失配。
async function openCopilotSettings() {
  // 菜单是 portal 渲染，且 primitives Menu 会同时挂一份 visibility:hidden 的
  // 测量副本，必须只认屏幕上真实可见、有尺寸的元素。
  const isVisible = (el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  // MutationObserver 等待 check() 返回非空，比固定 setTimeout 稳。
  const waitFor = (check, timeout) => new Promise((resolve) => {
    const existing = check();
    if (existing) { resolve(existing); return; }
    const observer = new MutationObserver(() => {
      const el = check();
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
  try {
    // DSH desktop 0.1.7 的设置入口在侧栏「账号菜单」里：
    //   trigger 是 button[aria-haspopup="menu"]，aria-label 随语言为
    //   「账号菜单」/「Account menu」；窄栏只有省略号图标，宽栏文字「更多」。
    const moreButton = Array.from(document.querySelectorAll("button"))
      .find((b) => {
        if (!isVisible(b)) return false;
        const label = b.getAttribute("aria-label");
        const text = (b.textContent || "").trim();
        return label === "账号菜单" || label === "Account menu" || text === "更多" || text === "More";
      });
    if (!moreButton) {
      console.warn("[copilot-auth] account-menu ('更多') button not found");
      return;
    }
    console.log("[copilot-auth] found account-menu button, clicking to open menu");
    moreButton.click();

    // 菜单项 button[role="menuitem"] 内部结构 = 图标 span + 文本 span +
    // 可选快捷键 kbd 串（Win 默认绑定 Ctrl+,，故整串 textContent 是
    // 「设置Ctrl,」而非「设置」），只能用前缀匹配，且只点可见的那份。
    // 最多等 2.5 秒。
    const settingsItem = await waitFor(() => {
      const candidates = document.querySelectorAll('button[role="menuitem"], [role="menuitem"]');
      for (const el of candidates) {
        if (!isVisible(el)) continue;
        const text = (el.textContent || "").trim();
        if (text === "设置" || text.startsWith("设置") || text === "Settings" || text.startsWith("Settings")) {
          return el;
        }
      }
      return null;
    }, 2500);

    if (!settingsItem) {
      console.warn("[copilot-auth] '设置' menu item not found after opening account menu");
      return;
    }
    console.log("[copilot-auth] found '设置' menu item, clicking to open settings panel");
    settingsItem.click();

    // 等「设置面板」就绪：可见的 [role="dialog"] 出现且内部 nav button 渲染完。
    // React 渲染是异步的，dialog 元素先出现 nav 子树后渲染，必须等 nav
    // button 有了再匹配。超时 5 秒。
    const panel = await waitFor(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) {
        if (!isVisible(d)) continue;
        if (d.querySelectorAll("nav button").length > 0) return d;
      }
      return null;
    }, 5000);

    if (!panel) {
      console.warn("[copilot-auth] settings panel with nav did not appear within 5s");
      return;
    }
    console.log("[copilot-auth] settings panel rendered");

    // SettingsRoot.tsx L78 navCell 的 textContent = icon + label，
    // 本节 label = "Copilot 账号"/"Copilot Accounts"，小写后含 "copilot"。
    const navButtons = panel.querySelectorAll("nav button");
    const target = Array.from(navButtons).find((b) => {
      const text = (b.textContent || "").toLowerCase();
      return text.includes("copilot");
    });

    if (target) {
      console.log("[copilot-auth] matched nav button:", target.textContent);
      target.click();
    } else {
      console.warn("[copilot-auth] no nav button matched 'copilot'");
      console.log("[copilot-auth] available nav texts:",
        Array.from(navButtons).map((b) => b.textContent));
    }
  } catch (err) {
    console.warn("[copilot-auth] openCopilotSettings error:", err);
  }
}

// 账号头像：风格对齐 DSH AccountAvatar（圆形成片、object-fit:cover、
// referrerPolicy=no-referrer、加载失败兜底）。弹窗身份行与账号切换列表共用，
// 保证两处头像尺寸/兜底完全一致。
function AccountAvatar({ id, url, login, size = 18, onRecovered }) {
  const image = useAvatarRecovery(id, url, onRecovered);
  const box = {
    width: size, height: size, borderRadius: "50%", flex: "none",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", background: "#adb5bd",
  };
  if (image.source && !image.failed) {
    return (
      <span style={box}>
        <img
          key={image.revision}
          src={image.source}
          alt=""
          referrerPolicy="no-referrer"
          onError={image.onError}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "50%" }}
        />
      </span>
    );
  }
  return (
    <span style={{ ...box, fontSize: Math.round(size * 0.55), color: "#fff", fontWeight: 600 }}>
      {(login ?? "?")[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function CopilotBadge({ t = (k) => DICTS.en[k] ?? k }) {
  const [whoami, setWhoami] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(null);
  const timer = useRef(null);
  const badgeRef = useRef(null);

  const refresh = () => {
    fetch("/copilot-auth/whoami").then((r) => r.json()).then((d) => setWhoami(d)).catch(() => {});
    fetch("/copilot-auth/accounts").then((r) => r.json()).then((d) => setAccounts(d?.accounts ?? [])).catch(() => {});
  };

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 30000);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchAccount = async (id) => {
    if (typeof id !== "string" || id === "") return;
    setOpen(false);
    setSwitching(id);
    try {
      await fetch("/copilot-auth/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      refresh();
    } catch { /* 静默 */ }
    setSwitching(null);
  };

  const badgeOpacity = whoami?.configured ? 1 : 0.5;
  // 剩余额度 = 100 - 已用百分比（进度条 >80% 变红，对应剩余 <20%）。
  // Math.round 消除浮点误差（100 - 69.2 = 30.799999...）。
  const used = whoami?.usagePercent;
  const quotaRemaining = typeof used === "number"
    ? Math.round(Math.max(0, Math.min(100, 100 - used))) : null;
  const lowQuota = quotaRemaining !== null && quotaRemaining < 20;

  if (!whoami) {
    return (
      <span className="copilot-badge" style={{ opacity: badgeOpacity }}>
        <span dangerouslySetInnerHTML={{ __html: BADGE_COPILOT_SVG }} />
        <span className="copilot-badge-label" style={{ opacity: 0.4 }}>…</span>
      </span>
    );
  }

  if (!whoami.configured) {
    return (
      <span className="copilot-badge" title={t("badgeClickToSignIn")}
        onClick={() => openCopilotSettings()}>
        <span dangerouslySetInnerHTML={{ __html: BADGE_COPILOT_SVG }} />
        <span className="copilot-badge-label">{t("badgeNotSignedIn")}</span>
      </span>
    );
  }

  const badgeTitle = [
    whoami.login,
    quotaRemaining !== null && `${t("badgeQuotaRemaining")} ${quotaRemaining}%`,
  ].filter(Boolean).join(" · ") || undefined;

  // 弹窗用 position: fixed 渲染到根堆叠上下文，避免被侧边栏（Files 面板）
  // 等高层级 DOM 盖住。坐标从徽标 getBoundingClientRect 实时计算。
  const badgeRect = badgeRef.current?.getBoundingClientRect();
  const popupStyle = badgeRect ? {
    position: "fixed",
    left: badgeRect.left,
    bottom: window.innerHeight - badgeRect.top + 4,
    background: "var(--dsh-bg, #fff)", border: "1px solid rgba(128,128,128,0.3)",
    borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: 0, minWidth: 280, maxWidth: 320, zIndex: 100001,
    overflow: "hidden",
  } : null;

  return (
    <div style={{ position: "relative", flex: "none" }} ref={badgeRef}>
      <span className="copilot-badge" title={badgeTitle} onClick={() => setOpen((v) => !v)}>
        <span dangerouslySetInnerHTML={{ __html: BADGE_COPILOT_SVG }} />
        {/* logo 后只显示剩余额度百分比 */}
        {quotaRemaining !== null && (
          <span className="copilot-badge-label" style={lowQuota ? { color: "#e03131" } : undefined}>
            {quotaRemaining}%
          </span>
        )}
      </span>
      {open && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 100000 }} onClick={() => setOpen(false)} />
          <div style={popupStyle}>
            {/* 标题栏：Plan 名称 + 设置按钮 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderBottom: "1px solid rgba(128,128,128,0.15)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {whoami.plan ?? "Copilot"}
              </span>
              <button type="button" title={t("nav")}
                style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  padding: 4, borderRadius: 4,
                  color: "var(--dsh-fg, currentColor)", opacity: 0.65,
                  display: "inline-flex", alignItems: "center", lineHeight: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  openCopilotSettings();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
            {/* 用量区 */}
            {whoami.usagePercent !== null && whoami.usagePercent !== undefined && (
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
                  <span>{t("badgeUsage")}</span>
                  {whoami.usageResetDate && <span>{t("badgeResets")} {whoami.usageResetDate}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{whoami.usagePercent}%</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>{t("badgeUsed")}</span>
                </div>
                <div style={{ height: 4, background: "rgba(128,128,128,0.2)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${whoami.usagePercent}%`,
                    background: whoami.usagePercent > 80 ? "#e03131" : "#4c6ef5",
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            )}
            {/* 身份行：当前账号头像 + 用户名。
                排版与下方账号切换列表行一致（18px 圆头像、13px 文字、gap 8）。 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              borderTop: whoami.usagePercent !== null && whoami.usagePercent !== undefined
                ? "none" : "1px solid rgba(128,128,128,0.15)",
            }}>
              <AccountAvatar id={whoami.id} url={whoami.avatarUrl} login={whoami.login} size={18} onRecovered={refresh} />
              <span style={{
                fontSize: 13, flex: "1 1 auto", minWidth: 0, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {whoami.login ?? "—"}
              </span>
            </div>
            {/* 账号切换区 */}
            {accounts && accounts.length > 1 && (
              <div style={{ borderTop: "1px solid rgba(128,128,128,0.15)", padding: "4px 0" }}>
                {accounts.map((acc) => {
                  const active = acc.active;
                  const label = `${acc.domain}/${acc.login ?? acc.name ?? t("legacyAccount")}`;
                  return (
                    <button key={acc.id} type="button"
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "6px 12px", border: "none",
                        background: active ? "rgba(76,109,245,0.08)" : "transparent",
                        cursor: active ? "default" : "pointer", fontFamily: "inherit",
                        fontSize: 13, textAlign: "left", color: "inherit",
                      }}
                      disabled={active || switching !== null}
                      onClick={() => switchAccount(acc.id)}
                    >
                      <AccountAvatar id={acc.id} url={acc.avatarUrl} login={acc.login} size={18} onRecovered={refresh} />
                      <span title={label} style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                      {active && <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>✓</span>}
                      {switching === acc.id && <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>{t("badgeSwitching")}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>, document.body)}
    </div>
  );
}

export function apply(ctx) {
  console.log("[copilot-auth] client apply v3 (badge+label+settings-jump)");
  ctx.locale.register("copilot-auth", DICTS);
  const t = ctx.locale.bind("copilot-auth");
  // 注入徽标全局样式：跟 ui-chat 的 StatsPills pill 同款
  // （conversation.composer.dock slot 同源），字体/颜色/图标尺寸/hover 阴影
  // 完全对齐，避免视觉违和。inline style 不支持 :hover，故走 CSS class。
  if (typeof document !== "undefined" && !document.getElementById("copilot-badge-style")) {
    const style = document.createElement("style");
    style.id = "copilot-badge-style";
    style.textContent = `
.copilot-badge{
  display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;
  max-width:240px;padding:1px 8px;border:none;border-radius:24px;
  background:transparent;color:var(--dsw-alias-label-tertiary);
  font:inherit;font-variant-numeric:tabular-nums;white-space:nowrap;
  cursor:pointer;font-family:inherit;flex:0 1 auto;position:relative;user-select:none;
  /* 与 ui-chat StatsPills .root 同款字号（secondary - 1px），保证跟旁边
     轮次/用量/命中率三个 pill 视觉一致 */
  font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);
  line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));
}
.copilot-badge:hover{
  background:var(--dsw-alias-interactive-bg-hover);
  color:var(--dsw-alias-label-secondary);
}
.copilot-badge svg{
  width:14px;height:14px;flex:none;
  /* octicons copilot-16 path 视觉重心偏上（DSH 标准图标在 path 层面
     做了光学偏移，参考 IconGaugeOutline16 注释「0.75 drop optically
     centers the drawn extent in the 16 box」），用 transform 补偿
     让 logo 跟其他 pill svg 视觉对齐，不破坏 path 数据 */
  transform:translateY(1px);
}
/* 响应式收缩：跟 StatsPills .label 一致（min-width:0; overflow:hidden;
   text-overflow:ellipsis），当窗口小 flex 容器收缩时文字被裁掉只留
   logo，跟旁边 StatsPills pill 行为一致。flex:0 1 auto 让 label 可收缩
   而 svg（flex:none）保持原尺寸。 */
.copilot-badge-label{
  min-width:0;overflow:hidden;text-overflow:ellipsis;
  flex:0 1 auto;white-space:nowrap;
}
`;
    document.head.appendChild(style);
  }
  ctx.slots.inject("settings.section", () => ctx.slots.register(
    { name: "settings.section", id: "copilot", order: 11, label: () => t("nav"), inject: () => ({ t }) },
    CopilotSection,
  ));
  // 工作区输入栏下方 Copilot 徽标（VSCode 风格）：显示 Copilot logo，
  // 点击弹出账号信息面板（用户名/plan/用量/切换账号）。
  ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register(
    { name: "conversation.composer.dock", id: "copilot-badge", order: 50, inject: () => ({ t }) },
    CopilotBadge,
  ));
  startNavIconEnforcer(() => t("nav"));
}
