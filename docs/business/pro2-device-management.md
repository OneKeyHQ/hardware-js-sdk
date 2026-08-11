# Pro2 / Neo 设备管理

本文集中说明 Pro2、Neo / Protocol V2 的设备设置、壁纸与 NFT 上传和固件升级。这些能力都依赖 Core 的 Protocol V2 守卫与文件/状态编排，不属于传输层协议。

## 设备设置

| Core 内部操作            | protobuf                 | 返回值           | 解锁策略                     |
| ------------------------ | ------------------------ | ---------------- | ---------------------------- |
| `deviceSettingsGet`      | `DeviceSettingsGet`      | `DeviceSettings` | 不解锁，直接读取             |
| `deviceSettingsSet`      | `DeviceSettingsSet`      | `Success`        | 按字段决定是否解锁           |
| `deviceSettingsPageShow` | `DeviceSettingsPageShow` | `Success`        | 已知锁定时先解锁，只执行一次 |

这些原始命令不属于公共 `CoreApi`；调用方统一使用 `deviceSettings`，Core 再按 V1/V2 路由。

`DeviceSettings` 的公开字段包含设备名称、蓝牙、语言、壁纸路径、亮度、自动锁定、自动关机、动画、轻触唤醒、震动、USB 锁定、随机键盘以及安全模式状态，锁定时也可以读取。`passphrase_enable` 与 `fido_enabled` 是私有字段，仅在设备解锁时返回。字段以当前 protobuf 和生成类型为准。

`deviceSettingsSet` 支持部分更新，但 SDK 会移除 `passphrase_enable` 与 `airgap_mode`。仅包含 `label`、`language`、`brightness`、`haptic_feedback` 时不解锁直接修改；只要包含其他字段，SDK 就会在锁定时先解锁再执行。修改成功提示及 `autolock_delay_ms`、`autoshutdown_delay_ms` 的页面跳转由设备固件实现。

任何 Protocol V2 设置写入成功后，SDK 都会强制刷新 `DeviceStatus` 与 `DeviceSettings`，并只用设备
读回结果更新统一 `DeviceState`。写入请求参数不作为状态来源；如果写入成功后的读回失败，公共调用会
返回失败，调用方不得自动重放可能已经生效的设置命令。

`passphrase_enable` 与 `airgap_mode` 必须通过 `deviceSettingsPageShow` 打开设备页面，由用户在设备端确认。

设置页当前支持：

- `DeviceReset`
- `DevicePinChange`
- `DevicePassphrase`
- `DeviceAirgap`

读取状态关闭钱包 Session 处理并使用 `unlockPolicy='none'`，不会触发自动解锁。统一
`deviceSettings` 根据字段计算 `none` 或 `unlock-before-run`；设备页面同样使用
`unlock-before-run`。已知设备锁定时先解锁，但收到 locked 响应后不重放设置写入或页面操作。

页面打开前，SDK 统一发送非阻塞 `REQUEST_BUTTON`，payload 包含
`source='method-lifecycle'`、`reason='settings-page'`、`completion='operation-completed'` 和具体 `page`。
App 只展示“请在设备上操作”，不调用 `uiResponse()`。API `Success` 表示设备上的最终确认已经完成。

公共 `deviceChangePin(remove=false)` 在 Pro2 上复用 `DevicePinChange` 页面并发送
`reason='change-pin'`；返回成功表示 PIN 已修改完成。Pro2 当前不支持通过该 API 执行 `remove=true`。

公共 `deviceWipe()` 在 Pro2 上复用 `DeviceReset` 擦除确认页并发送
`reason='device-management'`、`operation='wipe-device'`。返回成功表示安全芯片擦除已经完成，设备仍会停留在重启提示页等待用户确认。Protocol V1 继续使用原 `WipeDevice` 最终操作流程。

主要实现：

- `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`

## Portfolio 更新

`uploadPortfolio` 是后台文件同步与应用流程，不需要设备确认：

- 调用方传入不带 data URL 前缀的 `packageBase64`；LowLevel SDK 严格校验并解码为设备分片。
- 文件写入固定关闭分片进度 Event。
- SDK 不生成 `REQUEST_PIN` 或 `REQUEST_BUTTON`，也不触发钱包解锁。
- firmware 直接校验 pending package、更新 Portfolio 数据并返回最终 `Success/Failure`。
- App 以 `PortfolioUpdate` 最终响应为准，不等待设备页面。

## 壁纸上传

`deviceUploadWallpaper` 接收不带 data URL 前缀的 `604 × 1024` JPEG Base64。TopLevel 只传递字符串，
LowLevel SDK 负责解码、设备格式转换、写入文件系统并设置活动壁纸：

