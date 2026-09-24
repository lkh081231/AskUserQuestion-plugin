# ChatGPT Ask User Question Plugin 实现计划

官方开发文档、接口参考及审核资料已保存至 [OpenAI 文档索引](docs/reference/openai/README.md)，抓取日期为 2026-09-21；项目相关边界见[限制摘要](docs/reference/openai/LIMITATIONS.md)。接入与发布前需复核最新官方文档。

## 1. 目标与已确定决策

实现一个可在 ChatGPT Chat 中调用的 `ask_user_questions` 工具，让用户通过问答卡片补充信息，再由 Assistant 继续原任务。

交付完整插件：可安装的插件包、skill、部署好的 MCP 服务、问答 UI，以及安装、部署和验收文档。

| 项目 | 已确定方案 |
| --- | --- |
| UI 接入 | **方案 A：MCP Apps 标准** |
| 工具数量 | 一个：`ask_user_questions` |
| 提问后行为 | 通过指令要求工具调用成功后结束本轮并等待答案；不保证强制停止 |
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
用户逐题填写并最终提交（按钮或 Enter），或直接在聊天中打字回答
    ↓
ChatGPT 收到答案，Assistant 继续原任务
```

这里的 stop 指结束当前 assistant turn：不追加说明、不猜测答案、不继续任务。
MCP 请求正常返回，不保持挂起。停止等待是由工具说明和 skill 引导的目标行为，不是运行时强制保证；已知限制见第 7.2.1 节。

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

可根据实际需要增加条件题、`number`、`date`、`slider`、`ranking`、`matrix`、`file`，以及 Skip、Edit answer；前后翻页已纳入本次改版。

普通聊天已自然支持多轮提问：每次提问后结束本轮，收到答案后再决定是否需要下一组问题，无需额外的多步骤运行时。

## 3. 问答交互

### 3.1 布局与操作

2026-09-22 用户已确认 B 版视觉及最终交互，预览提交为 `2fe1f83`。参考 [固定输入框与分页预览](docs/previews/chat-flow.html)、[分页截图](docs/previews/chat-flow-multiple.png)和[提交后摘要](docs/previews/chat-flow-multiple-submitted.png)。以下为待实施的新要求，现有正式 UI 仍是一次展示全部问题、成功后禁用的旧版本；实施清单见 [TODO](TODO.md)，交给用户后续使用的 5.6 sol 执行。

- B 版视觉：浅色背景、细边框、灰色编号、选中项浅灰高亮和深色编号；整行选择区域覆盖编号、文字及留白。
- 提问面板紧贴聊天输入框上方，滚动历史消息时面板和输入框不移动。此为已确认的产品目标，宿主能力仍须先验证，见第 3.1.1 节。
- 多题每次只展示一题，右上角显示 `1 / N` 和前后切换；不预选答案。回退和再次前进保留每题的选择、Other、详情和文本草稿。
- 点击选项仅选择，允许补充详情；当前题有效后点击“下一题”或在详情/文本输入中按 Enter 前进。单题或最后一题按 Enter/点击提交时，校验全部答案并统一发送一次。
- Shift + Enter 换行；输入法组合与确认选字不触发前进或提交。可选题留空允许前进；必填错误定位到对应题目及控件。
- 普通选项选中后才展开下方可选详情输入，默认空；模型 `description` 仍为独立只读说明。Other 排在普通选项之后，选中后展开独立自定义文本框。
- 宿主确认发送成功后，编辑面板收起，保留一张包含全部题目和答案的摘要卡：问题灰色、答案深色、每题上下排列，无选项、输入框、提交按钮和分页。
- 发送中防重复并禁用编辑/翻页；失败保留答案、允许重试，继续提供可选中复制的 Q/A 兜底。
- 用户直接在聊天输入框回答时，Assistant 沿用文字答案；正式 MCP iframe 未验证能观察宿主输入，不能照搬独立预览的聊天模拟器或承诺跨卡片自动收起。
- 当前题内容过长时仅题目内容区滚动，保持题目导航和提交操作可访问；支持手机/iPad/桌面及键盘操作。

### 3.1.1 宿主能力核验与边界

独立 HTML 预览控制整个页面，不能作为 ChatGPT 内嵌 MCP App 能绑定宿主输入框的证据。正式 UI 开始前须核对最新官方接口和实际宿主：定位、显示模式、关闭/收起及高度调整能力，并记录来源、环境和实测结果。

不得以 iframe 内 `position: fixed` 冒充固定到 ChatGPT 输入框，也不得操作跨域父页面 DOM。若无公开受支持的绑定接口，明确记录缺口并向用户提出可审阅的替代呈现方案；不能静默把随消息滚动的卡片标记为达到固定目标。视觉、分页、点击、键盘和摘要等已确定的独立改造可继续实施。

保留 MCP Apps 标准 `ui/message` 与 `_meta.ui.resourceUri`，不引入问卷关联 ID、答案数据库或 agent suspend/resume。参考图中的排序、拖拽和 Skip/关闭不自动扩大现有题型与操作范围。

### 3.2 四种题型

**单选题（示例为用户已选择 Docker 并补充说明后的状态）：**

```text
Which deployment method do you prefer?
● Docker
  [ 使用 Docker Compose，部署在 NAS 上 ]
