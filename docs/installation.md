# 插件安装

## 前置条件

- 已按[部署说明](deployment.md)提供稳定 HTTPS `/mcp` 端点；
- 目标 ChatGPT 账号或工作区允许开发者模式和插件安装；
- 已构建并校验当前 `0.1.0` 版本；
- 有权限在 ChatGPT 中注册 MCP 连接并取得 `plugin_asdk_app...` 技术 ID。

## 注册 MCP 连接

1. 在 ChatGPT 打开 **Settings → Security and login**，启用 Developer mode。
2. 打开 ChatGPT Plugins 页面，选择新增连接。
3. 填写部署后的 `https://<独立域名>/mcp`，按目标环境配置认证。
4. 创建后从浏览器 URL 复制以 `plugin_asdk_app` 开头的技术 ID。
5. 用新对话先验证工具发现、卡片渲染和答案发送。

开发者模式、插件目录和本地 marketplace 的可用性可能受账号、产品表面和工作区策略影响。

## 写入连接映射

仓库中的 `.app.json` 初始为空：

```json
{
  "apps": {}
}
```

取得真实 ID 后改为：

```json
{
  "apps": {
    "ask-user-question": {
      "id": "plugin_asdk_app_实际连接ID",
      "category": "Productivity"
    }
  }
}
```

不要提交或分发伪造的 ID。映射 key 是插件内的稳定名称；`id` 必须指向目标工作区中实际注册的连接。

## 校验与生成插件包

```bash
npm run check
npm run package:plugin
```

生成目录：

```text
dist/plugin/ask-user-question/
```

若开发环境带有 Codex 的内置创建技能，还可运行：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/ask-user-questions
python3 /path/to/plugin-creator/scripts/validate_plugin.py .
```

这些本机脚本路径因安装而异；`npm run validate:package` 是仓库自带且可移植的结构检查。

## 安装完整插件

使用当前产品和工作区支持的 portable plugin 导入或本地 marketplace 流程安装 `dist/plugin/ask-user-question/`。如果使用个人或团队 marketplace：

1. 将生成目录放入该 marketplace 的 `plugins/ask-user-question/`。
2. 确认 marketplace entry 的 `source.path` 指向 `./plugins/ask-user-question`。
3. 策略建议使用 `installation: AVAILABLE`、`authentication: ON_INSTALL`、`category: Productivity`。
4. 刷新 ChatGPT / Codex，从该来源安装插件。
5. 新建对话验证 skill、MCP 工具和 UI 一起生效。

不要把开发连接已可用等同于完整插件已安装；后者还必须验证 bundled skill 在新对话中的触发与停止等待指令。

## 安装后验收

至少执行以下流程，并把次数和失败样例写入[验收记录](acceptance.md)：

1. 请求一个因目标或偏好不明确而需要先对齐的任务。
2. 确认 skill 促使模型调用 `ask_user_questions`。
3. 确认卡片展示正确、模型调用成功后本轮没有追加说明或继续任务。
4. 提交普通选项、补充说明、Other、多选、文本和 No。
5. 确认聊天收到人类可读 Q/A，Assistant 使用答案继续原任务且不重复询问。
6. 直接在聊天输入答案，确认无需回到卡片也能继续。
7. 发送改变或取消原任务的消息，确认模型遵循新消息。

步骤 3 只能统计实际表现，不能证明平台提供强制停止。

## 更新

- 服务、工具 schema 或资源变化后重新部署并刷新开发连接。
- skill、manifest 或资产变化后重新生成、安装插件并新建对话。
- 已发布插件的信息或 skill 更新需要按平台流程创建新版本并重新审核。
