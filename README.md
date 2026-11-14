# dsh-github-copilot-accounts

为 DSH（DeepSeek Harness）**桌面版**提供 GitHub Copilot **多账号与会话绑定**：设备码登录、全局默认或每个会话独立选账号、额度与用量展示。此分支针对 `DSH 0.2.2-rc.1 / Cordis 4.1`，使用插件标准适配器、会话投影、Remote 与 composition 隔离接口，不修改安装包或核心方法。

## 这是什么

用 GitHub 账号（带 Copilot 订阅）登录 DSH 的方式，和其他 Copilot 客户端（VSCode 等）一致：**网页 + 设备码**，全程不填 API Token。支持 **GitHub.com** 与 **GitHub Enterprise Cloud（ghe.com 域名）** 两种账号，**多账号并存、全局默认与会话专属绑定分离**，界面与交互对齐 GitHub Copilot desktop 的 Accounts 设置页。

本插件**复用 DSH 内置的原生 Copilot provider 与协议实现**。每个账号使用独立凭据映射，DSH 的会话模型选择记录保存绑定；请求准备后固定账号，不在发送前临时切换共享凭据。登录、头像、用量和短期凭据/模型权限刷新由账号管理层负责；不把 OAuth token 发给客户端。

## 特性

- 🔐 **设备码登录/注销**：网页 + user code，免 API Token；SSO 组织授权友好
- 👥 **多账号管理**：「添加账号」下拉支持 GitHub.com 与 GitHub Enterprise Cloud（输入 `company.ghe.com` 域名）两种入口；不同域名下的同名账号可独立并存，**Default 徽标**标记当前激活账号，… 菜单一键切换/注销；对话中的账号切换列表以单行 `domain/username` 显示账号（如 `github.com/alice`、`corpb.ghe.com/alice`），区分同名账号；过长标签省略显示，悬停可见完整内容
- 📊 **用量展示**：每张账号卡显示套餐、AI credits 和当前已用比例；同一 UTC 月进度游标在每条账号额度条上垂直对齐，图例与已过／剩余天数只在总览显示一次。会话菜单每行账号右侧显示独立余量，无限额度为 `∞`、读取失败或未知为 `—`。
- 🧩 **预置提供方路由**：安装即出现在 Models 页，无需手动配置
- 📦 **模型目录兜底填充**：登录成功/切换账号时，若 GitHub Copilot 路由还没有模型目录，自动填入账号可用模型（∩ 内置目录）；你已精简/定制过的目录**永不覆盖**（重启、重新登录均不重置）
- 🌐 **中/英双语界面**：跟随 DSH 语言设置自动切换
- 🔑 **凭据安全托管**：全部账号存入 DSH 内置凭据库（文件强制 0600 权限），Copilot 临时 token 到期自动刷新
- 🧪 **测试与 CI**：单元测试覆盖登录、账号隔离、激活/注销与用量等行为；GitHub Actions 构建测试

## 前置要求

- DSH `0.2.2-rc.1` desktop、Cordis `4.1.x`（此分支的原生接口/离线集成目标；旧版不作为兼容目标）
- 有效的 GitHub Copilot 订阅（个人账号或企业组织账号均可，SSO 登录）
- `pnpm` 可用（`dsh plugin` 是 pnpm 转发器）

## 安装

```bash
dsh plugin add dsh-github-copilot-accounts
```

或从源码路径安装：

```bash
dsh plugin add /path/to/dsh-github-copilot-accounts
```

安装、更新或移除后，**完整退出并重启 DSH desktop**。

会话策略不支持运行中热切回原始全局服务。若操作提示 `COPILOT_RESTART_REQUIRED`，请正常退出后重启；这是失败关闭的安全边界，不会静默改用其他账号。

### 故障排查

- 出站网络与代理由 DSH 启动器统一配置；本插件使用标准 `fetch`，不改写进程全局 dispatcher/fetch，也不记录代理 URL 或凭据。

- 企业镜像/私有源环境下 pnpm 解析 peer 失败：`export npm_config_auto_install_peers=false` 后重试（profile 自带的 pnpm workspace 默认已关闭 peer 自动安装）。
- registry 的 `latest` dist-tag 可能落后于 `next`：显式按版本号安装/排查时勿被 `latest` 误导。

## 账号管理

1. 打开设置，进入侧栏「**Copilot 账号**」（英文界面为 *Copilot Accounts*，位于 Models 之后）
2. 点右上「**＋ 添加账号 ⌄**」，选择登录方式：
   - **GitHub.com** — 个人与企业组织账号
   - **GitHub Enterprise Cloud** — 贵公司 ghe.com 域名下的账号（填入 `company.ghe.com` 形式的域名后继续）