○ Native Linux
○ Kubernetes
○ Other
  └─ 选中后输入自定义答案
```

**多选题（示例为用户已勾选后的状态）：**

```text
Which features do you need?
☑ Web UI
  [ 支持深色模式 ]
☐ API
☑ Authentication
  [ 补充说明（可选） ]
☐ Database
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
○ No
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
○ Modular monolith
  Better separation while remaining one service
○ Microservices
  Independent services
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
- 输入默认空且始终可选，选中选项后才展开输入框；不自动填充或生成补充说明。
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

1. 前进时校验当前题；最终提交时校验全部必填题及 Other 输入，必要时返回首个错误题。
2. 将已选选项转换为人类可读答案，逐项附加非空补充说明。
3. 生成 Q/A 文本。
4. 调用 `sendAnswerMessage(message)`，通过 MCP Apps 的 `ui/message` 发送。
5. 宿主确认发送成功后，UI 收起为全部问答摘要；ChatGPT 收到答案后，Assistant 继续原任务。

具体消息显示形式和下一轮生成行为需要在目标 ChatGPT 客户端实测。

宿主明确通知本次提问工具调用失败或取消时，UI 撤下编辑表单并显示对应提示；终止后的迟到题目通知不能恢复表单。这与答案发送失败时保留输入供手动重试是两个不同状态；宿主没有创建 UI 或没有投递工具状态时，组件不能自行得知远端调用结果。

### 6.2 简单提交保护

| 状态 | 行为 |
| --- | --- |
| `editing` | 允许填写和提交 |
| `submitting` | 立即禁用 Submit，阻止重复点击 |
| `submitted` | 收起编辑控件，仅保留全部问答摘要，禁止重复提交 |
| `error` | 保留当前输入、显示错误，允许用户手动重试 |

不自动重发。宿主无法发送时，显示可选中的 Q/A 文本，供用户手动复制并粘贴到聊天输入框。官方 UI 沙箱不支持 `navigator.clipboard`，不依赖程序化剪贴板复制。[安全隐私说明](docs/reference/openai/upstream/guides/security-privacy.md)

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

### 7.1 何时提问：以用户对齐为先

提问的首要目标是让结果符合用户的真实意图。减少点击和输入成本应通过清晰的问题与选项实现，不能靠省略必要的对齐来实现。“实现简单”“模型有推荐方案”或“可以先做再改”，都不足以把一个选择判定为小问题。

#### 7.1.1 先检查已有信息

先使用用户当前指令、此前已确认的选择和可读取的上下文。已有明确答案时直接遵循，不重复询问。可靠推断必须有具体依据，例如用户已指定的输出格式或仓库已有的运行环境；模型自身的习惯和常用默认值不等于用户偏好。

#### 7.1.2 哪些未知信息需要先对齐

当信息缺失或存在多个合理解释，并且不同答案会影响下列任一方面时，应先调用工具提问：

- **目标与范围**：最终解决什么问题、包含哪些内容、做到什么程度。
- **受众与使用场景**：给谁使用、在什么环境下使用、需要多深的解释。
- **交付与验收**：交付格式、详细程度、成功标准，或用户据此作出的决定。
- **约束与取舍**：时间、预算、兼容性、部署环境，以及功能之间的优先级。
- **主观偏好**：风格、语气、视觉方向或工作方式，且现有上下文没有明确偏好。
- **返工成本**：选错后会导致明显重做、额外投入，或使结果无法直接使用。

问题短、代码少或修改容易，也可能需要对齐。例如，邀请函使用正式还是轻松语气，会影响用户能否直接发送，不能仅因修改几个词就默认替用户决定。

#### 7.1.3 小问题的明确边界

只有同时满足以下条件的细节，才可以直接采用默认值：

