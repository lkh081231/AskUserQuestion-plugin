# ChatGPT Ask User Question Plugin 实现计划

## 1. 目标与已确定决策

实现一个可在 ChatGPT Chat 中调用的 `ask_user_questions` 工具，让用户通过问答卡片补充信息，再由 Assistant 继续原任务。

交付完整插件：可安装的插件包、skill、部署好的 MCP 服务、问答 UI，以及安装、部署和验收文档。

| 项目 | 已确定方案 |
| --- | --- |
| UI 接入 | **方案 A：MCP Apps 标准** |
| 工具数量 | 一个：`ask_user_questions` |
| 提问后行为 | 工具调用成功后直接 stop，结束本轮并等待答案 |
| 答案回传 | 通过 `ui/message` 发送人类可读的 Q/A 消息 |
| 题型 | `single_select`、`multi_select`、`text`、`confirm` |
| 自定义答案 | 选择类题目默认提供 UI 自动添加的 Other |
| 选项补充说明 | 每个普通选项下方提供可选输入，默认空，提交时附在选项文字后 |
| 状态管理 | 仅当前卡片的填写与提交状态 |
| 交互参考 | Claude 网页版 / Desktop 的聊天内交互式提问 |

目标流程：

```text
Assistant 判断需要澄清
    ↓
调用 ask_user_questions，MCP 服务返回题目和 UI 资源绑定
    ↓
ChatGPT 展示问答卡片，Assistant 结束本轮并等待
    ↓
用户填写并点击 Submit，或直接在聊天中打字回答
    ↓
ChatGPT 收到答案，Assistant 继续原任务
```

这里的 stop 指结束当前 assistant turn：不追加说明、不猜测答案、不继续任务。
MCP 请求正常返回，不保持挂起。这个行为由工具说明和 skill 约束，并在真实 ChatGPT 中验证；不假定插件具有强制终止模型的运行时 API。

## 2. MVP 范围

### 2.1 本期交付

- 一个 MCP 工具、一个问答 UI 和一个配套 skill。
- 四种题型、选项补充说明，以及 `Other`、`required`、`description`、`placeholder`、`Submit`。
- 输入和答案的基本校验、重复点击保护、发送失败提示。
- 可安装的插件包、可访问的 MCP 服务、部署和安装说明。
- 验收用例及公开发布所需材料。

### 2.2 本期不做

- 条件题、嵌套题、排序、滑块、拖拽和文件上传。
- 问卷关联 ID、答案数据库、跨卡片同步和刷新恢复。
- 复杂状态机、agent suspend/resume 或额外的 `submit_answers` 工具。
- 业务登录系统。

### 2.3 后续扩展

可根据实际需要增加条件题、`number`、`date`、`slider`、`ranking`、`matrix`、`file`，以及 Back、Skip、Edit answer。

普通聊天已自然支持多轮提问：每次提问后结束本轮，收到答案后再决定是否需要下一组问题，无需额外的多步骤运行时。

## 3. 问答交互

### 3.1 布局与操作

- 使用聊天内嵌卡片，单次展示全部问题，底部统一 Submit。
- 不默认打开模态窗口，不预选选项。
- 点击选项只更新表单；点击 Submit 才发送答案。
- 用户也可直接在聊天输入框回答，Assistant 不要求其返回卡片再次提交。
- 支持键盘操作，界面文案跟随会话语言；下方英文示例仅用于说明。
- 每个普通选项下方显示补充说明输入框，默认空；选中该选项后可填写，未选中时禁用。
- Other 始终排在普通选项之后，选中后立即展开自定义答案文本框。

