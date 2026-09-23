# 原生客户端调用失败排查

排查日期：2026-09-22 至 2026-09-23（UTC）。当前结论：**Windows 的失败调用已关联到本机日志，且同一原始对话在浏览器能显示卡片，问题范围缩小到 Windows 客户端卡片加载/展示路径。iPad 则优先指向调用入口的组织上下文鉴权。两者应分开排查，尚未完成修复。**

本次仅进行只读排查，没有修改生产代码、运行配置、组织关联或凭据，也没有重启服务。UI 已确认方案的交接见 [plan.md](../plan.md) 和 [TODO.md](../TODO.md)，提交 `0714b5f`。

## 用户提供的现象

| 环境 | 现象 | 证据来源 |
| --- | --- | --- |
| 手机浏览器 | 正常 | 用户报告 |
| PC 浏览器 | 正常 | 用户报告 |
| 手机/iPad 原生 ChatGPT | 调用阶段出现下方 UNAUTHORIZED | 用户提供错误文本，确认同一账号 |
| Windows 原生 ChatGPT | 静默失败；在 PC 浏览器打开同一原始对话能显示提问卡片 | 用户截图、分享链接、对应请求日志及浏览器复核 |
| UI 显示与答案提交 | 用户补充“提交和 ui 显示正常” | 未细分各端，不能将每个原生客户端的 UI/提交都记为已验收 |

原始错误：

```text
UNAUTHORIZED
Access denied: this tunnel requires an active organization context.
Configure the organization ID or send the OpenAI-Organization header.
```

用户补充的版本和失败时间：

