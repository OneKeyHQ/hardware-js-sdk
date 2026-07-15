# Pro2 设备管理

本文集中说明 Pro2 / Protocol V2 的设备设置、壁纸上传和固件升级。三类能力都依赖 Core 的 Protocol V2 守卫与文件/状态编排，不属于传输层协议。

## 设备设置

| SDK 方法                 | protobuf                 | 返回值           | 解锁策略             |
| ------------------------ | ------------------------ | ---------------- | -------------------- |
| `deviceSettingsGet`      | `DeviceSettingsGet`      | `DeviceSettings` | 锁定后解锁并重试一次 |
| `deviceSettingsSet`      | `DeviceSettingsSet`      | `Success`        | 锁定后解锁并重试一次 |
| `deviceSettingsPageShow` | `DeviceSettingsPageShow` | `Success`        | 锁定后解锁并重试一次 |

这些接口只支持 Protocol V2，不会自动回退到 V1 的 `deviceSettings`。

`DeviceSettings` 包含设备名称、蓝牙、语言、壁纸路径、亮度、自动锁定、自动关机、动画、轻触唤醒、震动、FIDO、实验功能、USB 锁定、随机键盘以及安全模式状态。字段以当前 protobuf 和生成类型为准，旧固件可能不返回新增字段。

`deviceSettingsSet` 支持部分更新，但 SDK 会移除 `passphrase_enable` 与 `airgap_mode`。这两类安全模式必须通过 `deviceSettingsPageShow` 打开设备页面，由用户在设备端确认。

设置页当前支持：

- `DeviceReset`
- `DevicePinChange`
- `DevicePassphrase`
- `DeviceAirgap`

三个方法显式声明 `retry-on-locked`。只有收到结构化 `DeviceLocked` 时才解锁并重试一次，第二次失败不会循环重试。

主要实现：

- `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`

## 壁纸上传

`deviceUploadWallpaper` 接收 `604 × 1024` 的 RGBA 数据。SDK 负责编码、写入设备文件系统并设置活动壁纸：

1. 校验尺寸、RGBA 长度、文件名和 `chunkSize`。
2. 完全不透明图片编码为 `RGB565`，存在透明像素时编码为 `RGB565A8`。
3. 使用 8×8 阈值矩阵进行有序抖动并生成设备二进制格式。
4. 创建 `vol0:/wallpapers/user`，通过 `FilesystemFileWrite` 分片上传。
5. 根据设备返回的 `processed_byte` 推进 offset。
6. 调用 `DeviceSettingsSet` 更新 `wallpaper_path`。

文件名仅允许字母、数字、下划线、连字符和可选 `.bin`。未提供名称时，SDK 使用编码结果的 BLAKE2s 哈希生成稳定名称。调用方不能借此写入任意路径。

上传没有事务式回滚：中断可能留下不完整文件，激活失败也不会自动删除文件。重新上传同名文件会从首片覆盖；将 `wallpaper_path` 设为空字符串可恢复内置壁纸。

主要实现：

- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`

## 固件升级

Protocol V1 继续使用 `firmwareUpdate` 至 `firmwareUpdateV3`；Pro2 使用 `firmwareUpdateV4`。低阶 `deviceFirmwareUpdate` 只负责发送安装目标，不执行完整升级编排。

支持的 Pro2 目标包括 bootloader、application P1/P2、coprocessor、SE01 ～ SE04 和 RESC bundle。`romloaderBinary` 虽仍存在于部分兼容类型中，但当前安装请求不接受 `ROMLOADER`，必须走 loader 专用流程。

高层升级流程：

1. 获取组件版本和设备状态。
2. 根据调用方二进制或远端 release 配置准备目标。
3. 比较版本和 fingerprint；`forceTargets` 只跳过指定目标的版本判断。
4. 对 RESC bundle 比较设备 header、版本和 hash。
5. 必要时重启进入 bootloader，并轮询确认模式。
6. 将目标文件分片写入 `vol0:/`，再使用 PathInfo 校验大小。
7. 一次发送包含全部待安装文件的 `DeviceFirmwareUpdateRequest`。
8. 轮询安装状态，允许安装阶段断连、超时和重连探测。
9. 回到 normal mode 后刷新 DeviceInfo/Features。

可靠性约束：

- BLE 与 WebUSB 使用不同默认 chunk，最小值为 64 字节。
- 文件传输根据 `processed_byte` 恢复进度，总进度按全部目标字节聚合。
- 安装开始、安装完成和用户交互使用不同超时窗口。
- Transport 不自动重发安装请求；重试由高层流程依据阶段和幂等性决定。
- release 配置、SDK target 类型和固件枚举必须同步发布。

`firmwareUpdateV4` 为兼容旧接口仍返回 BLE、application 和 bootloader 三类版本。需要 SE、P1/P2 或 coprocessor 版本时，应重新调用 `getDeviceInfo`。

主要实现：

- `packages/core/src/api/FirmwareUpdateV4.ts`
- `packages/core/src/protocols/protocol-v2/firmware.ts`
- `packages/core/src/api/protocol-v2/DeviceFirmwareUpdate.ts`

## 共同维护原则

- 设置、壁纸和升级都属于 Core 业务编排，Transport 只负责单次消息传输。
- 新增有副作用操作时，必须明确是否允许解锁后重试或断线后重试。
- 文件路径、chunk 上限和超时策略集中复用 helper，避免各方法自行实现。
- 公共字段归一化和运行模式判断见 [Pro2 字段迁移](../sdk/pro2-field-migration.md)。
