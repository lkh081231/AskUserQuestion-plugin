# 验收记录

## 记录范围

记录日期：**2026-09-24（UTC）**；历史部署结果保留原执行日期。插件版本：`0.1.0`。

本文件将本地自动化、MCP 协议烟雾测试、部署验证和真实 ChatGPT 行为验收分开记录。未执行项不按通过处理。

## 已确认 UI 改版的验收状态

用户已确认预览提交 `2fe1f83`。B 版视觉、多题分页、Enter 操作和统一问答摘要已实施到正式 React MCP Apps UI，并通过本地用户行为测试。**本轮未测试真实 ChatGPT 宿主中的 B 版卡片、`requestModal` 宿主弹窗和移动端软键盘。**

| 新验收项 | 当前状态 |
| --- | --- |
| 18：选择行与键盘 | 本地测试通过整行选择、详情独立输入、Enter、Shift + Enter 和 IME 保护；真实宿主和移动端软键盘未测试 |
| 19：多题分页和草稿 | 本地测试通过逐题渲染、前后导航、全量草稿恢复和全表错误定位；真实宿主展示未测试 |
| 20：成功后统一摘要 | 模拟宿主确认成功后本地测试通过只读摘要、发送锁和失败重试；B 版真实 `ui/message` 未测试 |
| 21：绑定宿主输入框 | 未执行；没有已核验的公开绑定接口，未使用 iframe 固定定位冒充该能力 |

下方原有测试结果描述改版前的版本，不能作为新 UI 的验收证据。

## 本地环境

| 项目 | 值 |
| --- | --- |
| 操作系统 | Linux（开发容器） |
| Node.js | `v24.19.0` |
| npm | `11.17.0` |
| Docker | `29.7.2` |
| MCP SDK | `@modelcontextprotocol/sdk@1.30.0` |
| MCP Apps | `@modelcontextprotocol/ext-apps@2.0.0` |
| OpenAI UI | `@openai/apps-sdk-ui@0.2.2` |
| 客户端 | curl、Vitest/jsdom、ChatGPT 开发者模式 |

## 自动化结果

| 检查 | 结果 | 覆盖 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | UI 和服务端 TypeScript |
| `npm test` | 通过，6 个测试文件、39 个 UI/服务测试和 4 个诊断测试 | schema、格式化、校验、loopback 默认监听、分页草稿、整行选择、Enter/IME、错误聚焦、发送锁、失败重试、成功摘要、生命周期和生产域名配置 |
| 完整 `npm run check` | 通过，2026-09-24（UTC） | 类型检查、测试、构建、7 项本地 MCP 验收、包结构和 Markdown 检查 |
| `npm run build` | 通过 | 单文件 MCP UI 和服务端构建 |
| `npm run validate:package` | 通过；报告 0 个注册 app 映射 | portable/compatibility manifest、资产、skill 路径和 `.app.json` 结构 |
| skill `quick_validate.py` | 通过 | skill frontmatter、命名和占位符 |
| plugin `validate_plugin.py .` | 通过 | compatibility manifest、skill、资产和 companion JSON |
| `npm audit --omit=dev` | 通过，0 个生产 Node 依赖漏洞 | 不包含开发/前端构建依赖 |
| 完整 `npm audit` | 有已知上游告警 | `@openai/apps-sdk-ui@0.2.2` 依赖的 lodash；npm 当前无修复 |

自动化测试证明本地函数和模拟浏览器行为，不证明 ChatGPT iframe、宿主桥接或模型回合行为。

## B 版正式 UI 本地验收

执行日期：**2026-09-24（UTC）**。环境为 Vitest/jsdom，发送成功和失败由测试宿主的 `sendMessage` Promise 模拟。

| 场景 | 结果 |
| --- | --- |
| B 版选择行 | 通过；点击选项行留白可选中，模型 `description` 不触发选择 |
| 选项补充详情 | 通过；详情为独立 textarea，输入不会切换或取消选项，取消/重选保留草稿 |
| Other 与题型 | 通过；普通选项后独立展示 Other，空白校验定位 Other，`allow_other: false` 时隐藏；保留单选、多选、文本、确认 |
| 单题与多题 | 通过；单题直接提交，多题仅渲染当前一题并显示 `1 / N` 与前后按钮 |
| 分页草稿 | 通过；前后切换保留每题选项、Other、详情和文本草稿 |
| 校验与焦点 | 通过；前进只校验当前题，单题/末页全表校验，切至首个错误题并聚焦具体控件，可选空值通过 |
| 键盘与 IME | 通过；前页 Enter 前进、末页/单题 Enter 提交、Shift + Enter 换行，native `isComposing`、`keyCode` 229 和 compositionstart/end 紧邻 Enter 不误提交 |
| 发送与成功摘要 | 通过；发送中锁定编辑/翻页并同步防重复，宿主确认后仅显示由 `formatQuestionAnswer` 生成的只读摘要 |
| 发送失败 | 通过；保留全部草稿，显示由 `formatAnswerMessage` 生成的可选中文本，提供手动重试且不自动重发 |
| 生命周期回归 | 通过；工具失败/取消撤下表单，迟到通知不能恢复 |