1. 目标、范围、交付形式和关键约束已经清楚。
2. 存在由上下文或稳定惯例支持的默认值，无迹象表明用户对此有特别偏好。
3. 不同合理选择不会实质改变结果的含义、用途、验收或用户体验。
4. 即使默认值不合适，也能局部、低成本地调整，不牵动方案和主要内容。

“小问题”取决于当前任务中的影响，不是按技术领域或问题名称固定分类。同一个版本选择，在 hello world 示例里可能无关紧要，在需要兼容旧系统的程序里就会影响可用性。

#### 7.1.4 正反例

| 用户请求或上下文 | 行为 | 判断依据 |
| --- | --- | --- |
| “写一个 Python hello world”，没有特殊环境要求 | 直接给出常规示例，不询问具体 Python 小版本 | 版本细节不实质影响这个示例的目标和交付 |
| 已有代码遵循统一缩进，要求增加一个简单函数 | 沿用仓库风格 | 上下文已有依据，不影响用户目标 |
| “写一份产品介绍”，未说明给客户还是工程团队看 | 先问受众和用途 | 决定内容重点、术语和深度 |
| “做一个网站”，未说明是展示页还是可用业务系统 | 先问目标和范围 | 交付物与实现工作量显著不同 |
| “写一封邀请函”，关系和场合不明 | 先问对象、场合或期望语气 | 影响能否直接使用，不能以改写容易为由跳过 |
| “写一个能在公司旧环境运行的 Python 工具”，环境未知 | 先核实环境；上下文无法确定时提问 | 版本影响兼容性和验收 |
| 用户已经指定 Docker 部署、中文输出 | 按已给信息继续，不重复询问 | 对齐已经完成 |
| 用户明确表示“风格你定” | 在授权范围内自行选择 | 该偏好已交由 Assistant 决定；其他未明确的关键约束仍需判断 |

#### 7.1.5 不确定时的处理

- 无法判断一个未知选择是否会改变用户预期时，优先提出一个简短、具体的对齐问题。
- 每个问题应对应一个明确影响；避免泛泛询问“还有什么要求”。
- 可给出推荐选项和简短理由，但不自动替用户选择。
- 一次只询问当前阶段需要明确的信息；题数上限用于控制单次负担，不是省略关键问题的理由。
- 先澄清目标层面的分歧，再询问依赖该目标的细节；无需让用户回答对当前结果没有影响的实现细节。

### 7.2 提问后的行为要求与限制

以下是期望模型遵循的行为要求，同时体现在工具 `description` 和 `skills/ask-user-questions/SKILL.md` 中；这些指令不构成强制停止机制：

```text
After a successful ask_user_questions call, stop immediately and end the current turn.
Do not append an explanation, assume answers, continue the task, or call more tools.
Wait for the user's next message, whether submitted through the UI or typed in chat.
Then continue the original task using the answers already provided.
If the user changes or cancels the request, follow that message instead.
```

输入校验失败时可修正参数重试；成功返回问卷后要求模型立即结束本轮，不增加额外的 stop 工具。

Skill 包含 `name` / `description` frontmatter、第 7.1 节的对齐原则、小问题判定条件和正反例，以及题目设计和停止、等待、收到答案后继续的流程。工具 `description` 简要说明：对齐优先，关键未知先问，已知不重复，满足全部小问题条件时直接继续。

#### 7.2.1 已知平台限制

截至 2026-09-21，根据已查阅的 ChatGPT 插件公开文档，尚未发现允许第三方插件强制停止当前模型生成、结束 assistant turn 或暂停等待用户的公开接口。这个结论限定于公开插件能力，不推断 ChatGPT 的内部实现。

- `ui/message` 用于发送后续消息；`requestClose()` 用于关闭组件，不能视为模型停止接口。
- 自定义“提问结束符”只是文本。没有宿主识别并执行停止的机制时，它不能提供强制保证。
- 工具说明、skill 和工具返回中的等待提示只能引导模型行为。模型仍可能追加文字、自行继续任务或发起后续工具调用。
- UI 成功展示、MCP 请求已返回、前端不再发送消息，都不等于模型已经停止。
- 本项目不通过保持 MCP 请求挂起、增加 stop 工具或模拟宿主按钮来声称解决该限制。