3. 页面显示一串**代码**（user code，可一键复制）与验证链接（企业账号为 `https://<你的域名>/login/device`）
4. 新标签打开链接，用对应账号输入代码；**SSO 用户必须对组织点 Authorize**（跳过则登录不生效）
5. 成功后账号出现在列表中并带 **Default** 徽标（新登录账号自动成为默认）

> 设备码有时效（约 15 分钟），请拿到代码后尽快完成授权。若超时，页面会显示失败原因，重新添加即可。

**多账号语义**（对齐 GitHub Copilot desktop）：

- 多个账号可同时保持登录；**全局默认**只用于选择「跟随全局默认」的会话。会话可固定绑定另一个账号，并发请求与刷新相互隔离。添加并成功登录新账号仍会更新全局默认，但不改写已有的专属绑定
- 账号按归一化的**域名 + 用户名**区分：同一域名的不同用户、不同域名的同名用户均可独立切换/移除；同一域名与用户名重新授权会更新原账号而非新增一条
- 卡片右上 **…** 菜单：**设为默认**（切换激活，即刻生效，无需重启）/ **移除账号**（仅清除所选账号凭据）/ **更新授权**（保留原槽位，重新进行同域名设备码登录）
- 身份查询失败而暂时没有用户名的恢复账号也可独立切换/移除，不会因用户名缺失误操作其它账号
- 每张卡片下方展示该账号的**套餐（Plan）**与 **AI credits** 进度条（按月重置）；用量拉取失败不影响登录与切换，仅显示不可用原因
- 移除默认账号后，跟随默认的会话需要重新选择默认账号；移除被绑定的账号后，对应会话明确报不可用，不会悄悄切到其他账号。其余账号绑定不受影响

## 用量与月进度

设置页和会话账号菜单显示 UTC 月的已过／剩余天数。每个账号额度条都有自己的**蓝色圆点**和当前已用比例，并在相同 x 坐标显示**黄色菱形**作为 UTC 月进度，便于纵向比较消耗快慢；顶部总览只显示一次图例和日期说明。

插件不保存用量历史、不绘制趋势、不估算月底余额，也不会在 profile 写入用量采样文件。这样当前用量偶发不可用时，不会留下片段化历史造成困惑。

“合计已用”只在两个或以上登录账号时显示，形式如 `合计已用 25% / 400%`。这是把每个账号的**当前百分比按 100% 归一化相加**的查看辅助，绝不是加权 AI credit 金额、独立计费池或组织共享额度的真实总余额。

网页 “Usage billed to” 是“选择谁支付”。插件不读取、切换或改变它，也不改变模型请求的计费目标。普通 Copilot 用户接口没有提供网页下拉项的身份/余额契约；更多边界见[计费主体调查](docs/copilot-billing-options-research.md)。

## 会话账号

在输入框下方点击 Copilot 额度徽标：

- 选择 `domain/username`：固定用于当前会话；另一会话可选择不同账号。
- 选择「跟随全局默认」：使用受管理的默认账号路径。
- 「设为全局默认」是独立动作，不等同于会话绑定；账号管理设置页仍提供全局操作。

会话忙碌时不接受新的绑定请求；若操作校验期间恰好开始执行，已准备的请求不变，后续步骤才使用新选择。当前模型不被目标账号支持时明确拒绝，不暗中替换模型。非 Copilot 会话请先显式选择 Copilot 模型。

绑定使用 DSH 原生会话路由记录保存，恢复和分支继承对应记录边界。原生 fork 子代理会在首个请求前修正「旧 seed 覆盖已捕获账号」的情况；已有子代理不会随父会话后续选择被重新绑定。自定义后端及显式辅助模型覆盖不被伪装成当前会话账号。

### 同一会话切号后继续

旧账号的原生签名和不可信 replay 不会给新账号使用；传输 affinity 按会话、实际账号与代际隔离。正常的同账号工具推理签名不会因为临时网络错误或压缩而一概丢弃。聊天记录、已完成的工具结果不被删除或静默重跑。

切号后的续接请求若最终失败，会显示简短提示并失效可重建的请求状态。插件不自动重跑整轮或工具；权限、额度等服务端问题仍需按 DSH 错误提示处理。

## 使用

- Models 页选择 `GitHub Copilot` 路由，模型目录已在首次登录时自动填充账号可用模型，无需手动「添加模型」；之后可自由增删精简，重启 / 重新登录都不会重置你的列表
- **配额说明**：base 模型（GPT-4o/4.1 一类）不耗 premium requests；premium 模型（Claude、Gemini、o 系列等）每次调用消耗月度配额。日常建议 base 档，premium 模型按需手动选

