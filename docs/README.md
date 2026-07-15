# OneKey Hardware SDK 文档索引

本目录保存 Hardware JS SDK 的长期工程文档。文档按“架构、协议、设备、SDK、业务、测试”组织；根目录只保留本索引。

## 推荐阅读路径

### 初次了解 SDK

1. [SDK 架构概览](./architecture/overview.md)
2. [传输协议文档](./protocol/README.md)
3. [SDK 文档](./sdk/README.md)

### 开发或排查 Pro2

1. [Protocol V1 与 V2 对比](./protocol/comparison/v1-vs-v2.md)
2. [Protocol V2 帧格式与 schema](./protocol/v2/framing-and-schema.md)
3. [Transport 总览与协议探测](./protocol/transports/README.md)
4. [Protocol V2 的 Core 适配](./sdk/protocol-v2/README.md)
5. [Pro 2 字段迁移与职责拆分](./sdk/protocol-v2/pro2-field-migration/README.md)
6. [Pro / Pro2 Passphrase 与钱包 Session](./device/session/pro-passphrase-session.md)
7. 对应的 [Pro2 业务能力](#业务能力)

### 集成链和签名能力

1. [多链集成概览](./business/chains/overview.md)
2. [EVM 集成](./business/chains/evm.md)
3. [EIP-7702](./business/chains/eip-7702.md)

## 架构

| 文档                                       | 内容                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| [SDK 架构概览](./architecture/overview.md) | SDK 分层、包职责、TransportManager、Device 生命周期与 Protocol V1/V2 边界 |

### 架构决策

| 文档                                                                                                    | 决策                                                 |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [ADR-001：Protocol V2 Link 生命周期](./architecture/decisions/001-protocol-v2-link-lifecycle.md)        | Link、Session、调用队列和 Sequence Cursor 的生命周期 |
| [ADR-002：Protocol V2 Transport 边界](./architecture/decisions/002-protocol-v2-transport-boundaries.md) | 公共协议层、平台 adapter、generation 与重试边界      |
| [ADR-003：钱包 Session 所有权](./architecture/decisions/003-wallet-session-ownership.md)                | `passphraseState`、`session_id` 与缓存隔离规则       |
| [ADR-004：受保护方法解锁重试](./architecture/decisions/004-protected-method-unlock-retry.md)            | 方法显式声明、结构化错误与单次重试策略               |

## 传输协议

| 文档                                                            | 内容                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| [传输协议索引](./protocol/README.md)                            | 协议探测、V2 线协议、协议运行时和 Transport 分类导航 |
| [Protocol V1 与 V2 传输差异](./protocol/comparison/v1-vs-v2.md) | 探测、帧、字节序、schema、Link 和重连差异            |
| [V2 帧格式与 schema](./protocol/v2/framing-and-schema.md)       | `0x5A` 帧、CRC、长度边界和 schema 路由               |
| [V2 消息分类与编号](./protocol/v2/messages.md)                  | wire message 分组、编号来源和更新规则                |
| [V2 Link 与 Session](./protocol/v2/link-and-session.md)         | 调用串行化、sequence、超时、generation 和错误边界    |
| [Transport 总览](./protocol/transports/README.md)               | 自动协议探测与公共层/平台层职责                      |
| [WebUSB 与 Node USB](./protocol/transports/webusb.md)           | USB endpoint、整帧读写和恢复                         |
| [BLE Transport](./protocol/transports/ble.md)                   | Electron、React Native、lowlevel BLE 分包和组帧      |

## 设备

### 安全与钱包状态

| 文档                                                                    | 内容                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| [Attach-to-PIN](./device/security/attach-to-pin.md)                     | Attach-to-PIN 安全模型、V1 行为与 Pro2 解锁边界     |
| [SLIP39](./device/security/slip39.md)                                   | SLIP39 恢复、EMS、Master Secret 和兼容性            |
| [Passphrase 与钱包 Session](./device/session/pro-passphrase-session.md) | Pro / Pro2 初始化、钱包标识、session 缓存和安全检查 |

### 设备信息与能力矩阵

| 文档                                                                 | 内容                             |
| -------------------------------------------------------------------- | -------------------------------- |
| [设备方法支持矩阵](./device/capabilities/method-support.md)          | 不同设备型号的方法支持和已知差异 |
| [Protocol V1 设备链支持矩阵](./device/capabilities/chain-support.md) | V1 机型、固件版本和链支持情况    |

## SDK 接入与协议适配

| 文档                                                               | 内容                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| [SDK 文档索引](./sdk/README.md)                                    | Protocol V2 Core 适配和事件文档导航                     |
| [Protocol V2 的 Core 适配](./sdk/protocol-v2/README.md)            | 设备信息、状态、Session、文件与升级如何进入公共 API     |
| [Pro 2 字段迁移](./sdk/protocol-v2/pro2-field-migration/README.md) | protobuf 字段拆分、Features/Profile 映射和字段缺口      |
| [硬件协议交互消息](./sdk/event-business-flows.md)                  | Device 到 SDK 的硬件中间消息、Ack 和 App 映射           |
| [OneKey `hd-*` SDK 公共事件](./sdk/events.md)                      | SDK/Core/Transport 到 App 的事件来源、UI 回传和生命周期 |
| [`hwk-*` Adapter 公共事件](./sdk/hwk-adapter-events.md)            | Adapter/Connector 到 App 的类型化事件与等待机制         |

## 业务能力

### 链与签名

| 文档                                          | 内容                                |
| --------------------------------------------- | ----------------------------------- |
| [多链集成概览](./business/chains/overview.md) | 地址派生、签名 API 和多链技术分类   |
| [EVM 集成](./business/chains/evm.md)          | EVM 交易、消息和 TypedData 签名     |
| [EIP-7702](./business/chains/eip-7702.md)     | EIP-7702 交易结构、安全边界和兼容性 |

### Pro2 设备业务

| 文档                                                     | 内容                                   |
| -------------------------------------------------------- | -------------------------------------- |
| [设备设置](./business/device-settings.md)                | Protocol V2 设置读取、写入和设备设置页 |
| [壁纸上传](./business/device-customization/wallpaper.md) | RGBA 编码、文件上传和壁纸激活          |
| [固件升级](./business/firmware-update/pro2.md)           | 多组件 target、暂存、安装、轮询和重连  |

## 测试与性能记录

| 文档                                                   | 内容                                 |
| ------------------------------------------------------ | ------------------------------------ |
| [Pro2 BLE 性能测试](./testing/pro2-ble-performance.md) | 真机测速环境、参数结论和后续优化方向 |

## 包级 README

| 包                   | README                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Core                 | [`packages/core/README.md`](../packages/core/README.md)                                       |
| Web SDK              | [`packages/hd-web-sdk/README.md`](../packages/hd-web-sdk/README.md)                           |
| BLE SDK              | [`packages/hd-ble-sdk/README.md`](../packages/hd-ble-sdk/README.md)                           |
| Common Connect SDK   | [`packages/hd-common-connect-sdk/README.md`](../packages/hd-common-connect-sdk/README.md)     |
| Transport            | [`packages/hd-transport/README.md`](../packages/hd-transport/README.md)                       |
| Web Device Transport | [`packages/hd-transport-web-device/README.md`](../packages/hd-transport-web-device/README.md) |

## 文档维护规则

- 不在 `docs/` 根目录新增主题文档；选择最接近的领域目录。
- 长期事实文档使用稳定主题名，不在文件名中加入日期。
- 设备型号是适用范围，不默认作为一级目录；同一型号形成多篇稳定文档后再创建子目录。
- 协议文档描述 wire format、schema 和传输机制；设备文档描述状态、安全和能力；业务文档描述用户可感知流程。
- 一个规则只保留一个当前事实来源，其他文档通过链接引用。
- 阶段性设计、实施计划和分支快照不进入长期文档；实现完成后由 Git、提交记录和 PR 保留历史。
- 仍影响当前架构的设计结论应提炼为 ADR，避免保留整篇实施过程。
- schema、生成文件和子模块来源必须注明，不能只写“已生成”。
- 文档与代码冲突时，以验证后的代码行为为准，并同步修正文档。
