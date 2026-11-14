window.__ModuleLoader__.load({
	id: "dsh-github-copilot-accounts",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime = require("react/jsx-runtime");
var name = "copilot-auth-ui";
var inject = ["slots", "locale"];
var DICTS = {
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
    noAccounts: "No connected accounts yet. Use \u201CAdd account\u201D to sign in.",
    loading: "\u2026",
    signingIn: "Signing in to",
    signingInDone: "Signed in",
    codeHint: "Open the link below and enter this code to finish signing in:",
    copy: "Copy",
    copied: "Copied \u2713",
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
    stepWaiting: "Waiting for authorization\u2026",
    openSite: "Open {target}",
    copyLink: "Copy link",
    badgeNotSignedIn: "Not signed in",
    badgeClickToSignIn: "Click to sign in",
    badgeSwitchAccount: "Switch account",
    badgeSwitching: "Switching\u2026",
    badgeUsage: "Usage",
    badgeUsed: "used",
    badgeResets: "resets",
    badgeQuotaRemaining: "Quota left"
  },
  zh: {
    nav: "Copilot \u8D26\u53F7",
    title: "\u8D26\u53F7",
    intro: "\u5BF9\u8BDD\u9ED8\u8BA4\u4F7F\u7528\u6807\u8BB0\u4E3A\u9ED8\u8BA4\u7684 GitHub Copilot \u8D26\u53F7\uFF0C\u53EF\u5728\u6B64\u5207\u6362\u3002",
    addAccount: "\u6DFB\u52A0\u8D26\u53F7",
    optGithub: "GitHub.com",
    optGithubDesc: "\u4E2A\u4EBA\u4E0E\u4F01\u4E1A\u7EC4\u7EC7\u8D26\u53F7",
    optGhe: "GitHub Enterprise Cloud",
    optGheDesc: "\u8D35\u516C\u53F8 ghe.com \u57DF\u540D\u4E0B\u7684\u8D26\u53F7",
    domainLabel: "\u516C\u53F8 ghe.com \u57DF\u540D",
    domainPlaceholder: "company.ghe.com",
    continue: "\u7EE7\u7EED",
    cancel: "\u53D6\u6D88",
    defaultBadge: "\u9ED8\u8BA4",
    setDefault: "\u8BBE\u4E3A\u9ED8\u8BA4",
    signOut: "\u79FB\u9664\u8D26\u53F7",
    updateAuth: "\u66F4\u65B0\u6388\u6743",
    managePlan: "\u7BA1\u7406\u5957\u9910",
    plan: "\u5957\u9910",
    credits: "AI \u989D\u5EA6\uFF08\u6309\u6708\u91CD\u7F6E\uFF09",
    creditsNote: "AI \u989D\u5EA6\u6D88\u8017\u53D6\u51B3\u4E8E\u6A21\u578B\u4E0E token \u7528\u91CF\u3002",
    resetsOn: "\u91CD\u7F6E\u65E5\u671F",
    unlimited: "\u4E0D\u9650\u91CF",
    noAccounts: "\u8FD8\u6CA1\u6709\u5DF2\u767B\u5F55\u8D26\u53F7\u3002\u70B9\u300C\u6DFB\u52A0\u8D26\u53F7\u300D\u5F00\u59CB\u767B\u5F55\u3002",
    loading: "\u2026",
    signingIn: "\u6B63\u5728\u767B\u5F55",
    signingInDone: "\u5DF2\u767B\u5F55",
    codeHint: "\u5728\u6D4F\u89C8\u5668\u6253\u5F00\u4E0B\u9762\u7684\u94FE\u63A5\uFF0C\u8F93\u5165\u8FD9\u4E32\u4EE3\u7801\u5B8C\u6210\u6388\u6743\uFF1A",
    copy: "\u590D\u5236",
    copied: "\u5DF2\u590D\u5236 \u2713",
    unknown: "\u672A\u77E5\u9519\u8BEF",
    usageFailed: "\u7528\u91CF\u4E0D\u53EF\u7528",
    legacyAccount: "GitHub Copilot \u8D26\u53F7",
    menu: "\u66F4\u591A\u64CD\u4F5C",
    authFailed: "\u6388\u6743\u5931\u8D25",
    authFailedDesc: "\u4F7F\u7528\u8BBE\u5907\u7801\u6388\u6743\u767B\u5F55 {target}\u3002",
    tryAgain: "\u91CD\u8BD5",
    errorNetwork: "\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8BBE\u7F6E\u540E\u91CD\u8BD5\u3002",
    errorTimeout: "\u8BF7\u6C42\u8D85\u65F6\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    errorCancelled: "\u767B\u5F55\u5DF2\u53D6\u6D88\u3002",
    errorDomainMismatch: "\u8BBE\u5907\u7801\u94FE\u63A5\u4E0E\u4F01\u4E1A\u57DF\u540D\u4E0D\u5339\u914D\uFF0C\u8BF7\u68C0\u67E5\u57DF\u540D\u540E\u91CD\u8BD5\u3002",
    errorDefault: "\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    cancelSignIn: "\u53D6\u6D88\u767B\u5F55",
    signInTimeout: "\u767B\u5F55\u8D85\u65F6\uFF085 \u5206\u949F\u65E0\u64CD\u4F5C\uFF09\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    addGithubTitle: "\u6DFB\u52A0 GitHub \u8D26\u53F7",
    addGithubDesc: "\u4F7F\u7528\u8BBE\u5907\u7801\u6388\u6743\u767B\u5F55 GitHub.com\u3002",
    addGheDesc: "\u4F7F\u7528\u8BBE\u5907\u7801\u6388\u6743\u767B\u5F55 {domain}\u3002",
    stepCopied: "\u4EE3\u7801\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",
    stepOpened: "\u5DF2\u6253\u5F00 {target}",
    stepWaiting: "\u7B49\u5F85\u6388\u6743\u4E2D\u2026",
    openSite: "\u6253\u5F00 {target}",
    copyLink: "\u590D\u5236\u94FE\u63A5",
    badgeNotSignedIn: "\u672A\u767B\u5F55",
    badgeClickToSignIn: "\u70B9\u51FB\u767B\u5F55",
    badgeSwitchAccount: "\u5207\u6362\u8D26\u53F7",
    badgeSwitching: "\u5207\u6362\u4E2D\u2026",
    badgeUsage: "\u989D\u5EA6",
    badgeUsed: "\u5DF2\u4F7F\u7528",
    badgeResets: "\u91CD\u7F6E",
    badgeQuotaRemaining: "\u5269\u4F59\u989D\u5EA6"
  }
};
var NAV_TEXTS = Object.keys(DICTS).map((locale) => DICTS[locale].nav);
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
  if (lower.includes("\u53D6\u6D88")) {
    return t("errorCancelled");
  }
  if (lower.includes("\u4F01\u4E1A\u57DF\u540D\u672A\u751F\u6548") || lower.includes("domain")) {
    return t("errorDomainMismatch");
  }
  return `${t("errorDefault")} (${msg})`;
}
var COPILOT_ICON_SVG = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="flex:none"><path d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.128-1.769.693-2.484.579-.733 1.494-1.124 2.724-1.261 1.206-.134 2.262.034 2.944.765.05.053.096.108.139.165.044-.057.094-.112.143-.165.682-.731 1.738-.899 2.944-.765 1.23.137 2.145.528 2.724 1.261.566.715.693 1.614.693 2.484 0 .572-.053 1.148-.254 1.656.066.228.098.429.126.612.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795Zm0-1.485c2.28 0 4.584-1.11 5.002-1.433V7.862l-.023-.116c-.49.21-1.075.291-1.727.291-1.146 0-2.059-.327-2.71-.991A3.222 3.222 0 0 1 8 6.303a3.24 3.24 0 0 1-.544.743c-.65.664-1.563.991-2.71.991-.652 0-1.236-.081-1.727-.291l-.023.116v4.255c.419.323 2.722 1.433 5.002 1.433ZM6.762 2.83c-.193-.206-.637-.413-1.682-.297-1.019.113-1.479.404-1.713.7-.247.312-.369.789-.369 1.554 0 .793.129 1.171.308 1.371.162.181.519.379 1.442.379.853 0 1.339-.235 1.638-.54.315-.322.527-.827.617-1.553.117-.935-.037-1.395-.241-1.614Zm4.155-.297c-1.044-.116-1.488.091-1.681.297-.204.219-.359.679-.242 1.614.091.726.303 1.231.618 1.553.299.305.784.54 1.638.54.922 0 1.28-.198 1.442-.379.179-.2.308-.578.308-1.371 0-.765-.123-1.242-.37-1.554-.233-.296-.693-.587-1.713-.7Z"/><path d="M6.25 9.037a.75.75 0 0 1 .75.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 .75-.75Zm4.25.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 1.5 0Z"/></svg>';
var PLUS_SVG = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="flex:none;margin-right:6px;vertical-align:middle"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>';
var CHECK_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none;color:#2ea44f"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';
var GLOBE_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none;opacity:0.6"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm5.93-4.26a7.3 7.3 0 0 0-.52.8c-.35.65-.66 1.44-.85 2.34h2.4l.7-2.51a4.53 4.53 0 0 0-1.73-.63Zm2.8-.31-.52 1.87h2.15A6.52 6.52 0 0 0 8 1.55c-.61 0-1.2.09-1.77.25l.7 2.51h2.4c.16-.66.27-1.34.32-2.04a6.53 6.53 0 0 0-1.42-.25Zm-4.86 8.32c.19.9.5 1.69.85 2.34.16.3.34.56.52.8a4.53 4.53 0 0 0 1.73-.63l-.7-2.51h-2.4Zm5.66 2.51c.35-.65.66-1.44.85-2.34.17-.86.26-1.77.26-2.71h-2.4l-.7 2.51c.61.36 1.27.61 1.99.74.01.6.01 1.2 0 1.8Z"/></svg>';
var SPINNER_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex:none;animation:copilot-spin 0.8s linear infinite"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28 12" stroke-linecap="round" opacity="0.6"/></svg>';
var SPINNER_STYLE = "<style>@keyframes copilot-spin{to{transform:rotate(360deg)}}</style>";
var CHEVRON_DOWN_SVG = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="flex:none;margin-left:4px;vertical-align:middle"><path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"/></svg>';
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
    } catch {
    }
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(run);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}
var styles = {
  section: { maxWidth: 720, display: "flex", flexDirection: "column", gap: 12, fontFamily: "inherit" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: "24px" },
  intro: { margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.75 },
  button: {
    height: 32,
    padding: "0 14px",
    fontSize: 14,
    borderRadius: 16,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  primary: { background: "#4c6ef5", color: "#fff" },
  secondary: { background: "transparent", color: "inherit", border: "1px solid currentColor", opacity: 0.8 },
  addButton: {
    height: 32,
    padding: "0 14px",
    fontSize: 14,
    borderRadius: 16,
    cursor: "pointer",
    fontFamily: "inherit",
    background: "transparent",
    color: "inherit",
    border: "1px solid rgba(128,128,128,0.45)"
  },
  card: {
    border: "1px solid rgba(128,128,128,0.35)",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  cardTop: { display: "flex", alignItems: "center", gap: 12 },
  avatar: { borderRadius: "50%", flex: "none", objectFit: "cover", background: "rgba(128,128,128,0.25)" },
  avatarFallback: {
    borderRadius: "50%",
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(128,128,128,0.25)",
    color: "inherit",
    fontWeight: 600
  },
  who: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
  nameRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  name: { fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: {
    flex: "none",
    fontSize: 12,
    lineHeight: "18px",
    padding: "0 8px",
    borderRadius: 9,
    background: "rgba(128,128,128,0.18)"
  },
  sub: { margin: 0, fontSize: 13, lineHeight: "20px", opacity: 0.7 },
  dots: {
    flex: "none",
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "inherit",
    fontSize: 16,
    cursor: "pointer",
    opacity: 0.75
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 36,
    zIndex: 10,
    minWidth: 200,
    padding: 4,
    background: "var(--background, #fff)",
    color: "var(--foreground, #1a1a1a)",
    border: "1px solid rgba(128,128,128,0.4)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    gap: 2
  },
  menuItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 14,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  menuItemDisabled: { opacity: 0.45, cursor: "default" },
  menuItemDanger: { color: "#e03131" },
  backdrop: { position: "fixed", inset: 0, zIndex: 9, background: "transparent" },
  menuDesc: { fontSize: 12, lineHeight: "18px", opacity: 0.7, marginTop: 2 },
  planBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    paddingTop: 4,
    borderTop: "1px solid rgba(128,128,128,0.25)"
  },
  planTitle: { fontSize: 13, lineHeight: "20px", opacity: 0.7 },
  planValue: { fontSize: 14, lineHeight: "22px", fontWeight: 500 },
  creditsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13,
    lineHeight: "20px"
  },
  barTrack: { height: 6, borderRadius: 3, background: "rgba(128,128,128,0.25)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, background: "#4c6ef5" },
  muted: { margin: 0, fontSize: 12, lineHeight: "18px", opacity: 0.6 },
  codeHint: { margin: 0, fontSize: 13, lineHeight: "20px", opacity: 0.85 },
  codeRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  code: { fontSize: 24, fontWeight: 700, letterSpacing: 2, fontVariantNumeric: "tabular-nums" },
  link: { fontSize: 13, color: "#4c6ef5" },
  error: { margin: 0, fontSize: 13, lineHeight: "20px", color: "#e03131" },
  // 错误卡片（参考 GitHub Copilot desktop Authorization failed 样式）
  errorCard: {
    border: "1px solid rgba(128,128,128,0.35)",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  errorCardTitle: { margin: 0, fontSize: 16, fontWeight: 600, lineHeight: "24px" },
  errorCardDesc: { margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.7 },
  alertBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 8,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    fontSize: 13,
    lineHeight: "20px"
  },
  alertIcon: {
    flex: "none",
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#DC2626",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    marginTop: 2
  },
  errorActions: { display: "flex", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    minWidth: 180,
    height: 32,
    padding: "0 10px",
    fontSize: 14,
    borderRadius: 8,
    border: "1px solid rgba(128,128,128,0.45)",
    background: "transparent",
    color: "inherit",
    fontFamily: "inherit"
  }
};
function Avatar({ src, name: name2, size = 36 }) {
  const [broken, setBroken] = (0, import_react.useState)(false);
  const initial = (name2 ?? "?").trim().charAt(0).toUpperCase() || "?";
  if (!src || broken) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...styles.avatarFallback, width: size, height: size, fontSize: Math.round(size * 0.45) }, children: initial });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "img",
    {
      src,
      alt: "",
      width: size,
      height: size,
      style: styles.avatar,
      onError: () => setBroken(true)
    }
  );
}
function UsageBlock({ t, plan, usage, usageError }) {
  if (usageError) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: styles.muted, children: [
      t("usageFailed"),
      "\uFF1A",
      usageError
    ] });
  }
  if (!plan && !usage) return null;
  const percent = usage?.unlimited ? void 0 : usage?.percentUsed;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.planBlock, children: [
    plan !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.planTitle, children: t("plan") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.planValue, children: plan })
    ] }),
    usage?.unlimited === true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.muted, children: t("unlimited") }),
    typeof percent === "number" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.creditsRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("credits") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          Math.round(percent),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.barTrack, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...styles.barFill, width: `${Math.min(100, Math.max(0, percent))}%` } }) })
    ] }),
    usage?.resets !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.muted, children: [
      t("resetsOn"),
      " ",
      usage.resets
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.muted, children: t("creditsNote") })
  ] });
}
function AccountCard({ t, account, busy, menuOpen, onToggleMenu, onActivate, onLogout, onUpdateAuth, onManagePlan }) {
  const title = account.name ?? account.login ?? t("legacyAccount");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.cardTop, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, { src: account.avatarUrl, name: account.name ?? account.login }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.who, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.nameRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.name, children: title }),
          account.active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.badge, children: t("defaultBadge") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.sub, children: [account.login, account.domain].filter(Boolean).join(" \xB7 ") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative", flex: "none" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: styles.dots, "aria-label": t("menu"), onClick: onToggleMenu, children: "\u2026" }),
        menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.menu, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              style: { ...styles.menuItem, ...account.active || busy ? styles.menuItemDisabled : null },
              disabled: account.active || busy,
              onClick: onActivate,
              children: t("setDefault")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              style: { ...styles.menuItem, ...busy ? styles.menuItemDisabled : null },
              disabled: busy,
              onClick: onUpdateAuth,
              children: t("updateAuth")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              style: { ...styles.menuItem, ...busy ? styles.menuItemDisabled : null },
              disabled: busy,
              onClick: onManagePlan,
              children: t("managePlan")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              style: { ...styles.menuItem, ...styles.menuItemDanger, ...busy ? styles.menuItemDisabled : null },
              disabled: busy,
              onClick: onLogout,
              children: t("signOut")
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageBlock, { t, plan: account.plan, usage: account.usage, usageError: account.usageError })
  ] });
}
function CopilotSection({ t = (key) => DICTS.en[key] ?? key }) {
  const [accounts, setAccounts] = (0, import_react.useState)(null);
  const [signing, setSigning] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(void 0);
  const [syncError, setSyncError] = (0, import_react.useState)(void 0);
  const [copied, setCopied] = (0, import_react.useState)(false);
  const [linkCopied, setLinkCopied] = (0, import_react.useState)(false);
  const [linkOpened, setLinkOpened] = (0, import_react.useState)(false);
  const [addOpen, setAddOpen] = (0, import_react.useState)(false);
  const [enterpriseStep, setEnterpriseStep] = (0, import_react.useState)(false);
  const [domain, setDomain] = (0, import_react.useState)("");
  const [menuFor, setMenuFor] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [lastStart, setLastStart] = (0, import_react.useState)(null);
  const [countdown, setCountdown] = (0, import_react.useState)(0);
  const timer = (0, import_react.useRef)(null);
  const timeoutTimer = (0, import_react.useRef)(null);
  const stopTimers = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (timeoutTimer.current) {
      clearInterval(timeoutTimer.current);
      timeoutTimer.current = null;
    }
  };
  const startTimeout = () => {
    if (timeoutTimer.current) clearInterval(timeoutTimer.current);
    setCountdown(300);
    timeoutTimer.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          if (timeoutTimer.current) {
            clearInterval(timeoutTimer.current);
            timeoutTimer.current = null;
          }
          if (timer.current) {
            clearInterval(timer.current);
            timer.current = null;
          }
          fetch("/copilot-auth/cancel", { method: "POST" }).catch(() => {
          });
          setSigning(null);
          setError(t("signInTimeout"));
          return 0;
        }
        return n - 1;
      });
    }, 1e3);
  };
  const cancelSignIn = () => {
    stopTimers();
    fetch("/copilot-auth/cancel", { method: "POST" }).catch(() => {
    });
    setSigning(null);
    setLastStart(null);
    setCountdown(0);
    setError(void 0);
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
  (0, import_react.useEffect)(() => {
    let alive = true;
    fetch("/copilot-auth/state").then((r) => r.json()).then((s) => {
      if (!alive) return;
      if (s.status === "running") {
        setSigning(s);
        poll();
      } else if (s.status === "failed") {
        setError(s.error ?? t("unknown"));
      }
    }).catch(() => {
    });
    refreshAccounts();
    return () => {
      alive = false;
      stopTimers();
    };
  }, []);
  const poll = () => {
    if (timer.current) clearInterval(timer.current);
    startTimeout();
    const tick = () => {
      fetch("/copilot-auth/state").then((r) => r.json()).then((s) => {
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
      }).catch(() => {
      });
    };
    tick();
    timer.current = setInterval(tick, 1e3);
  };
  const start = async (kind, domainValue) => {
    setAddOpen(false);
    setEnterpriseStep(false);
    setError(void 0);
    setCopied(false);
    setLinkCopied(false);
    setLinkOpened(false);
    setLastStart({ kind, domain: domainValue });
    try {
      const res = await fetch("/copilot-auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, domain: domainValue })
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
  const retry = () => {
    if (lastStart === null) return;
    start(lastStart.kind, lastStart.domain);
  };
  const cancelError = () => {
    setError(void 0);
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
        body: JSON.stringify({ id })
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
        body: JSON.stringify({ id })
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
  const updateAuth = async (account) => {
    setMenuFor(null);
    const kind = account.domain === "github.com" ? "github.com" : "ghe.com";
    const domainValue = account.domain === "github.com" ? void 0 : account.domain;
    await start(kind, domainValue);
  };
  const managePlan = (account) => {
    setMenuFor(null);
    const base = account.domain === "github.com" ? "https://github.com" : `https://${account.domain}`;
    window.open(`${base}/settings/copilot`, "_blank", "noopener");
  };
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
    }
  };
  const openSite = async (url) => {
    if (!url) return;
    try {
      const r = await fetch("/copilot-auth/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (r.ok) setLinkOpened(true);
    } catch {
    }
  };
  const copyLinkUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2e3);
    } catch {
    }
  };
  const closeMenus = () => {
    setAddOpen(false);
    setMenuFor(null);
  };
  const codeNotice = signing ? [...signing.notices ?? []].reverse().find((n) => n && typeof n.code === "string" && n.code !== "") : void 0;
  const codeUrl = codeNotice?.url;
  const autoOpenedRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!codeUrl || !codeNotice?.code || autoOpenedRef.current === codeNotice.code) return;
    autoOpenedRef.current = codeNotice.code;
    setLinkOpened(false);
    void openSite(codeUrl);
  }, [codeUrl, codeNotice?.code]);
  const signInTarget = signing?.kind === "ghe.com" && signing?.domain ? `${t("optGhe")}\uFF08${signing.domain}\uFF09` : t("optGithub");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.section, children: [
    (addOpen || menuFor !== null) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.backdrop, onClick: closeMenus }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.headerRow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: styles.title, children: t("title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative", flex: "none" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", style: styles.addButton, onClick: () => {
          setMenuFor(null);
          setAddOpen((v) => !v);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: PLUS_SVG } }),
          t("addAccount"),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: CHEVRON_DOWN_SVG } })
        ] }),
        addOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.menu, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", style: styles.menuItem, onClick: () => start("github.com"), children: [
            t("optGithub"),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.menuDesc, children: t("optGithubDesc") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              style: styles.menuItem,
              onClick: () => {
                setAddOpen(false);
                setEnterpriseStep(true);
              },
              children: [
                t("optGhe"),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.menuDesc, children: t("optGheDesc") })
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.intro, children: t("intro") }),
    enterpriseStep && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: styles.sub, htmlFor: "ghc-domain", children: t("domainLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.codeRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: "ghc-domain",
            style: styles.input,
            placeholder: t("domainPlaceholder"),
            value: domain,
            onChange: (e) => setDomain(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: { ...styles.button, ...styles.primary },
            disabled: domain.trim() === "",
            onClick: () => start("ghe.com", domain.trim()),
            children: t("continue")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.button, ...styles.secondary }, onClick: () => setEnterpriseStep(false), children: t("cancel") })
      ] })
    ] }),
    signing?.status === "running" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: SPINNER_STYLE } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: { ...styles.title, fontSize: 16 }, children: t("addGithubTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { ...styles.intro, marginTop: 4 }, children: (signing.domain && signing.domain !== "github.com" ? t("addGheDesc") : t("addGithubDesc")).replace("{domain}", signing.domain).replace("{target}", signing.domain ?? t("optGithub")) })
      ] }),
      codeNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...styles.codeRow, cursor: "pointer" }, onClick: () => copyCode(codeNotice.code), role: "button", tabIndex: 0, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.code, children: codeNotice.code }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: copied ? CHECK_SVG : '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="flex:none;opacity:0.5"><rect x="5" y="5" width="9" height="9" rx="2"/><rect x="2" y="2" width="9" height="9" rx="2"/></svg>' } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: "20px", opacity: copied ? 1 : 0.5 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: copied ? CHECK_SVG : '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none;opacity:0.4"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>' } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("stepCopied") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: "20px", opacity: linkOpened ? 1 : 0.5 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: linkOpened ? CHECK_SVG : GLOBE_SVG } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("stepOpened").replace("{target}", signing.domain ?? t("optGithub")) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: "20px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: SPINNER_SVG } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("stepWaiting") }),
          countdown > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { opacity: 0.4, fontSize: 12 }, children: [
            "(",
            Math.floor(countdown / 60),
            ":",
            String(countdown % 60).padStart(2, "0"),
            ")"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        codeUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: { ...styles.button, background: "#2ea44f", color: "#fff", border: "none" },
            onClick: () => openSite(codeUrl),
            children: t("openSite").replace("{target}", signing.domain ?? t("optGithub"))
          }
        ),
        codeUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.button, ...styles.secondary }, onClick: () => copyLinkUrl(codeUrl), children: linkCopied ? t("copied") : t("copyLink") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.button, ...styles.secondary, opacity: 0.7 }, onClick: cancelSignIn, children: t("cancelSignIn") }) })
    ] }),
    error && lastStart !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.errorCard, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { style: styles.errorCardTitle, children: t("authFailed") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.errorCardDesc, children: t("authFailedDesc").replace(
        "{target}",
        lastStart.kind === "ghe.com" && lastStart.domain ? lastStart.domain : t("optGithub")
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.alertBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.alertIcon, children: "!" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: friendlyError(error, t) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.errorActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.button, ...styles.secondary }, onClick: cancelError, children: t("cancel") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: { ...styles.button, ...styles.primary }, onClick: retry, children: t("tryAgain") })
      ] })
    ] }),
    error && lastStart === null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.error, children: error }),
    accounts === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.sub, children: t("loading") }) : accounts.length === 0 && signing === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.sub, children: t("noAccounts") }) : accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      AccountCard,
      {
        t,
        account,
        busy,
        menuOpen: menuFor !== null && menuFor === account.id,
        onToggleMenu: () => setMenuFor((v) => v === account.id ? null : account.id),
        onActivate: () => activate(account.id),
        onLogout: () => logout(account.id),
        onUpdateAuth: () => updateAuth(account),
        onManagePlan: () => managePlan(account)
      },
      account.id
    )),
    syncError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: styles.muted, children: [
      "sync: ",
      syncError
    ] })
  ] });
}
var BADGE_COPILOT_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex:none"><path d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.128-1.769.693-2.484.579-.733 1.494-1.124 2.724-1.261 1.206-.134 2.262.034 2.944.765.05.053.096.108.139.165.044-.057.094-.112.143-.165.682-.731 1.738-.899 2.944-.765 1.23.137 2.145.528 2.724 1.261.566.715.693 1.614.693 2.484 0 .572-.053 1.148-.254 1.656.066.228.098.429.126.612.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795Zm0-1.485c2.28 0 4.584-1.11 5.002-1.433V7.862l-.023-.116c-.49.21-1.075.291-1.727.291-1.146 0-2.059-.327-2.71-.991A3.222 3.222 0 0 1 8 6.303a3.24 3.24 0 0 1-.544.743c-.65.664-1.563.991-2.71.991-.652 0-1.236-.081-1.727-.291l-.023.116v4.255c.419.323 2.722 1.433 5.002 1.433ZM6.762 2.83c-.193-.206-.637-.413-1.682-.297-1.019.113-1.479.404-1.713.7-.247.312-.369.789-.369 1.554 0 .793.129 1.171.308 1.371.162.181.519.379 1.442.379.853 0 1.339-.235 1.638-.54.315-.322.527-.827.617-1.553.117-.935-.037-1.395-.241-1.614Zm4.155-.297c-1.044-.116-1.488.091-1.681.297-.204.219-.358.679-.242 1.614.091.726.303 1.231.618 1.553.299.305.784.54 1.638.54.922 0 1.28-.198 1.442-.379.179-.2.308-.578.308-1.371 0-.765-.123-1.242-.37-1.554-.233-.296-.693-.587-1.713-.7Z"/><path d="M6.25 9.037a.75.75 0 0 1 .75.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 .75-.75Zm4.25.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 1.5 0Z"/></svg>';
async function openCopilotSettings() {
  const isVisible = (el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const waitFor = (check, timeout) => new Promise((resolve) => {
    const existing = check();
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = check();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
  try {
    const moreButton = Array.from(document.querySelectorAll("button")).find((b) => {
      if (!isVisible(b)) return false;
      const label = b.getAttribute("aria-label");
      const text = (b.textContent || "").trim();
      return label === "\u8D26\u53F7\u83DC\u5355" || label === "Account menu" || text === "\u66F4\u591A" || text === "More";
    });
    if (!moreButton) {
      console.warn("[copilot-auth] account-menu ('\u66F4\u591A') button not found");
      return;
    }
    console.log("[copilot-auth] found account-menu button, clicking to open menu");
    moreButton.click();
    const settingsItem = await waitFor(() => {
      const candidates = document.querySelectorAll('button[role="menuitem"], [role="menuitem"]');
      for (const el of candidates) {
        if (!isVisible(el)) continue;
        const text = (el.textContent || "").trim();
        if (text === "\u8BBE\u7F6E" || text.startsWith("\u8BBE\u7F6E") || text === "Settings" || text.startsWith("Settings")) {
          return el;
        }
      }
      return null;
    }, 2500);
    if (!settingsItem) {
      console.warn("[copilot-auth] '\u8BBE\u7F6E' menu item not found after opening account menu");
      return;
    }
    console.log("[copilot-auth] found '\u8BBE\u7F6E' menu item, clicking to open settings panel");
    settingsItem.click();
    const panel = await waitFor(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) {
        if (!isVisible(d)) continue;
        if (d.querySelectorAll("nav button").length > 0) return d;
      }
      return null;
    }, 5e3);
    if (!panel) {
      console.warn("[copilot-auth] settings panel with nav did not appear within 5s");
      return;
    }
    console.log("[copilot-auth] settings panel rendered");
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
      console.log(
        "[copilot-auth] available nav texts:",
        Array.from(navButtons).map((b) => b.textContent)
      );
    }
  } catch (err) {
    console.warn("[copilot-auth] openCopilotSettings error:", err);
  }
}
function AccountAvatar({ url, login, size = 18 }) {
  const [failed, setFailed] = (0, import_react.useState)(false);
  const box = {
    width: size,
    height: size,
    borderRadius: "50%",
    flex: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "#adb5bd"
  };
  if (url && !failed) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: box, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: url,
        alt: "",
        referrerPolicy: "no-referrer",
        onError: () => setFailed(true),
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "50%" }
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...box, fontSize: Math.round(size * 0.55), color: "#fff", fontWeight: 600 }, children: (login ?? "?")[0]?.toUpperCase() ?? "?" });
}
function CopilotBadge({ t = (k) => DICTS.en[k] ?? k }) {
  const [whoami, setWhoami] = (0, import_react.useState)(null);
  const [accounts, setAccounts] = (0, import_react.useState)(null);
  const [open, setOpen] = (0, import_react.useState)(false);
  const [switching, setSwitching] = (0, import_react.useState)(null);
  const timer = (0, import_react.useRef)(null);
  const badgeRef = (0, import_react.useRef)(null);
  const refresh = () => {
    fetch("/copilot-auth/whoami").then((r) => r.json()).then((d) => setWhoami(d)).catch(() => {
    });
    fetch("/copilot-auth/accounts").then((r) => r.json()).then((d) => setAccounts(d?.accounts ?? [])).catch(() => {
    });
  };
  (0, import_react.useEffect)(() => {
    refresh();
    timer.current = setInterval(refresh, 3e4);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  const switchAccount = async (id) => {
    if (typeof id !== "string" || id === "") return;
    setOpen(false);
    setSwitching(id);
    try {
      await fetch("/copilot-auth/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id })
      });
      refresh();
    } catch {
    }
    setSwitching(null);
  };
  const badgeOpacity = whoami?.configured ? 1 : 0.5;
  const used = whoami?.usagePercent;
  const quotaRemaining = typeof used === "number" ? Math.round(Math.max(0, Math.min(100, 100 - used))) : null;
  const lowQuota = quotaRemaining !== null && quotaRemaining < 20;
  if (!whoami) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "copilot-badge", style: { opacity: badgeOpacity }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: BADGE_COPILOT_SVG } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "copilot-badge-label", style: { opacity: 0.4 }, children: "\u2026" })
    ] });
  }
  if (!whoami.configured) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "span",
      {
        className: "copilot-badge",
        title: t("badgeClickToSignIn"),
        onClick: () => openCopilotSettings(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: BADGE_COPILOT_SVG } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "copilot-badge-label", children: t("badgeNotSignedIn") })
        ]
      }
    );
  }
  const badgeTitle = [
    whoami.login,
    quotaRemaining !== null && `${t("badgeQuotaRemaining")} ${quotaRemaining}%`
  ].filter(Boolean).join(" \xB7 ") || void 0;
  const badgeRect = badgeRef.current?.getBoundingClientRect();
  const popupStyle = badgeRect ? {
    position: "fixed",
    left: badgeRect.left,
    bottom: window.innerHeight - badgeRect.top + 4,
    background: "var(--dsh-bg, #fff)",
    border: "1px solid rgba(128,128,128,0.3)",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: 0,
    minWidth: 280,
    maxWidth: 320,
    zIndex: 100001,
    overflow: "hidden"
  } : null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { position: "relative", flex: "none" }, ref: badgeRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "copilot-badge", title: badgeTitle, onClick: () => setOpen((v) => !v), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { dangerouslySetInnerHTML: { __html: BADGE_COPILOT_SVG } }),
      quotaRemaining !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "copilot-badge-label", style: lowQuota ? { color: "#e03131" } : void 0, children: [
        quotaRemaining,
        "%"
      ] })
    ] }),
    open && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { position: "fixed", inset: 0, zIndex: 1e5 }, onClick: () => setOpen(false) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: popupStyle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid rgba(128,128,128,0.15)"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 13, fontWeight: 600 }, children: whoami.plan ?? "Copilot" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                title: t("nav"),
                style: {
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 4,
                  color: "var(--dsh-fg, currentColor)",
                  opacity: 0.65,
                  display: "inline-flex",
                  alignItems: "center",
                  lineHeight: 0
                },
                onClick: (e) => {
                  e.stopPropagation();
                  setOpen(false);
                  openCopilotSettings();
                },
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "3" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })
                ] })
              }
            )
          ] }),
          whoami.usagePercent !== null && whoami.usagePercent !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "10px 12px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, opacity: 0.7 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("badgeUsage") }),
              whoami.usageResetDate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                t("badgeResets"),
                " ",
                whoami.usageResetDate
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 20, fontWeight: 700 }, children: [
                whoami.usagePercent,
                "%"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 12, opacity: 0.6 }, children: t("badgeUsed") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { height: 4, background: "rgba(128,128,128,0.2)", borderRadius: 2, overflow: "hidden" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
              height: "100%",
              width: `${whoami.usagePercent}%`,
              background: whoami.usagePercent > 80 ? "#e03131" : "#4c6ef5",
              borderRadius: 2
            } }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderTop: whoami.usagePercent !== null && whoami.usagePercent !== void 0 ? "none" : "1px solid rgba(128,128,128,0.15)"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountAvatar, { url: whoami.avatarUrl, login: whoami.login, size: 18 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
              fontSize: 13,
              flex: "1 1 auto",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }, children: whoami.login ?? "\u2014" })
          ] }),
          accounts && accounts.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { borderTop: "1px solid rgba(128,128,128,0.15)", padding: "4px 0" }, children: accounts.map((acc) => {
            const active = acc.active;
            const label = `${acc.domain}/${acc.login ?? acc.name ?? t("legacyAccount")}`;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 12px",
                  border: "none",
                  background: active ? "rgba(76,109,245,0.08)" : "transparent",
                  cursor: active ? "default" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  textAlign: "left",
                  color: "inherit"
                },
                disabled: active || switching !== null,
                onClick: () => switchAccount(acc.id),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountAvatar, { url: acc.avatarUrl, login: acc.login, size: 18 }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: label, style: { minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: label }),
                  active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", fontSize: 11, opacity: 0.5 }, children: "\u2713" }),
                  switching === acc.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", fontSize: 11, opacity: 0.5 }, children: t("badgeSwitching") })
                ]
              },
              acc.id
            );
          }) })
        ] })
      ] }),
      document.body
    )
  ] });
}
function apply(ctx) {
  console.log("[copilot-auth] client apply v3 (badge+label+settings-jump)");
  ctx.locale.register("copilot-auth", DICTS);
  const t = ctx.locale.bind("copilot-auth");
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
  /* \u4E0E ui-chat StatsPills .root \u540C\u6B3E\u5B57\u53F7\uFF08secondary - 1px\uFF09\uFF0C\u4FDD\u8BC1\u8DDF\u65C1\u8FB9
     \u8F6E\u6B21/\u7528\u91CF/\u547D\u4E2D\u7387\u4E09\u4E2A pill \u89C6\u89C9\u4E00\u81F4 */
  font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);
  line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));
}
.copilot-badge:hover{
  background:var(--dsw-alias-interactive-bg-hover);
  color:var(--dsw-alias-label-secondary);
}
.copilot-badge svg{
  width:14px;height:14px;flex:none;
  /* octicons copilot-16 path \u89C6\u89C9\u91CD\u5FC3\u504F\u4E0A\uFF08DSH \u6807\u51C6\u56FE\u6807\u5728 path \u5C42\u9762
     \u505A\u4E86\u5149\u5B66\u504F\u79FB\uFF0C\u53C2\u8003 IconGaugeOutline16 \u6CE8\u91CA\u300C0.75 drop optically
     centers the drawn extent in the 16 box\u300D\uFF09\uFF0C\u7528 transform \u8865\u507F
     \u8BA9 logo \u8DDF\u5176\u4ED6 pill svg \u89C6\u89C9\u5BF9\u9F50\uFF0C\u4E0D\u7834\u574F path \u6570\u636E */
  transform:translateY(1px);
}
/* \u54CD\u5E94\u5F0F\u6536\u7F29\uFF1A\u8DDF StatsPills .label \u4E00\u81F4\uFF08min-width:0; overflow:hidden;
   text-overflow:ellipsis\uFF09\uFF0C\u5F53\u7A97\u53E3\u5C0F flex \u5BB9\u5668\u6536\u7F29\u65F6\u6587\u5B57\u88AB\u88C1\u6389\u53EA\u7559
   logo\uFF0C\u8DDF\u65C1\u8FB9 StatsPills pill \u884C\u4E3A\u4E00\u81F4\u3002flex:0 1 auto \u8BA9 label \u53EF\u6536\u7F29
   \u800C svg\uFF08flex:none\uFF09\u4FDD\u6301\u539F\u5C3A\u5BF8\u3002 */
.copilot-badge-label{
  min-width:0;overflow:hidden;text-overflow:ellipsis;
  flex:0 1 auto;white-space:nowrap;
}
`;
    document.head.appendChild(style);
  }
  ctx.slots.inject("settings.section", () => ctx.slots.register(
    { name: "settings.section", id: "copilot", order: 11, label: () => t("nav"), inject: () => ({ t }) },
    CopilotSection
  ));
  ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register(
    { name: "conversation.composer.dock", id: "copilot-badge", order: 50, inject: () => ({ t }) },
    CopilotBadge
  ));
  startNavIconEnforcer(() => t("nav"));
}

		return module.exports;
	}
});
