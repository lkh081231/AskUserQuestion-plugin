# 原生客户端调用失败排查

排查日期：2026-09-22 至 2026-09-23（UTC）。当前结论：**手机/iPad 优先指向调用入口的组织/工作区上下文鉴权；尚未确认具体客户端缺陷或完成修复。Windows 静默失败暂不能认定同一根因。**

本次仅进行只读排查，没有修改生产代码、运行配置、组织关联或凭据，也没有重启服务。UI 已确认方案的交接见 [plan.md](../plan.md) 和 [TODO.md](../TODO.md)，提交 `0714b5f`。

## 用户提供的现象

| 环境 | 现象 | 证据来源 |
| --- | --- | --- |
| 手机浏览器 | 正常 | 用户报告 |
| PC 浏览器 | 正常 | 用户报告 |
| 手机/iPad 原生 ChatGPT | 调用阶段出现下方 UNAUTHORIZED | 用户提供错误文本，确认同一账号 |
| Windows 原生 ChatGPT | 静默失败，未呈现预期提问卡片 | 用户截图与描述，尚无对应请求时间/错误详情 |
| UI 显示与答案提交 | 用户补充“提交和 ui 显示正常” | 未细分各端，不能将每个原生客户端的 UI/提交都记为已验收 |

原始错误：

```text
UNAUTHORIZED
Access denied: this tunnel requires an active organization context.
Configure the organization ID or send the OpenAI-Organization header.
```

尚缺各端 ChatGPT 版本、手机操作系统、是否处于同一工作区、每次失败时间以及工具调用详情。相同账号并不能单独证明当前工作区和调用所带的组织上下文相同。

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

错误明确指向 active organization context，加上正常浏览器、健康的本地服务和已存在的 Tunnel 关联，优先排查：

1. 原生客户端与浏览器的活动工作区不同，或登录会话中的组织上下文未刷新。
2. 原生客户端/其后端调用路径没有正确传递或解析组织/工作区上下文。
3. 失败端的连接信息或客户端版本与正常端存在差异。

这些是待证实假设。当前没有取得失败请求的头、平台 request ID 或对应原生端日志，不能定论为 iOS/iPadOS 缺陷，也不能宣称所有原生客户端均不支持 Secure MCP Tunnel。

### Windows 的判断

截图中的“完成测试”不能证明 `ask_user_questions` 已成功执行，也没有给出 UNAUTHORIZED。需要按顺序区分：

- 模型未实际调用工具。
- 调用入口拒绝，但客户端没有展示详细错误。
- 工具执行后，客户端未加载或渲染 UI 资源。

官方排障文档也要求区分服务、组件和 ChatGPT 客户端层。[插件排障](https://developers.openai.com/plugins/deploy/troubleshooting)

### 日志中独立的 `server/discover` 错误

2026-09-22 09:53:17.693 UTC 有一条本地上游 HTTP 400，方法为 `server/discover`，平台 request ID 为 `req_c05be5d50552426480cfefd390f971f4`。没有来源客户端信息，不能将它归为 Windows 根因，也不能和 UNAUTHORIZED 合并。

本次使用规范 JSON-RPC 信封直接复测 `server/discover`，本地返回 HTTP 200 / JSON-RPC `-32601 Method not found`；`tools/list` 正常。因此旧日志中的 400 未被完整复现，可能存在请求格式或头部差异，暂不增加猜测性的协议兼容分支。

## 下一步最小对照实验

1. 在各端确认同一账号和同一工作区，记录 ChatGPT 版本及手机系统版本；正常浏览器保留原连接。
2. 依次在浏览器、手机/iPad、Windows 新对话中选择同一个工具连接，明确请求调用 `ask_user_questions`，每次只测一端；记录到分钟的时间与时区。
3. 对比该时间段的 Tunnel 方法计数、脱敏日志和客户端工具调用详情；只记录方法、状态、时间及 request ID，不开启原始 HTTP 日志。
4. 若浏览器产生 `tools/call`，原生端报组织错误且无对应新增调用，证据支持调用入口问题；仍需平台请求日志才能最终确认。
5. 若 Windows 增加 `tools/call`，再查返回内容是否出错及 UI 资源是否加载。`resources/read` 可能被缓存，未新增不等于绝对未加载；结合调用详情和渲染日志判断。
6. 若活动工作区一致、版本更新/重新登录后仍复现，向 OpenAI 提交下方诊断信息。组织关联需要修改时，先核对目标工作区，不盲目增加访问范围。

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

Same account; desktop and mobile browsers work.
Phone/iPad native clients report during tool invocation:
UNAUTHORIZED
Access denied: this tunnel requires an active organization context.
Configure the organization ID or send the OpenAI-Organization header.

Windows native client fails silently; no confirmed error code yet.
UI rendering and answer submission are reported working where the call succeeds.

Local MCP and tunnel-client are healthy and ready.
tunnel-client: 0.0.14+0f870e50a973fa820d4c409000059e181e8d242b
Tunnel metadata has one organization and one workspace association.
GET metadata using the runtime key succeeds both with and without the associated
OpenAI-Organization header. No production config change has been applied.

Needed: native app versions, active workspace comparison, exact failure times,
client-side request IDs, and confirmation of context propagation on native callers.
Please inspect organization/workspace context resolution at the tunnel invocation
entry point and clarify native client support for this connection.
```