本轮明确未执行：

1. 真实 ChatGPT 宿主中的 B 版展示、焦点、滚动、`ui/message` 和错误通知。
2. `window.openai.requestModal` 宿主弹窗的题目传递、答案回传、关闭和原卡片摘要。
3. 手机/iPad 移动端软键盘、安全区、键盘遮挡和输入法实机行为。
4. 宿主输入框绑定或固定定位；当前公开接口没有已验证实现。

## 本地 MCP 协议烟雾测试

运行 `npm run accept:local` 后，脚本会构建项目、在随机本地端口启动服务，并通过 MCP SDK 的 Streamable HTTP 客户端执行以下检查。该命令可重复执行，结束时自动关闭服务：

| 场景 | 结果 |
| --- | --- |
| `GET /` | 通过，返回 `Ask User Question MCP server` |
| `OPTIONS /mcp` | 通过，返回 Streamable HTTP 客户端所需的 CORS 方法和请求头 |
| MCP `initialize` | 通过 |
| `tools/list` | 通过，发现 `ask_user_questions` 和 `_meta.ui.resourceUri` |
| 单选题 `tools/call` | 通过，返回默认值、纯文本 fallback 和 `structuredContent` |
| 四题型 `tools/call` | 通过，返回四种归一化问题 |
| 重复 question ID | 通过拒绝，返回 MCP `isError: true` 和字段路径 |
| `resources/read` | 通过，MIME 为 `text/html;profile=mcp-app` |

最近执行：**2026-09-24（UTC）**，共 7 组协议检查通过。该工具不读取私有数据、不执行写操作且不访问公网，因此授权检查在本地验收中标记为不适用；`tools/list` 已验证对应安全注解为只读、非破坏、非开放世界。

这是本地 Streamable HTTP 协议验证，不包括 `ui/initialize`、真实宿主中的 `ui/message` 或卡片视觉检查。

## Secure MCP Tunnel 与 ChatGPT 功能验收

2026-09-22 根据实际部署与测试记录补充以下结果。Tunnel Client 为 `0.0.14`，Cloudflared 为 `2026.8.2`，本地 MCP 地址为 `http://127.0.0.1:8787/mcp`，Tunnel 健康端口使用 `127.0.0.1:8081`。

| 场景 | 结果 |
| --- | --- |
| `tunnel-client doctor --explain` | 通过；control plane、Runtime API Key、MCP target、MCP reachability、OAuth metadata、health listener 和 UI 均为 PASS |
| user systemd 常驻服务 | 通过；MCP 与 Tunnel 均为 enabled、active、running |
| 本地健康与就绪 | 通过；MCP 根路径正常，Tunnel `/healthz` 返回 `live`，`/readyz` 返回 `ready` |
| 异常自动恢复 | 通过；终止 Tunnel 主进程后 PID 更新、`NRestarts` 从 0 增至 1，并恢复 `ready` |
| 本地监听范围 | 通过；MCP `8787` 与 Tunnel 管理端口 `8081` 均仅监听 `127.0.0.1` |
| ChatGPT 开发者模式连接 | 通过；通过 Tunnel 发现 `ask_user_questions` |
| 工具 schema 与 UI 绑定 | 通过；发现四种题型及 questions、options、allow_other、required、placeholder |
| 四题型工具调用 | 通过；一次调用展示 single select、multi select、text 和 confirm |
| MCP App UI | 通过；卡片在 ChatGPT 中显示并接受输入 |
| `ui/message` 答案回传 | 通过；四道题的人类可读 Q/A 返回 ChatGPT |

本次记录证明 Tunnel、工具、UI 和答案回传链路可用。测试报告没有逐项记录模型是否追加文字、提前继续或调用额外工具，因此不能据此把停止等待验收记为通过。

## 原生客户端兼容性问题

2026-09-22 至 2026-09-23，用户报告浏览器正常、手机/iPad 原生端在调用时返回组织上下文 UNAUTHORIZED，Windows 原生端静默失败。同一账号、普通个人聊天已确认；已记录 Android `1.2026.258（15）`、iOS/iPad `1.2026.251(34655566626)`、Windows `26.905.11957`。

