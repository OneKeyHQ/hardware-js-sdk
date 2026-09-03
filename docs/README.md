# OneKey Hardware SDK 内部维护文档

`docs/` 面向 Hardware JS SDK 内部开发维护者，目标是帮助维护者快速理解架构、定位实现和判断修改边界。接入方使用说明优先维护在各 package README 或对外 API 文档中。

当前事实的优先级为：验证后的代码与生成源 > 本索引列出的长期维护文档 > package README
中的接入说明。阶段性设计和实施计划由 Git、提交记录、Issue 和 PR 保留，不作为当前事实源。

## 推荐阅读路径

### 第一次进入仓库

1. [SDK 架构概览](./architecture/overview.md)：理解包分层、Device 生命周期和 V1/V2 边界。
2. [SDK 关键架构决策](./architecture/decisions.md)：了解 Link、Transport、钱包 Session 和调用前解锁的约束。
3. [Protocol V1/V2 传输协议](./protocol/protocol-v1-v2.md)：理解探测、帧、Schema、USB/BLE 和错误恢复。
4. [SDK Core 运行时](./sdk/core-runtime.md)：理解协议消息如何进入 Features、Profile 和公共能力。

### 开发或排查 Pro2

1. [Protocol V1/V2 传输协议](./protocol/protocol-v1-v2.md)
2. [SDK Core 运行时](./sdk/core-runtime.md)
3. [SDK Core 运行时——App Passphrase 接入约定](./sdk/core-runtime.md#app-passphrase-接入约定)
4. [Pro2 字段迁移](./sdk/pro2-field-migration.md)
5. [钱包 Session 与设备安全](./device/wallet-session-and-security.md)
6. [Pro2 设备管理](./business/pro2-device-management.md)
7. [Pro2 资源更新架构设计](./design/pro2-resource-update/README.md)

### 排查事件和 UI 交互

1. [SDK 事件](./sdk/events.md)
2. [钱包 Session 与设备安全](./device/wallet-session-and-security.md)
3. 对应 Core method、事件常量和 UI response registry 源码

### 新增或排查 SDK 错误

1. [Hardware SDK Error Contract](./sdk/error-contract.md)
2. [Protocol V1/V2 传输协议](./protocol/protocol-v1-v2.md#错误与重试边界)
3. 对应 Transport、Core method、vendor adapter 与 App error mapping

### 开发链与签名能力

1. [多链集成概览](./business/chains-overview.md)
2. [EVM 与 EIP-7702](./business/evm.md)
3. [设备能力矩阵](./device/capabilities.md)

### 维护 AI Agent 规范

1. [Agent 工作流维护](./maintenance/agent-workflow.md)
2. 根目录 `AGENTS.md`
3. `.skillshare/skills` 下对应领域 Skill

## 文档目录

| 领域 | 文档                                                               | 维护内容                                        |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------- |
| 架构 | [SDK 架构概览](./architecture/overview.md)                         | SDK 分层、包职责、协议选择、Device 生命周期     |
| 架构 | [SDK 关键架构决策](./architecture/decisions.md)                    | 跨模块且持续有效的设计约束                      |
| 协议 | [Protocol V1/V2 传输协议](./protocol/protocol-v1-v2.md)            | 探测、Schema、帧、Link、USB/BLE、错误恢复       |
| SDK  | [SDK Core 运行时](./sdk/core-runtime.md)                           | Core adapter、Features、Profile、文件和升级入口 |
| SDK  | [SDK 事件](./sdk/events.md)                                        | 设备中间消息、`hd-*` 与 `hwk-*` 事件边界        |
| SDK  | [Hardware SDK Error Contract](./sdk/error-contract.md)             | 错误分类、映射、传输、恢复与兼容约束            |
| SDK  | [Pro2 无固件中间 Event 迁移](./sdk/pro2-eventless-migration.md)    | 当前钱包 Session 拆分请求迁移与兼容清单         |
| SDK  | [Pro2 字段迁移](./sdk/pro2-field-migration.md)                     | Protocol V2 字段拆分、SDK 映射和 Feature 缺口   |
| 设备 | [钱包 Session 与设备安全](./device/wallet-session-and-security.md) | 初始化、Passphrase、Attach-to-PIN、Session 缓存 |
| 设备 | [SLIP-39](./device/slip39.md)                                      | 恢复模型、EMS、校验和 SDK 边界                  |
| 设备 | [设备能力矩阵](./device/capabilities.md)                           | 机型方法支持、测试覆盖和版本判断方法            |
| 业务 | [多链集成概览](./business/chains-overview.md)                      | 链分类、派生路径和签名能力                      |
| 业务 | [EVM 与 EIP-7702](./business/evm.md)                               | EVM API、交易类型和 EIP-7702 安全边界           |
| 业务 | [Pro2 设备管理](./business/pro2-device-management.md)              | 设置、壁纸上传和多组件固件升级                  |
| 设计 | [Pro2 资源更新架构设计](./design/pro2-resource-update/README.md)   | 自描述 RESC ZIP、路径校验和按需传输             |
| 测试 | [Pro2 BLE 性能](./testing/pro2-ble-performance.md)                 | 真机测速、参数结论和优化方向                    |
| 维护 | [Agent 工作流维护](./maintenance/agent-workflow.md)                | 指令、Skill、命令模板和校验入口                 |

## 文档边界

- 架构文档回答“模块为什么这样分层，以及哪些约束不能破坏”。
- 协议文档回答“字节和消息如何在设备与 SDK 之间可靠传输”。
- SDK 文档回答“协议结果如何转成 Core 状态、API 和事件”。
- 设备文档回答“设备身份、钱包状态、安全和能力如何管理”。
- 业务文档只记录实现复杂、容易误改的用户能力编排。
- 维护文档回答“仓库规范和自动化入口如何保持一致”。

## 维护规则

1. 一个主题只保留一个当前事实源，其他文档通过链接引用。
2. 不按单个 protobuf 文件、Transport 平台或 Core method 创建新文档。
3. 优先在现有文档中新增章节；只有主题具有独立维护边界时才新增文件。
4. 易变的版本号、远端配置和完整枚举优先指向代码或配置来源，避免复制后失真。
5. 阶段性设计、实施计划和分支快照不进入长期事实文档，由 Git、提交记录、Issue 和 PR
   保存。
6. 文档描述与验证后的代码行为冲突时，以代码为准并同步修正文档。
7. protobuf、生成 Schema、Core 映射和文档必须作为同一次变更检查。
8. 不记录容易漂移的文档篇数；通过索引和链接校验保证可发现性。
9. 修改 Agent 指令、Skill 或命令模板后运行 `yarn lint:agent-context`。

## 包级入口

- Core：[`packages/core/README.md`](../packages/core/README.md)
- Web SDK：[`packages/hd-web-sdk/README.md`](../packages/hd-web-sdk/README.md)
- BLE SDK：[`packages/hd-ble-sdk/README.md`](../packages/hd-ble-sdk/README.md)
- Common Connect SDK：[`packages/hd-common-connect-sdk/README.md`](../packages/hd-common-connect-sdk/README.md)
- Transport：[`packages/hd-transport/README.md`](../packages/hd-transport/README.md)
- Web Device Transport：[`packages/hd-transport-web-device/README.md`](../packages/hd-transport-web-device/README.md)
