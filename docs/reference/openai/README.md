# OpenAI 插件开发文档快照

## 来源与范围

抓取日期：**2026-09-21（UTC）**。来源为 [OpenAI Plugins 官方文档](https://developers.openai.com/plugins)提供的 Markdown 页面。

本目录保存 **30 篇原文，共 424,919 字节（约 415 KiB）**：官方插件入口索引链接的开发、接口、打包、部署、安全与审核文档，以及入口页和 UI 更新日志。商业转化和迁移指南一并留存供查阅，不代表本项目需要实现这些功能。

- [接口参考](upstream/reference.md)：桥接接口、工具描述、annotations、资源元数据与工具结果。
- [限制摘要](LIMITATIONS.md)：宿主、部署、隐私和发布限制，区分官方规定与项目判断。
- [来源清单](manifest.json)：每篇的网页地址、下载地址、最终地址、UTC 抓取时间、Content-Type、字节数和 SHA-256。

`upstream/` 保留下载的原始字节，不翻译或重新排版。原文中的站点相对链接、图片及 MDX 组件也保留原样；它是文本快照，不是可完全离线浏览的网站镜像，也不包含 SDK 或示例仓库源码。相对链接无法在本地打开时，请使用下方对应的官方页面。

## 本项目建议阅读顺序

| 步骤 | 本地资料 | 用途 |
| --- | --- | --- |
| 1 | [MCP 与 UI 快速开始](upstream/build/app-quickstart.md) | 验证最小端到端闭环 |
| 2 | [MCP 服务](upstream/build/mcp-server.md)、[工具设计](upstream/plan/tools.md) | 实现工具与结果结构 |
| 3 | [UI 开发](upstream/build/chatgpt-ui.md)、[接口参考](upstream/reference.md) | MCP Apps 资源绑定、桥接、答案回传 |
| 4 | [UI 规范](upstream/concepts/ui-guidelines.md)、[安全隐私](upstream/guides/security-privacy.md) | 问答卡片与沙箱限制 |
| 5 | [Skill 开发](upstream/build/skills.md)、[插件打包](upstream/build/plugins.md) | 提问策略与完整插件交付 |
| 6 | [连接与测试](upstream/deploy/connect-chatgpt.md)、[故障排查](upstream/deploy/troubleshooting.md) | 在真实 ChatGPT 中验证行为 |
| 7 | [发布准则](upstream/app-guidelines.md)、[提交流程](upstream/deploy/submission.md)、[MCP 审核](upstream/deploy/app-review.md) | 准备发布材料和审核 |
| 8 | [提交错误](upstream/deploy/submission-errors.md)、[更新日志](upstream/changelog.md) | 排查失败并核对平台变化 |

## 全部原文

| 文档 | 本地原文 | 官方页面 |
| --- | --- | --- |
| Plugin guidelines | [Markdown](upstream/app-guidelines.md) | [来源](https://developers.openai.com/plugins/app-guidelines) |
| MCP server and UI quickstart | [Markdown](upstream/build/app-quickstart.md) | [来源](https://developers.openai.com/plugins/build/app-quickstart) |
| Authentication | [Markdown](upstream/build/auth.md) | [来源](https://developers.openai.com/plugins/build/auth) |
| Add UI to your MCP server | [Markdown](upstream/build/chatgpt-ui.md) | [来源](https://developers.openai.com/plugins/build/chatgpt-ui) |
| Examples | [Markdown](upstream/build/examples.md) | [来源](https://developers.openai.com/plugins/build/examples) |
| Build an MCP server | [Markdown](upstream/build/mcp-server.md) | [来源](https://developers.openai.com/plugins/build/mcp-server) |
| Checkout API reference | [Markdown](upstream/build/monetization.md) | [来源](https://developers.openai.com/plugins/build/monetization) |
| Package your plugin | [Markdown](upstream/build/plugins.md) | [来源](https://developers.openai.com/plugins/build/plugins) |
| Build skills | [Markdown](upstream/build/skills.md) | [来源](https://developers.openai.com/plugins/build/skills) |
| Plugin UI changelog | [Markdown](upstream/changelog.md) | [来源](https://developers.openai.com/plugins/changelog) |
| MCP server | [Markdown](upstream/concepts/mcp-server.md) | [来源](https://developers.openai.com/plugins/concepts/mcp-server) |
| Plugin architecture | [Markdown](upstream/concepts/plugins.md) | [来源](https://developers.openai.com/plugins/concepts/plugins) |
| Skills | [Markdown](upstream/concepts/skills.md) | [来源](https://developers.openai.com/plugins/concepts/skills) |
| UI guidelines | [Markdown](upstream/concepts/ui-guidelines.md) | [来源](https://developers.openai.com/plugins/concepts/ui-guidelines) |
| Remote MCP server review requirements | [Markdown](upstream/deploy/app-review.md) | [来源](https://developers.openai.com/plugins/deploy/app-review) |
| Connect and test your plugin | [Markdown](upstream/deploy/connect-chatgpt.md) | [来源](https://developers.openai.com/plugins/deploy/connect-chatgpt) |
| Plugin submission errors | [Markdown](upstream/deploy/submission-errors.md) | [来源](https://developers.openai.com/plugins/deploy/submission-errors) |
| Submit plugins | [Markdown](upstream/deploy/submission.md) | [来源](https://developers.openai.com/plugins/deploy/submission) |
| Troubleshooting | [Markdown](upstream/deploy/troubleshooting.md) | [来源](https://developers.openai.com/plugins/deploy/troubleshooting) |
| Local services Get Quote conversion spec | [Markdown](upstream/guides/local-services-request-quote-conversion-spec.md) | [来源](https://developers.openai.com/plugins/guides/local-services-request-quote-conversion-spec) |
| Optimize Metadata | [Markdown](upstream/guides/optimize-metadata.md) | [来源](https://developers.openai.com/plugins/guides/optimize-metadata) |
| Product checkout conversion spec | [Markdown](upstream/guides/product-checkout-conversion-spec.md) | [来源](https://developers.openai.com/plugins/guides/product-checkout-conversion-spec) |
| Restaurant reservation conversion spec | [Markdown](upstream/guides/restaurant-reservation-conversion-spec.md) | [来源](https://developers.openai.com/plugins/guides/restaurant-reservation-conversion-spec) |
| Security & Privacy | [Markdown](upstream/guides/security-privacy.md) | [来源](https://developers.openai.com/plugins/guides/security-privacy) |
| Submit your Claude Code plugin to OpenAI | [Markdown](upstream/guides/submit-claude-plugin.md) | [来源](https://developers.openai.com/plugins/guides/submit-claude-plugin) |
| Plugins | [Markdown](upstream/index.md) | [来源](https://developers.openai.com/plugins) |
| Define tools | [Markdown](upstream/plan/tools.md) | [来源](https://developers.openai.com/plugins/plan/tools) |
| Brainstorm plugin use cases | [Markdown](upstream/plan/use-case.md) | [来源](https://developers.openai.com/plugins/plan/use-case) |
| Quickstart | [Markdown](upstream/quickstart.md) | [来源](https://developers.openai.com/plugins/quickstart) |
| Reference | [Markdown](upstream/reference.md) | [来源](https://developers.openai.com/plugins/reference) |

## 更新与验证

这是指定日期的参考快照，不代表未来平台行为。接入接口、部署或提交审核前，重新核对对应官方页面；有冲突时以最新官方文档与实际宿主行为为准，并更新项目说明。

更新时按 `manifest.json` 中的 `download_url` 下载，核对官方来源和响应类型，保存原始字节并重新记录抓取时间、大小和 SHA-256。新增或删除页面时同步更新本索引和限制摘要。清单中的抓取时间不是官方发布日期。

验证原文的文件数、路径唯一性、字节数和 SHA-256；项目编写的索引与摘要另行检查 Markdown 结构和本地链接。原文不套用本仓库排版规则，`upstream/.gitattributes` 仅关闭原文的 Git 空白检查，避免修改上游字节；其完整性由清单校验。

当前仅完成资料下载和文档核对，尚未执行真实 ChatGPT 接入、UI 沙箱测试或发布审核。