## 注销与卸载

- 移除单账号：账号卡 **…** 菜单 →「移除账号」
- 卸载：`dsh plugin remove dsh-github-copilot-accounts` 后重启 DSH desktop（卸载不影响凭据库中已有记录，重装即恢复）

## 工作原理

- 通过 `cordis.patch.yml` 生效：
  1. 注册本插件（host 侧提供 `/copilot-auth` 本地登录、账号、资料与用量接口，跨站 Origin 拒绝）
  2. 以 settings base 层预置 `github-copilot` 路由（用户 `settings.yaml` 可逐字段覆盖）
- 登录复用 GitHub 设备码流；全局默认仍保留 `llm-pi-ai/github-copilot` 镜像，账号槽位由 DSH 凭据服务托管在 `copilot-auth` scope。新槽位按域名与用户名隔离，旧 id 保持不变。受管理请求实际从固定账号槽位读取/刷新，不在发送时来回覆盖主记录
- 标准 `LlmAdapter` 注册拥有全部受管理逻辑路由；每账号内部仍保留原生 `github-copilot` 身份及专属 CredentialStore。默认路由在请求准备时捕获已知 OAuth 账号；未知 API-key/显式认证覆盖不会被猜作某个账号
- 会话操作走所属 Host 的 `copilotAccounts` 原生 Remote，只允许明确的 owner 调用，按 Session 资源校验并在异步操作后复核；不通过本地 REST 代替远端 Host，也不因同名 Session/账号而复用另一连接的数据
- `/copilot-auth/accounts` 为每个账号返回 `id`（实际凭据槽位 key，不含 token 的不透明标识）；前端仅将它用于列表/菜单定位与 `activate`、`logout` 的 `{id}` 请求，用户名仅用于显示，不从用户名或域名自行拼装 id。旧客户端的 `{login}` 请求仅在用户名唯一匹配时兼容；多个域名下有同名账号时返回 `409`，客户端应重新读取账号列表并使用对应 `id`
- 账号身份（login/姓名/头像）取自 `api.<域名>/user`。`accounts` / `whoami` 查询按 5 分钟资料 TTL 刷新并合并同账号的并发请求，失败后缓存 1 分钟并保留原资料；该 TTL 是客户端策略，不代表头像签名有效期。刷新仅更新槽位的 `account` 元数据，不改主授权或 token 字段
- **头像加载恢复**：GHE 自定义头像可能返回带签名的完整 URL，前端原样加载，不提取签名或附带 OAuth token。图片失败时通过 `POST /copilot-auth/profile {id}` 请求新资料并仅重试一次（强制刷新有 30 秒冷却）；URL / 账号改变时重置失败状态。接口不接收任意 URL，不代理图片；重复失败保留首字母圆标，不无限重试
- 套餐与用量取自 `copilot_internal/user`，直接使用长期 refresh token 认证，结果按 grant 绑定缓存 5 分钟；Copilot 短期 token 刷新独立进行
- **模型目录兜底填充**：登录成功/切换账号时，取「凭据缓存的账号可用模型 ∩ pi-ai 内置目录」写入该路由的模型目录——仅当该路由尚未配置 `models` 且无 `modelOverrides` 时写入；目录已存在（含空列表）一律让路，插件启动/重启也绝不触碰用户 settings。同步失败经 `/copilot-auth/accounts` 的 `syncError` 字段暴露
- **存储兼容**：已有 `copilot-auth/account-<login>` 与 `recovered-*` 槽位保留原 key，不要求迁移或重新登录；同一归一化域名与用户名重新授权会复用已有槽位及其 id。v0.1.0 单账号升级时，首次打开账号页或再次登录会将旧主凭据自动快照为槽位。旧版本已经因跨域同名覆盖而丢失的授权无法凭空恢复，需要重新添加该账号

## 已知边界

