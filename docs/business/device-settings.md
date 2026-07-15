# Pro2 设备设置

## 适用范围

本文描述 Pro2 / Protocol V2 的设备设置接口。Protocol V1 设备继续使用既有的 `deviceSettings`；SDK 当前不会把旧接口自动路由到 Protocol V2。

## 公共接口

| SDK 方法                 | protobuf                 | 返回值           | 解锁策略                     |
| ------------------------ | ------------------------ | ---------------- | ---------------------------- |
| `deviceSettingsGet`      | `DeviceSettingsGet`      | `DeviceSettings` | 设备锁定后自动解锁并重试一次 |
| `deviceSettingsSet`      | `DeviceSettingsSet`      | `Success`        | 设备锁定后自动解锁并重试一次 |
| `deviceSettingsPageShow` | `DeviceSettingsPageShow` | `Success`        | 设备锁定后自动解锁并重试一次 |

三个接口均为 Protocol V2-only，并跳过 Protocol V1 的强制固件升级检查和 passphrase 前置流程。

## 可读取设置

当前 `DeviceSettings` 包含设备名称、蓝牙、语言、壁纸路径、亮度、自动锁定、自动关机、动画、抬起唤醒、震动、设备名展示、FIDO、实验功能、USB 锁定、随机键盘，以及 passphrase 和 airgap 状态。

具体字段以当前 Protocol V2 protobuf 和生成的 TypeScript 类型为准，应用不应假设旧固件一定返回所有字段。

## 写入边界

`deviceSettingsSet` 支持部分字段更新，但会移除 `passphrase_enable` 和 `airgap_mode`，并要求请求中至少保留一个可写字段。对应公共输入类型为：

```ts
Omit<DeviceSettings, 'passphrase_enable' | 'airgap_mode'>;
```

这两个字段涉及安全模式切换和设备端确认，不允许通过通用 SDK 设置接口静默修改。应用应使用 `deviceSettingsPageShow` 打开相应设备页面，让用户在设备端完成操作。

## 打开设备设置页

`deviceSettingsPageShow` 接受数字 enum，或以下字符串值：

- `DeviceReset`
- `DevicePinChange`
- `DevicePassphrase`
- `DeviceAirgap`

参数兼容 `fieldName` 和 protobuf 风格的 `field_name`，发送到设备时统一转换为 `field_name`。

## 解锁和错误语义

三个接口都声明 `retry-on-locked`：首次调用如果收到标准化的 `HardwareErrorCode.DeviceLocked`，Core 会调用一次设备解锁，然后重新执行原方法。第二次失败直接返回调用方，不循环重试。

Protocol V1 设备调用这些接口时，应得到一致的“不支持 Protocol V2”错误，而不是回退到旧 `deviceSettings`。

## 关键代码

- `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`
- `packages/core/src/types/api/protocolV2.ts`
