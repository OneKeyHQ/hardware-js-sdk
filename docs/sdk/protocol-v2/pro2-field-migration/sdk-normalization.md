# Pro 2 字段的 SDK 转换

Protocol V2 按用途拆分消息后，不会直接暴露成一组完全不同的上层设备模型。Core 对基础身份和状态进行有限转换，同时保留专用 API 和原始 protobuf 数据。

## 三条不同路径

| 路径                 | 请求与输出                                         | 是否更新缓存 | 适用场景                        |
| -------------------- | -------------------------------------------------- | ------------ | ------------------------------- |
| 初始化 adapter       | `DeviceInfoGet -> buildProtocolV2FeaturesPayload`  | 是           | 建立 Device 内唯一标准 Features |
| `getDeviceInfo`      | 按 scope 请求 `DeviceInfo`，再构建 `DeviceProfile` | 可刷新       | 设备详情、版本和校验信息        |
| 原始 `deviceInfoGet` | 调用方自定义 targets/types，返回原始 `DeviceInfo`  | 否           | 协议调试和专用查询              |

这三条路径不能统称为“DeviceInfoGet API”，否则会掩盖查询范围、输出结构和缓存副作用的差异。

## DeviceInfo 与 DeviceStatus 映射

| Protocol V2 来源                   | 标准 Features                      | DeviceProfile                 | 说明                       |
| ---------------------------------- | ---------------------------------- | ----------------------------- | -------------------------- |
| `protocol_version`                 | `protocolVersion`                  | `protocol` / raw              | 协议类型固定为 V2          |
| `hw.serial_no`                     | `serialNo`                         | `serialNo`                    | 不用于生成 `deviceId`      |
| `fw.application.version`           | `firmwareVersion`                  | `versions.firmware`           | 主应用版本                 |
| `fw.bootloader.version`            | `bootloaderVersion`                | `versions.bootloader`         | bootloader 版本            |
| `fw.romloader.version`             | `boardVersion`                     | `versions.board`              | 历史 boardloader 命名兼容  |
| `coprocessor.application.version`  | `bleVersion`                       | `versions.ble`                | 当前 BLE/协处理器应用版本  |
| `coprocessor.bt_adv_name`          | `bleName`                          | raw                           | BLE 广播名                 |
| `se1..se4.application.version`     | `se01Version..se04Version`         | `versions.se01..se04`         | SE 应用版本                |
| `se1..se4.bootloader.version`      | `se01BootVersion..se04BootVersion` | 对应 boot 版本                | SE bootloader 版本         |
| `status.device_id`                 | `deviceId`                         | `deviceId`                    | 唯一来源                   |
| `status.init_states`               | `initialized`                      | `status.initialized`          | 决定 normal/notInitialized |
| `status.unlocked`                  | `unlocked`                         | `status.unlocked`             | 动态状态                   |
| `status.passphrase_enabled`        | `passphraseProtection`             | `status.passphraseProtection` | 命名转换                   |
| `status.attach_to_pin_enabled`     | `attachToPinEnabled`               | `status.attachToPinEnabled`   | 命名转换                   |
| `status.unlocked_by_attach_to_pin` | `unlockedAttachPin`                | `status.unlockedAttachPin`    | 解锁来源                   |
| `status.backup_required`           | `backupRequired`                   | `status.backupRequired`       | 备份状态                   |

`build_id` 和 `hash` 只在 verify/full 查询范围中请求，并进入 `Features.verify` 或 `DeviceProfile.verify`。

## 当前不合并进标准 Features 的字段

| 字段/能力       | Protocol V2 来源                       | 当前策略                               |
| --------------- | -------------------------------------- | -------------------------------------- |
| label           | `DeviceSettings.label`                 | 调用设置 API                           |
| language        | `DeviceSettings.language`              | 调用设置 API；V2 Profile 当前为 `null` |
| BLE 开关        | `DeviceSettings.bt_enable`             | 调用设置 API；V2 Profile 当前为 `null` |
| 自动锁屏        | `DeviceSettings.autolock_delay_ms`     | 调用设置 API                           |
| 自动关机        | `DeviceSettings.autoshutdown_delay_ms` | 调用设置 API                           |
| 触觉反馈        | `DeviceSettings.haptic_feedback`       | 调用设置 API                           |
| 钱包 Session ID | `DeviceSession.session_id`             | 由钱包 Session 管理持有                |
| 钱包标识        | `DeviceSession.btc_test_address`       | 映射为内部 `passphraseState`           |
| 工厂信息        | `DeviceFactoryInfo`                    | 只通过工厂 API 获取                    |
| 固件任务记录    | `DeviceFirmwareUpdateStatus`           | 只通过升级流程获取                     |

不合并的原因不是实现遗漏，而是避免把不同生命周期、权限边界的数据重新塞回一个不断膨胀的 Features 对象。

## 当前缺失的 Feature 字段

| Feature 字段或能力                    | 当前 Protocol V2 情况                             | SDK 当前处理与后续需要修改                                    |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| 显式运行模式                          | 没有 normal/bootloader/romloader 字段             | SDK 暂按返回结构区分；后续需要固件提供明确字段                |
| `applicationDataVersion/BuildId/Hash` | 已提供 `fw.application_data`                      | 当前仅保留在 raw；如上层需要，应新增独立 Feature/Profile 字段 |
| `safetyChecks`                        | DeviceInfo、DeviceStatus、DeviceSettings 均无来源 | 标准 Features 保持 `null`，需要固件提供读取来源               |
| `batteryLevel`                        | 当前 V2 protobuf 没有来源                         | Feature 无可靠值，不能用于 Pro 2 升级前低电量拦截             |
| `noBackup` 等 V1 细分备份字段         | 当前只提供 `backup_required`                      | 不根据一个布尔值推导其他历史状态；需要协议增加明确字段        |

必须区分这张表与上一节：上一节是“已有专用 API，当前不合并进 Features”；本节列的是 Feature 仍缺少明确字段或稳定来源的内容。

## 缓存合并规则

- Device 内只维护一份标准 Features 缓存。
- 新的 `DeviceInfo` 按字段语义与前一次缓存合并，避免轻量请求清空未请求的版本字段。
- `device_id`、Passphrase 和 Attach-to-PIN 等明确状态字段不使用不相关字段兜底。
- PIN 解锁结果可以回写标准状态，但后续仍可通过 `DeviceStatusGet` 重新确认。
- 原始 protobuf 保存在 `Features.raw.protocolV2DeviceInfo`，供排查和重新构建 Profile 使用。

## 新字段接入步骤

1. 在与字段用途对应的 firmware-pro2 proto 文件中增加或调整字段。
2. 运行 `yarn update-protobuf`，同步两份 Protocol V2 schema 和生成类型。
3. 判断字段应进入标准 Features、DeviceProfile、专用 API，还是只保留 raw。
4. 若进入 Features，定义空值、锁定状态、轻量查询和字段级缓存合并规则。
5. 补充 Core adapter 测试，并更新本目录对应分类文档和迁移矩阵。

不要先在 SDK 手写字段，再等待固件补 proto；这会造成 TypeScript 表面可用、运行时字段始终为空的伪兼容。
