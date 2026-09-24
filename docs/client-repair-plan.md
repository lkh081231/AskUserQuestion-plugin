# 原生客户端修复方案

制定日期：2026-09-23；更新日期：2026-09-24。状态：**Windows 元数据候选已实现并通过完整本地检查；浏览器 A 版基线正常，Windows 因客户端无法启动暂缓；原生端尚未修复。用户新增要求先部署 Cloudflare Tunnel 测试：连接器已就绪，域名路由与客户端验证待完成。** 既有请求 ID、版本和日志见[排查记录](client-troubleshooting.md)。本方案独立于交给 5.6 sol 的 B 版视觉、分页和提交摘要改造。

## 1. 结论与执行顺序

| 优先级 | 工作 | 判定依据 | 本轮状态 |
| --- | --- | --- | --- |
| P0 | Windows：验证工具 UI 元数据兼容别名 | 请求到达、同一原始对话在浏览器可显示；返回 Windows 重开仍不显示 | 已验证 SDK 能保留候选别名，待真实 A/B |
| P0 | 手机/iPad：核查个人账号的 Tunnel 调用上下文 | iPad 报组织鉴权，失败分钟未见转发；同一个人账号的浏览器正常 | 已整理平台定位材料，待原生/平台侧复核 |
| P1 | Windows：如别名无效，用独立诊断资源定位挂载、握手、题目通知 | 当前仅凭无卡片无法区分这些阶段 | 已验证现有 UI 在模拟标准宿主正常，待原生诊断 |
| P2 | 仅在证实旧桥接存在时增加能力检测适配 | 本地“仅旧接口”场景不显示题目，但尚未证明 Windows 使用旧接口 | 条件方案，暂不实现 |
| 备选 | 独立的受保护 HTTPS MCP 连接 | 可隔离 Secure MCP Tunnel 的入口鉴权路径 | 未部署；不保证能解决原生 UI 问题 |

首先做 Windows 最小元数据实验。移动端优先保留现有私有 Tunnel，按已取得的 iPad request ID 定位调用入口；如必须尽快恢复原生调用，再评估 HTTPS 备选。每次实验只改变一个因素，保留浏览器基线。

## 2. 本轮新增证据

### 2.1 Windows 再次打开仍无卡片

用户先在 PC 浏览器打开原始对话，确认提问卡片可显示；随后回 Windows 客户端重新打开同一对话，仍然看不到卡片。这使“仅首次调用后未刷新”的解释不再充分；仍需区分宿主未挂载、资源加载和 iframe 内桥接。

### 2.2 使用在线 UI HTML 的隔离浏览器实验

2026-09-23 08:57:38 UTC，通过 loopback `resources/read` 读取当前资源，放入临时本地页面的沙箱 iframe，用 Chromium 模拟宿主协议。未重建或替换在线 HTML，未调用真实聊天的消息接口；所有题目和答案均为合成数据。

资源：`ui://ask-user-questions/v1.html`，SHA-256：`685cd6b8f84c2accfca103961c3d7cb7d6923040ca34ae9a4d2091573dd24075`。

| 模拟宿主行为 | 实际结果 | 能说明什么 |
| --- | --- | --- |
| 标准握手后立即发送 `ui/notifications/tool-input` | 卡片显示；提交只产生一次 `ui/message`，收到确认后显示已提交；无页面异常 | 此通知时序下标准路径正常 |
| 标准握手后仅发送 `ui/notifications/tool-result` | 同样显示并成功提交一次；无页面异常 | 不依赖一定先收到输入通知 |
| 仅提供 `window.openai.toolInput/toolOutput/sendFollowUpMessage`，不响应标准握手 | 2.5 秒采样时仍为 `Loading questions…`，只发出 `ui/initialize` | 当前实现没有旧桥接读取路径；不代表 Windows 确实是这种宿主 |
| 标准握手成功，但不发送题目通知 | 2.5 秒采样时仍为 `Loading questions…` | “握手成功”和“有数据可渲染”是不同阶段 |

