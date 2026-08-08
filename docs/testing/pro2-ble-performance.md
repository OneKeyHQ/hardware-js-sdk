# Pro2 BLE 传输测速记录

> - 文档状态：历史性能基线，不代表所有固件与手机组合
> - 测试日期：2026-05-11
> - 适用范围：当日 OneKey Pro2、iOS 真机、React Native Demo 与 `react-native-ble-plx` 组合
> - 维护要求：BLE 固件、SDK pacing、chunk 大小或文件写入 ACK 模型变化后重新测试。

本文记录 React Native Demo 在 iOS 真机上针对 OneKey Pro2 BLE 传输速率的两轮调试结果，并给出当时结论。测试目标是区分三类瓶颈：

- BLE GATT 写入本身的上行能力。
- React Native / `react-native-ble-plx` 写入队列能力。
- `firmwareUpdateV4` 中 `FilesystemFileWrite` 每块等待设备回包的协议层耗时。

## 测试环境

- 设备：OneKey Pro2。
- 连接方式：React Native Demo，iOS 真机，BLE。
- 固件升级方法：`firmwareUpdateV4`。
- SDK 层文件写入：`FilesystemFileWrite`。
- 当前 BLE 固件升级 chunk：`1800B`。
- BLE GATT 写入方式：`writeWithoutResponse` 为主，`writeWithResponse` 只作 baseline。

## 第一轮：SDK 层 speed profile

这一轮通过 RN Demo 的 Pro2 BLE 固件升级入口测试不同 transport pacing 参数。测试结果如下：

| Profile                 |        结果 |
| ----------------------- | ----------: |
| `withResponse baseline` | `2.00 KB/s` |
| `default`               |  `8.0 KB/s` |
| `faster pacing`         |  `9.0 KB/s` |
| `aggressive`            | `9.64 KB/s` |

### 第一轮结论

`writeWithoutResponse` 相比 `writeWithResponse` 有明显收益，`2.00 KB/s -> 8.0 KB/s` 说明写入方式是有效优化点。

但 `default -> aggressive` 只从 `8.0 KB/s` 提升到 `9.64 KB/s`，收益约 20%。这说明 `packetLength`、`burstSize`、`pauseMs`、`flushDelayMs` 这类 pacing 参数不是主要瓶颈，只能做边缘优化。

按 `chunk=1800B` 粗略换算：

```text
8 KB/s  ~= 1800B / 220ms
9 KB/s  ~= 1800B / 195ms
10 KB/s ~= 1800B / 176ms
```

也就是说，当前速率更像是每次 `FilesystemFileWrite` 都要等待设备完成处理并返回 `processed_byte`，下一块才能继续发送。这个串行 ACK 模型会把吞吐限制在“单块大小 / 单轮回包耗时”。

## 第二轮：BLEDiag raw write 测试

这一轮绕过 SDK，仅使用 `react-native-ble-plx` 直接向 OneKey BLE write characteristic 写入数据，用于测 BLE GATT 上行写入天花板。

测试参数和结果：

| requestMTU |    Size |  chunk |       Raw write 结果 | Ping RTT 结果                    |
| ---------: | ------: | -----: | -------------------: | -------------------------------- |
|      `256` | `64 KB` |  `20B` |           `6.0 KB/s` | `iters=40` 时 `no ack within 3s` |
|      `256` | `64 KB` | `128B` |            `21 KB/s` | 未记录                           |
|      `256` | `64 KB` | `182B` |            `25 KB/s` | 未记录                           |
|      `256` | `64 KB` | `253B` |               无回复 | 未记录                           |
|      `256` | `64 KB` | `244B` |          `34.4 KB/s` | 未记录                           |
|      `512` | `64 KB` | `509B` | 无回复，卡在 writing | 未记录                           |

### 第二轮结论

在 iOS 真机 + `react-native-ble-plx` + Pro2 的组合下，稳定可用的 `writeWithoutResponse` payload 上限更接近 `244B`，不是 `requestMTU - 3` 推导出的 `253B`，更不是 `512 - 3 = 509B`。

`chunk=244B` 的 raw write 约 `34.4 KB/s`，这是不经过 SDK、也不等待协议层 ACK 的上行天花板。真实 `firmwareUpdateV4` 只有 `8-10 KB/s`，属于 raw ceiling 上叠加设备端文件写入、`FilesystemFileWrite` 回包、JS/native 调度后的结果。

`chunk=253B` 和 `chunk=509B` 无回复，说明不能只信 `requestMTU`，需要以真机实际稳定结果为准。`requestMTU=512` 在当前组合下不适合作为 Pro2 BLE 固件升级参数。

