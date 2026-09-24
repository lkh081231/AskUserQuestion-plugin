# 宿主 UI 能力核验

核对日期：2026-09-24（UTC）。范围：官方公开接口、当前安装的 `@modelcontextprotocol/ext-apps@2.0.0` 类型声明；本次未连接真实 ChatGPT 客户端执行显示模式实验。

## 核验结果

用户已确认的目标是提问面板固定在聊天输入框上方，聊天记录滚动时不移位。本次查阅的公开接口未发现指定宿主输入框锚点、停靠位置或与输入框绑定的参数。不能把独立 HTML 预览的布局能力等同于正式 MCP iframe 的能力，也不能据此断言所有宿主均不支持未来扩展。

| 能力 | 已核对的接口或文档 | 对本项目的含义 |
| --- | --- | --- |
| 内嵌显示 | 默认 `inline`，UI 位于宿主内容流 | 可承载 B 版分页和摘要，但不能宣称滚动时固定在输入框旁 |
| 切换显示模式 | `requestDisplayMode`，模式为 `inline`、`fullscreen`、`pip`；查看 `availableDisplayModes`，返回实际模式 | 宿主可不满足所请求模式；这些枚举不提供输入框停靠坐标 |
| PiP | 官方将其用于对话继续时保持可见的活动 | 可以作为后续浮层候选；位置由宿主决定，移动端可能改为全屏，尚未实测 |
| 关闭 | 标准 SDK 的 `requestTeardown` 请求宿主卸载；ChatGPT 扩展有 `window.openai.requestClose()` | 请求不等于已关闭，不证明可以改变在对话中的位置；当前已确认行为为成功后保留问答摘要 |
| 高度与尺寸 | 标准 SDK 的 `sendSizeChanged`、`autoResize`；ChatGPT 扩展有 `notifyIntrinsicHeight` | 通知内容尺寸以适应分页和摘要高度，不能移动 iframe 到宿主输入框 |
| 宿主 DOM 与聊天输入 | UI 在受限 iframe 内运行 | 不访问跨域父页面 DOM，不复制预览里的模拟聊天输入栏，不假设能监听用户直接输入的聊天消息 |

来源：[OpenAI UI 接入与呈现方式](https://developers.openai.com/plugins/build/chatgpt-ui)、[OpenAI UI 运行时参考](https://developers.openai.com/plugins/reference)、[MCP Apps 标准 SDK App API](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html)、[MCP Apps 架构与沙箱说明](https://apps.extensions.modelcontextprotocol.io/api/documents/Overview.html)。

本地核对：`node_modules/@modelcontextprotocol/ext-apps/dist/src/app.d.ts` 声明了 `requestTeardown`、`requestDisplayMode` 和 `sendSizeChanged`；正式组件已有 `useApp({ autoResize: true })`。声明存在不代表目标客户端实际支持。

## 可审阅的呈现候选

| 候选 | 能保留的体验 | 缺口与待确认事项 |
| --- | --- | --- |
| 标准内嵌卡片 | B 版选中高亮、逐题分页、Enter 操作、成功问答摘要 | 随宿主消息滚动；不能达到固定输入框目标，是否接受由用户决定 |
| 宿主支持时请求 PiP | 可能在翻阅历史时保持可见，可复用同一题目表单 | 不保证紧贴输入框；需先验证实际模式、移动端行为、关闭与摘要保留方式，不能自动启用冒充原目标 |
| 用户可控制的独立聊天页面 | 已确认 HTML 预览能把问题和输入框放在同一固定区域 | 超出当前 ChatGPT 插件交付范围，不代表在 ChatGPT 里实现相同行为 |

本阶段按 `plan.md` 第 3.1.1 节继续独立实施视觉、分页、键盘、发送和摘要；不引入未经确认的显示模式切换，不把内嵌布局记为固定目标通过。

## 真实宿主待验收

1. 记录 ChatGPT 客户端、版本、日期、连接方式和账号上下文。
2. 读取实际 `hostContext.displayMode`、`availableDisplayModes`、`containerDimensions`。
3. 若用户选择 PiP 候选，记录请求值、返回值、实际位置、滚动表现及移动端变化。
4. 验证分页与成功摘要后的高度变化、焦点、可见区域和消息回传。
5. 确认宿主是否真的存在额外支持的输入框绑定接口；若无证据，保持该验收项未完成。

本次真实宿主定位/显示模式实验次数为 0；不得以本地单元测试或独立预览替代。
