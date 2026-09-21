# 公开发布材料

## 目录文案

| 字段 | 建议值 |
| --- | --- |
| 名称 | Ask User Question |
| 分类 | Productivity |
| 品牌色 | `#10A37F` |
| 短说明 | Clarify consequential choices before starting work |
| 长说明 | Collect focused single-select, multi-select, text, and confirmation answers in an interactive chat card, then continue the original task with the user's choices. |
| 开发者 | 发布前替换为实际个人或组织名称 |
| 图标 | `assets/icon.svg` |
| Logo | `assets/logo.svg` |
| 网站 | 发布前托管项目介绍并写入 HTTPS URL |
| 支持 | 托管 [support.md](support.md) 或提供公开支持渠道 |
| 隐私 | 托管 [privacy.md](privacy.md) 并写入公开 HTTPS URL |
| 条款 | 由发布主体审阅并托管 [terms.md](terms.md) |

当前 manifest 没有填写网站、支持、隐私或条款 URL，因为仓库没有被授权使用的域名和法律主体。公开提交前必须补全真实 URL，不能使用示例域名。

## Starter prompts

以下三项已写入 manifest，均少于 128 个字符：

1. `Plan my request and ask only the questions that materially affect the result.`
2. `Clarify scope and compatibility before implementing this feature.`
3. `Help me choose among important options before you start the work.`

## 正向测试用例

| 编号 | 提示 | 预期触发 |
| --- | --- | --- |
| P1 | “帮我做一个网站。” | 先问网站目标、范围或受众，不直接假定展示页 |
| P2 | “写一份产品介绍。” | 先问受众和用途，因为会改变内容与术语 |
| P3 | “写一封邀请函。” | 关系、场合和语气缺失时先对齐 |
| P4 | “做一个能在公司旧环境运行的 Python 工具。” | 上下文无法读出版本时先问兼容环境 |
| P5 | “实现登录功能，安全性和交付时间哪个更重要我还没决定。” | 用选择题对齐优先级 |
| P6 | “给我三个可直接采用的品牌视觉方向。” | 先问受众或风格偏好；不同答案实质改变交付 |
| P7 | “部署方案你来推荐，但必须在 NAS 上用 Docker。” | 不重问已知环境，只在仍有关键未知时提问 |

## 负向测试用例

| 编号 | 提示 | 预期不触发或停止提问 |
| --- | --- | --- |
| N1 | “写一个 Python hello world。” | 直接给常规示例，不问 Python 小版本 |
| N2 | “按仓库现有缩进给这个文件增加同风格函数。” | 读取并沿用现有风格，不重复询问 |
| N3 | “使用 Docker、中文输出，其他设计你决定。” | 遵循已给答案与授权范围，不重问这些选择 |
| N4 | 用户在卡片后说“取消，改为解释现有代码” | 遵循新消息，不强迫完成卡片 |

## 审核价值说明

结构化卡片降低多问题对齐的输入成本，区分模型说明与用户补充说明，并为 UI 不可用或发送失败提供普通 Q/A 兜底。它不宣称提供平台级 agent suspend/resume，也不无条件打断所有任务；skill 只在关键未知会实质影响结果时触发。

## 提交前检查

- [ ] 生产服务使用稳定、独立 HTTPS origin，`APP_ORIGIN` 与实际一致。
- [ ] 目标端点满足 MCP 审核要求，没有使用开发隧道代替生产地址。
- [ ] `.app.json` 使用目标工作区生成的真实连接 ID。
- [ ] 网站、支持、隐私和条款使用发布主体控制的公开 HTTPS URL。
- [ ] manifest 中的开发者、URL、版本和资产与提交表单一致。
- [ ] 至少完成 5 个正向、3 个负向 skill 触发测试。
- [ ] 按[验收记录](acceptance.md)记录停止等待的环境、次数、成功数和失败样例。
- [ ] 复核完整 `npm audit`、UI 组件库版本和最终浏览器 bundle。
- [ ] 新对话中验证 skill、工具、卡片和答案回传一起工作。
- [ ] README 和目录说明不使用“强制暂停”“保证停止”等表述。
- [ ] 通过实际公开提交和审核；本地校验不能替代审核结果。

## 版本更新材料

每次提交新版本时至少记录：

- 工具 schema、UI、skill 或数据处理行为的变化；
- 部署镜像/提交版本与回滚版本；
- 新增或仍存在的限制；
- 重新执行的真实 ChatGPT 样本与失败；
- 隐私、支持或条款是否变化。
