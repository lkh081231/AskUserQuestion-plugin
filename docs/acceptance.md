# 验收记录

## 记录范围

记录日期：**2026-09-21（UTC）**。插件版本：`0.1.0`。

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
| 客户端 | curl、Vitest/jsdom；不是 ChatGPT |

## 自动化结果

| 检查 | 结果 | 覆盖 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | UI 和服务端 TypeScript |
| `npm test` | 通过，5 个测试文件、27 个测试 | schema、格式化、校验、四题型表单、重试、重复提交和生产域名配置 |
| `npm run build` | 通过 | 单文件 MCP UI 和服务端构建 |
| `npm run validate:package` | 通过；报告 0 个注册 app 映射 | portable/compatibility manifest、资产、skill 路径和 `.app.json` 结构 |
| skill `quick_validate.py` | 通过 | skill frontmatter、命名和占位符 |
| plugin `validate_plugin.py .` | 通过 | compatibility manifest、skill、资产和 companion JSON |
| `npm audit --omit=dev` | 通过，0 个生产 Node 依赖漏洞 | 不包含开发/前端构建依赖 |
| 完整 `npm audit` | 有已知上游告警 | `@openai/apps-sdk-ui@0.2.2` 依赖的 lodash；npm 当前无修复 |

自动化测试证明本地函数和模拟浏览器行为，不证明 ChatGPT iframe、宿主桥接或模型回合行为。

## 本地 MCP 协议烟雾测试

在构建后运行 `npm start`，对 `http://localhost:8787/mcp` 执行以下检查：

| 场景 | 结果 |
| --- | --- |
| `GET /` | 通过，返回 `Ask User Question MCP server` |
| MCP `initialize` | 通过 |
| `tools/list` | 通过，发现 `ask_user_questions` 和 `_meta.ui.resourceUri` |
| 单选题 `tools/call` | 通过，返回默认值、纯文本 fallback 和 `structuredContent` |
| 四题型 `tools/call` | 通过，返回四种归一化问题 |
| 重复 question ID | 通过拒绝，返回 MCP `isError: true` 和字段路径 |
| `resources/read` | 通过，MIME 为 `text/html;profile=mcp-app` |

这是本地 Streamable HTTP 协议验证，不包括 `ui/initialize`、真实宿主中的 `ui/message` 或卡片视觉检查。

## MVP 验收项映射

| 编号 | 本地状态 | 证据或缺口 |
| --- | --- | --- |
| 1 | 通过 | 表单测试提交 Docker，Q/A 格式化测试 |
| 2 | 通过（逻辑） | Other 去空白且不添加前缀；未在真实宿主点击 |
| 3 | 通过 | 多选、普通项和 Other 的 UI/格式化测试 |
| 4 | 通过 | 必填和 Other 空白校验测试 |
| 5 | **未执行** | 需要真实 ChatGPT 模型回合统计 |
| 6 | 通过 | 四题型、可选题、No、隐藏 Other、题数/选项数/重复 ID 测试 |
| 7 | 通过（模拟宿主） | 同步重复提交锁、成功禁用、失败保留与重试、手动复制文本测试 |
| 8 | **未执行** | 直接聊天回答和改变任务需要真实 ChatGPT |
| 9 | **未执行** | `.app.json` 无真实连接 ID，完整插件未安装 |
| 10 | 通过 | 单选和多选补充说明交互与格式化测试；确认题复用同一控件路径 |
| 11 | 通过 | 空说明、未选说明不回传、取消/重选恢复草稿测试 |
| 12 | 通过 | 模型 description 不进入用户答案测试 |
| 13–16 | 仅完成 skill 规则 | 尚未在目标模型中进行正反触发行为测试 |
| 17 | 通过（文档） | README 已披露限制并链接本记录；真实样本仍为 0 |

## 真实 ChatGPT 停止等待验收

| 项目 | 当前记录 |
| --- | --- |
| 测试日期 | 未执行 |
| ChatGPT 客户端 | 未连接 |
| 可见模型标识 | 不适用 |
| 插件版本 | `0.1.0` 待安装 |
| 测试提示 | 待按下方场景执行 |
| 执行次数 | **0** |
| 符合预期次数 | **0** |
| 追加额外文字 | 未观察；不是“0 次失败”结论 |
| 提前继续任务 | 未观察；不是“0 次失败”结论 |
| 额外工具调用 | 未观察；不是“0 次失败”结论 |
| 收到答案后正确继续 | 未测试 |
| 失败样例 | 无，因为尚未执行，不代表不存在失败 |

取得公网端点、真实连接 ID 和目标客户端访问权限后，每个场景至少重复多次，并逐次记录：提示、模型标识、是否追加文字、是否提前工作、是否调用额外工具、答案通道和后续行为。不能只保留成功样例。

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
| Docker 镜像构建/运行 | 通过；镜像 `ask-user-question:0.1.0`，ID `sha256:1910064cde5…` | 本地容器健康检查和生产 `ui.domain` 通过 |
| 稳定公网 HTTPS | 未执行 | 缺少域名、云账号和部署凭据 |
| ChatGPT 注册连接 | 未执行 | 依赖公网端点和目标工作区权限 |
| `.app.json` 映射 | 未完成 | 缺少真实 `plugin_asdk_app...` ID |
| 完整插件安装 | 未执行 | 依赖连接映射和支持的安装表面 |
| 公开提交与审核 | 未执行 | 依赖稳定部署、法律/支持 URL 和真实验收 |

## 结论

本地实现和可部署交付已达到进入真实集成测试的条件。计划尚未全部完成：阶段 1 的真实 ChatGPT 闭环、阶段 3 的完整安装、阶段 4 的稳定部署和公开提交均受外部环境阻塞。不得把本记录表述为插件已上线、已通过目录审核或模型必然停止。

Docker 验收使用 `APP_ORIGIN=https://questions.example.com` 和宿主端口 `18787`；`GET /` 返回健康文本，`resources/read` 返回 `_meta.ui.domain` 对应的生产 origin。测试容器使用 `--rm`，完成后已停止并删除。