原始结构化观察见[实验结果](diagnostics/2026-09-23-ui-bridge.json)。这四个场景是本地模拟，不是 Windows、iOS 或 Android 验收。首次完整 Chromium 因缺少 `libcups.so.2` 未启动，之后改用已安装的 headless shell 完成实验；未安装系统依赖。

### 2.3 元数据与能力状态的隔离 MCP 实验

在内存中的独立 MCP 服务上验证了两个事实：

- 同时声明 `_meta.ui.resourceUri` 和 `_meta["openai/outputTemplate"]` 时，已安装的 SDK 会在 `tools/list` 保留两者且值相同。该结果只证明候选改动可被服务端正确发布。
- 初始化过的 MCP 实例能够读取客户端 UI 扩展能力；新实例没有该能力状态。当前 `server/index.ts` 每个 HTTP 请求创建新实例且不分配 session ID，因此不能在后续 `tools/call` 中将缺少初始化能力误判为“不支持 UI”。

不为解决这个判定问题引入会话数据库，也不按 `openai/userAgent` 或操作系统名称强制切换桥接。

## 3. Windows 修复路径

### 3.1 第一阶段：最小元数据对照

候选修改仅在 `server/tools/askUserQuestions.ts` 的工具描述中增加官方兼容别名，保持工具名、schema、HTML、MIME 和停止等待指令不变：

```ts
_meta: {
  ui: { resourceUri: QUESTION_RESOURCE_URI },
  "openai/outputTemplate": QUESTION_RESOURCE_URI,
  "openai/toolInvocation/invoking": "Preparing questions…",
  "openai/toolInvocation/invoked": "Waiting for your answer",
},
```

