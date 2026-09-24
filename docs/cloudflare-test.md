# Cloudflare Tunnel 移动端对照测试

## 目的与当前状态

2026-09-24，用户要求通过 Cloudflare HTTPS 连接对照手机与 iPad 的 Secure MCP Tunnel 组织上下文错误，随后明确先使用 Quick Tunnel。

Quick Tunnel 已于 07:38 UTC 启动；07:39:49 UTC 完成 7 项公网 MCP 检查，全部通过。临时测试端点为：

```text
https://abroad-ending-undefined-lecture.trycloudflare.com/mcp
```

用户随后确认手机通过本轮 HTTPS 连接提问、显示、提交均成功；首次显示“正在加载问题”后约等待 5 秒，第二次较快。iPad 尚未提供本轮结果。手机这次功能成功不等于已完成各端多次验收，也不代表原 Secure MCP Tunnel 的组织上下文问题已修复。

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

上述 HTTPS 连接步骤对应 [ChatGPT 官方连接说明](https://developers.openai.com/plugins/deploy/connect-chatgpt)。手机真机结果来自用户回报，连接创建和真机操作由用户完成；浏览器及 iPad 的本轮对照结果待补充。

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
| 手机提问、显示及提交 | 用户确认均成功；首次加载提示约 5 秒，第二次较快 |
| 浏览器、iPad 本轮 HTTPS 对照 | 未取得单独结果 |
| 各端至少 3 次新对话及 1 次重开 | 尚未完整记录 |

结构化检查结果见[公网验收快照](diagnostics/2026-09-24-cloudflare-quick.json)。原有 `diagnose:clients` 只观察 Secure MCP Tunnel，不能用其计数衡量本轮 Cloudflare 请求。连接数或公网 MCP 返回 200 不能替代真实 ChatGPT 卡片与 `ui/message` 验收。

## 手机首次加载耗时

用户描述的慢阶段是已经显示“正在加载问题”，不是卡片出现前一直空白。现有 UI 在 `isConnected`、`app` 或题目 `data` 未就绪时显示这条提示；没有人为设置 5 秒延迟。提示已经渲染说明 UI 脚本已开始运行，但没有真机分阶段时间戳，尚不能区分宿主握手、题目通知投递和客户端调度的耗时。

07:50:42 UTC 从部署主机分别通过 loopback 与公网 HTTPS 各采样 3 次，使用合成问题；每次 curl 允许压缩并启用 TLS 校验。结果如下：

| 路径 | 操作 | 首字节中位数 | 总耗时中位数 | 总耗时范围 |
| --- | --- | --- | --- | --- |
| loopback | `tools/call` | 3.0 ms | 3.3 ms | 2.7–3.6 ms |
| loopback | `resources/read` | 15.2 ms | 16.1 ms | 9.9–17.6 ms |
| Quick Tunnel | `tools/call` | 87.8 ms | 88.1 ms | 86.0–491.3 ms |
| Quick Tunnel | `resources/read` | 131.9 ms | 147.9 ms | 145.6–151.6 ms |

UI HTML 为 580454 字节，其中内联 JavaScript 469926 字节、内联 CSS 110182 字节；未发现外部 script 或 stylesheet 标签。公网 UI 的 JSON-RPC 响应已由 Cloudflare gzip 压缩，线上传输 150180 字节，解压后为 582178 字节，`CF-Cache-Status` 为 `DYNAMIC`。

这些样本只测部署主机到公网端点，不能代替手机网络或 ChatGPT 内部耗时，也未保证冷缓存。第二次更快可能与首次初始化或缓存有关，当前没有足够证据确认原因；不把它直接归因于 Quick Tunnel、HTML 体积或服务处理慢。下一步性能定位应分别测量 UI 脚本启动、`ui/initialize` 完成、题目通知到达和首次表单显示，不能用加缓存或猜测性桥接替换当作已验证修复。

结构化样本见[耗时快照](diagnostics/2026-09-24-cloudflare-latency.json)。本阶段只采样和记录，没有发布 UI 修改、加入问答响应缓存或改变现有发送路径。

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
