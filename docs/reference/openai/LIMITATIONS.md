# OpenAI 插件限制与本项目影响

## 核对范围

核对日期：**2026-09-21**。以下依据[本地官方文档快照](README.md)；来源和校验值见 [manifest.json](manifest.json)。这是开发摘要，不代替完整准则或真实 ChatGPT 验收。

## 宿主与接口

| 事项 | 官方描述或已核对的边界 | 对本项目的影响 |
| --- | --- | --- |
| 强制停止模型 | 当前查阅的公开接口未提供插件强制结束模型回合的能力；`requestClose()` 的用途是关闭 UI。[接口参考](upstream/reference.md)、[UI 指南](upstream/build/chatgpt-ui.md) | **公开文档能力核对结论，非官方永久禁止声明**。工具说明和 skill 只能引导停止；结束符不能建立强制保证。README 必须披露，并记录真实行为验收。 |
| 标准桥接 | 新 UI 优先使用 MCP Apps 提供的共同接口，`window.openai` 用于兼容和 ChatGPT 特有扩展。[接口参考](upstream/reference.md) | 保持方案 A：`_meta.ui.resourceUri` 绑定资源、`ui/message` 回传答案。不要把 UI 消息发送成功等同于模型已停止。 |
| 浏览器能力 | UI 运行在隔离 iframe；`window.alert`、`window.prompt`、`window.confirm` 和 `navigator.clipboard` 不可用。[安全隐私](upstream/guides/security-privacy.md) | 确认题使用卡片内控件；发送不可用时展示可选中的 Q/A 文本，供用户手动复制。 |
| 网络与内嵌页面 | 资源 CSP 约束网络请求和资源；子 iframe 默认禁用，启用需列明来源且受嵌入页面政策约束。[安全隐私](upstream/guides/security-privacy.md)、[发布准则](upstream/app-guidelines.md) | 只声明实际需要的域名；当前问答卡片不需要嵌入第三方页面。 |
| 发布 UI 的域名 | 提交带 UI 的插件时，`_meta.ui.domain` 必填，且每个插件须使用独立 origin。[接口参考](upstream/reference.md) | 将域名配置纳入部署和提交检查。 |
| 工具输入时机 | 需用户批准的调用，在批准前初始 `toolInput` 可能为空，批准后才有输入通知。[接口参考](upstream/reference.md) | 渲染时允许输入尚未到达，不把初始空值直接当作错误问卷。 |
| 元数据约束 | 调用前后状态文本各最多 64 字符；工具应声明 `readOnlyHint`、`destructiveHint`、`openWorldHint`，这些提示不代替授权。[接口参考](upstream/reference.md) | 按实际行为填写工具元数据；这类平台限制与项目自定的题数、字数限制分开记录。 |

## 开发、部署与发布

| 事项 | 官方条件 | 对本项目的影响 |
| --- | --- | --- |
| 开发连接 | 可使用公开 HTTPS 或 Secure MCP Tunnel；公开端点支持 Streamable HTTP。开发模式可用性受账号和工作区政策影响。[连接与测试](upstream/deploy/connect-chatgpt.md) | 本地服务可运行不代表该账号已能在 ChatGPT 使用；验收记录须注明实际连接环境。 |
| 提交端点 | 开发隧道不能替代提交插件所需的公开 HTTPS 端点。[连接与测试](upstream/deploy/connect-chatgpt.md) | 完整交付需要稳定可访问的服务地址。 |
| 开发期间更新 | 服务或元数据变更后刷新开发连接，并在新对话测试。[连接与测试](upstream/deploy/connect-chatgpt.md) | 排查旧 schema、旧资源和旧工具说明时先核对宿主已刷新。 |
| 已发布版本更新 | 工具更新采用持续审核；已提交的插件信息或导入的 skill 变更仍需新版本、审核和发布。[连接与测试](upstream/deploy/connect-chatgpt.md) | 修改本地 skill 不等于线上版本已更新。 |
| 审核并发与地区 | 每个 MCP 集成同时只能有一个已发布版本和一个在审版本；文档目前说明 EU 数据驻留项目不能提交带 MCP 服务的插件。[MCP 审核](upstream/deploy/app-review.md) | 提交前复核组织、项目和版本状态；这是抓取日期时的平台条件。 |
| 原创性与可靠性 | 插件应提供内建能力未覆盖的实际价值；需完整、可靠，试验或演示插件不获接受。[发布准则](upstream/app-guidelines.md) | **项目判断**：需要解释结构化问答卡片的价值并提供验收证据；能安装或本地通过不保证目录审核通过。 |
| 工具触发范围 | 工具说明应准确，不应推荐超出明确用户意图和插件用途的宽泛触发。[发布准则](upstream/app-guidelines.md) | 提问策略聚焦当前任务的信息对齐，避免写成所有对话无条件调用。 |

## 数据与其他规则

- **隐私与日志**：遵守最小收集原则，公开隐私政策，说明收集、保存与共享；不要索取完整聊天历史或尝试重建聊天记录。避免记录原始敏感内容。项目不建设答案数据库，但部署时仍须核对服务日志。[发布准则](upstream/app-guidelines.md)、[安全隐私](upstream/guides/security-privacy.md)
- **认证**：将来接入外部账号时核对 OAuth 2.1、CIMD/DCR 和服务端 scope 验证要求。当前无业务登录需求，不因存档认证文档而新增登录流程。[认证指南](upstream/build/auth.md)、[安全隐私](upstream/guides/security-privacy.md)
- **商业与内容**：广告、支付、受限内容和第三方服务接入另有规则，原文已收录；本期问答插件不添加商业交易流程。[发布准则](upstream/app-guidelines.md)、[Checkout 参考](upstream/build/monetization.md)
- **打包与审核错误**：manifest、skill、连接映射和提交字段以对应规范为准；提交失败时按错误码定位，不推测平台统一限额。[打包指南](upstream/build/plugins.md)、[提交错误](upstream/deploy/submission-errors.md)

## README 与验收同步

未来产品 README 的“已知限制”须至少写明停止行为依赖指令遵循、没有已确认的公开强制停止接口、手动复制兜底和运行所需的宿主环境，并注明核对日期、链接实际验收记录。不能将这些资料下载记录作为接口实测结果。

本地模拟与真实 ChatGPT 验收分别记录。模型停止行为须记录环境、执行次数和失败样例；UI 消息发送、卡片关闭和模型回合结束是不同事件，应分别观察。
