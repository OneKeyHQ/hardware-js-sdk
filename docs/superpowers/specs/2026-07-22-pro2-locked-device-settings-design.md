# Pro2 锁定状态读取设备设置设计

## 背景

`firmware-pro2` 从提交 `ea3031eeb` 开始将 `DeviceSettings` 拆分为公开字段和私有字段。`DeviceSettingsGet` 在设备锁定时不再返回 `DeviceLocked`，而是始终返回公开字段，并省略仅允许解锁后读取的 `passphrase_enable` 与 `fido_enabled`。

本次适配直接以新固件协议为准，不兼容仍要求解锁的旧版 Pro2 固件。

## SDK 行为

- 更新 `firmware-pro2` 子模块到远端 `dev` 最新提交。
- 重新生成 Protocol V2 protobuf JSON 与 TypeScript 类型，使字段编号、已删除字段和可选字段与固件一致。
- 将 `DeviceSettingsGet.unlockPolicy` 从 `retry-on-locked` 改为 `none`。
- `DeviceSettingsSet` 与 `DeviceSettingsPageShow` 仍保持现有解锁策略，不扩大本次变更范围。
- 增加回归测试，确保调度器在设备状态为锁定时直接执行 `DeviceSettingsGet`，不会调用 `device.unlockDevice()`。

## App 行为

- `getPro2DeviceManagementSnapshot` 不再依据 `DeviceStatus.unlocked` 决定是否读取设置，而是每次都调用 `deviceSettingsGet`。
- 锁定状态下，公开设置进入快照并正常展示；缺失的私有字段继续保持 `undefined`。
- 删除“读取 DeviceSettings 需要解锁”相关注释、条件判断和对应测试预期。
- 设置写入、需要设备页面确认的操作，以及私有设置项的交互策略不在本次范围内。

## 数据流

1. App 获取 `DeviceStatus` 与缓存/刷新的 `DeviceInfo`。
2. App 不区分锁定状态，调用 SDK `deviceSettingsGet`。
3. SDK 直接发送 `DeviceSettingsGet`，不预解锁，也不在锁定错误后重试解锁。
4. 固件返回所有公开字段；解锁时额外返回私有字段。
5. App 将实际返回字段合并进 Pro2 管理快照。

## 测试与验收

- SDK：`DeviceSettingsGet` 的 `unlockPolicy` 为 `none`，锁定状态不会触发解锁。
- 协议：生成产物中 `passphrase_enable=100`、`fido_enabled=101`，不存在 `experimental_features`。
- App：锁定与解锁状态都会调用一次 `deviceSettingsGet`，且锁定状态的快照包含公开设置。
- 运行 SDK 定向 Jest 测试、protobuf 生成校验，以及 App 的 Pro2 设备管理定向测试和相关类型检查。