1. 严格校验 Base64、JPEG、固定尺寸、解码后 RGBA 长度、文件名和 `chunkSize`。
2. 将 JPEG 解码结果编码为 `RGB565`。
3. 使用 8×8 阈值矩阵进行有序抖动并生成设备二进制格式。
4. 从 `ProtocolInfo.supported_messages` 确认 `FilesystemDirMake(60809)`、
   `FilesystemFileWrite(60805)` 和 `DeviceSettingsSet(60412)`。
5. 创建 `vol1:/wallpapers`，通过 `FilesystemFileWrite` 分片上传。
6. 根据设备返回的 `processed_byte` 推进 offset。
7. 调用 `DeviceSettingsSet` 更新 `wallpaper_path`。

文件名仅允许字母、数字、下划线、连字符和可选 `.bin`。未提供名称时，SDK 使用编码结果的 BLAKE2s 哈希生成稳定名称。调用方不能借此写入任意路径。

上传没有事务式回滚：中断可能留下不完整文件，激活失败也不会自动删除文件。重新上传同名文件会从首片覆盖；将 `wallpaper_path` 设为空字符串可恢复内置壁纸。

主要实现：

- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`

## NFT 上传

`deviceUploadNft` 仅支持 Pro2、Neo / Protocol V2。调用方先将原图和缩略图分别裁剪为 `540 × 540`
与 `263 × 263` JPEG，并把不带 data URL 前缀的 Base64 传入 SDK；LowLevel 随后完成以下编排：

1. 严格校验两段 Base64、JPEG、固定尺寸和解码后的 RGBA 长度。
2. 从当前 Link 的 `ProtocolInfo.supported_messages` 确认 `FilesystemPathInfoQuery(60802)`、
   `FilesystemFileWrite(60805)`、`FilesystemDirList(60808)` 和 `NftUpdate(61500)`，不使用固件版本字符串推断能力。
3. 将透明区域合成到黑色背景，以 LVGL v9 未压缩 RGB565 编码两张图片；编码与壁纸共用
   RGB565 抖动实现，但 NFT 不生成 A8 alpha plane。
4. 以完整原图 `.bin` 的 BLAKE2s 前 8 位和 Unix 毫秒时间生成
   `nft-<hash8>-<timestamp_ms>` basename。
5. 写入前使用 `FilesystemDirList("vol1:/nft", depth=1)` 统计完整的 NFT 三文件集合；新 NFT
   达到 10 个上限时抛出 `NftStorageLimitReached`，不触发固件删除最旧 NFT；同 basename 的
   幂等重试不受该限制。
6. 按原图 `.bin`、缩略图 `_m.bin`、元数据 `.json` 顺序串行写入固件预置的 `vol1:/nft`，
   不额外发送 `FilesystemDirMake`；默认使用 2048-byte chunk、0 ms pacing 和 15 秒单次请求超时。
7. 三个文件全部确认后发送一次 `NftUpdate`；Transport 不自动重放该副作用请求，只有最终
   `Success` 才返回 `nftUpdated: true`。

`title` 限制为 1 ～ 63 UTF-8 bytes，`subtitle` 限制为 0 ～ 95 UTF-8 bytes。公开参数允许传入固定
`timestampMs`，便于响应丢失时以同一 basename 幂等重发；Transport 不自动重放带副作用请求。
NFT 图片与缩略图尺寸通过独立 `getNftSize` API 获取，不复用壁纸的 `homeScreenType` 分支。

主要实现：

- `packages/core/src/api/protocol-v2/DeviceUploadNft.ts`
- `packages/core/src/utils/pro2Nft.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`

## 固件升级

Protocol V1 继续使用 `firmwareUpdate` 至 `firmwareUpdateV3`；Pro2 与 Neo 使用 `firmwareUpdateV4`。低阶
`DeviceFirmwareUpdate` 只供 Core 内部升级编排发送安装目标，不属于公共 `CoreApi`。

切换固件类型不新增 `DeviceSettingsPageShow` 页面。`firmwareUpdateV4` 使用
`unlock-before-run`：已知锁定时先解锁，再发送 `DeviceReboot(Bootloader)`；升级编排一旦开始，
收到 locked 错误也不会从头重放。确认与重启页面由设备固件处理，SDK 随后负责重连和升级编排。

支持的 Pro2 目标包括 bootloader、application P1/P2、coprocessor、SE01 ～ SE04 和 RESC bundle；Neo 使用相同升级链路并支持资源同步，但只提供 SE01 与 SE02。`romloaderBinary` 虽仍存在于部分兼容类型中，但当前安装请求不接受 `ROMLOADER`，必须走 loader 专用流程。

高层升级流程：

1. 调用 `checkAllFirmwareRelease` 获取组件版本、建议升级目标和远端 release 配置。
2. 将返回的 `targetsToUpdate` 传给 `firmwareUpdateV4`；SDK 在重启前下载、校验所有远端
   firmware 与 RESC binary；每个远端组件必须提供正整数大小和完整 SHA-256，缺失或不匹配时在
   修改设备前终止升级。
3. 比较版本和 fingerprint；`forceTargets` 只跳过指定目标的版本判断。
4. 对 RESC bundle 比较设备 header、版本和 hash。
5. 必要时重启进入 bootloader，并轮询确认模式。
6. 将目标文件分片写入 `vol0:/`，再使用 PathInfo 校验大小。
7. 一次发送包含全部待安装文件的 `DeviceFirmwareUpdateRequest`。
8. 轮询 target 安装状态，允许安装阶段断连、超时和重连探测；同一连接可用时复用当前
   command channel，只在链路失败后重新枚举和校验物理身份。
9. 确认设备已自动回到 normal mode 时不再重复发送 Normal reboot；随后显式刷新
   `DeviceState` 的 identity/versions。

可靠性约束：

- BLE 与 WebUSB 使用不同默认 chunk，最小值为 64 字节。
- 文件传输根据 `processed_byte` 恢复进度，总进度按全部目标字节聚合。
- 固件未提供 target 内部百分比，安装进度只能表示已完成 target 的比例；接入方如需连续动画，
  必须将其作为有阶段上限的估算值，不能当成设备真实进度。
- 安装开始、安装完成和用户交互使用不同超时窗口。
- 安装请求发出后设备可能在 `Success` 回包到达前主动断开 BLE；SDK 不重放有副作用的安装请求，
  而是进入重连与状态轮询，由 target 状态或最终 App 版本确认结果。
- Transport 不自动重发安装请求；重试由高层流程依据阶段和幂等性决定。
- release 配置、SDK target 类型和固件枚举必须同步发布。

`firmwareUpdateV4` 为兼容旧接口仍返回 BLE、application 和 bootloader 三类版本。需要 SE、P1/P2、hash、build ID 或 coprocessor 版本时，应调用 `getDeviceState({ scope: 'firmware' })`。

`checkAllFirmwareRelease` 的 Protocol V2 分支读取设备状态并解析已加载的 Pro2 `firmware-v1` 配置，但不下载
二进制、不重启设备，也不执行安装。配置中每个 `components.*.version` 是该 target 的建议
版本；返回的 `targetsToUpdate` 可直接作为 `firmwareUpdateV4` 的同名参数。版本相同时，SDK
仅使用 `components.*.payloadHash` 对 Bootloader/P1/P2 区分同版本 hotfix；缺少合法
`payloadHash` 时状态保持 `unknown`，不会在检查阶段访问组件 URL。配置中的
`fingerprint` 是完整 `.okpkg` 的 SHA-256，只用于下载后的完整文件校验，不能与设备 payload hash
直接比较。缺少当前版本或无法取得可比元数据的组件标记为 `unknown`，不会自动加入升级目标；
ROMloader 标记为 `unsupported`。

P1 对应 `DeviceInfo.fw.application`，P2 对应 `DeviceInfo.fw.application_data`。Normal mode 只报告
P1 时，P1/P2 按同一 application package set 处理；P1 需要 hotfix 时两个 application target
一起更新。Bootloader mode 能报告 P2 时，SDK 分别比较 P1/P2。

发布配置应为 Bootloader/P1/P2 写入 OKPP `payloadHash`。旧配置的 Range 回退要求 CDN 允许
对应运行环境跨域读取 `Range` 响应；否则相同版本组件返回 `unknown`，不会误判为已是最新版本。

主要实现：

- `packages/core/src/api/FirmwareUpdateV4.ts`
- `packages/core/src/protocols/protocol-v2/firmware.ts`
- `packages/core/src/api/protocol-v2/DeviceFirmwareUpdate.ts`

## 共同维护原则

- 设置、壁纸、NFT 和升级都属于 Core 业务编排，Transport 只负责单次消息传输。
- 新增有副作用操作时，必须明确是否允许解锁后重试或断线后重试。
- 文件路径、chunk 上限和超时策略集中复用 helper，避免各方法自行实现。
- 公共字段归一化和运行模式判断见 [Pro2 字段迁移](../sdk/pro2-field-migration.md)。
