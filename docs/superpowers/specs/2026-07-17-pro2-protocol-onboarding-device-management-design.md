# Pro2 Protocol、Onboarding 与设备管理对齐设计

## 目标

同步 `firmware-pro2/dev` 最新 Protocol V2 定义，更新 SDK 的 protobuf schema 与类型，按新
`DevOnboardingStatus` 模型改造 Pro2 onboarding，并让 app-monorepo 的 Pro2 设备管理全面使用
Protocol V2 SDK 接口。

本设计不兼容旧 Pro2 开发固件。Pro、Touch、Classic、Mini 和第三方硬件继续使用现有流程。

## 固件与协议基线

- `firmware-pro2` 目标分支：`origin/dev`
- 调研时最新提交：`e4884ae8a`
- Onboarding 协议从 `stage/status_code/detail_code` 改为：
  - `step`
  - `phase`
  - `setup.kind`
  - `setup.method`
  - `pin_set`
  - `wallet_initialized`
- 后续 `DeviceInfo.status` 将从固件协议删除，所有动态状态统一由 `DeviceStatusGet` 返回。

## 数据边界

### DeviceInfoGet：静态信息

`DeviceInfoGet` 只负责连接期间基本不变化的信息：

- `protocol_version`
- `hw`
- `fw`
- `coprocessor`
- `se1` 至 `se4`

SDK 不再在默认 targets 中请求 `status`，也不再从 `DeviceInfo.status` 构建设备状态。

设备首次连接、设备身份变化、固件升级、重启进入其他模式或静态缓存缺失时刷新
`DeviceInfoGet`。普通页面聚焦和设置操作不重复读取完整设备信息。

### DeviceStatusGet：动态状态

`DeviceStatusGet` 是以下字段的唯一来源：

| Protocol 字段 | SDK/App 语义 |
| --- | --- |
| `device_id` | 当前钱包设备 ID |
| `unlocked` | 设备是否已解锁 |
| `init_states` | 钱包是否已初始化 |
| `backup_required` | 是否需要备份 |
| `passphrase_enabled` | Passphrase 是否启用 |
| `attach_to_pin_enabled` | Attach-to-PIN 是否启用 |
| `unlocked_by_attach_to_pin` | 当前是否通过 Attach-to-PIN 解锁 |

设备详情进入、重新聚焦、解锁完成、安全设置完成、onboarding 完成和擦除操作后刷新状态。

### DeviceSettingsGet/Set：设备设置

`DeviceSettingsGet` 是 Pro2 当前设置的唯一来源：

| Protocol 字段 | 设备管理功能 |
| --- | --- |
| `label` | 设备名称 |
| `bt_enable` | 蓝牙开关状态 |
| `language` | 语言 |
| `wallpaper_path` | 当前壁纸路径 |
| `passphrase_enable` | Passphrase 开关展示 |
| `brightness` | 屏幕亮度 |
| `autolock_delay_ms` | 自动锁定时间 |
| `autoshutdown_delay_ms` | 自动关机时间 |
| `animation_enable` | 动画开关 |
| `tap_to_wake` | 轻触唤醒 |
| `haptic_feedback` | 触感反馈 |
| `device_name_display_enabled` | 主屏设备名称展示 |
| `airgap_mode` | Air Gap 状态展示 |
| `fido_enabled` | FIDO 功能 |
| `experimental_features` | 实验功能 |
| `usb_lock_enable` | USB Lock |
| `random_keypad` | 随机键盘 |

设备详情页先调用 `DeviceStatusGet`。仅当设备已经解锁时自动调用 `DeviceSettingsGet`，避免用户只是
打开详情页就被强制要求输入 PIN。用户主动执行设置操作时，SDK 使用 `retry-on-locked` 完成解锁和重试。

普通设置通过 `DeviceSettingsSet` 写入。Passphrase、Air Gap、修改 PIN 和擦除设备通过
`DeviceSettingsPageShow` 打开设备页面，最终决策留在设备端。设置操作成功后重新读取
`DeviceStatusGet + DeviceSettingsGet`，不通过本地乐观值长期代替设备真实状态。