官方将该字段定义为兼容别名，并继续推荐标准字段；没有公开证据说明用户的 Windows 构建必须使用别名。因此将其作为**待验证候选修复**。[UI 元数据参考](https://developers.openai.com/plugins/reference)

实施及验收：

1. 在独立本地构建中准备候选改动，在 `scripts/accept-local-mcp.mjs` 增加“两个 URI 一致且可读”的契约检查；运行 `npm run check`。本阶段不改 `ui/src/App.tsx`。
2. 记录基线 A：当前标准字段配置，刷新连接元数据后使用固定模型在 Windows、浏览器各测新对话；保留时间、request ID、工具响应和卡片结果。
3. 发布候选 B 到既有开发测试服务，只重启 MCP 服务使描述生效，Tunnel 配置保持不变。按官方步骤刷新 ChatGPT 连接元数据，再开新对话复测。[连接刷新流程](https://developers.openai.com/plugins/deploy/connect-chatgpt)
4. B 若改善，再切回 A 并同样刷新、开新对话进行回验。不能把一次刷新或客户端缓存变化的效果归因于别名。
5. 验证 B 下 Windows 能首次显示、重开同一对话仍显示、提交恰好一条 Q/A，且正常浏览器无回归；记录至少 3 次新对话结果。旧对话可能保存旧描述，不单靠旧对话判断候选补丁是否生效。
6. B 无改善则恢复基线，进入下一阶段，不叠加 MIME 替换、CSP 放宽和 SDK 升级。

成功标准：改动与恢复之间有可重复的显示差异，候选版本达到上述交互验收。真实结果出现前不将此项标为修复完成。

### 3.2 第二阶段：定位宿主挂载与桥接

若元数据实验失败，建立独立诊断资源，例如 `ui://ask-user-questions/diagnostic-v1.html`，保留原 `v1.html` 注册用于已有对话。先用极简静态标记和小脚本验证资源能显示，再以新资源 URI 加入完整 UI 的分阶段诊断；每份诊断构建固定一个 URI，避免更换脚本后旧缓存影响判定。[UI 资源与缓存](https://developers.openai.com/plugins/build/chatgpt-ui)

诊断构建只显示阶段信息，不记录题目/答案正文、凭据或账号 ID，不向外部上报：

| 最后可观察阶段 | 下一步 |
| --- | --- |
| 静态标记也不出现 | 结合宿主组件日志和新 URI 的 `resources/read` 排查资源获取、卡片挂载或显示策略；不能直接认定 JS 错误 |
| 有静态标记，脚本未启动 | 查脚本/CSP/模块执行错误；先以小脚本排除正式 bundle 的加载问题 |
| 脚本启动，`ui/initialize` 未完成 | 检查宿主是否响应标准桥接，以及是否真实提供旧接口 |
| 握手完成，没有题目通知 | 查 `tool-input/tool-result` 投递、错误结果及生命周期；不要把缺少题目当作空问卷成功 |
| 数据已到达，组件未显示 | 查 React 渲染、数据校验及尺寸通知，依据错误修复 |
| 卡片显示，提交失败 | 单独检查 `ui/message` 应答；不能把显示修复当成发送修复 |

诊断信息只存在于开发诊断资源；正式页面显示可理解的加载或失败提示，技术字段不进入普通答题流程。诊断源码需要发布后才能观察真正的 Windows iframe，本轮未执行该发布。

### 3.3 第三阶段：有证据才适配旧桥接

仅当 Windows 诊断确认 iframe 已运行、标准桥接不可用、且宿主真实提供兼容数据和发送方法时，才在 `ui/src/host.ts` 引入小型宿主适配层：

- 标准 MCP Apps 为主路径；仅按功能存在性选择兼容路径，不按版本号或 user-agent 猜测。
- 兼容路径读取 `window.openai.toolOutput` 或经校验的 `toolInput`，监听 `openai:set_globals` 更新；题目可能延迟到达，不把初始空值当作失败。
- 确认 `sendFollowUpMessage` 可用后才开放兼容路径提交；Q/A 格式仍复用现有 formatter。
- 开始提交后固定本次发送路径；超时、异常或迟到的标准握手都不能自动改路重发。只有确认成功才收起，失败保留答案并提供手动复制。
- 对“握手完成但长期没有数据”增加明确状态提示；等待阈值只触发提示，不生成答案、不自动提交，也不把桥接迟到当作用户同意重试。
- 验证标准/旧接口同时存在、迟到握手、失败后手动重试及重复点击，确保最多发送一次。

官方列出兼容接口但推荐新 UI 使用标准桥接。此适配是条件方案，不能修复宿主根本没有创建 iframe 的情况。[桥接接口](https://developers.openai.com/plugins/build/chatgpt-ui)

## 4. 手机/iPad 修复路径

### 4.1 第一阶段：保持部署不变，隔离会话和连接状态

已确认同一个人账号、普通聊天，不重复要求用户切换不存在的团队。固定同一模型与工具连接，只在一个移动端逐步操作：完全退出并重开应用、检查可用官方更新、必要时重新登录；每一步分别复测并记录，不能一次混改后宣称原因已定。

如果当前连接可 Refresh，先刷新后复测；若仍失败，可创建指向同一 Tunnel 的单独测试连接来区分旧连接缓存，保留原连接供正常浏览器使用。这些是待执行的排查动作，不是已知修复。Android 要补一个独立时间与 request ID，不能用 iPad 样本替代。

### 4.2 第二阶段：按 request ID 定位平台入口

iPad request ID：`3ab0ad39-142e-4ba2-a8b7-92898ebdbca6`，失败约 2026-09-23 08:36 UTC。支持材料已经整理在[排查记录](client-troubleshooting.md#可提交给-openai-的诊断摘要)，本轮没有发送。

需要平台回答的具体问题：

1. 该请求在进入 Tunnel 队列前是否已被拒绝，原始状态/错误是什么？
2. 原生调用的个人账号上下文是否解析出了对应组织；为何正常浏览器路径能通过？
3. 使用的是哪个连接及 Tunnel 关联，是否与正常请求一致？
4. 是否有适用于这些 ChatGPT 原生客户端构建的支持限制或已修复版本？

本机 `--control-plane.organization-id` 只为 daemon 发往 control plane 的请求添加组织头；`--mcp.extra-headers` 则作用于 Tunnel 到本地 MCP 的请求。两者均不能作为修复 ChatGPT 调用者上下文的已验证手段。本地 CORS、UI JS 或在响应中添加 `OpenAI-Organization` 也不能补齐入口请求的身份上下文。[Tunnel 请求路径](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

个人账号在 Tunnel 机制中也对应 Platform organization；报错不代表必须购买或创建团队。已有一个组织和一个工作区关联，修改前应由平台或账号管理页核对具体映射，不能仅因为报错就追加任意组织或扩大授权。

### 4.3 备选：独立受保护的 HTTPS MCP 连接

以下为原正式部署方案。2026-09-24 用户明确改为先部署 Cloudflare Tunnel 做临时 HTTPS 对照；此次测试复用当前无应用认证的 A 版服务，实际状态、访问边界和回退见[Cloudflare 测试记录](cloudflare-test.md)。不将临时匿名测试端点视为已完成下述正式认证部署。

当私有 Tunnel 路径暂时无法恢复、且确实需要原生端调用时，准备独立 HTTPS 测试连接，直接转发到当前本地 MCP 服务：

```text
ChatGPT → 受保护的 HTTPS /mcp → 当前 MCP 服务
```

此路径避开 Secure MCP Tunnel 的组织入口，但仍需实测原生客户端是否支持该连接和 UI。官方支持通过 HTTPS 或 Tunnel 注册 MCP。[连接方式](https://developers.openai.com/plugins/deploy/connect-chatgpt)

具体实施边界：使用独立 origin 和 TLS；当前服务没有认证，不直接将其发布为匿名公网端点。若采用 OAuth，复用可用身份提供方或认证网关，按 MCP OAuth 校验访问令牌并发布发现元数据；不用客户端脚本、URL 参数或公开静态文件传 runtime key。[官方鉴权要求](https://developers.openai.com/plugins/build/auth)

这是新增访问路径和认证部署，超出当前私有 Tunnel 的运行方式，应作为独立交付；本轮只形成方案。上线前必须具备域名、证书、可用认证方案和可回退的测试连接，不以“换成公网”承诺原生端一定恢复。

## 5. 验收与回退

| 环境 | 必测行为 | 当前结论 |
| --- | --- | --- |
| Windows `26.905.11957` | 新调用显示、重开显示、提交一条 Q/A、宿主继续 | 显示失败；候选未验证 |
| iOS/iPad `1.2026.251(34655566626)` | 调用进入服务、无组织错误、显示、提交 | 调用失败；候选未验证 |
| Android `1.2026.258（15）` | 同上，独立记录时间和 request ID | 用户报告失败；缺独立日志关联 |
| PC/移动浏览器 | 原连接仍能调用、显示和提交 | 用户基线正常；每轮改动后做回归 |

每端分别记录调用、资源读取/缓存、挂载、显示、提交和继续对话。至少 3 次新对话成功及 1 次重开检查后，才能把某一端记为本轮通过；不据此宣称所有模型/版本永久稳定。新调用固定模型，不能继续用 Windows `gpt-5-6` 与 iPad `gpt-5-6-thinking` 直接比较差异。

回退规则：

- 元数据候选：恢复变更前工具描述，重启 MCP、刷新连接并验证浏览器；保留旧资源供旧对话读取。
- 诊断或桥接候选：工具重新指向已验证资源，保留原资源与回退构建；不在用户填写中自动热切换。
- 新连接或 HTTPS 备选：只移除测试连接/测试入口，恢复原 Tunnel 使用方式，不删除正常浏览器的连接。
- 任一候选需要代码修改时执行 `npm run check`，完成检查后按阶段提交；真实客户端证据单独记入验收文档。

## 6. 官方资料核对范围

本轮已复核 UI 构建、元数据参考、插件变更日志、Tunnel、连接刷新及鉴权文档。未找到针对用户三个构建号的明确兼容矩阵或已确认修复。

官方合并变更日志中的 MCP App UI 元数据保留修复 `#45805` 位于 **Codex CLI 0.156.0** 的变更列表，不能当作普通 ChatGPT Chat 模式 Windows `26.905.11957` 已知缺陷或保证升级有效的依据。[产品变更日志](https://learn.chatgpt.com/docs/changelog)

## 7. 实施记录

2026-09-24 用户补充：已在 ChatGPT 选择 Tunnel 方式新建连接，手机/iPad 仍报相同的 active organization context 错误，后续不重复要求重建。用户随后提供 Cloudflare Tunnel 运行令牌并要求先部署测试。07:23 UTC 已启动独立 Docker 连接器，4 条连接就绪；未重建、重启或替换原 MCP 服务及 Secure MCP Tunnel，公网路由与真机结果见[测试记录](cloudflare-test.md)。

2026-09-23 15:44 UTC（UTC+8 23:44），已在 `server/tools/askUserQuestions.ts` 增加 `openai/outputTemplate`，并在本地 MCP 验收脚本检查双 URI 相同、通过别名可读取对应资源。`npm run check` 全部通过：类型检查、30 个测试、构建、7 项本地 MCP 验收、包结构及文档检查。

候选 HTML 与线上 A 版逐字节一致，SHA-256 仍为第 2.2 节记录的值。本轮未改工具 schema、UI 或 Tunnel 配置。候选构建暂存在本机 `/tmp/ask-client-repair-stage1/dist-candidate`；原构建备份在同目录 `dist-before`，线上 `dist` 已恢复 A 版，避免等待期间服务意外重启加载候选。临时备份不是长期发布存档。

用户于 UTC+8 2026-09-24 00:04 报告浏览器正常，模型名称为 GPT-5.6 Sol（用户提供，未通过分享元数据复核）。Windows 客户端当前无法启动，用户自行排查；因此暂停 Windows A/B 实验，继续保留线上 A 版，不把启动失败归因于插件。

用户于 UTC+8 00:07 报告 Android 完全退出重开后仍为 UNAUTHORIZED。本机 16:06–16:09 UTC 的 Tunnel journal 没有事件，管理日志也未见此窗口转发；同账号重新登录后的下一次复测也报告失败，具体证据见下文。此步骤不能通过修改本机服务代替。

已提供 `npm run diagnose:clients` 作为复测只读命令：固定读取 loopback 管理端口，只输出诊断字段；比较快照时检测进程变更及计数重置。它不发布代码、不重启服务、不记录题目或答案。

### 7.1 Android 新请求与独立 UI 错误处理修复

UTC+8 00:17 样本取得 request ID `ba379803-7727-4c1e-9706-0ff9309cc148`；工具消息时间实际为 UTC 16:18:07–09，分享功能隐藏了工具原始输出。直到 16:27 的本机快照仍无新增调用/资源计数；前后台切换的闪动不证明调用已进入本机。模型元数据为 `gpt-5-6-instant`，用户确认同一原始对话在浏览器于 UTC+8 00:29 重试正常；本机相应窗口新增两次转发，调用与资源读取各增加 1。进一步指向客户端入口/上下文差异，具体鉴权根因仍需平台侧核查，见排查记录。

同时完成一项独立、已本地复现的修复：`ui/src/App.tsx` 处理工具失败和取消通知，撤下表单并显示提示，忽略终止后的迟到输入/结果。已通过完整检查及真实浏览器中的模拟协议实验。这是错误状态修复，不是鉴权修复，也未确认解决原生闪动。

候选构建保存至 `/tmp/ask-client-repair-stage1/dist-error-state-candidate`，UI SHA-256 为 `0bf7dc11a88d53e49a7b05b0fff7f5363b1e2a8c1e14cb3e09892879490ebbae`。线上构建已恢复 A 版，未重启。后续 Windows 单字段对照继续使用 `f662cbf` 对应的 `dist-candidate`，不能直接用包含本次 UI 修复的最新构建做单因素比较。UI 候选需要单独安排发布与缓存验证，遵循第 3.2 节的资源版本规则。