依据：[ChatGPT 插件接口参考](https://developers.openai.com/plugins/reference)、[MCP Apps UI 指南](https://developers.openai.com/plugins/build/chatgpt-ui)。

#### 7.2.2 验证与对外说明

最小闭环阶段优先验证模型停止等待的实际表现，并将以下结果写入 `docs/acceptance.md`：

- 测试日期、客户端、可见的模型标识、插件版本及测试提示。
- 每个测试场景的执行次数、符合预期的次数，以及失败样例。
- 分别记录额外文字、提前继续任务、额外工具调用，以及收到答案后能否正确继续。

本地 UI 和 MCP 测试不能替代模型行为验证。实测通过只说明该环境和样本中的表现，不能宣称所有模型或对话均能可靠停止；失败样例必须保留，不因已披露限制就标为通过。

创建 README 时必须同步写入第 10.4 节的限制说明。未来如果官方开放相关接口，先核对支持范围并实测，再更新实现、计划和 README 中的能力描述。

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

### 8.4 原生客户端兼容性修复

2026-09-23 的证据将 Windows 卡片加载/展示与手机/iPad Tunnel 入口组织鉴权分开。分阶段实施见[客户端修复方案](docs/client-repair-plan.md)，证据见[排查记录](docs/client-troubleshooting.md)。此工作与 B 版视觉改造分开提交。

标准 MCP Apps 接口仍为主路径。官方兼容别名先作为单因素实验；旧桥接适配必须有真实宿主证据，不能从无状态 MCP 请求缺失初始化能力推断不支持 UI。手机/iPad 不通过修改 UI 或向本地响应添加组织头修复入口鉴权。公开 HTTPS 仅列作独立部署备选，尚未改变当前私有运行方式。

## 9. 规划目录

以下是当前实现结构概览；测试文件和构建配置未全部展开。

```text
ask-user-question/
├── AGENTS.md
├── plan.md
├── plugin.json              # portable 插件清单
├── .app.json                # 已注册 ChatGPT MCP 连接的映射
├── .codex-plugin/plugin.json # Codex compatibility manifest
├── assets/                  # 插件图标等展示资源
├── server/
│   ├── app.ts
│   ├── config.ts
│   ├── index.ts
│   ├── tools/
│   │   └── askUserQuestions.ts
│   └── schemas/
│       └── questions.ts
├── ui/src/
│   ├── App.tsx
│   ├── copy.ts
│   ├── types.ts
│   ├── components/QuestionCard.tsx
│   └── utils/
│       ├── answers.ts
│       └── validation.ts
├── skills/
│   └── ask-user-questions/
│       └── SKILL.md
├── dist/                    # 构建生成的服务端和 UI 资源
├── docs/
│   ├── reference/openai/     # 已下载的官方文档、来源清单及限制摘要
│   ├── deployment.md
│   ├── installation.md
│   ├── acceptance.md
│   ├── publishing.md
│   ├── privacy.md
│   ├── support.md
│   └── terms.md
├── Dockerfile
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

### 10.4 README 必须包含的已知限制

`README.md` 已包含“已知限制”章节，明确停止等待依赖模型遵循指令，并链接实际验收记录。采用的说明文字：

> 本插件通过工具说明和 skill 请求 ChatGPT 在展示问题后结束本轮，等待你的回答。目前查阅的公开插件接口不提供强制停止当前模型生成的能力，因此模型仍可能追加回复或提前继续任务。自定义结束符不能消除这一限制。支持环境、实测结果和已知失败情况见验收记录；测试通过不代表所有对话均有停止保证。

同时说明 UI 沙箱的手动复制兜底、宿主与部署条件，详见[限制摘要](docs/reference/openai/LIMITATIONS.md)。注明能力核对日期，区分已测试与未测试环境。README 和发布说明不得将该行为描述为“强制暂停”“保证停止”或完整的 agent suspend/resume。

## 11. 实施阶段与提交约定

每个阶段完成相关检查后提交一次 Git commit，记录本阶段的完整变更。具体工作约定见 [AGENTS.md](AGENTS.md)。

| 阶段 | 内容 | 完成条件 |
| --- | --- | --- |
| 0. 计划与约定 | 确定方案 A、整理 Markdown、初始化项目指令 | 文档检查通过并提交 |
| 1. 最小闭环 | 一道单选题、标准 MCP Apps 桥接、停止等待及回传 | 真实 ChatGPT 中完成闭环，并记录停止行为的测试次数、结果和失败样例 |
| 2. 完整问答 UI | 四种题型、Other、选项补充说明、基本校验和提交保护 | 核心功能与边界用例通过 |
| 3. 插件集成 | Skill、manifest、连接映射和完整安装 | 新对话中验证 skill、工具和 UI 一起工作 |
| 4. 交付准备 | 稳定部署、文档、发布材料及完整验收 | 可安装、可部署、可验收；README 披露停止限制，发布材料齐备 |

单选题闭环验证是实施第一步，不替代完整插件交付。真实客户端验证尚未完成时，应明确记录，不将阶段标记为完成。

截至 2026-09-22，阶段 0 已完成；阶段 2 旧版的本地功能与边界测试已完成，B 版分页/摘要/键盘修复及宿主输入框绑定仍待实施。Secure MCP Tunnel 已在真实 ChatGPT 中完成工具发现、四题型 UI 和答案回传验证，并已通过 user systemd 常态化运行、健康、就绪和异常自动恢复测试，但阶段 1 仍缺少停止等待行为统计；阶段 3 已完成 skill 和包结构但缺少真实连接 ID 与完整安装；阶段 4 的私有 Tunnel 部署已完成，公网部署、法律/支持 URL 和公开审核仍受外部条件阻塞。实际证据见[验收记录](docs/acceptance.md)。

## 12. MVP 验收

| 编号 | 场景 | 预期结果 |
| --- | --- | --- |
| 1 | 单选题选择 Docker 并提交 | 聊天收到对应问题和 `A: Docker` |
| 2 | Other 输入 Podman 并提交 | 收到 `A: Podman`，不添加 `Other:` 前缀 |
| 3 | 多选 Web UI、API、Other → Cloudflare Tunnel | 答案包含三项，各自占一行 |
| 4 | 必填题未回答或 Other 仅有空白 | 阻止提交并提示填写 |
| 5 | 工具调用成功后等待，随后提交答案 | 行为目标：本轮无额外说明、提前继续或后续工具调用；收到答案后继续，不重复询问已回答问题。按第 7.2.2 节记录实际表现，不视为强制保证 |
| 6 | 四种题型、可选题、隐藏 Other 和非法输入 | 文本题和确认题可正常回答；No 有效；可选题可留空；未选中的 Other 草稿不回传；非法题数、选项及重复 ID 被拒绝 |
| 7 | 重复点击、发送成功、发送失败或接口不可用 | 一次点击流程只发起一次发送；成功后仅保留全部问答摘要；失败保留输入并可手动重试；接口不可用时可选中并手动复制 Q/A，不依赖 `navigator.clipboard` |
| 8 | 用户直接打字回答或改变任务 | 使用文字答案继续；不强迫提交卡片；改变任务时按新消息处理 |
| 9 | 按安装说明安装完整插件并新建对话 | Skill、工具和 UI 均可用，能够完整完成问答 |
| 10 | 单选、多选及确认题填写选项补充说明 | 选中后在选项下方展开默认空的输入框；非空内容附在各自 label 后；单选和确认题仍只选一项 |
| 11 | 补充说明留空、取消选中、重新选中或隐藏 Other | 空说明不阻止提交且不附分隔符；未选中说明不回传；重选可恢复草稿；隐藏 Other 不影响说明输入 |
| 12 | 选项同时有模型 description 和用户补充说明 | 只读说明与输入分开展示，回传 label 和用户说明，不将模型 description 当成用户答案 |
| 13 | 明确的小问题：常规 Python hello world、沿用现有缩进 | 直接完成，不为无实质影响的细节弹出问卷 |
| 14 | 目标、受众、语气、范围或兼容环境未明确且影响结果 | 在产出依赖该选择的内容前先提问，不以实现简单或可返工为由猜测 |
| 15 | 用户已给答案或已将某项选择交给 Assistant | 不重复询问，在已确认或授权范围内继续 |
| 16 | 无法确定未知选择是否影响用户预期 | 用简短具体的问题先对齐，不以减少提问为由直接默认 |
| 17 | README 与验收记录中的停止能力说明 | README 明确说明没有已确认的公开强制停止接口、行为依赖模型指令遵循；注明核对日期并链接真实测试结果，不承诺所有对话必然停止 |
| 18 | B 版选择行、详情与键盘 | 整行单击/触摸可选择，详情不误切换选择，Enter 按当前页前进/提交，Shift + Enter 与输入法选字不提交 |
| 19 | 多题前后导航 | 每次一题、显示页数、回退保留全部草稿；必填和 Other 错误阻止前进，最终仅发送一次 |
| 20 | 提交成功后摘要 | 一张卡包含所有问题与答案，编辑控件及页码消失，发送失败不提前收起 |
| 21 | 与宿主输入框绑定 | 真实宿主中滚动前后位置不变；无受支持接口则标记能力缺口，不用独立预览冒充通过 |

在 `docs/acceptance.md` 中记录实际环境、执行结果和未完成项；当前表格描述预期行为，不表示测试已执行。
