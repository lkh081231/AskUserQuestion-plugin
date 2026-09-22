# Secure MCP Tunnel 常态化部署

本项目在开发者模式下使用两个 user systemd 服务长期运行。目标用户必须已启用 linger，使用户服务在退出登录及主机重启后继续运行。

## 服务结构

```text
ask-user-question-mcp.service
    └── http://127.0.0.1:8787/mcp
            ↑
openai-mcp-tunnel.service
    └── OpenAI control plane
```

- MCP 服务异常退出时自动重启。
- Tunnel 服务依赖 MCP 服务，并在 MCP 健康检查成功后启动。
- Tunnel 健康与管理端点仅监听 `127.0.0.1:8081`。
- Runtime API Key 通过 systemd credential 文件加载，不写入 Git、环境示例或命令行。
- stdout 和 stderr 由 journald 收集。

## 前置检查

```bash
loginctl show-user "$USER" -p Linger
tunnel-client --version
cloudflared --version
npm ci
npm run check
systemd-analyze --user verify deploy/systemd/*.service
```

若 `Linger=no`，需要管理员执行 `loginctl enable-linger <user>`。

## 安装配置

```bash
install -d -m 700 ~/.config/ask-user-question ~/.config/systemd/user
install -m 644 deploy/systemd/*.service ~/.config/systemd/user/
install -m 600 deploy/systemd/tunnel.env.example \
  ~/.config/ask-user-question/tunnel.env
```

编辑 `~/.config/ask-user-question/tunnel.env`，将 `CONTROL_PLANE_TUNNEL_ID` 设置为 Platform Tunnel 页面中的真实 ID。不要在这里保存 Runtime API Key。

通过无回显输入创建独立的 credential 文件：

```bash
read -rsp "Runtime API Key: " runtime_api_key
printf '\n'
install -m 600 /dev/null ~/.config/ask-user-question/control-plane-api-key
printf '%s' "$runtime_api_key" > \
  ~/.config/ask-user-question/control-plane-api-key
unset runtime_api_key
```

加载并启动：

```bash
systemctl --user daemon-reload
systemctl --user enable --now ask-user-question-mcp.service
systemctl --user enable --now openai-mcp-tunnel.service
```

## 验证与运维

```bash
systemctl --user --no-pager --full status \
  ask-user-question-mcp.service openai-mcp-tunnel.service
curl --fail http://127.0.0.1:8787/
curl --fail http://127.0.0.1:8081/healthz
curl --fail http://127.0.0.1:8081/readyz
journalctl --user -u openai-mcp-tunnel.service -n 100 --no-pager
```

OpenAI Docs 还建议在故障时重新执行：

```bash
tunnel-client doctor --health.listen-addr 127.0.0.1:8081 --explain
```

更新应用时先完成检查和构建，再依次重启：

```bash
npm ci
npm run check
systemctl --user restart ask-user-question-mcp.service
systemctl --user restart openai-mcp-tunnel.service
```

停止并取消自动启动：

```bash
systemctl --user disable --now openai-mcp-tunnel.service
systemctl --user disable --now ask-user-question-mcp.service
```

Secure MCP Tunnel 适合私有 MCP 和开发者模式接入，但不能替代公开插件提交所需的稳定公网 HTTPS 端点。
