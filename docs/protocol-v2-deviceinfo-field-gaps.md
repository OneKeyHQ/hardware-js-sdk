# Protocol V2 DeviceInfo 字段对齐状态

本文档记录当前 `firmware-pro2` 的 `DeviceInfoGet -> DeviceInfo` 与 SDK 标准 `Features` 的映射状态。当前实现只对齐 `submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest`。

## 当前映射

| SDK 语义 | 当前 Protocol V2 来源 |
| --- | --- |
| `device_id` | `status.device_id` |
| `passphrase_protection` | `status.passphrase_enabled` |
| `attach_to_pin_enabled` | `status.attach_to_pin_enabled` |
| `unlocked_attach_pin` | `status.unlocked_by_attach_to_pin` |
| `serial_no` / `onekey_serial_no` | `hw.serial_no` |
| 固件版本 | `fw.application` |
| bootloader 版本 | `fw.bootloader` |
| romloader / application data | `fw.romloader` / `fw.application_data` |
| 协处理器版本 | `coprocessor.application` |
| BLE 广播名 | `coprocessor.bt_adv_name` |
| SE 版本 | `se1`-`se4` 的 `application` / `bootloader` |
| 语言、label、初始化、备份状态 | `status.language` / `status.label` / `status.init_states` / `status.backup_required` |

## 当前字段边界

- 设备信息请求名是 `DeviceInfoGet`。
- 协处理器 target 字段是 `targets.coprocessor`。
- `status.passphrase_protection`：当前固件字段是 `status.passphrase_enabled`，SDK 映射为标准 `passphrase_protection`。
- `hw.device_id` 或 `serial_no -> device_id` fallback：`device_id` 只来自 `status.device_id`。
- onboarding 轮询消息：当前固件未导出，SDK API 和构建脚本不再注入。
- Protocol V2 `TonSignData` / `TonSignedData`：当前固件未导出，构建脚本不再注入；普通 Protocol V1 TON schema 不受影响。

## 仍需产品/固件后续确认的能力

这些不是当前迁移阻塞项，只是 V1 `Features` 中仍没有 V2 等价来源的状态：

| 能力 | 影响 |
| --- | --- |
| `bootloader_mode` 或等价运行模式 | 设备详情和升级流程无法完全从 `DeviceInfo` 判断当前运行模式。 |
| `safety_checks` | testnet 签名临时放宽流程无法从 V2 features 读取设备安全等级。 |
| `battery_level` | 固件升级前低电量拦截无法依赖 V2 features。 |
| `auto_lock_delay_ms` / `auto_shutdown_delay_ms` / `haptic_feedback` | 设备详情页无法从 V2 features 回显这些设置。 |

新增这些字段时，应先更新 firmware-pro2 protobuf，再运行 `yarn update-protobuf`，最后在 `packages/core/src/deviceProfile` 和 Protocol V2 feature builder 中补映射。