| 客户端 | ChatGPT 版本（保留用户原写法） | 2026-09-23 失败时间 | 分享记录 |
| --- | --- | --- | --- |
| Android | `1.2026.258（15）` | 尚未提供单独时间 | 尚未提供 |
| iOS / iPad | `1.2026.251(34655566626)` | UTC+8 16:36，即 UTC 08:36 | [iPad 记录](https://chatgpt.com/s/t_6ab38f8f57c08191b592a4e21ebd5cc3) |
| Windows | `26.905.11957` | UTC+8 16:35，即 UTC 08:35 | [Windows 记录](https://chatgpt.com/s/t_6ab38f326614819195f6c4a8acbb2aa9) |

用户确认是同一账号，并补充“个人用户，就是普通的 chat 没有指定工作区”。目前没有用户主动切换团队工作区的证据，不再把切换工作区作为默认解释；产品调用携带的内部组织上下文仍需平台核查。尚缺各端操作系统完整版本及原始工具调用结果；Android 版本括号中的 `15` 未单独确认含义。

## 失败请求与本机日志的关联

分享页面于 2026-09-23 正常 HTTP GET 返回 200；只解析页面中已有的消息数据，没有执行嵌入脚本。分享记录展示的是助手最终消息与元数据，**不是完整原始工具响应**；其中助手对原因的解释不能作为平台已确认的结论。

| 证据 | Windows | iPad |
| --- | --- | --- |
| 分享消息中的 `request_id` | `4efe9788-9226-4af9-9238-459c9204e209` | `3ab0ad39-142e-4ba2-a8b7-92898ebdbca6` |
| 分享记录发布时间（UTC） | 08:34:58.398 | 08:36:31.342 |
| 本机 Tunnel 转发 | 08:34:46.301、08:34:46.783，两条日志的 `cmd_request_id` 均为上述 ID 加 `/en67` | 08:32–08:39 窗口内没有对应 ID，也没有 08:36 的转发记录 |
| 分享消息内容 | 最终文本为空，渲染表达式返回 `null`；未出现 UNAUTHORIZED | 助手报告 UNAUTHORIZED，并引用缺少 active organization context 的错误 |
| 同一原始对话在浏览器打开 | 用户确认能显示提问卡片 | 尚未单独验证 |
| 分享元数据中的模型 | `gpt-5-6` | `gpt-5-6-thinking` |

Windows 对应的本机命令 ID 为 `cmd_1afa06d1_e139_4884_a041_1547430967e1`、`cmd_dce0e1c4_79c6_475b_b4cf_4643e7d5d651`。它们将分享消息和服务器转发关联起来；日志未记录这两条各自的方法与结果正文，不能凭 `rpc_request_id` 猜测方法。

Tunnel 方法累计计数在两个失败样本前后发生如下变化，期间进程没有重启：

| 方法 / HTTP 状态 | 08:17 后首次采样 | 08:40:04 UTC | 08:44:41 UTC |
| --- | --- | --- | --- |
| `initialize` / 200 | 2 | 3 | 3 |
| `tools/call` / 200 | 6 | 7 | 7 |
| `resources/read` / 200 | 5 | 5 | 6 |

08:44:36.142 UTC 新增一条转发，`cmd_request_id=d3732812-0c7d-4798-acbc-a080be608674/r7si`，与浏览器复核时段相符。结合计数，新增请求为成功的 UI 资源读取；日志无客户端标签，因此与浏览器操作的归属仍属于时间相关性。08:40 前资源计数没有增加也不能单独证明 Windows 未加载资源，宿主可能使用缓存。

两份分享记录使用的模型不同，不能把所有差异只归因于操作系统。后续跨端新调用应固定模型、账号上下文及连接；Windows 同一原始对话在浏览器呈现正常，则已经提供了无需重新生成工具结果的对照证据。

## 已验证的服务侧事实

| 检查 | 结果 | 范围/限制 |
| --- | --- | --- |
| MCP user systemd | active/running；自 2026-09-22 06:38:30 UTC 运行 | 不能证明具体原生客户端请求已到达 |
| Tunnel user systemd | active/running；自 2026-09-22 06:48:01 UTC 运行 | 本次未重启 |
| `/healthz`、`/readyz` | 200，`live` / `ready` | 本地运行状态 |
| Tunnel 版本 | `0.0.14+0f870e50a973fa820d4c409000059e181e8d242b` | 已安装版本；未据此声称为最新版本 |
| 随机端口 `doctor` | `result: ok`，无失败检查 | 配置、MCP 可达、OAuth 元数据探测、临时监听和 UI 检查通过；不替代原生客户端鉴权测试 |
| MCP OAuth | 未发布业务 OAuth 元数据，候选地址为 404 | 当前应用无业务登录流程，不应混同于 OpenAI Tunnel 的组织鉴权 |
| 当前配置 | 未设置 `CONTROL_PLANE_ORGANIZATION_ID`、额外 control-plane/MCP headers，未开启原始 HTTP 日志 | 缺少可选变量本身不是故障证据 |
| 当前 Tunnel 元数据 GET | 使用已有 runtime key，不带组织头返回 200 | 证明此运行凭据能识别/访问当前 Tunnel，不证明 ChatGPT 原生调用 token 的状态 |
| 带已有组织头再次 GET | 同样返回 200 | 没有出现“加头才恢复”的差异 |
| 元数据关联 | 1 个 organization、1 个 workspace、0 个 tenant | 不能仅凭数量判定关联正确/错误；尚未与失败客户端实际上下文逐一核对 |
| 报错文本来源检查 | 项目服务/UI 代码无该组织判断；已安装 tunnel-client 二进制无两条完整报错字串 | 支持入口层假设，不等于已拿到失败请求的远端调用栈 |
| 标准 `tools/list` 本地请求 | HTTP 200，返回 `ask_user_questions` | 工具发现正常 |
| 运行中工具的 UI 绑定 | `_meta.ui.resourceUri=ui://ask-user-questions/v1.html` | 使用标准元数据；没有 `openai/outputTemplate` 兼容别名 |
| 运行中 `resources/read` 本地请求 | HTTP 200，`text/html;profile=mcp-app`，HTML 580454 字节，含内联脚本 | 证明本地资源可读，不替代 Windows 宿主加载验证 |

2026-09-23 08:17 UTC 后首次采样，Tunnel 运行期方法计数如下。计数是自守护进程启动以来的累计值，**没有客户端标签**；`tunnel_service_status=200` 也不等同于具体工具结果 `isError=false` 或 UI 已显示。

| 方法 | Tunnel 记录的状态 | 次数 |
| --- | --- | --- |
| `initialize` | 200 | 2 |
| `tools/list` | 200 | 1 |
| `tools/call` | 200 | 6 |
| `resources/read` | 200 | 5 |
| `notifications/initialized` | 202 | 1 |
| `server/discover` | 400 | 1 |

稳态运行以来日志里未发现本地 `401/403` 或上述 UNAUTHORIZED 文案。信息级日志不包含完整请求及用户端身份，因此不能据“没有日志”单独断言某次失败完全未到达本机。

## 两条请求链路必须区分

```text
ChatGPT 原生客户端的账号/工作区上下文
    → OpenAI 的工具/Tunnel 调用入口（本次主要怀疑范围）
    → 隧道任务
    → 本机 tunnel-client
    → http://127.0.0.1:8787/mcp

本机 tunnel-client + runtime key
    → OpenAI Tunnel control plane（本次已验证可访问）
```

官方资料说明，Tunnel 的允许访问范围与 Platform organization、ChatGPT workspace 的关联有关；私有服务侧的 runtime key 与产品调用侧的上下文是不同环节。[Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

本机 CLI 的 `--control-plane.organization-id` / `CONTROL_PLANE_ORGANIZATION_ID` 用于本机发送到 control plane 的请求。当前这条链路已可正常访问。不能据移动端报错就断言修改该变量能补齐 ChatGPT 原生客户端的调用上下文，也不应把组织头加到本地 MCP 响应或放进问答 UI 来尝试修复入口鉴权。

### 手机/iPad 的判断

错误明确指向 active organization context，加上正常浏览器、健康的本地服务、已存在的 Tunnel 关联，以及用户确认同一账号的普通个人聊天，优先排查：

1. 原生客户端/其后端调用路径没有正确传递或解析个人账号对应的组织上下文。
2. 原生端登录会话或连接缓存中的上下文未刷新。
3. 失败端所使用的连接信息与正常端存在差异。

这些是待证实假设。iPad 分享消息中的 request ID 已取得，对应时间未见本机转发，进一步支持入口鉴权方向；尚无原始失败响应、请求头或平台鉴权日志，不能定论为 iOS/iPadOS 缺陷。Android 尚未获得独立时间与请求 ID，不能把 iPad 的关联结果直接当成 Android 实测，更不能宣称所有原生客户端均不支持 Secure MCP Tunnel。

### Windows 的判断

此次 Windows 请求 ID 与本机转发匹配，且用户确认**在正常 PC 浏览器打开同一原始对话，能看到提问卡片**。这两项证据已将主要排查范围缩小到 Windows 客户端卡片的关联、加载或展示：

- 此次请求不是完全未进入 Tunnel；目前没有证据支持把它归为 iPad 的同一组织鉴权错误。
- 同一结果能在浏览器显示，说明该结果和 UI 资源至少对浏览器有效。Windows 的具体失败环节仍需宿主工具结果、组件加载或渲染日志。
- 分享页面的空最终文本不能单独作为 UI 缺陷证据：本工具本就要求调用成功后结束本轮、不追加说明，卡片依附于工具调用。分享最终消息没有完整呈现工具/组件状态。
- 运行中服务已经提供官方推荐的 `_meta.ui.resourceUri` 与 `text/html;profile=mcp-app`。`openai/outputTemplate` 是官方列出的可选兼容别名，但目前没有证据证明 Windows 版本 `26.905.11957` 必须依赖它；暂不加入未经验证的修复。[工具元数据参考](https://developers.openai.com/plugins/reference)

官方排障文档也要求区分服务、组件和 ChatGPT 客户端层。[插件排障](https://developers.openai.com/plugins/deploy/troubleshooting)

### 日志中独立的 `server/discover` 错误

2026-09-22 09:53:17.693 UTC 有一条本地上游 HTTP 400，方法为 `server/discover`，平台 request ID 为 `req_c05be5d50552426480cfefd390f971f4`。没有来源客户端信息，不能将它归为 Windows 根因，也不能和 UNAUTHORIZED 合并。

本次使用规范 JSON-RPC 信封直接复测 `server/discover`，本地返回 HTTP 200 / JSON-RPC `-32601 Method not found`；`tools/list` 正常。因此旧日志中的 400 未被完整复现，可能存在请求格式或头部差异，暂不增加猜测性的协议兼容分支。

## 下一步最小对照实验

1. 同一账号、普通个人聊天已由用户确认；请平台核查个人账号的内部组织映射，不要求用户盲目切换团队或增加 Tunnel 授权范围。
2. Windows 的“同一原始对话在浏览器打开”检查已完成且能显示卡片。后续在 Windows 重开这条对话，记录是否仍缺卡片及可取得的客户端加载错误；不必再用新调用来证明旧结果有效。
3. 若需复测新调用，固定同一模型、账号上下文、工具连接，在浏览器、手机/iPad、Windows 依次执行；补齐 Android 的独立时间与 request ID。只记录方法、状态、时间及 request ID，不开启原始 HTTP 日志。
4. 请平台按 iPad request ID 检查组织上下文解析及 Tunnel 入口鉴权；本机 control-plane 配置无法验证或补齐原生调用者的上下文。
5. 请平台按 Windows request ID 检查工具结果与卡片关联、资源缓存/加载及 Windows 展示路径。可选兼容别名只能作为独立的待验证实验，不能作为已知修复，也不混入后续 B 版 UI 改造。
6. 如需提交支持工单，使用下方已整理的信息；本次没有发送。

短期可以继续使用用户已确认正常的浏览器路径。本次没有发布公开 MCP 端点或改换 Tunnel；不把新增部署当作已经验证的修复。

## 复测命令与 doctor 端口说明

查看正在运行的服务：

```bash
curl --fail http://127.0.0.1:8081/healthz
curl --fail http://127.0.0.1:8081/readyz
journalctl --user -u openai-mcp-tunnel.service \
  --since '2026-09-23 08:00:00 UTC' --no-pager
curl --fail --silent http://127.0.0.1:8081/metrics \
  | rg '^command_end_to_end_latency_milliseconds_count' \
  | rg 'enqueue_to_response'
```

分享日志前脱敏 tunnel/org/workspace ID、凭据、原始答案和个人信息，保留必要的时间与 request ID。

`doctor` 会尝试绑定健康端口。常驻服务占用 8081 时，用同端口执行 `doctor` 会报 `address already in use`；这不是常驻服务故障。本次改用 `--health.listen-addr 127.0.0.1:0` 后通过。诊断时应使用同一已加载配置及受保护凭据引用，不能把 API key 写进命令行或报告。

## 可提交给 OpenAI 的诊断摘要

以下仅为草稿，尚未发送：

```text
Issue: Native ChatGPT tool invocation via Secure MCP Tunnel fails while web works.

Same account, ordinary personal chats; user does not select a team workspace.
Desktop and mobile browsers work.
Phone/iPad native clients report during tool invocation:
UNAUTHORIZED
Access denied: this tunnel requires an active organization context.
Configure the organization ID or send the OpenAI-Organization header.

Android: 1.2026.258 (15); no separate timestamp/request ID captured yet.
iOS/iPad: 1.2026.251(34655566626).
Windows: 26.905.11957.

Windows failure: 2026-09-23 16:35 UTC+8 / 08:35 UTC.
Share: https://chatgpt.com/s/t_6ab38f326614819195f6c4a8acbb2aa9
Shared-message request_id: 4efe9788-9226-4af9-9238-459c9204e209
This exactly matches the prefix of two local Tunnel cmd_request_id values,
forwarded at 08:34:46.301 and 08:34:46.783 UTC.
The user confirmed that opening the SAME original conversation in a PC browser
displays the question card; Windows does not. Investigate the Windows component
association/loading/rendering path separately from mobile organization auth.

iPad failure: 2026-09-23 16:36 UTC+8 / 08:36 UTC.
Share: https://chatgpt.com/s/t_6ab38f8f57c08191b592a4e21ebd5cc3
Shared-message request_id: 3ab0ad39-142e-4ba2-a8b7-92898ebdbca6
The shared assistant message reports the organization-context error.
No matching local forwarding event in the 08:32-08:39 UTC window.
Shared messages are not raw tool responses or platform authentication traces.

Across the two failures, initialize/200 increased by 1, tools/call/200 by 1,
and resources/read/200 remained unchanged at the 08:40 UTC snapshot.
resources/read/200 increased by 1 at the later 08:44 UTC snapshot, around the
browser check. Metrics have no client labels; resources may also be cached.
HTTP 200 alone does not establish isError=false.

Local MCP and tunnel-client are healthy and ready.
tunnel-client: 0.0.14+0f870e50a973fa820d4c409000059e181e8d242b
Tunnel metadata has one organization and one workspace association.
GET metadata using the runtime key succeeds both with and without the associated
OpenAI-Organization header. No production config change has been applied.

The live tool descriptor provides _meta.ui.resourceUri and the resource returns
text/html;profile=mcp-app. The optional openai/outputTemplate alias is absent;
please confirm whether this Windows build requires any documented compatibility
metadata. No assumed compatibility fix has been deployed.

Models differ in the shared metadata: gpt-5-6 on Windows, gpt-5-6-thinking on iPad.
Further new-call comparisons should hold model/account context/connection constant.
Needed: raw tool/client traces, platform-side personal-account organization context
resolution for the iPad request, and component handling for the Windows request.
```
