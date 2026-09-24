# Cloudflare Tunnel 移动端对照测试

## 目的与当前状态

2026-09-24，用户要求先用提供的 Cloudflare Tunnel 部署测试，验证直接 HTTPS 连接能否绕开手机与 iPad 的 Secure MCP Tunnel 组织上下文错误。此次为临时连接对照，不代表正式公开部署或移动端修复完成。

Cloudflare Docker 连接器已于 07:23 UTC 启动，4 条 QUIC 连接已注册，loopback 就绪接口返回 200。尚未下发公开域名路由，公网 MCP 与真实客户端待验证。

## 部署配置

| 项目 | 实际配置 |
| --- | --- |
| 容器名称 | `ask-user-question-cloudflare-test` |
| 官方镜像 | `cloudflare/cloudflared:latest`，实际版本 `2026.9.1` |
| 镜像摘要 | `sha256:b269e8abd07a5bf6f3f4be65d5050b2174eca89c56a0241a8ff32a16aec454e4` |
| 网络 | Linux host 网络，访问现有 `127.0.0.1:8787` |
| 指标及就绪接口 | `127.0.0.1:20246`，不公开监听 |
| 凭据 | `/tmp/ask-cloudflare-test-v4key4zy/tunnel-token`，目录 700、文件 600，只读挂载到 `/run/secrets/tunnel-token` |
| 运行限制 | 当前用户 UID/GID、只读根文件系统、删除所有 capabilities、`no-new-privileges` |
| 生命周期 | Docker 后台运行，restart policy 为 `no`；主机重启后不自动恢复 |
| 日志 | info 级别，单文件 5 MB，最多 2 个文件 |

令牌未写入仓库、容器参数或环境变量。原 MCP 和 Secure MCP Tunnel 未重启；在线 A 版 UI 与工具描述保持原状。

当前 MCP 服务没有 OAuth 或其他应用认证。公开路由启用后，本轮测试端点可匿名调用；仅用于此次连接验证。Cloudflare 连接器令牌用于连接隧道，并不是 MCP 调用者认证。正式使用的认证部署另行设计。

## 域名路由与 ChatGPT 连接

在 Cloudflare 后台打开此次 Tunnel，添加 Published application 路由：

| 字段 | 值 |
| --- | --- |
| Hostname | 用户选择的测试域名 |
| Path | 留空 |
| Service URL | `http://127.0.0.1:8787` |

路由配置由 Cloudflare 远端下发。当前 Tunnel 运行令牌不能代替管理 API 凭据修改域名路由；实际测试域名待补充。[Cloudflare 官方配置说明](https://developers.cloudflare.com/tunnel/get-started/)

路由生效并通过公网验收后，在 ChatGPT 新建独立开发测试连接，填写 `https://<测试域名>/mcp`，使用当前服务对应的无认证配置。保留既有 Secure MCP Tunnel 连接，测试时只启用本轮 HTTPS 连接，避免模型选错工具。[ChatGPT 官方连接说明](https://developers.openai.com/plugins/deploy/connect-chatgpt)

## 验证记录

| 检查 | 结果 |
| --- | --- |
| Cloudflare 连接器 `/ready` | 200，4 条就绪连接 |
| 本地 MCP 初始化、工具发现、合成工具调用 | 通过 |
| 本地 UI 资源读取 | 通过，`text/html;profile=mcp-app`，580454 字节 |
| 本地 UI SHA-256 | `685cd6b8f84c2accfca103961c3d7cb7d6923040ca34ae9a4d2091573dd24075`，与原 A 版一致 |
| 公网 TLS、健康端点与 MCP 协议 | 待域名路由配置后执行 |
| 浏览器、Android、iPad 调用与提交 | 未执行 |

公网验收使用合成题目，检查初始化、工具发现、四题型调用、非法参数拒绝、UI 资源读取及与 loopback 基线一致。随后固定账号、模型和 HTTPS 连接分别做浏览器与原生端测试，记录是否仍报组织错误、卡片显示、答案提交和继续对话。

原有 `diagnose:clients` 只观察 Secure MCP Tunnel，不能用其计数衡量本轮 Cloudflare 请求。Cloudflare 连接数或公网 MCP 返回 200 也不能替代真实 ChatGPT 卡片与提交验收。

## 停止与回退

停止本轮连接器：

```bash
docker stop ask-user-question-cloudflare-test
```

重新开始同一轮测试（凭据文件仍存在时）：

```bash
docker start ask-user-question-cloudflare-test
```

彻底结束测试时，先移除 ChatGPT 测试连接与 Cloudflare 测试路由，再停止并删除本轮容器，删除上述临时凭据文件与空目录。只操作本轮对象，保留原 Secure MCP Tunnel 及正常浏览器连接。

如果服务器重启或临时目录被清理，重新通过受保护文件注入令牌后创建容器；不要把令牌粘贴进 Git、部署文档或容器命令行。