- **不改写内置模型描述**：pi-ai 的内置描述随 DSH 安装包升级；本插件会刷新账号的可用模型权限并与内置/配置目录求交集，但不修改 `app.asar` 或凭空补出上游尚未描述的模型
- **ghe.com 用量端点未实测**（实测账号为 github.com 组织账号）：企业账号的 `copilot_internal/user` 按 pi-ai token 端点同构推导为 `api.<域名>`；不可用时仅该卡显示「用量不可用」，登录/切换主流程不受影响
- 用量进度条依赖 `copilot_internal/user` 的响应字段（`copilot_plan` / `quota_snapshots.premium_interactions`），字段缺失或上游改名时对应元素自动隐藏
- 登录进行中不能并发发起第二次登录（409）
- 头像仍为 GitHub 外链；资料刷新与单次重试不能绕过桌面壳 CSP、网络或服务器拒绝访问，持续失败时回落为首字母圆标。不能仅凭图片响应的缓存时间判断 GHE 签名 URL 何时失效
- Models 页的凭据状态圆点只反映 API Key 引用，OAuth 登录成功后圆点仍可能显示未配置（外观问题，功能不受影响）
- 自行在 `cordis.patch.yml` patch `llm-pi-ai` 整段 config 会覆盖预置路由
- `settings.yaml` 的 `llm-pi-ai:` 节只能稀疏覆盖字段，无法删除预置路由本身（移除须卸载本插件）
- 路由前缀 `/copilot-auth` 两侧硬编码，不可配置
- 此版本要求 DSH `0.2.2-rc.1` 及 Cordis `4.1.x`；接口能力或隔离补丁未通过校验时，会话功能明确不可用，不回退为全局账号绑定。其他版本需要额外验证
- 模型目录只在「尚不存在」时由登录成功兜底填充一次，填充后归用户所有：账号新增的模型不会自动出现——pi-ai 内置目录已描述的模型在 Models 页手动添加即可
- 模型目录只写入 pi-ai 内置目录已描述的模型：目录快照外的新模型需随 DSH 升级获得

## 开发

```bash
npm install
npm test        # node:test：patch 结构 + host（多账号登录/隔离/激活/注销/用量/兜底填充）
npm run build   # esbuild 打包 client 到 lib/client.js（__ModuleLoader__ 信封）
npm pack --dry-run
```

| 路径 | 职责 |
|---|---|
| `cordis.patch.yml` | patch（本插件 entry / 预置路由） |
| `src/host.mjs` · `src/shared.mjs` | host 半区：登录状态机、本地账号/资料/用量接口、槽位/激活、模型目录兜底填充 |
| `src/client.jsx` | client 半区：Accounts 设置页（卡片/下拉/进度条）+ 双语文案 |
| `src/avatar-recovery.mjs` | client 单次头像恢复状态机与同账号请求去重（编入客户端产物） |
| `scripts/build-client.mjs` | client 打包（`__ModuleLoader__` CJS 工厂信封） |
| `lib/client.js` | 构建产物（入库，使 git 安装免构建） |

## 版本号规则

版本号采用 semver 预发布后缀同时表达「插件自身版本」与「接口验证目标 DSH 版本」。本分支交付的是本地测试包，原生离线/合成交互验证不等于真实账号验收：

```
<插件核心版本>-dsh-<目标 DSH 版本>
   0.3.0            0.2.2-rc.1
```

- 例：`0.3.0-dsh-0.2.2-rc.1` 表示插件 0.3.0，目标 DSH desktop `0.2.2-rc.1`；具体已通过的验证范围见交付报告；
- **插件功能发版**：bump 核心号（patch/minor），后缀保持当前适配的 DSH 版本；
- **DSH 升级后重新实测适配**：bump 核心号并替换后缀，如 `0.2.0-dsh-0.1.8`；
- git tag 与之一致但带 `v` 前缀：`v0.1.2-dsh-0.2.0-rc.1`；
- 后缀版本号仍是合法 semver 预发布标识（每段仅含字母数字与连字符）。注意 npm 对预发布版本**要求显式 `--tag`**（CI 的 release.yml 与手工发布均带 `--tag latest`），显式挂到 `latest` 后 `dsh plugin add dsh-github-copilot-accounts` 按 dist-tag 安装即可正常获取该版本；仅 `^x.y.z` 形式的版本范围不会匹配预发布号，这不影响插件安装方式。

## 维护者发布

以下保留原项目发布流程说明，不表示本地测试分支已发布，也不授权自动推送 tag 或执行发布。

本项目使用 npm **Trusted Publishing（GitHub Actions OIDC）** 发布，不在仓库或 GitHub Secrets 中保存 `NPM_TOKEN`。

- 发布 workflow：`.github/workflows/release.yml`，推送 `v*` tag 或手动触发
- npm Trusted Publisher 配置：GitHub Actions；owner = `JacobCodeShow`，repository = `dsh-github-copilot-accounts`，workflow = `release.yml`，无 environment（见 `release.yml` 尾注）
- **首次发布前**：包尚不存在时 npm 要求先完成一次性 bootstrap（不能用长期 secret），再在 package settings 中配置 Trusted Publisher。详见 [npm Trusted Publishing 文档](https://docs.npmjs.com/trusted-publishers)
- 包名无 scope（`dsh-github-copilot-accounts`），首次发布前在 npm 确认该名称未被占用；fork 者如改名需同步 `package.json` / `cordis.patch.yml` / `scripts/build-client.mjs` 三处

## License

MIT
