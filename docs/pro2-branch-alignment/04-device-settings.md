# Pro2 DeviceSettings

## 1. 新增公共接口

| SDK 方法 | protobuf | 返回值 | 解锁策略 |
| --- | --- | --- | --- |
| `deviceSettingsGet` | `DeviceSettingsGet` | `DeviceSettings` | 锁定后自动解锁重试一次 |
| `deviceSettingsSet` | `DeviceSettingsSet` | `Success` | 锁定后自动解锁重试一次 |
| `deviceSettingsPageShow` | `DeviceSettingsPageShow` | `Success` | 锁定后自动解锁重试一次 |

三者均为 Protocol V2-only，并跳过 V1 的强制固件升级检查和 passphrase 前置流程。

## 2. 可读字段

当前 `DeviceSettings` 包括：设备名称、蓝牙、语言、壁纸路径、亮度、自动锁定/关机、动画、抬起唤醒、震动、设备名展示、FIDO、实验功能、USB 锁定、随机键盘，以及 passphrase/airgap 状态。

## 3. 写入限制

`deviceSettingsSet` 会移除 `passphrase_enable` 和 `airgap_mode`，并要求至少保留一个可支持字段。原因是这两项涉及安全确认，应通过设备端设置页完成，而不是静默远程切换。

因此类型也使用：

```ts
Omit<DeviceSettings, 'passphrase_enable' | 'airgap_mode'>
```

## 4. 打开设备端设置页

`deviceSettingsPageShow` 支持数字 enum 或以下字符串：

- `DeviceReset`
- `DevicePinChange`
- `DevicePassphrase`
- `DeviceAirgap`

参数同时兼容 `fieldName` 和 protobuf 风格的 `field_name`，发送给固件时统一为 `field_name`。

## 5. 与旧 `deviceSettings` 的兼容边界

旧 `deviceSettings` 是 Protocol V1 的通用方法；新 `deviceSettingsGet/Set/PageShow` 是 V2 专用方法。目前没有把旧方法自动路由到 V2，因此调用方应按协议或设备类型选择：

- V1 设备继续使用 `deviceSettings`。
- Pro2 使用新的三个 V2 方法。

## 6. 关键代码

- `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`
- `packages/core/src/types/api/protocolV2.ts`
