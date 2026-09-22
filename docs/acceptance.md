# 验收记录

## 记录范围

记录日期：**2026-09-22（UTC）**。插件版本：`0.1.0`。

本文件将本地自动化、MCP 协议烟雾测试、部署验证和真实 ChatGPT 行为验收分开记录。未执行项不按通过处理。

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
| `npm test` | 通过，5 个测试文件、30 个测试 | schema、格式化、校验、loopback 默认监听、四题型表单、重试、重复提交和生产域名配置 |
| `npm run build` | 通过 | 单文件 MCP UI 和服务端构建 |
| `npm run validate:package` | 通过；报告 0 个注册 app 映射 | portable/compatibility manifest、资产、skill 路径和 `.app.json` 结构 |
| skill `quick_validate.py` | 通过 | skill frontmatter、命名和占位符 |
| plugin `validate_plugin.py .` | 通过 | compatibility manifest、skill、资产和 companion JSON |
| `npm audit --omit=dev` | 通过，0 个生产 Node 依赖漏洞 | 不包含开发/前端构建依赖 |
| 完整 `npm audit` | 有已知上游告警 | `@openai/apps-sdk-ui@0.2.2` 依赖的 lodash；npm 当前无修复 |

自动化测试证明本地函数和模拟浏览器行为，不证明 ChatGPT iframe、宿主桥接或模型回合行为。

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

最近执行：**2026-09-21（UTC）**，共 7 组协议检查通过。该工具不读取私有数据、不执行写操作且不访问公网，因此授权检查在本地验收中标记为不适用；`tools/list` 已验证对应安全注解为只读、非破坏、非开放世界。

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

## MVP 验收项映射

| 编号 | 本地状态 | 证据或缺口 |
| --- | --- | --- |
| 1 | 通过 | 表单测试提交 Docker，Q/A 格式化测试 |
| 2 | 通过（逻辑） | Other 去空白且不添加前缀；未在真实宿主点击 |
| 3 | 通过 | 多选、普通项和 Other 的 UI/格式化测试 |
| 4 | 通过 | 必填和 Other 空白校验测试 |
| 5 | **未执行** | 需要真实 ChatGPT 模型回合统计 |
| 6 | 通过 | 四题型、可选题、No、隐藏 Other、题数/选项数/重复 ID 测试 |
| 7 | 通过（功能链路） | 真实 ChatGPT 中 UI 提交成功；失败保留、重试和复制兜底仍由模拟宿主覆盖 |
| 8 | **未执行** | 直接聊天回答和改变任务需要真实 ChatGPT |
| 9 | 部分通过 | 开发者模式 Tunnel app 可用；`.app.json` 无真实连接 ID，包含 skill 的完整插件未安装 |
| 10 | 通过 | 单选和多选补充说明交互与格式化测试；确认题复用同一控件路径 |
| 11 | 通过 | 空说明、未选说明不回传、取消/重选恢复草稿测试 |
| 12 | 通过 | 模型 description 不进入用户答案测试 |
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