## SDK 架构调整

### Protocol schema

1. 子模块更新到 `firmware-pro2/origin/dev`。
2. 从 `sys/protobuf/onekey_protocol/{legacy,latest}` 重新生成 `messages-protocol-v2.json`。
3. 更新 `packages/hd-transport/src/types/messages.ts`。
4. 同步 `packages/core/src/data/messages/messages-protocol-v2.json`。
5. 使用 schema 一致性测试确保 transport 和 core 的 JSON 完全一致。

### Features 状态拆分

当前 `buildProtocolV2FeaturesPayload(deviceInfo, previous)` 改为接收独立数据源：

```ts
buildProtocolV2FeaturesPayload({
  deviceInfo,
  deviceStatus,
  previous,
});
```

- 版本、序列号、BLE 名称和 SE 信息只从 `deviceInfo` 读取。
- 设备 ID、初始化、解锁、备份、Passphrase 和 Attach-to-PIN 只从 `deviceStatus` 读取。
- `Features.raw` 分开保存：
  - `protocolV2DeviceInfo`
  - `protocolV2DeviceStatus`
- `updateProtocolV2Status()` 只合并独立 status 缓存，不再伪造带 `status` 的 DeviceInfo。

### 初始化和刷新

Protocol V2 正常应用初始化顺序：

1. `DeviceInfoGet` 获取静态身份和版本。
2. `DeviceStatusGet` 获取动态状态和 `device_id`。
3. 两者合并生成标准 `Features`。

普通业务运行前的轻量刷新只调用 `DeviceStatusGet`。

Bootloader/Romloader 不再通过“`DeviceInfo.status` 不存在”判断。正常应用模式以
`DeviceStatusGet` 成功为依据；状态接口不可用时，再使用固件镜像、协处理器和 SE 字段结构区分
Bootloader 与 Romloader。

### 高层与低层接口

- `deviceInfoGet`：保持原始 Protocol V2 静态信息接口，不隐式请求状态。
- `deviceStatusGet`：保持原始动态状态接口，并更新 Device 内部状态缓存。
- `deviceSettingsGet/Set`：保持原始设置接口。
- 高层 `getDeviceInfo`：按需要组合 `DeviceInfoGet + DeviceStatusGet` 构建完整 `DeviceProfile`。

## Onboarding 映射

### 顶层 Step

| 固件 Step | App 宏观状态 | App Stepper |
| --- | --- | --- |
| `UNKNOWN` | `checking` | Checking |
| `CHECKING` | `checking` | Checking |
| `PERSONALIZATION` | `needsSetup` | Personalization |
| `PIN` | `needsSetup` | Pin |
| `SETUP` | `needsSetup` | Setup |
| `DONE` | 满足完成条件后 `ready` | Done |

完成条件必须同时满足：

```ts
step === DEV_ONBOARDING_STEP_DONE &&
pin_set === true &&
wallet_initialized === true
```

字段缺失或 `UNKNOWN` 时保持 checking，不提前跳转 Finalize。

### Phase

| 固件 Phase | App 内容 |
| --- | --- |
| `SAFETY_CHECK` | 设备安全检查 |
| `PIN_SETUP` | 创建 PIN |
| `FINGERPRINT_SETUP` | 设置指纹 |
| `SETUP_CHOICE` | 选择创建或恢复 |
| `WALLET_CREATE_START` | 创建新钱包 |
| `RECOVERY_PHRASE_VIEW` | 查看和记录助记词 |
| `RECOVERY_PHRASE_CONFIRM` | 确认助记词 |
| `RESTORE_METHOD_CHOICE` | 选择恢复方式 |
| `RECOVERY_PHRASE_RESTORE` | 助记词恢复 |
| `SEEDCARD_RESTORE` | SeedCard 恢复 |
| `WALLET_READY` | 钱包已创建 |
| `SEEDCARD_BACKUP_PROMPT` | SeedCard 备份提示 |
| `SEEDCARD_BACKUP` | SeedCard 备份中 |

### Setup

