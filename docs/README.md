# OneKey Hardware SDK 文档索引

本目录保存 Hardware JS SDK 的长期工程文档。文档按“架构、协议、设备、SDK、业务、测试、归档”组织；根目录只保留本索引。

## 推荐阅读路径

### 初次了解 SDK

1. [SDK 架构概览](./architecture/overview.md)
2. [传输层设计](./protocol/transport.md)
3. [硬件交互事件](./sdk/events.md)

### 开发或排查 Pro2

1. [Protocol V2](./protocol/protocol-v2.md)
2. [传输层设计](./protocol/transport.md)
3. [Pro / Pro2 Passphrase 与钱包 Session](./device/session/pro-passphrase-session.md)
4. 对应的 [Pro2 业务能力](#业务能力)

### 集成链和签名能力

1. [多链集成概览](./business/chains/overview.md)
2. [EVM 集成](./business/chains/evm.md)
3. [EIP-7702](./business/chains/eip-7702.md)

## 架构

| 文档                                       | 内容                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| [SDK 架构概览](./architecture/overview.md) | SDK 分层、包职责、TransportManager、Device 生命周期与 Protocol V1/V2 边界 |

## 协议与传输

| 文档                                     | 内容                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| [Protocol V2](./protocol/protocol-v2.md) | 帧格式、schema、消息、link 生命周期、文件系统和固件安装协议    |
| [传输层设计](./protocol/transport.md)    | WebUSB、Electron BLE、React Native BLE、协议探测和连接生命周期 |

## 设备

### 安全与钱包状态

| 文档                                                                    | 内容                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| [Attach-to-PIN](./device/security/attach-to-pin.md)                     | Attach-to-PIN 安全模型、V1 行为与 Pro2 解锁边界     |
| [SLIP39](./device/security/slip39.md)                                   | SLIP39 恢复、EMS、Master Secret 和兼容性            |
| [Passphrase 与钱包 Session](./device/session/pro-passphrase-session.md) | Pro / Pro2 初始化、钱包标识、session 缓存和安全检查 |

### 设备信息与能力矩阵

| 文档                                                                              | 内容                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------- |
| [Protocol V2 DeviceInfo 字段差异](./device/device-info/protocol-v2-field-gaps.md) | DeviceInfo 当前映射、字段边界和待确认能力 |
| [设备方法支持矩阵](./device/capabilities/method-support.md)                       | 不同设备型号的方法支持和已知差异          |
| [设备链支持矩阵](./device/capabilities/chain-support.md)                          | 机型、固件版本和链支持情况                |

## SDK 接入

| 文档                            | 内容                                           |
| ------------------------------- | ---------------------------------------------- |
| [硬件交互事件](./sdk/events.md) | UI、设备和固件升级事件的触发时机与应用响应规则 |

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

## 历史归档

[归档目录](./archive/) 保存 Pro2 分支对齐快照、Superpowers 设计和实施计划。归档内容用于追溯，不代表当前实现；正式结论以本索引指向的领域文档为准。

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
- 阶段性设计、实施计划和分支快照进入 `archive/`，并明确标记历史状态。
- schema、生成文件和子模块来源必须注明，不能只写“已生成”。
- 文档与代码冲突时，以验证后的代码行为为准，并同步修正文档。
