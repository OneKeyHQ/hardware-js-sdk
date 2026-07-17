# Pro2 无固件中间 Event 改造边界

## 结论

本次删除的是 firmware 在业务最终响应前发送、并要求 Host ACK 才能继续的 UI 协议消息。

以下能力不在删除范围：

- SDK → App 的公共 UI Event。
- USB/BLE 请求响应和 BLE notification。
- 文件、固件、资源和批量业务进度。
- 交易数据分片 Request/Ack。
- 状态查询、最终业务响应与设备生命周期事件。

## 三层边界

| 层级           | Protocol V1                                                          | Protocol V2 / Pro2                                  |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| firmware → SDK | 可发送 `ButtonRequest/PinMatrixRequest/PassphraseRequest` 并等待 ACK | 不发送 UI 中间消息，只处理显式命令并返回最终结果    |
| SDK 内部       | 将硬件消息转换为 Event 和 ACK                                        | 根据调用参数、错误和 Session 状态合成 Event         |
| SDK → App      | 发送公共 UI Event，必要时等待 `uiResponse()`                         | 继续发送同一类公共 Event，必要时等待 `uiResponse()` |

App 不应感知 protobuf UI 消息是否存在。它只消费 SDK 公共 Event，并把用户选择通过 `uiResponse()`
返回 SDK。

## 判断表

| 内容                                                        | 是否保留  | 原因                         |
| ----------------------------------------------------------- | --------- | ---------------------------- |
| `DEVICE.CONNECT/DISCONNECT`                                 | 保留      | Transport 和设备生命周期     |
| `DEVICE.FEATURES/SUPPORT_FEATURES`                          | 保留      | 状态刷新和 SDK 能力计算      |
| BLE notification                                            | 保留      | BLE 响应传输通道             |
| USB/BLE 权限与系统通知                                      | 保留      | 宿主环境交互                 |
| `DEVICE_PROGRESS`                                           | 保留      | SDK 文件、资源和批量任务进度 |
| `FIRMWARE_PROGRESS/PROCESSING/TIP`                          | 保留      | SDK 固件升级状态             |
| `PREVIOUS_ADDRESS_RESULT`                                   | 保留      | SDK 批量地址中间结果         |
| 签名数据分片 Request/Ack                                    | 保留      | 承载待签名业务数据           |
| `DeviceFirmwareUpdateStatus`                                | 保留      | 可查询的固件安装状态         |
| `DevOnboardingStatus`                                       | 保留      | 可查询的 onboarding 事实状态 |
| SDK 合成的 `REQUEST_*`                                      | 保留      | App 稳定交互契约             |
| firmware `PassphraseRequest/PinMatrixRequest/ButtonRequest` | Pro2 删除 | UI 中间协议消息              |
| firmware `PassphraseAck/PinMatrixAck/ButtonAck`             | Pro2 删除 | Host UI ACK                  |

## 删除判定

一个 firmware 消息同时满足以下条件时，才属于 Pro2 需要删除的 UI 中间消息：

1. 出现在业务最终响应之前。
2. 主要目的是要求 Host 展示 UI、收集选择或允许设备页面继续。
3. firmware 状态机必须等待 Host ACK/响应。

如果消息承载交易数据、文件数据、状态查询结果、传输进度或 Transport 生命周期，则不在删除范围。

## SDK 合成 Event 的约束

- 只有 App 确实需要作出选择时，SDK 才创建阻塞等待项。
- 仅用于提示设备操作时，SDK 发出非阻塞 Event，不等待 `uiResponse()`。
- Event payload 应包含 `source`、`reason` 和设备标识，便于 App 复用 UI 并区分来源。
- 阻塞等待必须串行或具备 requestId 关联；不能依赖同类型全局 Promise 支持并发。
- 取消、超时、断连和调用结束必须清理等待项并发送关闭 UI 通知。
- SDK 不得伪造来自 Transport 的 protobuf Request 来触发现有 Event handler。

## 日志与调试

无固件中间 Event 不等于无日志。debug 应继续输出：

- TX/RX 方法名。
- 消息类型/ID。
- seq。
- 帧长度。
- SDK 合成 Event 的 `source/reason`，但不记录敏感 payload。

不得输出：

- Passphrase、PIN、助记词或熵。
- 文件数据分片正文。
- 完整签名交易正文。

## 验收项

- 删除 firmware UI 消息后，App 仍能收到所需的 SDK UI Event。
- 阻塞选择 Event 可以映射到明确业务命令并完成原调用。
- 非阻塞提示 Event 不需要 ACK，也不会让调用永久等待。
- BLE、文件、壁纸、Portfolio 和固件升级进度保持正常。
- 签名数据分片不被当作协议错误。
- Onboarding 和固件安装状态仍可查询。
- App 权限、连接、设备选择和取消 UI 不受影响。
