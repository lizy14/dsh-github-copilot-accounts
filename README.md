# dsh-github-copilot-accounts

GitHub Copilot 多账号管理：设备码登录、GitHub.com / GitHub Enterprise Cloud 账号槽位、套餐与当前用量显示。

## 此分支的范围

PR #4 在原有账号管理基础上添加 **按原生 DSH Session 独立选择 Copilot 账号的路由和 Remote 基础能力**：

- 每个账号使用独立凭据映射，内部仍复用 DSH 的原生 `github-copilot` provider 和协议实现。
- 固定账号路由与受管理的全局默认路由分离；会话选择不覆盖全局模型偏好。
- 请求准备后固定账号；缺失、删除、禁用或不支持当前模型的账号明确失败，不换用其他账号。
- provider replay、推理签名和传输 affinity 按实际账号隔离；切号不删除聊天或工具结果，也不静默重跑整轮/工具。
- 恢复、普通 fork 和新原生子代理保留对应的会话选择边界；已有子代理不随父会话后续选择重绑。

**此 PR 不包含新的会话账号菜单、紧凑用量布局、合计、UTC 游标、原生头像资源池或手动刷新模型按钮。** 当前客户端仍以原有账号管理界面为主；底部徽标明确标为“全局默认”，其账号切换动作改变的是全局默认，不是专属 Session 绑定。专用会话 UI 将由后续 PR 提供。

相关讨论：