Claude 官方资料确认了选择、多选和直接打字回答的交互，但未公开完整 AskUserQuestion 协议。默认 Other、题数限制和统一 Submit 是本项目的设计。[Claude 交互说明](https://support.claude.com/en/articles/13641943-visual-and-interactive-content)

### 3.2 四种题型

**单选题（示例为用户已选择 Docker 并补充说明后的状态）：**

```text
Which deployment method do you prefer?
● Docker
  [ 使用 Docker Compose，部署在 NAS 上 ]
○ Native Linux
  [ 补充说明（可选） ]（未选中，禁用）
○ Kubernetes
  [ 补充说明（可选） ]（未选中，禁用）
○ Other
  └─ 选中后输入自定义答案
```

**多选题（示例为用户已勾选后的状态）：**

```text
Which features do you need?
☑ Web UI
  [ 支持深色模式 ]
☐ API
  [ 补充说明（可选） ]（未选中，禁用）
☑ Authentication
  [ 补充说明（可选） ]
☐ Database
  [ 补充说明（可选） ]（未选中，禁用）
☐ Other
  └─ Type your answer...
```

**文本题：**

```text
Any additional requirements?
[ Type your answer here... ]
```

**确认题：**

```text
Proceed with this architecture?
○ Yes
  [ 补充说明（可选） ]（未选中，禁用）
○ No
  [ 补充说明（可选） ]（未选中，禁用）
○ Other
  └─ Type your answer...
```

### 3.3 题目与选项设计

| 项目 | 规则 |
| --- | --- |
| 每次题数 | 建议 1–4 题，通常 3 题足够；最多 5 题 |
| 题型选择 | 优先单选和多选，降低输入成本 |
| 普通选项数 | 单选 / 多选提供 2–5 项，不包含 UI 自动添加的 Other |
| 题目与选项说明 | 模型通过 `description` 提供只读提示 |
| 用户补充说明 | 普通选项下方的可选输入；与模型提供的 `description` 分开 |
| 自定义输入提示 | 默认 `Type your answer...`，可通过 `placeholder` 覆盖 |

选项说明示例：

```text
Preferred architecture?
○ Monolith
  Simplest deployment
  [ 补充说明（可选） ]（未选中，禁用）
○ Modular monolith
  Better separation while remaining one service
  [ 补充说明（可选） ]（未选中，禁用）
○ Microservices
  Independent services
  [ 补充说明（可选） ]（未选中，禁用）
○ Other
  Type your answer...
```

## 4. 工具输入与默认值

### 4.1 输入结构

工具名：`ask_user_questions`。

```typescript
interface AskUserQuestionsInput {
  title?: string;
  questions: Question[];
}

interface Question {
  id: string;
  question: string;
  description?: string;
  type: "single_select" | "multi_select" | "text" | "confirm";
  options?: Option[];
  required?: boolean;
  allow_other?: boolean;
  placeholder?: string;
}

interface Option {
  id: string;
  label: string;
  description?: string;
}
```

TypeScript interface 用于说明；实际注册工具时使用 JSON Schema / Zod 实施运行时约束。

`Option.description` 是模型提供的只读说明。用户补充说明保存在当前卡片的答案状态中，按题目和选项 ID 对应，默认空字符串；不添加到工具输入，也不覆盖 `description`。

### 4.2 默认值

| 字段或行为 | 默认值 |
| --- | --- |
| `required` | `true` |
| `allow_other` | 单选、多选和确认题为 `true`；文本题为 `false` |
| Other 文案 | `Other`，按会话语言本地化 |
| 用户补充说明 | 默认空字符串；提示为 `补充说明（可选）`，按会话语言本地化 |
| 自定义输入 placeholder | `Type your answer...`，允许题目覆盖 |
| 最大题数 | 5 |
| 建议题数 | 通常 3 题，按实际需要减少或增加 |

省略字段时应用默认值；显式的 `false` 必须保留。文本题忽略 `allow_other`，始终不展示 Other。

### 4.3 简单输入约束

- `questions` 包含 1–5 题。
- 题目文本、题目 ID、选项 label 和选项 ID 去除首尾空白后不能为空。
- `Question.id` 在本次调用内唯一；`Option.id` 在所属题目内唯一。
- `single_select` / `multi_select` 必须提供 2–5 个 `options`。
- `confirm` 不传 `options`，UI 固定生成 `yes` / `no` 两项并本地化显示。
- `text` 不传 `options`。
- 模型不生成 Other 选项；UI 使用独立的 Other 状态，避免与普通选项 ID 冲突。
- 输入不合法时返回明确的工具错误，不生成空问卷。

### 4.4 工具调用示例

```json
{
  "title": "Choose deployment preferences",
  "questions": [
    {
      "id": "deployment",
      "question": "Where do you want to deploy this?",
      "type": "single_select",
      "options": [
        { "id": "docker", "label": "Docker" },
        { "id": "native", "label": "Native Linux" },
        { "id": "k8s", "label": "Kubernetes" }
      ]
    },
    {
      "id": "features",
      "question": "Which features do you need?",
      "type": "multi_select",
      "options": [
        { "id": "web", "label": "Web UI" },
        { "id": "api", "label": "API" },
        { "id": "auth", "label": "Authentication" }
      ]
    }
  ]
}
```

UI 自动为两道题追加 Other，模型无需显式传入 `allow_other: true`。

## 5. Other、选项补充说明与答案校验

### 5.1 Other 行为

`single_select`、`multi_select` 和 `confirm` 默认展示 Other；只有显式指定 `allow_other: false` 才隐藏。

单选或确认题仍只允许选择一个选项，Other 与普通选项互斥。需要对普通选项补充描述时，直接填写该选项下方的补充说明。

选中 Other 后，最终答案直接使用输入文本，不添加 `Other:` 前缀。例如，用户输入 `Podman`，答案即为 `Podman`。Other 使用自定义答案文本框，不再叠加一个补充说明框。

多选题允许普通选项与 Other 同时选中。例如，用户选择 Web UI、Authentication，并在 Other 输入 Cloudflare Tunnel，最终答案为：

```text
- Web UI
- Authentication
- Cloudflare Tunnel
```

Other 未选中时，即使保留了输入草稿，也不进入最终答案。

### 5.2 选项补充说明

- 单选、多选和确认题的每个普通选项都提供补充说明；确认题包括 Yes 和 No。
- 输入框位于对应选项下方；存在模型提供的 `description` 时，按“选项标题 → 只读说明 → 补充输入框”排列。
- 输入默认空且始终可选，选中选项后才启用输入框；不自动填充或生成补充说明。
- 提交时，将非空补充说明附在选项 label 后，格式为 `选项文字 — 补充说明`。
- 补充说明为空或仅空白时，只回传选项 label，不附加分隔符。
- 多选题逐项附加各自的说明，每个选项保持一条答案。
- 取消选中后可保留当前卡片中的说明草稿，但不回传；重新选中可继续编辑。
- `allow_other=false` 只隐藏 Other，不影响普通选项的补充说明。

例如，选择 Docker 并填写部署要求后，回传：

```text
Q: Which deployment method do you prefer?
A: Docker — 使用 Docker Compose，部署在 NAS 上
```

### 5.3 答案校验规则

| 场景 | 行为 |
| --- | --- |
| 必填单选 / 确认题未选择 | 阻止提交，提示 `Please answer this question.` |
| 必填多选题未选择 | 至少选择一项，否则阻止提交 |
| 必填文本题为空或仅空白 | 阻止提交 |
| 已选择 Other，但文本为空或仅空白 | 阻止提交，提示 `Please type your answer.` |
| 可选题留空 | 允许提交，回传 `A: 未回答`，按会话语言本地化 |
| 可选题选择了 Other | 仍须填写 Other 文本 |
| 确认题选择 No | 算作有效答案，不将 `false` 或 `no` 误判为未回答 |
| 普通选项已选中，补充说明为空 | 允许提交，补充说明不属于必填内容 |
| 未选中选项仍有说明草稿 | 不回传该选项或其说明，也不视为题目已回答 |

文本题和 Other 使用 `trim()` 后是否为空判断是否已填写。单选题只允许一个选择；多选题可同时选择多个普通选项和 Other。

## 6. 提交与消息格式

### 6.1 提交流程

1. 校验必填题及 Other 输入。
2. 将已选选项转换为人类可读答案，逐项附加非空补充说明。
3. 生成 Q/A 文本。
4. 调用 `sendAnswerMessage(message)`，通过 MCP Apps 的 `ui/message` 发送。
5. ChatGPT 收到答案后，Assistant 继续原任务。

具体消息显示形式和下一轮生成行为需要在目标 ChatGPT 客户端实测。

### 6.2 简单提交保护

| 状态 | 行为 |
| --- | --- |
| `editing` | 允许填写和提交 |
| `submitting` | 立即禁用 Submit，阻止重复点击 |
| `submitted` | 显示已提交，禁用当前卡片的再次提交 |
| `error` | 保留当前输入、显示错误，允许用户手动重试 |

不自动重发。宿主无法发送时，显示可复制的 Q/A 文本，供用户粘贴到聊天输入框。

这些限制仅作用于当前卡片实例，不引入状态机库、服务端答案存储、刷新恢复或跨卡片协调。

### 6.3 消息格式

使用普通 Q/A 文本，便于用户阅读、模型理解和聊天导出；不依赖专用 parser。

```text
Q: Where do you want to deploy this?
A: Docker — 使用 Docker Compose，部署在 NAS 上

Q: Which features do you need?
A:
- Web UI — 支持深色模式
- Authentication
- Cloudflare Tunnel
```

消息不附加问卷 ID、版本号或其他协议字段，依靠当前聊天上下文理解答案。

选择类题目只回传用户选中的 label、填写的补充说明及 Other 答案，不把模型提供的 `Option.description` 当作用户补充说明回传。文本题继续回传用户填写的文本。

格式化伪代码：

```typescript
const message = questions
  .map((question) => {
    const answer = formatAnswer(question, answers[question.id]);
    return `Q: ${question.question}\nA: ${answer}`;
  })
  .join("\n\n");

await sendAnswerMessage(message);
```

`answers` 保存当前卡片的选择、各选项补充说明、Other 和文本题答案；`formatAnswer` 按第 5 节的规则格式化。

`sendAnswerMessage` 封装 MCP Apps 标准 `ui/message`，将发送结果交给当前卡片的提交状态处理。

## 7. 工具与 Skill 使用规则

### 7.1 何时提问

仅当重要信息无法可靠推断，且答案会实质影响结果时调用工具，例如：

- 存在多个合理方案，需要用户偏好决定。
- 需求存在歧义，或有多个合理解释。
- 用户偏好会决定架构。
- 需要用户作出影响结果的重要选择。

小问题直接采用合理默认值。例如，用户要求 Python hello world 时，不必先询问 Python 版本。

### 7.2 提问后的固定规则

以下规则同时体现在工具 `description` 和 `skills/ask-user-questions/SKILL.md` 中：

```text
After a successful ask_user_questions call, stop immediately and end the current turn.
Do not append an explanation, assume answers, continue the task, or call more tools.
Wait for the user's next message, whether submitted through the UI or typed in chat.
Then continue the original task using the answers already provided.
If the user changes or cancels the request, follow that message instead.
```

输入校验失败时可修正参数重试；成功返回问卷后即停止，不增加额外的 stop 工具。

Skill 包含 `name` / `description` frontmatter、适用条件、题目设计规则，以及停止、等待、收到答案后继续的流程。

## 8. 技术架构

### 8.1 方案 A：MCP Apps 标准

采用标准资源绑定和宿主桥接，维护一条实现路径，优先使用现成 SDK。

| 环节 | 实现 |
| --- | --- |
| 工具绑定 UI | `_meta.ui.resourceUri` |
| UI 初始化 | `ui/initialize` |
| 接收工具输入 / 结果 | `ui/notifications/tool-input` / `ui/notifications/tool-result` |
| 发送答案 | `ui/message` |
| UI 资源 | `ui://ask-user-questions/v1.html` |
| UI 资源 MIME 类型 | `text/html;profile=mcp-app` |
| 视图层 | React、TypeScript、`@openai/apps-sdk-ui` |

这是本项目已选定的实现方式，符合官方新 UI 指引。[OpenAI UI 开发指南](https://developers.openai.com/plugins/build/chatgpt-ui)

```text
ChatGPT → ask_user_questions → MCP Server
                                  │
                                  ├─ 校验并归一化题目
                                  └─ 返回题目数据和 UI 资源绑定
                                              ↓
                                    ChatGPT 内嵌问答卡片
                                    Assistant 结束本轮等待
                                              ↓
                                      用户填写并提交
                                              ↓
                               sendAnswerMessage → ui/message
                                              ↓
                                  ChatGPT 收到 Q/A 后继续
```

### 8.2 数据与服务约定

- 服务端应用默认值，返回 `structuredContent`，包含可选 `title` 和归一化的 `questions`。
- `content` 包含简短等待提示，以及供纯文本回答的题目和选项，支持 UI 不可用时的问答。
- 将 HTML、JS、CSS 构建为 MCP UI 资源，配置与实际加载行为匹配的 CSP。
- 工具只生成问卷，不执行确认题中描述的动作。
- 按当前无业务写入的行为，annotations 使用 `readOnlyHint: true`、`destructiveHint: false`、`openWorldHint: false`。
- 答案由前端直接交给 ChatGPT，服务端无需保存答案。

工具返回结构和 annotations 以官方约定为依据。[MCP 服务开发指南](https://developers.openai.com/plugins/build/mcp-server)

### 8.3 UI 组件

```text
AskUserQuestionsApp
├── QuestionHeader
├── QuestionCard[]
│   ├── SingleSelectQuestion
│   ├── MultiSelectQuestion
│   ├── TextQuestion
│   └── ConfirmQuestion
├── OtherInput
└── SubmitButton
```

## 9. 规划目录

以下是目标结构；当前仓库处于计划和项目约定初始化阶段。

```text
ask-user-question/
├── AGENTS.md
├── plan.md
├── plugin.json              # portable 插件清单
├── .app.json                # 已注册 ChatGPT MCP 连接的映射
├── assets/                  # 插件图标等展示资源
├── server/
│   ├── index.ts
│   ├── tools/
│   │   └── askUserQuestions.ts
│   └── schemas/
│       └── questions.ts
├── ui/
│   ├── App.tsx
│   ├── components/
│   │   ├── QuestionCard.tsx
│   │   ├── SingleSelect.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── TextQuestion.tsx
│   │   ├── ConfirmQuestion.tsx
│   │   └── OtherInput.tsx
│   └── utils/
│       ├── validation.ts
│       └── formatAnswer.ts
├── skills/
│   └── ask-user-questions/
│       └── SKILL.md
├── dist/                    # 构建生成的服务端和 UI 资源
├── docs/
│   ├── deployment.md
│   ├── installation.md
│   └── acceptance.md
├── package.json
├── tsconfig.json
└── README.md
```

## 10. 完整插件交付

### 10.1 打包方式

采用 portable 布局：根目录 `plugin.json`，技能放在 `skills/` 下。ChatGPT 展示信息和连接映射通过 `extensions.com.openai` 配置。

开发安装时，通过 `.app.json` 引用已注册的 MCP 连接。若需要随包声明独立 MCP 服务，再增加 `mcp.json`，避免重复注册同一工具。

官方仍支持 `.codex-plugin/plugin.json` 兼容布局；本项目新包采用根目录 manifest。插件包安装和 MCP 服务部署分别完成，交付时同时提供可访问的服务与安装说明。[插件打包指南](https://developers.openai.com/plugins/build/plugins)

### 10.2 部署与安装验证

1. 构建并部署 MCP 服务及 UI 产物，生产使用稳定 HTTPS `/mcp` 和 Streamable HTTP；开发可使用隧道。
2. 在 ChatGPT 开发者模式连接服务，验证工具发现、卡片展示、提交及停止等待行为。
3. 打包 manifest、连接映射、skill、图标及文档，安装完整插件后重新验收。
4. 记录目标客户端、账号所支持的安装路径，以及服务和元数据更新步骤。

开发连接和完整插件安装需要分别验证。[连接与测试指南](https://developers.openai.com/plugins/deploy/connect-chatgpt)

### 10.3 公开发布材料

- 名称、图标、说明、网站、支持、隐私和条款链接。
- Starter prompts，以及至少 5 个正向和 3 个负向测试用例。
- 通过 With MCP 提交的远程服务和最终 skill 包。

公开目录发布经过提交、审核、发布流程。开发用连接 ID 不能替代公开提交，本地构建成功也不代表发布成功。[提交与发布指南](https://developers.openai.com/plugins/deploy/submission)

## 11. 实施阶段与提交约定

每个阶段完成相关检查后提交一次 Git commit，记录本阶段的完整变更。具体工作约定见 [AGENTS.md](AGENTS.md)。

| 阶段 | 内容 | 完成条件 |
| --- | --- | --- |
| 0. 计划与约定 | 确定方案 A、整理 Markdown、初始化项目指令 | 文档检查通过并提交 |
| 1. 最小闭环 | 一道单选题、标准 MCP Apps 桥接、停止等待及回传 | 真实 ChatGPT 中完成提问、回答、继续任务 |
| 2. 完整问答 UI | 四种题型、Other、选项补充说明、基本校验和提交保护 | 核心功能与边界用例通过 |
| 3. 插件集成 | Skill、manifest、连接映射和完整安装 | 新对话中验证 skill、工具和 UI 一起工作 |
| 4. 交付准备 | 稳定部署、文档、发布材料及完整验收 | 可安装、可部署、可验收，发布材料齐备 |

单选题闭环验证是实施第一步，不替代完整插件交付。真实客户端验证尚未完成时，应明确记录，不将阶段标记为完成。

## 12. MVP 验收

| 编号 | 场景 | 预期结果 |
| --- | --- | --- |
| 1 | 单选题选择 Docker 并提交 | 聊天收到对应问题和 `A: Docker` |
| 2 | Other 输入 Podman 并提交 | 收到 `A: Podman`，不添加 `Other:` 前缀 |
| 3 | 多选 Web UI、API、Other → Cloudflare Tunnel | 答案包含三项，各自占一行 |
| 4 | 必填题未回答或 Other 仅有空白 | 阻止提交并提示填写 |
| 5 | 工具调用成功后等待，随后提交答案 | 本轮无额外说明或后续工具调用；收到答案后继续，不重复询问已回答问题 |
| 6 | 四种题型、可选题、隐藏 Other 和非法输入 | 文本题和确认题可正常回答；No 有效；可选题可留空；未选中的 Other 草稿不回传；非法题数、选项及重复 ID 被拒绝 |
| 7 | 重复点击、发送成功、发送失败或接口不可用 | 一次点击流程只发起一次发送；成功后禁用；失败保留输入并可手动重试；接口不可用时可复制 Q/A |
| 8 | 用户直接打字回答或改变任务 | 使用文字答案继续；不强迫提交卡片；改变任务时按新消息处理 |
| 9 | 按安装说明安装完整插件并新建对话 | Skill、工具和 UI 均可用，能够完整完成问答 |
| 10 | 单选、多选及确认题填写选项补充说明 | 输入框位于选项下方且默认空；非空内容附在各自 label 后；单选和确认题仍只选一项 |
| 11 | 补充说明留空、取消选中、重新选中或隐藏 Other | 空说明不阻止提交且不附分隔符；未选中说明不回传；重选可恢复草稿；隐藏 Other 不影响说明输入 |
| 12 | 选项同时有模型 description 和用户补充说明 | 只读说明与输入分开展示，回传 label 和用户说明，不将模型 description 当成用户答案 |

在 `docs/acceptance.md` 中记录实际环境、执行结果和未完成项；当前表格描述预期行为，不表示测试已执行。
