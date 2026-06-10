# Protocol V2 DevGetDeviceInfo 字段缺口分析

对比对象：

- Protocol V1 `Features`（90 字段，`GetFeatures` 返回）
- Protocol V1 `OnekeyFeatures`（44 字段，`OnekeyGetFeatures` 返回）
- Protocol V2 `DeviceInfo`（`DevGetDeviceInfo` 返回，来源 `firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device.proto`）

结论：**OnekeyFeatures 的 44 个字段已被 V2 的 `fw/bt/se1-4` 树完全覆盖**（version/build_id/hash/SE state/SE type 均有）。缺口集中在 legacy `Features` 的设备状态类字段，SDK 当前在兼容视图（`deviceProfile/legacyFeaturesView.ts`）中只能填占位值。

## V2 已覆盖（无需固件动作）

| V1 字段 | V2 来源 |
| --- | --- |
| major/minor/patch_version, onekey_firmware_version/hash/build_id | `fw.app.{version,build_id,hash}` |
| bootloader_version, onekey_boot_* | `fw.boot.*` |
| boardloader_version, onekey_board_* | `fw.board.*` |
| ble_ver, onekey_ble_version/hash/build_id | `bt.app.*` |
| ble_name, onekey_ble_name | `bt.adv_name` |
| ble_enable | `status.bt_enable` |
| onekey_se0X_version/hash/build_id/state（含 boot） | `se1-4.{app,boot,state}` |
| onekey_se_type | `se1-4.type` |
| serial_no, onekey_serial_no, onekey_serial | `hw.serial_no` |
| language / label / initialized / needs_backup / passphrase_protection | `status.{language,label,init_states,backup_required,passphrase_protection}` |
| model / vendor / product / onekey_device_type | SDK 静态填充（hw.device_type） |

## 缺口一：安全/会话相关（建议固件优先补充）

已确认决策（2026-06-10）：

| 决策 | V1 字段 | 用途 / SDK 当前占位行为 | 建议 |
| --- | --- | --- | --- |
| 必须 | `device_id` | 随 seed 轮换的设备身份，SDK 用于判断硬件是否重置过。session 缓存键、`checkDeviceId`、钱包侧账户绑定都依赖"wipe 后变化"语义。当前回退 `serialNo`（永不变化）→ wipe 后旧 session 缓存不会自然失效 | `DevStatus` 增加 `device_id`（seed-scoped，wipe 轮换） |
| 必须 | `bootloader_mode`（或等价模式枚举） | 固件升级用。`isBootloader()` 对 Pro2 恒 false，SDK 无法向调用方如实报告运行模式 | bootloader 下也响应 `DevGetDeviceInfo` 并上报运行模式 |
| 必须 | `safety_checks` | Strict/Prompt 等级。testnet 签名临时放宽流程（`checkSafetyLevelOnTestNet`）对 Pro2 失效 | `DevStatus` 增加 |
| 后续补充 | `capabilities` | 能力声明（如 AttachToPin）。等能力枚举确定后补充；当前 SDK 按"V2 即全支持"推断 | `DeviceInfo` 增加 capabilities 列表 |
| 低优先级 | `pin_protection` | 已核实：App 侧无真实读取（仅测试 fixtures），SDK 侧仅作为 Reset/Recovery 的写入参数 | 暂缓 |
| 待定 | `unlocked` | 连接时的锁屏初始状态（`UnLockDevice` 响应里有，`DeviceInfo` 拿不到）。`hasUsePassphrase` 的 locked 预检对 Pro2 失效，目前靠 `passphrase_protection` 兜住主流程 | 建议跟 device_id 一起加，成本低 |
| P2 | `no_backup` / `unfinished_backup` | seedless / 备份未完成判定（`isSeedless()`）。已有 `backup_required` 但语义不同 | `DevStatus` 补充 |
| P2 | `unlocked_attach_pin` / `attach_to_pin_user` | attach pin 会话状态 | 与 passphrase 会话设计一起定 |
| P2 | `session_id` | V2 是否存在 session 概念待定义 | 与 passphrase 会话设计一起定 |

## 缺口二：设置/体验类 —— 实际消费调查结果（2026-06-10，扫描 App-monorepo + hardware-js-sdk）

SDK 侧这些字段只出现在 `deviceSettings`(ApplySettings) 的**写入参数**里，无读取逻辑；读回需求全部来自 App。App 侧排除测试夹具（`firewareUpdateFixtures.ts`）后的真实消费：

| 字段 | App 真实消费 | 结论 |
| --- | --- | --- |
| `battery_level` | `ServiceFirmwareUpdate.validateDeviceBattery`（ServiceFirmwareUpdate.ts:2249）：BLE 固件升级前低电量(≤25%)拦截。**当前 Pro2 因拿不到该字段会静默跳过此保护** | **需要补充** |
| `auto_lock_delay_ms` | 设备详情页读取显示（deviceDetails/actions.ts:79）+ DeviceSettingsManager 写入 | **需要补充** |
| `auto_shutdown_delay_ms` | 设备详情页读取显示（actions.ts:80）+ 写入 | **需要补充** |
| `haptic_feedback` | 设备详情页读取显示（actions.ts:82）+ 写入 | **需要补充** |
| `brightness_prcent` | 无读取。App 只通过 `setBrightness`(change_brightness) 触发设备端调节，不回读当前值 | 暂不需要 |
| `display_rotation` | 仅 ApplySettings 写参数，无读取 | 暂不需要 |
| `passphrase_always_on_device` | 仅 ApplySettings 写参数，无读取 | 暂不需要 |
| `wipe_code_protection` | 仅 fixtures | 不需要 |
| `sd_card_present` / `sd_protection` | 仅 fixtures（Pro2 无 SD 卡则永不需要） | 不需要 |
| `experimental_features` | 仅 ApplySettings 写参数 / fixtures | 不需要 |
| `busy` | 无 features.busy 消费（搜到的均为无关上下文） | 不需要 |
| `coin_switch` | 仅 fixtures | 不需要 |
| `NFT_voucher` | 仅 fixtures | 不需要 |

注：设备详情页同时读取 `language`（DevStatus 已有 ✓）和 `passphrase_protection`（已有 ✓）。

## 缺口三：可不补的字段

- `fw_vendor` / `firmware_present` / `backup_only`：若 Pro2 只发 Universal 固件可忽略；若未来有 BTC-only 固件则必须补（否则固件更新会选错包）。
- `revision` / `bootloader_hash`（顶层 legacy 字段）：已被 `fw.*.hash` 覆盖。
- `cpu_info` / `pre_firmware`：工厂信息走 `FactoryGetDeviceInfo`，不需要进 `DeviceInfo`。
- `_passphrase_cached`、`offset`、`spi_flash`、`initstates`（V1 历史遗留/废弃字段）。

## SDK 侧对应动作（字段补充后）

1. `protocols/protocol-v2/features.ts` 的 `ProtocolV2DeviceInfo` 类型与 `deviceProfile/buildDeviceProfile.ts` 的 `normalizeV2Status` 增加映射。
2. `deviceId` 切换到固件上报值后，删除 `buildProfileFromProtocolV2` 中的 serialNo 回退注释块。
3. `legacyFeaturesView.ts` 中对应占位值（`unlocked: false`、`pin_protection: null` 等）替换为真实值。