2026-09-23 UTC+8 16:35 的 Windows 失败分享记录，其 request ID 与本机 08:34:46 UTC 的转发日志匹配。用户确认在 PC 浏览器打开同一原始对话能显示提问卡片，问题范围缩小到 Windows 客户端卡片加载/展示。UTC+8 16:36 的 iPad 分享消息报告组织鉴权错误，对应分钟未见本机转发，支持调用入口鉴权方向；内部账号上下文及平台原始错误仍待核验。两份记录的模型不同，后续新调用对照须固定模型。

本地服务、Tunnel readiness、随机端口 doctor、元数据读取及运行中标准 UI 绑定/资源读取通过；这些检查不能替代原生客户端验收。**没有修复或跨端通过结论**。请求 ID、证据限制、支持工单草稿和复测步骤见[客户端排查](client-troubleshooting.md)。

本轮追加本地隔离实验：使用在线 HTML 的标准输入/结果通知均能显示卡片并成功提交一次；仅旧接口或缺少题目通知时停在加载状态（2.5 秒采样）。兼容别名发布与 MCP 能力状态实验通过。这些是模拟宿主/内存 MCP 检查；Windows 重开仍无卡片，原生端未修复。候选与验收门槛见[修复方案](client-repair-plan.md)。

2026-09-23 15:44 UTC，Windows 单字段兼容候选已通过 `npm run check`（30 个测试、7 项本地 MCP 验收及其余检查），新增验证标准 URI 与 `openai/outputTemplate` 一致且对应资源可读。UI HTML 与线上版本逐字节一致。候选尚未部署；等待刷新连接后的 A 版基线，原生客户端验收仍未通过。

UTC+8 2026-09-24 00:04，用户报告 GPT-5.6 Sol 浏览器调用正常；Windows 应用无法启动，插件对照暂缓。00:07 Android 重开后仍 UNAUTHORIZED，对应 UTC 16:06–16:09 的本机 Tunnel 日志没有事件。线上仍为 A 版，移动端未修复；新增只读复测命令用于后续证据采样，不替代原生验收。本轮 `npm test` 通过 30 个原有测试和 4 个诊断测试；诊断命令已对真实 loopback 管理接口验证，文档与脚本语法检查通过。

UTC+8 00:17 Android 复测仍报错；分享 request ID 已取得，工具消息时间为 UTC 16:18:07–09，原始输出被分享功能隐藏。切后台回前台卡片区域闪动，但截至 UTC 16:27 本机无新增调用或资源读取；原生问题仍未修复。

UTC+8 00:29，用户确认同一安卓原始对话在浏览器重试正常；本机 16:29 UTC 窗口新增两次转发，`tools/call/200`、`resources/read/200` 各增加 1，线上仍为未变更的 A 版。这是单次浏览器对照，不是原生端验收通过。

独立 UI 修复的本地验收通过：失败/取消通知撤下表单，迟到通知不能恢复；标准桥接正常路径仍能发送一次 Q/A。`npm run check` 通过 34 个 UI/服务测试、4 个诊断测试和 7 项 MCP 验收，浏览器模拟错误/取消场景没有发送消息。候选尚未部署，未将此结果算作原生闪动或鉴权修复。详细证据见[排查记录](client-troubleshooting.md)。

## Cloudflare Tunnel 临时对照部署

2026-09-24 07:23 UTC，按用户新增要求启动独立 Cloudflare Docker 连接器，实际版本 `2026.9.1`，4 条 QUIC 连接就绪。本地 MCP 初始化、发现、合成调用和 UI 读取通过，HTML SHA-256 与原 A 版一致。原服务未重启、候选代码未发布。

用户随后要求先用 Quick Tunnel。07:38 UTC 已获得临时 HTTPS 地址，07:39:49 UTC 的公网 TLS、健康端点、OPTIONS、MCP 初始化、工具发现、四题型调用、重复 ID 拒绝及 UI 读取共 7 项检查通过；UI 与 A 版 SHA-256 一致。先前等待域名路由的命名 Tunnel 容器已停止。

用户随后确认手机通过 Quick Tunnel 提问、显示和提交均成功；首次“正在加载问题”约 5 秒，第二次较快。iPad 未取得本轮结果，各端至少 3 次新对话与 1 次重开验收尚未完整记录。原 Secure MCP Tunnel 的组织上下文错误仍无修复结论。

07:50 UTC 的部署主机采样中，公网工具调用与 UI 资源读取总耗时中位数分别约 88 ms、148 ms，UI JSON 响应已 gzip 压缩到约 150 KB。这些样本不包含手机宿主握手或题目通知等待，首次 5 秒的根因未确定。此次复用无应用认证的现有服务，仅用于临时 HTTPS 对照；不计为稳定公开部署或完整插件安装。实际地址、协议及耗时快照、Quick Tunnel 的 SSE 限制和回退见[Cloudflare 测试记录](cloudflare-test.md)。

## MVP 验收项映射

