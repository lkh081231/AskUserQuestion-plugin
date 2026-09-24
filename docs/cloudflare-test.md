# Cloudflare Tunnel 移动端对照测试

## 目的与当前状态

2026-09-24，用户要求通过 Cloudflare HTTPS 连接对照手机与 iPad 的 Secure MCP Tunnel 组织上下文错误，随后明确先使用 Quick Tunnel。

Quick Tunnel 已于 07:38 UTC 启动；07:39:49 UTC 完成 7 项公网 MCP 检查，全部通过。临时测试端点为：

```text
https://abroad-ending-undefined-lecture.trycloudflare.com/mcp
```

手机/iPad 的真实 ChatGPT 调用、卡片显示与提交仍待用户验证；公网协议通过不代表原生端已修复。

## 当前 Quick Tunnel 配置

| 项目 | 实际配置 |
| --- | --- |
| 容器名称 | `ask-user-question-cloudflare-quick` |
| 官方镜像 | `cloudflare/cloudflared:latest`，实际版本 `2026.9.1` |
| 镜像摘要 | `sha256:b269e8abd07a5bf6f3f4be65d5050b2174eca89c56a0241a8ff32a16aec454e4` |
| 网络与上游 | Linux host 网络，`http://127.0.0.1:8787` |
| 指标及就绪接口 | `127.0.0.1:20247`，不公开监听 |
| 就绪状态 | 200，1 条 QUIC 连接 |
| 凭据 | Quick Tunnel 无需令牌，未挂载命名 Tunnel 凭据 |
| 运行限制 | 当前用户 UID/GID、只读根文件系统、删除所有 capabilities、`no-new-privileges` |
| 生命周期 | Docker 后台运行，restart policy 为 `no`；主机重启后不自动恢复 |
| 日志 | info 级别，单文件 5 MB，最多 2 个文件 |

原 MCP 和 Secure MCP Tunnel 未重启，在线 A 版 UI 与工具描述保持原状。当前 MCP 无应用认证，本轮 HTTPS 端点可匿名调用，仅用于临时测试；没有新增业务认证部署。

Quick Tunnel 地址临时分配，进程重新启动后应重新读取地址并更新 ChatGPT 测试连接。官方说明 Quick Tunnel 不支持 SSE，最多 200 个并发请求；当前 MCP 使用无状态 JSON 响应，本轮 SDK 协议验收通过，不据此宣称 SSE 可用。[Cloudflare 官方说明](https://developers.cloudflare.com/tunnel/get-started/)

## ChatGPT 测试步骤

1. 新建独立开发测试连接，使用上述 HTTPS `/mcp` URL，认证选择无；这次使用 HTTPS 连接方式。
2. 保留既有 Secure MCP Tunnel 连接。测试对话只启用本轮 HTTPS 连接，避免同名工具选错入口。
3. 固定账号、模型和连接，依次在浏览器、Android、iPad 新对话中调用 `ask_user_questions`，显示问题后填写并提交。
4. 分别记录调用时间、客户端版本、是否有组织错误、卡片显示、提交是否恰好产生一条 Q/A、助手能否继续。各原生端至少 3 次新对话和 1 次重开检查后才记为本轮验收通过。

上述 HTTPS 连接步骤对应 [ChatGPT 官方连接说明](https://developers.openai.com/plugins/deploy/connect-chatgpt)。此处尚未执行 ChatGPT 账号内的连接创建和真机操作。

## 验证记录

公网验收使用合成问题，SDK 客户端通过实际 HTTPS 端点访问当前服务；TLS 校验开启，无额外认证头。

| 检查 | 结果 |
| --- | --- |
| 公网 TLS 与 `GET /` | 通过，200，返回预期服务名称 |
| `OPTIONS /mcp` | 通过，204，允许 POST |
| MCP 初始化 | 通过，服务为 `ask-user-question-server` / `0.1.0` |
| `tools/list` | 通过，仅 `ask_user_questions`，UI URI 与只读/非破坏注解正确 |
| 四题型 `tools/call` | 通过，单选、多选、文本、确认及默认值符合预期 |
| 非法重复题目 ID | 通过，返回工具错误 |
| UI `resources/read` | 通过，`text/html;profile=mcp-app`，580454 字节 |
| UI SHA-256 | `685cd6b8f84c2accfca103961c3d7cb7d6923040ca34ae9a4d2091573dd24075`，与原 A 版一致 |
| SDK 后台错误 | 本次检查未记录到错误 |
| 浏览器、Android、iPad 卡片显示及答案提交 | 未执行 |

结构化检查结果见[公网验收快照](diagnostics/2026-09-24-cloudflare-quick.json)。原有 `diagnose:clients` 只观察 Secure MCP Tunnel，不能用其计数衡量本轮 Cloudflare 请求。连接数或公网 MCP 返回 200 不能替代真实 ChatGPT 卡片与 `ui/message` 验收。

## 停止、重启与回退

停止本轮公网入口：

```bash
docker stop ask-user-question-cloudflare-quick
```

重新开始临时测试：

```bash
docker start ask-user-question-cloudflare-quick
docker logs --since 1m ask-user-question-cloudflare-quick
```

读取本次启动新分配的 `trycloudflare.com` 地址后，更新 ChatGPT 测试连接并重新验证。测试结束后移除 ChatGPT 测试连接，停止并删除此容器；原 Secure MCP Tunnel 和 MCP 服务不受该容器停止影响。

## 先前命名 Tunnel 的部署记录

07:23 UTC 曾使用用户提供的令牌启动 `ask-user-question-cloudflare-test`，4 条 QUIC 连接就绪，但没有下发公开域名路由。用户改用 Quick Tunnel 后已停止该命名 Tunnel 容器，保留配置供后续使用。

其指标端口为 `127.0.0.1:20246`，令牌保存在 `/tmp/ask-cloudflare-test-v4key4zy/tunnel-token`，目录 700、文件 600，只读挂载到 `/run/secrets/tunnel-token`。令牌未写入仓库、容器参数或环境变量，并已检查容器元数据和日志中不存在令牌正文。

将来恢复命名 Tunnel 时，需在 Cloudflare 后台配置 Published application 域名路由，Service URL 使用 `http://127.0.0.1:8787`，Path 留空，再启动该容器并验证实际域名。本次 Quick Tunnel 不依赖该路由。

彻底结束命名 Tunnel 实验时，删除其容器、临时凭据文件和空目录；如配置过远端测试路由也一并移除。主机重启或临时目录清理后，需重新通过受保护文件注入令牌，不将令牌写入 Git 或命令行。
