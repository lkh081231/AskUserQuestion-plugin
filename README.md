# Ask User Question

Ask User Question 是一个 ChatGPT / Codex 插件：当目标、范围、约束、交付或偏好中的关键未知会实质影响结果时，它通过聊天内嵌卡片向用户提问，再将人类可读的 Q/A 文本发送回对话。

项目采用 MCP Apps 标准：工具通过 `_meta.ui.resourceUri` 绑定单文件 UI，卡片通过 `ui/message` 提交答案。当前版本为 `0.1.0`。

## 当前状态

本地实现已经完成：MCP 服务、四种题型 UI、校验与失败兜底、配套 skill、portable/compatibility manifest、容器构建文件和交付文档均已提供。类型检查、27 个自动化测试、本地 MCP 协议烟雾测试、Docker 运行、skill 校验和插件结构校验已通过。

以下外部步骤尚未执行：部署到稳定公网 HTTPS、在 ChatGPT 开发者模式注册连接、写入真实 `plugin_asdk_app...` ID、安装完整插件并进行真实会话验收。因此当前 `.app.json` 的 `apps` 映射为空，不能据此声称插件已经在 ChatGPT 中完成安装或停止行为验收。详情见[验收记录](docs/acceptance.md)。

## 功能

- 一个 `ask_user_questions` MCP 工具，一次支持 1–5 题。
- `single_select`、`multi_select`、`text` 和 `confirm` 四种题型。
- 选择题默认提供 Other；`allow_other: false` 可隐藏。
- 每个普通选项都有可选补充说明，提交时按 `选项 — 说明` 格式回传。
- 必填、Other 空白、重复 ID、题数和选项数等输入/答案校验。
- 同步重复提交锁、成功后禁用、失败保留输入和可选择的手动复制文本。
- 英文和简体中文固定 UI 文案，问题正文保持工具调用方提供的语言。
- 无答案数据库；答案由 UI 直接通过 `ui/message` 交给聊天宿主。

## 本地开发

要求 Node.js 22 或更高版本。当前验证环境使用 Node.js 24.19.0。

```bash
npm install
npm run check
npm start
```

默认健康检查地址为 `http://localhost:8787/`，MCP 端点为 `http://localhost:8787/mcp`。开发模式下可不设置 `APP_ORIGIN`；生产和提交审核时必须设置为部署 UI 的独立 HTTPS origin。

```bash
APP_ORIGIN=https://questions.example.com PORT=8787 npm start
```

常用命令：

| 命令 | 用途 |
| --- | --- |
| `npm run typecheck` | 检查 UI 和服务端 TypeScript |
| `npm test` | 运行 Vitest / jsdom 测试 |
| `npm run build` | 构建单文件 MCP UI 和服务端 JavaScript |
| `npm run validate:package` | 校验 portable manifest、compatibility manifest、skill、资产和连接映射结构 |
| `npm run check` | 依次执行类型检查、测试、构建和包结构校验 |
| `npm run package:plugin` | 在 `dist/plugin/ask-user-question/` 生成可分发插件目录 |
| `npm start` | 启动构建后的 Streamable HTTP MCP 服务 |

## 项目结构

```text
.
├── plugin.json                     # portable Agent Plugins manifest
├── .codex-plugin/plugin.json       # Codex compatibility overlay
├── .app.json                       # 已注册 ChatGPT MCP 连接映射
├── skills/ask-user-questions/      # 提问与停止等待策略
├── server/                         # MCP 服务、schema 和工具
├── ui/                             # React MCP Apps UI
├── assets/                         # 插件图标和 logo
├── scripts/                        # 包校验与打包脚本
├── docs/                           # 安装、部署、验收和发布材料
├── Dockerfile
└── plan.md
```

## 安装与部署

- [部署 MCP 服务](docs/deployment.md)
- [注册连接并安装插件](docs/installation.md)
- [公开发布材料与检查清单](docs/publishing.md)
- [验收记录](docs/acceptance.md)

部署和完整插件安装是两个独立步骤。仅运行本地服务不会产生 `.app.json` 所需的 ChatGPT 注册连接 ID；仅安装 skill 也不会自动部署 MCP 服务。

## 已知限制

能力核对日期：**2026-09-21**。

本插件通过工具说明和 skill 请求 ChatGPT 在展示问题后结束本轮，等待你的回答。目前查阅的公开插件接口不提供强制停止当前模型生成的能力，因此模型仍可能追加回复或提前继续任务。自定义结束符不能消除这一限制。支持环境、实测结果和已知失败情况见[验收记录](docs/acceptance.md)；测试通过不代表所有对话均有停止保证。

此外：

- `ui/message` 发送答案，不是模型 suspend/resume 或强制停止接口。
- UI 沙箱不支持 `navigator.clipboard`；发送失败时只展示可选择文本，由用户手动复制。
- 真实 ChatGPT 验收尚未执行；当前停止行为执行次数为 0，没有可报告的真实失败样例。
- 当前服务不含业务认证。公开部署和提交前应按目标工作区要求决定是否增加认证、限流和日志策略。
- 当前 `@openai/apps-sdk-ui@0.2.2` 的依赖树使完整 `npm audit` 报告 lodash 的已知问题，且 npm 当前没有可用修复。`npm audit --omit=dev` 对 Node 生产依赖报告 0 个漏洞，但仍应在发布前复核 UI 组件库更新及最终浏览器包。
- `.app.json` 目前为空；必须部署服务并在 ChatGPT 注册后填入真实连接 ID，完整插件才可调用工具。

限制依据和本地快照见 [OpenAI 文档索引](docs/reference/openai/README.md)与[限制摘要](docs/reference/openai/LIMITATIONS.md)。

## 数据处理

服务端接收模型生成的问题定义并将其归一化返回，不保存问卷或答案。卡片答案直接发送给聊天宿主。部署平台、反向代理和运行日志仍可能处理请求元数据，运营者必须按[隐私说明](docs/privacy.md)配置并披露实际行为。

## 许可证与发布

仓库尚未声明开源许可证，也未配置公开网站、支持、隐私和条款 URL。在公开目录提交前，发布者必须确认权利主体、托管相应文档并补全 manifest URL。准备项见[发布材料](docs/publishing.md)。