| 编号 | 本地状态 | 证据或缺口 |
| --- | --- | --- |
| 1 | 通过 | B 版分页表单提交 Docker，Q/A 格式化测试 |
| 2 | 通过（逻辑） | Other 去空白且不添加前缀；未在真实宿主点击 |
| 3 | 通过 | 多选、普通项和 Other 的 UI/格式化测试 |
| 4 | 通过 | 必填和 Other 空白校验测试 |
| 5 | **未执行** | 需要真实 ChatGPT 模型回合统计 |
| 6 | 通过 | 四题型、可选题、No、隐藏 Other、题数/选项数/重复 ID 测试 |
| 7 | 部分通过 | 旧 A 版真实 ChatGPT UI 提交成功；B 版发送锁、失败保留、重试和复制兜底由模拟宿主覆盖，本轮真实宿主未测试 |
| 8 | **未执行** | 直接聊天回答和改变任务需要真实 ChatGPT |
| 9 | 部分通过 | 开发者模式 Tunnel app 可用；`.app.json` 无真实连接 ID，包含 skill 的完整插件未安装 |
| 10 | 通过（本地） | 单选、多选和确认题补充说明交互与格式化测试 |
| 11 | 通过（本地） | 空说明、未选说明不回传、取消/重选恢复草稿测试 |
| 12 | 通过（本地） | 模型 description 独立只读展示且不进入用户答案测试 |
| 13–16 | 仅完成 skill 规则 | 尚未在目标模型中进行正反触发行为测试 |
| 17 | 通过（文档） | README 已披露限制并链接本记录；真实样本仍为 0 |

## 真实 ChatGPT 停止等待验收

| 项目 | 当前记录 |
| --- | --- |
| 测试日期 | 未专项执行 |
| ChatGPT 客户端 | 功能链路已连接；停止行为未记录 |
| 可见模型标识 | 不适用 |
| 插件版本 | `0.1.0` Tunnel app；完整插件待安装 |
| 测试提示 | 待按下方场景执行 |
| 执行次数 | **0** |
| 符合预期次数 | **0** |
| 追加额外文字 | 未观察；不是“0 次失败”结论 |
| 提前继续任务 | 未观察；不是“0 次失败”结论 |
| 额外工具调用 | 未观察；不是“0 次失败”结论 |
| 收到答案后正确继续 | 未测试 |
| 失败样例 | 无，因为尚未执行，不代表不存在失败 |

在已连接的 Tunnel app 中，每个场景至少重复多次，并逐次记录：提示、模型标识、是否追加文字、是否提前工作、是否调用额外工具、答案通道和后续行为。不能只保留成功样例。

建议真实场景：

1. 目标不明确的网站请求，预期先问范围。
2. 已明确 Docker 和中文输出的请求，预期不重复询问。
3. 普通 Python hello world，预期不因小版本提问。
4. 正式或轻松语气会影响可用性的邀请函，预期先问。
5. 工具卡片提交、直接文字回答、改变任务和取消任务。

## 部署与安装验收

| 项目 | 状态 | 阻塞 |
| --- | --- | --- |
| 本地服务 | 通过 | 无 |
| Docker 镜像构建/运行 | 通过；镜像 `ask-user-question:0.1.0`，ID `sha256:2d4b21ed2b07…` | 容器显式监听 `0.0.0.0`，宿主健康检查和生产 `ui.domain` 通过 |
| Secure MCP Tunnel | 通过；MCP 与 Tunnel systemd 均已启用并运行，健康、就绪和异常恢复测试通过 | 无 |
| 稳定公网 HTTPS | 未执行 | 缺少域名、云账号和部署凭据 |
| ChatGPT 开发者模式连接 | 通过 | Tunnel app 已发现工具并完成 UI 回传 |
| `.app.json` 映射 | 未完成 | 缺少真实 `plugin_asdk_app...` ID |
| 完整插件安装 | 未执行 | 依赖连接映射和支持的安装表面 |
| 公开提交与审核 | 未执行 | 依赖稳定部署、法律/支持 URL 和真实验收 |

## 结论

本地实现、Secure MCP Tunnel 常态化服务、真实 ChatGPT 工具发现、四题型 UI 和答案回传已验证。计划尚未全部完成：阶段 1 缺少停止等待行为统计，阶段 3 缺少真实连接映射与完整插件安装，阶段 4 的公网部署和公开提交仍受外部环境阻塞。不得把本记录表述为插件已上线、已通过目录审核或模型必然停止。

Docker 验收使用 `APP_ORIGIN=https://questions.example.com` 验证生产 `ui.domain`，并在监听收紧后通过宿主端口 `18788` 复测；`GET /` 返回健康文本。测试容器使用 `--rm`，完成后已停止并删除。
