# Pro2 无 Event 改造边界

## 结论

“删除硬件 Event”只删除请求过程中的硬件 UI 中间响应，不等于删除所有 SDK Event、Request/Ack 或
BLE notification。

## 保留内容表

| 内容 | 是否保留 | 原因 |
| --- | --- | --- |
| `DEVICE.CONNECT/DISCONNECT` | 保留 | Transport 和设备生命周期 |
| `DEVICE.FEATURES/SUPPORT_FEATURES` | 保留 | 状态刷新和 SDK 能力计算 |
| BLE notification | 保留 | BLE 响应传输通道 |
| USB/BLE 权限与系统通知 | 保留 | 宿主环境交互，不是设备 UI Event |
| `DEVICE_PROGRESS` | 保留 | SDK 文件/资源传输进度 |
| `FIRMWARE_PROGRESS/PROCESSING/TIP` | 保留 | SDK 固件升级状态 |
| `PREVIOUS_ADDRESS_RESULT` | 保留 | SDK 批量地址中间结果 |
| 签名数据分片 Request/Ack | 保留 | 业务数据协议 |
| `DeviceFirmwareUpdateStatus` | 保留 | 可查询的固件安装状态 |
| `DevOnboardingStatus` | 保留 | 可查询的 onboarding 状态 |
| `PassphraseRequest/PinMatrixRequest/ButtonRequest` | Pro2 删除 | Host UI 中间响应 |

## 判断方法

一个消息只有同时满足以下条件，才属于 Pro2 需要删除的硬件 UI Event：

1. 出现在业务最终响应之前。
2. 主要目的是通知 App 展示或选择设备 UI。
3. 固件必须等待 Host ACK/响应后才能继续设备交互。

如果消息承载文件数据、交易数据、状态查询结果、进度或 Transport 生命周期，它不在删除范围。

## 日志与调试

无 Event 不等于无日志。debug 应继续输出：

- TX/RX 方法名。
- 消息类型/ID。
- seq。
- 帧长度。

不得输出：

- Passphrase、PIN、助记词等敏感内容。
- 文件数据分片正文。
- 完整签名交易正文。

## 验收项

- 删除 UI Event 后 BLE 仍能正常收包。
- 文件、壁纸、Portfolio 和固件升级仍有进度。
- 签名数据分片不被当作协议错误。
- Onboarding 和固件安装状态仍可查询。
- App 权限、连接和设备选择 UI 不受影响。