`raw write` 会直接写非协议数据，只适合测试 GATT 写入队列，可能污染设备协议解析状态。做完 raw write 后，应断开并重新连接，再跑 Ping RTT 或 SDK 固件升级流程。

## 当前推荐参数

用于底层 BLE 上行测速：

```text
requestMTU: 256
raw size: 64KB 或 256KB
raw chunk: 244B
Ping RTT iters: 40 或 100
```

用于 SDK 层 `firmwareUpdateV4` 调试：

```text
普通 FilesystemFileWrite chunkSize: 1800B
FirmwareUpdateV4 固定 staging 路径 chunkSize: 1960B
iOS packetLength: min(协商 MTU - 3, 244B)
Android packetLength: min(协商 MTU - 3, 244B)
write mode: writeWithoutResponse
固定 burst pause: 0ms
固定 flush pause: 0ms
```

当前极限测试配置不再为缺失 MTU 提供兼容分包回退。iOS 连接后通过
`requestMTU(247)` 刷新 `react-native-ble-plx` 的设备快照；该调用不会要求 iOS 重新协商，
但会返回由 CoreBluetooth 最大无响应写长度换算出的 MTU。刷新失败时应直接暴露连接错误，
避免用推测容量掩盖问题。

Android 默认同样使用经过验证的 `244B` 上限。更大的包长只能通过显式 BLE tuning 配置用于
特定手机、固件和设备组合的真机实验，不能作为生产默认值。

不建议继续使用：

```text
iOS raw requestMTU: 512
raw chunk: 509B
raw chunk: 253B
writeWithResponse 作为提速方案
```

## 优化方向

目前更值得关注的是协议层 ACK 粒度，而不是继续微调 pacing。

`FirmwareUpdateV4` 的固定 staging 路径已按生产 Protocol V2 schema 测量 protobuf 和帧头开销。最长路径 `vol0:/application_p1.bin` 在 uint32 最大 offset/total_size 下最多容纳 `1988B` 数据且完整帧正好为 `2048B`；SDK 使用 `1960B`，保留 `28B` 余量。普通 FileWrite 和资源路径仍保持 `1800B`，因为允许的路径最长可达 `127B`。

不能直接测试 `2400B`、`3072B` 或 `4096B`：这些数据块加上 protobuf 和 V2 帧开销后必然超过当前 Transport 的 `2048B` 限制。

如果未来要显著增大单次文件块，必须由固件接收缓冲、Protocol V2 BLE 最大帧和各 BLE Transport 的限制共同升级；只修改 `chunkSize` 不会绕过帧上限。

如果 raw write 维持在 `34 KB/s` 左右，即使放大 `FilesystemFileWrite` chunk，RN BLE 链路上限也会限制最终速度，很难接近 WebUSB 或 desktop BLE 的量级。

## SDK 可靠性与事件开销

`FirmwareUpdateV4` 在连接恢复后不再无条件从文件偏移 `0` 重传。SDK 只记录设备通过
`processed_byte` 明确确认的文件偏移；重连、物理设备身份校验和初始化完成后，再通过
`FilesystemPathInfoQuery` 检查 staging 文件。只有远端文件存在、不是目录，且文件大小位于
“本地确认偏移到目标文件总大小”之间时才续传。

远端大小大于本地确认偏移时，SDK 仍从本地确认偏移重写相同数据，不会跳过响应丢失后未确认的
字节。远端文件缺失、大小落后、超过目标大小或状态查询失败时，安全回退到偏移 `0` 并重新覆盖。
这项优化减少了 BLE 断连后的重复传输，同时不把副作用命令的自动重放下沉到 Transport。

文件写入的内部确认回调仍在每个 ACK 后触发，用于保存续传水位和记录真实吞吐；App 可见的
`FIRMWARE_PROGRESS` 则只在整数百分比变化、超过 `1s` 心跳间隔或单文件完成时发送。这样可减少
RN bridge 和 Desktop renderer 的高频事件开销，不影响确认偏移的精度。

## 判断方法

- 如果 raw write 明显高于 SDK 固件升级速率，瓶颈在 `FilesystemFileWrite` 的设备处理和协议 ACK。
- 如果 raw write 自身很低，瓶颈在 RN BLE / iOS BLE / `react-native-ble-plx` 写入队列。
- 如果 Ping RTT 很低但固件升级慢，瓶颈更偏设备端文件系统或 flash 写入。
- 如果 Ping RTT 接近 `180-220ms`，则 `1800B` 下 `8-10 KB/s` 属于当前串行模型的自然结果。
