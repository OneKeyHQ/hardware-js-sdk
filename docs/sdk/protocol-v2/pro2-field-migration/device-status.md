# Pro 2 设备状态字段迁移

`DeviceStatus` 承载会随锁定、初始化、备份和安全设置变化的运行状态。Core 可以独立读取它，也可以消费 `DeviceInfo.status` 中的状态快照。

## 字段迁移

| 旧语义 / SDK 语义      | Protocol V2 字段            | SDK 映射                        | 迁移说明                                   |
| ---------------------- | --------------------------- | ------------------------------- | ------------------------------------------ |
| 设备 ID                | `device_id`                 | `Features.deviceId`             | 从硬件信息移动到实时状态，不允许序列号兜底 |
| 是否解锁               | `unlocked`                  | `Features.unlocked`             | 动态状态                                   |
| 是否初始化             | `init_states`               | `Features.initialized`          | 字段名不同，语义保持一致                   |
| 是否需要备份           | `backup_required`           | `Features.backupRequired`       | 动态状态                                   |
| Passphrase 保护        | `passphrase_enabled`        | `Features.passphraseProtection` | 固件与 SDK 命名不同                        |
| Attach-to-PIN 是否启用 | `attach_to_pin_enabled`     | `Features.attachToPinEnabled`   | 下划线转公共驼峰语义                       |
| 是否由 Attach PIN 解锁 | `unlocked_by_attach_to_pin` | `Features.unlockedAttachPin`    | 固件字段更明确地描述解锁来源               |

## 两种读取路径

### `DeviceInfoGet` 内嵌状态

初始化 adapter 和部分 `getDeviceInfo` scope 会设置 `targets.status=true`。这样一次调用可以同时建立设备身份和基础状态，用于构建标准 Features。

### `DeviceStatusGet` 独立状态

钱包 Session、PIN 解锁或需要快速刷新状态的流程可以直接调用：

```text
DeviceStatusGet -> DeviceStatus
```

独立读取避免为了几个动态布尔值重复请求所有固件、协处理器和 SE 信息。Core 的内部状态刷新会把返回值合并进缓存的 `raw.protocolV2DeviceInfo.status`，再重新构建标准 Features。

## 公共和私有状态

protobuf 注释将字段分为：

- 公共状态：`device_id`、`unlocked`、`init_states`、`backup_required`。
- 解锁后可用的私有状态：`passphrase_enabled`、`attach_to_pin_enabled`、`unlocked_by_attach_to_pin`。

因此调用方必须允许私有字段为空。空值不能直接解释成 `false`，也不能覆盖此前已确认的状态，除非当前 SDK adapter 对该字段有明确的字段级合并规则。

## Onboarding 状态

onboarding 没有塞入 `DeviceStatus`，而是独立消息：

```text
DevGetOnboardingStatus -> DevOnboardingStatus
```

返回值包含 `stage`、`status_code` 和 `detail_code`。SDK 对外提供 `deviceGetOnboardingStatus`。它描述初始化流程所在步骤，不应与 `init_states` 这个最终初始化布尔值混用。

## 不属于 DeviceStatus 的内容

| 内容                             | 正确归属                          |
| -------------------------------- | --------------------------------- |
| label、语言、蓝牙开关、自动锁屏  | `DeviceSettings`                  |
| 钱包 `session_id` 和钱包标识     | `DeviceSession`                   |
| 主控、BLE、SE 版本               | `DeviceInfo`                      |
| 固件升级任务状态                 | `DeviceFirmwareUpdateStatus`      |
| `safety_checks`、`battery_level` | 当前 V2 protobuf 没有标准读取来源 |

## 维护约束

- 新增动态设备状态时优先扩展 `DeviceStatus`，不要加入硬件或固件信息结构。
- 新增用户可配置项时进入 `DeviceSettings`，不要因为 UI 需要回显就复制到 `DeviceStatus`。
- SDK 若把新字段归一化到 Features，必须同时定义锁定状态下缺失值的处理规则。
