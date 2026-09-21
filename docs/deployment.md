# MCP 服务部署

## 部署目标

生产服务需要提供：

- 稳定、公开可访问的 HTTPS origin；
- `POST`、`GET`、`DELETE` 和 `OPTIONS /mcp`；
- `GET /` 健康检查；
- 与部署 origin 一致的 `APP_ORIGIN`；
- 由平台或反向代理负责的 TLS、限流和必要日志控制。

开发隧道可用于连接测试，但不能代替公开提交所需的稳定端点。

## 环境变量

| 变量 | 必需性 | 说明 |
| --- | --- | --- |
| `PORT` | 可选 | HTTP 监听端口，默认 `8787` |
| `APP_ORIGIN` | 生产必需 | 仅接受不带路径、查询或凭据的 HTTPS origin，例如 `https://questions.example.com` |

`APP_ORIGIN` 会写入 MCP UI 资源的 `_meta.ui.domain`。未设置时适合本地测试；公开提交带 UI 的插件前必须设置，并为本插件使用独立 origin。

## 直接运行

```bash
npm ci
npm run check
APP_ORIGIN=https://questions.example.com PORT=8787 npm start
```

`npm start` 依赖已构建的 `dist/`；在新环境先运行 `npm run build`，或使用 `npm run check` 完成全部检查和构建。

## Docker

构建镜像：

```bash
docker build -t ask-user-question:0.1.0 .
```

运行：

```bash
docker run --rm \
  -p 8787:8787 \
  -e APP_ORIGIN=https://questions.example.com \
  ask-user-question:0.1.0
```

镜像使用多阶段构建。运行阶段只安装 MCP 服务所需的生产依赖，并以非 root `node` 用户启动。

## 反向代理与网络

将公网 `https://questions.example.com/mcp` 代理到容器的 `8787` 端口，并满足以下要求：

- 不缓冲或改写 MCP JSON 响应；
- 允许 `POST`、`GET`、`DELETE` 和 CORS 预检 `OPTIONS`；
- 保留 `Content-Type`、`Mcp-Session-Id` 和 `Access-Control-Expose-Headers`；
- 设定合理的请求大小、连接和速率限制；
- 不在普通访问日志中记录完整请求体。

本服务当前使用无状态 Streamable HTTP，每个 MCP 请求创建独立 server/transport 实例，不维护答案会话。

## 部署后检查

健康检查：

```bash
curl -fsS https://questions.example.com/
```

期望输出：

```text
Ask User Question MCP server
```

MCP 初始化：

```bash
curl -fsS \
  -X POST https://questions.example.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"deployment-check","version":"0.1.0"}}}'
```

随后在目标 ChatGPT 工作区按[安装说明](installation.md)注册连接。不要把 curl 成功视为卡片渲染、`ui/message` 或模型停止等待已经通过。

## 安全与隐私

- 当前工具本身无业务写入，声明 `readOnlyHint: true`、`destructiveHint: false`、`openWorldHint: false`。
- 服务不保存答案，但请求中的问题可能包含用户上下文；关闭请求体日志并限制错误追踪中的原始载荷。
- 当前未实现 OAuth 或自定义鉴权。若工作区或公开访问模型需要认证，应按当时的官方 MCP 认证规范另行设计和验收。
- 定期运行 `npm audit --omit=dev` 并复核 `@openai/apps-sdk-ui` 的上游更新。

## 回滚与更新

1. 保留上一个可运行镜像标签。
2. 部署新镜像后检查 `/`、`/mcp`、工具 schema 和 UI 资源。
3. 在 ChatGPT 刷新开发连接，并使用新对话测试，避免旧元数据缓存影响判断。
4. 失败时切回上一镜像；不要更改已注册连接 ID，除非端点或连接本身需要重建。

## 当前未执行项

截至 2026-09-21，本仓库没有云账号、域名或部署凭据，因此没有执行公网部署。Dockerfile 和步骤属于可部署交付，不是已上线证明；实际 URL、平台、区域、镜像摘要和部署时间应补记到[验收记录](acceptance.md)。