- [#3：Session 账号路由与切换](https://github.com/JacobCodeShow/dsh-github-copilot-accounts/issues/3)
- [#5：GHE 头像资料刷新和失败恢复](https://github.com/JacobCodeShow/dsh-github-copilot-accounts/issues/5)
- [#7：会话账号 UI、当前用量和头像复用](https://github.com/JacobCodeShow/dsh-github-copilot-accounts/issues/7)
- [#8：手动模型刷新](https://github.com/JacobCodeShow/dsh-github-copilot-accounts/issues/8)

同名跨域账号隔离已由上游 PR #2 合入；此分支保持该行为，不重复提出该修复。

## 前置要求

- 接口验证目标：DSH desktop `0.2.2-rc.1`、Cordis `4.1.x`；其他版本需要额外验证。
- 有效的 GitHub Copilot 订阅。
- DSH 的原生 OAuth、credentials 和普通原生 Session 服务。

只支持 GitHub.com 与 GitHub Enterprise Cloud 的 `*.ghe.com` 域名。外部 ACP/Codex 会话、显式 API-key/认证覆盖和非原生端点不应被猜作某个 OAuth 账号。

## 安装和更新

这是待审阅的源码分支，不代表 npm 已发布新版本。用 DSH 插件管理器安装本地构建包或源码路径；安装、更新、移除后完整退出并重启 DSH。

客户端语言注册随插件生命周期释放。若旧版本已经遗留同名 locale 导致入口消失，需重新加载整个页面或重启；新版本不会删除其他活跃实例的语言资源或吞掉冲突异常。

原生组合已经提供 authorization 服务，不能重复挂载。受管理默认策略使用标准 composition 消费者隔离，不替换原始全局服务。若运行中修改或撤回该隔离出现 `COPILOT_RESTART_REQUIRED`，正常退出后重启，不能热回退为其他账号。

出站代理和网络策略由 DSH 启动器负责；插件使用普通 `fetch`，不修改进程全局 fetch/dispatcher，也不记录代理 URL。

## 账号管理

1. 设置侧栏打开「Copilot 账号」。
2. 添加 GitHub.com 或 GitHub Enterprise Cloud 账号；企业域名应为 `company.ghe.com`。
3. 使用页面给出的设备码和验证链接完成授权。
4. 登录成功后新账号成为全局默认，旧槽位保留。

账号按归一化域名与用户名区分，id 由 Host 返回；客户端不拼接凭据 key。同域重新授权复用原槽位，跨域同名账号并存。恢复账号同样按 id 操作。已经因旧版本覆盖丢失的授权不能凭空恢复，需要重新登录。

上游设置页的「设为默认」仍是全局动作。新会话功能另外提供受保护的账号路由和 `copilotAccounts` Remote；使用专属路由的 Session 不会被全局默认变更改写。

## Session 路由和 Remote

- `copilot-default`：请求准备时捕获实际匹配到的默认 OAuth 账号。
- `copilot-account-…`：固定账号的公开路由，id 为账号槽位的不可逆摘要。
- `copilotAccounts`：所属 Host 的原生 Remote，包含目录查询、Session 绑定及受限账号操作；只允许 owner，并验证实际 Session 资源权限。

普通原生模型选择器可见受管理路由。Remote 绑定使用现有模型/推理档位，目标账号不支持时拒绝，不替换模型。会话忙碌或只读时不接受新绑定；已经准备的请求不被随后选择改写。

原始 `github-copilot` replay、外来账号 replay 或无法证明 provenance 的状态按 provider-neutral 历史处理。有效同账号的必要推理签名不能因为临时网络错误而一概清除。身份校验包含实际 issuer 和长期授权的摘要，短期 access 更新不改变身份。

具体继承边界见 [Session 继承说明](docs/session-inheritance.md)。这些记录来自原生接口的离线合成测试，不代表真实账户端到端测试已完成。

## 模型目录与用量

每账号的实际模型列表取 **账号可用模型 id ∩ 原生描述目录 ∩ 用户配置**，可能彼此不同；同一模型 id 不意味着相同账号权限。

登录/设默认时，仅当 `github-copilot` 未配置 `models` 且无 `modelOverrides` 时填充空目录。已有目录（包括空列表）归用户所有，不能覆盖。新模型的 wire 描述仍需随 DSH 内置目录获得；插件不改写安装包。

全局短期 access 按原有建议间隔刷新；账号请求路径在未知、到期或建议刷新边界检查/更新授权与模型元数据。**这不是固定周期覆盖 Models 设置。** 显式手动模型刷新属于 #8 后续功能。

当前套餐和用量来自 `copilot_internal/user` 的 `quota_snapshots.premium_interactions`；返回字段缺失时显示未知，不能当成 0。旧字段名不能证明它一定等同于网页新 AI-credit 计费报告。插件没有用量历史、趋势或月底预测。

网页 `Usage billed to` 是付款主体选择。此 PR 不读取或修改它，不将组织 access 列表视作计费池，也不汇总未验证的付款方余额。

Host 中已有的 profile 刷新基础与 #5 / PR #6 的后端存在重叠；头像修复 PR 包含客户端失败恢复。两 PR 需要在其中一个合入后重新核对最终 diff，不能假定任意顺序无冲突合并。

## 卸载和回退

卸载不删除 DSH 凭据记录或 Session 文件，但旧版本不认识新增的受管理/固定账号路由。这类会话回退后可能显示模型不可用；重新安装此功能恢复，或由用户显式选择旧版原生模型使用全局默认。插件不会后台把固定绑定转换成另一个账号。

## 开发与验证

使用环境已批准的 npm 源安装依赖，不在公开仓库记录本机私有源配置。

```sh
npm test
npm run build
npm pack --dry-run
```

普通 Node 测试可直接运行。`*-native.test.mjs` 等原生集成测试需要测试代码指定的本地提取 DSH fixture；未提供时会跳过。它目前不是可随此仓库自动安装的 CI fixture，必须报告跳过数量，不能把本机通过结果当作维护者可直接复现的全部覆盖。

测试使用合成 grant、Session、协议或 RPC，不读取用户 credentials 文件，不请求真实账号/模型。JSONL 覆盖 codec/backend read/restore，不证明 writer/fsync/Windows 锁或崩溃恢复。

浏览器验证和新的会话 UI 留在 #7 后续 PR。这里没有 `test:ui` 命令。

## 发布

版本后缀标记 DSH 接口目标，不代表真实 GHE 验收或已发布 npm 版本。维护者确认后沿用原项目 GitHub Actions Trusted Publishing 流程；本分支不自动推送 release tag 或改变 registry dist-tag。

MIT
