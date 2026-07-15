# 传输协议文档

本目录只描述设备与 SDK Transport 之间的数据通信协议，包括协议探测、帧格式、protobuf schema、消息编号、请求响应匹配、连接生命周期，以及 USB/BLE 的读写实现。

Core API 如何转换协议字段、设备设置如何使用、钱包 Session 如何缓存、固件升级如何编排，不属于本目录。

## 文档目录

| 分类      | 文档                                                   | 负责回答的问题                                                    |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| 协议对比  | [Protocol V1 与 V2 传输差异](./comparison/v1-vs-v2.md) | 两套协议在探测、帧、字节序、schema 和调用状态上有什么区别？       |
| V2 线协议 | [帧格式与 schema](./v2/framing-and-schema.md)          | `0x5A` 帧如何编码、校验和选择 protobuf schema？                   |
| V2 线协议 | [消息分类与编号](./v2/messages.md)                     | V2 schema 包含哪些系统消息组，wire ID 来源是什么？                |
| V2 运行时 | [Link、Session 与错误边界](./v2/link-and-session.md)   | 调用如何串行化，Sequence、超时、失效和重连如何管理？              |
| Transport | [Transport 总览与协议探测](./transports/README.md)     | 公共传输层和平台实现如何分工，如何探测 V1/V2？                    |
| Transport | [WebUSB 与 Node USB](./transports/webusb.md)           | USB endpoint、完整帧读写和失败恢复如何工作？                      |
| Transport | [BLE](./transports/ble.md)                             | Electron、React Native、lowlevel BLE 如何分包、组帧和隔离旧通知？ |

## 本目录包含什么

- V1/V2 协议探测顺序和连接缓存。
- V1 `0x3F` chunk 与 V2 `0x5A` frame。
- 消息类型字节序、长度、CRC、Router、Attr 和 Sequence。
- protobuf schema 的加载、选择、编码和解码。
- 请求与响应匹配、调用队列、超时、取消和 Link 失效。
- WebUSB、Node USB、Electron BLE、React Native BLE 和 lowlevel BLE 的物理读写。

## 本目录不包含什么

| 内容                                                      | 文档位置                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Protocol V2 到 Core API、Features 和 DeviceProfile 的转换 | [SDK Protocol V2 适配](../sdk/protocol-v2/README.md)                |
| Pro 2 字段迁移和 Feature 缺口                             | [Pro 2 字段迁移](../sdk/protocol-v2/pro2-field-migration/README.md) |
| Passphrase、Attach-to-PIN 和钱包 Session 行为             | `docs/device/`                                                      |
| 设备设置、壁纸、固件升级等用户流程                        | `docs/business/`                                                    |
| 长期架构决策                                              | `docs/architecture/decisions/`                                      |

## 文档边界

- `comparison/` 只比较稳定的传输协议差异，不展开 Core 或业务适配。
- `v2/` 描述 wire format、protobuf schema、消息编号和协议运行时。
- `transports/` 描述各平台如何发现设备、建立物理连接、读写数据和恢复错误。
- 消息名称可以在协议文档中出现，但消息如何组合成业务流程应链接到 SDK、设备或业务文档。

## 事实来源

- 公共协议实现：`packages/hd-transport/src/protocols/`
- Transport 实现：`packages/hd-transport-*`
- 生成 schema：`packages/hd-transport/messages-protocol-v2.json`
- protobuf 上游：`submodules/firmware-pro2`