- `CHOICE`：创建或恢复选择。
- `CREATE + RECOVERY_PHRASE`：创建助记词钱包。
- `CREATE + SEEDCARD`：SeedCard 备份。
- `RESTORE + RECOVERY_PHRASE`：助记词恢复。
- `RESTORE + SEEDCARD`：SeedCard 恢复。

App 删除旧 `DevOnboardingStage`、`status_code` 和 `detail_code` 映射。枚举标准化同时接受 protobuf
运行时返回的数字值和枚举名称字符串。Onboarding 页面激活期间维持 1.2 秒状态查询；请求进行中、页面
退出或已经跳转 Finalize 时停止重复请求。

## app-monorepo 设备管理

### 后台聚合层

在 `ServiceHardware`/`DeviceSettingsManager` 中建立 Pro2 专用读取适配，不让 UI 直接处理 protobuf：

```ts
type IPro2DeviceManagementSnapshot = {
  info?: ProtocolV2DeviceInfo;
  status: DeviceStatus;
  settings?: DeviceSettings;
};
```

- `status` 每次页面生命周期刷新。
- `info` 使用连接级缓存；静态缓存失效时才读取。
- `settings` 仅在已解锁时读取。
- 同一 connectId 的并发读取合并为一个进行中的 Promise。
- 页面层只消费归一化后的管理模型。

### 页面生命周期

1. 页面进入或重新聚焦。
2. 获取 `DeviceStatusGet`。
3. 静态缓存缺失或失效时获取 `DeviceInfoGet`。
4. `unlocked === true` 时获取 `DeviceSettingsGet`。
5. 更新设备详情、About、安全和通用设置页面。

不使用持续轮询。Onboarding 页面自己的短周期查询不属于设备管理页生命周期刷新。

### 设置操作

- 设置写入统一走现有 `DeviceSettingsManager` Pro2 分支。
- 补齐当前缺失的 Pro2 设置读取和写入字段。
- 设置成功后重新读取 status/settings。
- Passphrase、Air Gap、PIN、Wipe 操作打开设备页面后，不假设用户一定完成修改；页面重新聚焦或操作
  生命周期结束时重新查询真实值。
- About 页面从 `DeviceInfoGet` 展示固件、Bootloader、BLE、SE、序列号和硬件版本，不再从旧
  `featuresInfo` 猜测 Protocol V2 字段。
- 能力判断以 Protocol V2 schema 和设备返回字段为准，不套用 Pro/Touch 的版本门槛。

## 错误处理

- 状态读取失败：保留最近一次静态信息，页面展示连接错误并允许重试。
- 设置读取因锁定失败：不作为页面错误；显示锁定态，等待用户主动操作解锁。
- 静态信息读取失败：不覆盖现有缓存，About 页面显示可用的旧值和刷新入口。
- Onboarding 未知字段：保持 checking，记录 debug 日志，不推断完成。
- 枚举未知值：映射到 `UNKNOWN`，确保未来固件新增枚举不会导致页面崩溃。

## 验证

### hardware-js-sdk

- protobuf JSON 与生成类型测试。
- DeviceInfo 不含 status 时的 Features 构建测试。
- DeviceStatus 独立更新且不覆盖静态版本信息的测试。
- Protocol V2 初始化分别请求 info/status 的测试。
- Bootloader/Romloader 模式判断回归测试。
- 新 onboarding enum/type 导出测试。

### app-monorepo

- 新 onboarding `step/phase/setup` 映射表测试。
- DONE 但 `pin_set` 或 `wallet_initialized` 不满足时不跳转测试。
- 设备管理页面生命周期刷新测试。
- 锁定设备不自动调用 `DeviceSettingsGet` 的测试。
- 解锁设备读取 settings 的测试。
- 静态 DeviceInfo 缓存与失效测试。
- 各 Pro2 设置写入后重新读取真实值的测试。
- About 页面 Protocol V2 字段展示测试。

## 非目标

- 不兼容旧 Pro2 onboarding stage 协议。
- 不改动非 Pro2 设备的 onboarding 和设备管理流程。
- 不在设备管理页增加持续轮询。
- 不用 App 本地乐观状态代替设备最终状态。
