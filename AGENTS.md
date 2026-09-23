# 项目工作约定

## 项目定位

本仓库用于开发 ChatGPT Ask User Question 插件。产品目标、接口和验收要求以 [plan.md](plan.md) 为准。

仓库已包含 TypeScript MCP 服务、React MCP Apps UI、测试和构建脚本。功能范围与完成状态仍以 `plan.md` 和 `docs/acceptance.md` 为准；本地测试不能替代真实 ChatGPT 验收。

## 已确定的设计

- 采用方案 A：MCP Apps 标准，通过 `_meta.ui.resourceUri` 绑定 UI，通过 `ui/message` 发送答案。
- 使用一个 `ask_user_questions` 工具，支持单选、多选、文本和确认题。
- 产品要求 Assistant 成功调用提问工具后结束本轮等待用户回答；当前查阅的公开插件接口没有强制停止能力，工具说明和 skill 仅提供行为约束，不能承诺稳定停止。
- 选择类题目默认由 UI 添加 Other，显式 `allow_other: false` 时隐藏。
- 已确认 B 版视觉、多题分页和成功后问答摘要；正式实施见 `plan.md` 第 3.1 节及 `TODO.md`，宿主输入框绑定须先核验。
- 每个普通选项选中后在下方展开默认空的可选补充说明，提交时附在选项 label 后；与模型 `description` 分开。单选和确认题仍只选一项，Other 保持独立选项。
- 回传人类可读的 Q/A 文本，不添加问卷关联 ID。
- 状态和校验保持简单，不引入答案数据库、跨卡片同步或 agent suspend/resume。
- 完整交付包括插件包、skill、MCP 服务、UI、安装部署文档及验收记录。
- 插件提问策略以用户对齐为先：影响目标、交付、约束或偏好的关键未知先问，已有答案不重复问；仅在满足 `plan.md` 第 7.1 节全部小问题条件时采用默认值。

## 开发方式

- 默认使用中文沟通和编写项目说明，代码标识符使用清晰的英文。
- 按 `plan.md` 中的实施阶段推进，先验证最小端到端闭环，再补齐功能和插件交付。
- 修改前检查 Git 状态和相关文件，保留用户已有改动。
- 接口或产品行为发生变化时，同步更新计划、使用说明及相关验收项。
- 接入 MCP Apps 和 ChatGPT 插件接口时核对官方文档，区分计划、示例与实测结果。已下载的官方原文、接口和限制见 [资料索引](docs/reference/openai/README.md)；接入与发布前复核最新官方版本。
- 避免为简单问答添加无关功能、兼容分支和复杂基础设施。

## 文档与验证

- Markdown 使用一个一级标题、连续的标题层级、规范列表和表格。
- 代码示例注明语言；目录树、UI 草图和纯文本消息使用 `text` 代码块。
- 标题、列表、表格和代码块之间保留空行；文件以换行结束。
- 仅修改文档时，检查 Markdown 结构、链接和 `git diff --check`，无需运行无关应用测试。
- `docs/reference/openai/upstream/` 中的官方 Markdown 原文保留原始字节，不套用本地排版规则；通过 `manifest.json` 校验文件数、大小和 SHA-256。本地索引与限制摘要仍按项目规范检查。
- 新增应用代码后，执行仓库实际提供的相关检查；不要假定尚不存在的 npm 脚本可运行。
- 新增构建与测试脚本时，将准确命令补充到本文和 README。
- 安装依赖使用 `npm install`；完整本地检查使用 `npm run check`。
- 单独执行时使用 `npm run typecheck`、`npm test` 和 `npm run build`。
- `npm test` 同时执行 UI/服务测试和诊断脚本测试；仅诊断测试使用 `npm run test:diagnostics`。
- 客户端复测使用 `npm run diagnose:clients -- --since <带时区的ISO时间>` 读取本地 Tunnel 状态、脱敏事件和方法计数；加 `--baseline <快照.json>` 比较同进程计数，命令说明见 `docs/client-troubleshooting.md`。
- 使用 `npm run accept:local` 构建并执行可重复的本地 Streamable HTTP MCP 验收。
- 构建后使用 `npm start` 启动 Streamable HTTP 服务，默认端点为 `http://localhost:8787/mcp`；可通过 `PORT` 覆盖端口。
- 使用 `npm run validate:package` 校验插件结构，使用 `npm run package:plugin` 生成 `dist/plugin/ask-user-question/`。
- 修改 systemd 单元后使用 `systemd-analyze --user verify deploy/systemd/*.service` 校验。
- 生产设置 `APP_ORIGIN` 为独立 HTTPS origin；Docker 构建使用 `docker build -t ask-user-question:0.1.0 .`。
- 真实 ChatGPT 验收与本地测试分别记录；未执行的验证必须明确注明。
- 创建 README 时必须增加“已知限制”：停止行为依赖模型指令遵循、没有已确认的公开强制停止接口、结束符不能保证停止；注明核对日期并链接实际验收结果。不得将其宣传为强制暂停。
- 停止行为验收须记录环境、执行次数和失败样例；单次成功或本地测试通过不能代表所有对话都有保证。

## 阶段完成与 Git 提交

- **每完成一个阶段任务，完成相关检查后立即创建一次 Git commit。** 这是用户已授权的默认工作方式，无需每次再次询问。
- 一个阶段应形成可检查的完整结果；不需要每编辑一个文件就提交。
- 提交前检查 `git diff` 和暂存区，只暂存本阶段相关文件，不混入无关改动。
- Commit 信息简洁描述本阶段结果，采用 `docs:`、`feat:`、`fix:` 或 `chore:` 等前缀。
- 未完成必要验证时，不宣称阶段完成；需要保留中间进度时，明确说明提交的实际范围。
- 提交后检查 Git 状态，向用户报告完成内容、验证结果、commit 短哈希及剩余事项。
- 默认仅本地提交；推送远端或公开发布按用户明确要求执行。
