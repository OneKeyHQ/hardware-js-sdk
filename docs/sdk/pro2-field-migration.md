# Pro2 Protocol V2 字段迁移与职责拆分

## 1. 文档目的

本文完整说明 OneKey Pro 2 在 Protocol V2 中如何重新组织设备字段，以及 Hardware JS SDK Core 如何读取、转换和对外提供这些字段。

这次调整不是简单地把旧字段改名，而是把过去集中在一次初始化结果中的内容，按照实际用途拆成多组消息：

1. 设备基本信息：型号、序列号、主控固件、蓝牙芯片、安全芯片等相对稳定的信息。
2. 设备实时状态：是否初始化、是否解锁、是否需要备份、Passphrase 和 Attach-to-PIN 状态。
3. 用户设置：语言、设备名称、蓝牙开关、亮度、锁屏时间、振动反馈等可配置内容。
4. 钱包会话：当前打开的是哪个钱包、钱包 Session 是否可以恢复、PIN 解锁结果。
5. 设备操作与固件管理：重启、设备证书、固件安装目标和安装状态。
6. 生产制造信息：生产时间、工厂测试、老化测试、工厂序列号等生产阶段数据。
7. SDK 字段转换：SDK 将 Protocol V1/V2 响应转换为统一 `DeviceState`，协议原始结构只在 Core 内部保留。

本文可以独立阅读，是仓库内 Pro2 字段迁移和 SDK 归一化的唯一事实源，也可直接同步到 Confluence。

## 2. 一句话结论

Pro 2 不再使用一份不断扩张的设备信息对象承载所有数据，而是按照“基本信息、实时状态、用户设置、钱包会话、设备操作、生产制造”分别提供消息；SDK 在内部聚合协议差异，对外只提供统一 `DeviceState` 读取/刷新接口和对应的业务操作 API。

## 3. 为什么要拆分

Protocol V1 常通过 `Initialize -> Features` 一次返回大量信息。这个方式使用方便，但随着设备能力增加，会出现几个问题：

- 设备型号和固件版本很少变化，解锁状态和备份状态却会频繁变化，二者不适合使用同一个刷新周期。
- label、语言、亮度等是用户设置，不是设备身份。
- 钱包 Session 代表当前钱包上下文，不代表物理设备本身。
- 固件安装进度是一次任务的状态，不是设备长期属性。
- 工厂测试和生产记录具有不同的权限边界，不应出现在普通设备详情中。
- 每新增一个字段都塞进 `Features`，会让固件、SDK 和 App 之间的兼容成本持续增加。

Protocol V2 因此按字段用途、变化频率和安全边界进行拆分。

## 4. 拆分后的整体结构

可以把旧的集中式设备信息理解成被拆成以下七部分：

| 分类               | Protocol V2 消息                                        | 主要内容                                      | 推荐读取方式                                       |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| 设备基本信息       | `DeviceInfoGet -> DeviceInfo`                           | 型号、序列号、主控、蓝牙芯片、SE 芯片及版本   | `getDeviceState({ scope: 'firmware' })`            |
| 设备实时状态       | `DeviceStatusGet -> DeviceStatus`                       | 初始化、解锁、备份、Passphrase、Attach-to-PIN | `getDeviceState()`                                 |
| 用户设置           | `DeviceSettingsGet/Set/PageShow`                        | label、语言、蓝牙、亮度、锁屏、振动等         | `getDeviceState({ scope: 'settings' })` / 高层 API |
| 钱包会话恢复       | `DeviceSessionGet -> DeviceSession`                     | 按 `session_id` 恢复已有钱包会话              | Core 内部钱包 Session 管理                         |
| 钱包会话创建       | `DeviceSessionAskPin/AskPassphrase -> DeviceSession`    | 验证并原子返回主钱包或隐藏钱包会话            | 受保护方法与钱包选择流程                           |
| 设备操作与固件管理 | `DeviceReboot`、`DeviceCertificate*`、`DeviceFirmware*` | 重启、证书、固件安装                          | 对应专用 API 和升级流程                            |
| 生产制造信息       | `DeviceFactoryInfo*`、`DeviceFactoryTest` 等            | 生产时间、工厂测试、永久锁                    | 生产制造专用 API                                   |

字段流转关系可以简化为：

```text
Protocol V2 protobuf
    ├── DeviceInfo ─────────────────> DeviceState identity / versions / verification
    ├── DeviceStatus ───────────────> DeviceState status
    ├── DeviceSettings ─────────────> DeviceState identity / settings
    ├── DeviceSession ──────────────> Core 钱包 Session 缓存（不进入公共 DeviceState）
    ├── DeviceFirmware ─────────────> 固件升级流程
    └── DeviceFactory ──────────────> 生产制造专用 API
```

## 5. 设备基本信息

### 5.1 消息结构

设备基本信息通过以下请求读取：

```text
DeviceInfoGet -> DeviceInfo
```

`DeviceInfo` 的结构如下：

```text
DeviceInfo
├── protocol_version       协议版本
├── hw                     硬件型号、序列号和硬件版本
├── fw                     主控各阶段镜像信息
├── coprocessor            蓝牙/协处理器信息
├── se1、se2、se3、se4     安全芯片信息
```

`DeviceInfo` 不再承担实时状态读取。历史 `targets.status` 将被协议删除，SDK 不构造该字段。

### 5.2 硬件信息

| Protocol V2 字段              | 含义                | SDK 当前处理                             |
| ----------------------------- | ------------------- | ---------------------------------------- |
| `hw.Device_type`              | 设备型号            | SDK 按协议枚举识别 Pro 2、Neo 等真实型号 |
| `hw.serial_no`                | 设备序列号          | 转换为 `DeviceState.identity.serialNo`   |
| `hw.hardware_version`         | 可读硬件版本        | 保留在原始 Protocol V2 数据中            |
| `hw.hardware_version_raw_adc` | 硬件版本 ADC 原始值 | 保留在原始数据中                         |

序列号和设备 ID 是两个不同概念：

- 序列号来自 `hw.serial_no`。
- 设备 ID 来自 `DeviceStatus.device_id`。
- SDK 不允许使用序列号为设备 ID 兜底。

### 5.3 主控固件信息

| Protocol V2 字段      | 含义                         | SDK 当前处理                                |
| --------------------- | ---------------------------- | ------------------------------------------- |
| `fw.romloader`        | romloader 镜像信息           | 映射到历史兼容字段 `boardVersion`           |
| `fw.bootloader`       | bootloader 镜像信息          | `bootloaderVersion` 和 bootloader 校验信息  |
| `fw.application`      | 主应用镜像信息               | `firmwareVersion` 和固件校验信息            |
| `fw.application_data` | P2/application data 镜像信息 | 当前保留在原始数据中，尚无独立 Feature 字段 |

每个镜像都可以包含：

| 字段       | 用途               |
| ---------- | ------------------ |
| `version`  | 版本展示和升级判断 |
| `build_id` | 定位具体构建       |
| `hash`     | 镜像完整性校验     |

这里的 SDK `boardVersion` 是历史 boardloader 命名留下的兼容字段，当前对应 `romloader.version`；它不等价于 `hw.hardware_version`。`application_data` 是独立的 P2 数据包，不能映射为 `boardVersion`。

### 5.4 蓝牙与协处理器信息

| Protocol V2 字段          | 含义                | SDK 当前处理                          |
| ------------------------- | ------------------- | ------------------------------------- |
| `coprocessor.bootloader`  | 协处理器 bootloader | 保留在原始数据中                      |
| `coprocessor.application` | 协处理器/蓝牙应用   | 转换为 `bleVersion`                   |
| `coprocessor.bt_adv_name` | 蓝牙广播名称        | 转换为 `DeviceState.identity.bleName` |
| `coprocessor.bt_mac`      | 蓝牙 MAC 地址       | 保留在原始数据中                      |

蓝牙广播名称和蓝牙开关是两个不同字段：

- 广播名称来自 `DeviceInfo.coprocessor.bt_adv_name`。
- 蓝牙是否启用来自 `DeviceSettings.bt_enable`。

### 5.5 安全芯片信息

Pro 2 最多提供 `se1` 至 `se4` 四组安全芯片信息。每组可以包含：

| Protocol V2 字段 | 含义                               | SDK 当前处理                                             |
| ---------------- | ---------------------------------- | -------------------------------------------------------- |
| `application`    | SE 应用版本、build ID、hash        | 转换为 `se01Version` 至 `se04Version` 及校验字段         |
| `bootloader`     | SE bootloader 版本、build ID、hash | 转换为 `se01BootVersion` 至 `se04BootVersion` 及校验字段 |
| `type`           | SE 芯片类型                        | 保留在原始数据中，Core 提供枚举解析 helper               |
| `state`          | SE 当前运行状态                    | 保留在原始数据中，Core 提供枚举解析 helper               |

### 5.6 查询范围

`DeviceInfoGet` 不是每次都返回全部内容。请求由两组参数控制：

- `targets`：要读取哪些静态组件，例如 `hw`、`fw`、`coprocessor`、`se1` 至 `se4`。
- `types`：镜像信息需要包含 `version`、`build_id`、`hash` 还是组件特有信息 `specific`。

SDK 当前使用的典型范围：

| 场景        | 读取内容                                           | 原因                                         |
| ----------- | -------------------------------------------------- | -------------------------------------------- |
| 初始化      | hw、fw、coprocessor；version、specific             | 建立静态信息，结合 ProtocolInfo 识别运行阶段 |
| 轻量刷新    | hw、fw、coprocessor；version、specific             | 刷新静态信息，不隐式读取状态                 |
| versions    | hw、fw、coprocessor、se1 至 se4；version、specific | 展示所有组件版本                             |
| verify/full | 所有 target；version、build_id、hash、specific     | 设备完整校验                                 |

## 6. 设备实时状态

运行状态由独立的 `DeviceStatusGet` 提供：

```text
DeviceStatusGet -> DeviceStatus
```

`DeviceInfoGet.targets.status` 是即将从底层协议删除的历史字段，SDK 业务流程不再构造或公开它。
初始化先读取 `ProtocolInfo`：`build_fingerprint` 的 binary 段识别 application、bootloader 或
romloader，`supported_messages` 判断 `DeviceStatusGet` 是否可调用。application 在声明支持时
读取运行状态；bootloader/romloader 直接返回可用的身份和版本快照，绝不发送
`DeviceStatusGet`。每次公共 `getDeviceState()` 也遵循同一规则。

### 6.1 字段映射

| Protocol V2 字段            | 含义                       | SDK 字段                                  |
| --------------------------- | -------------------------- | ----------------------------------------- |
| `device_id`                 | 钱包初始化生命周期 ID      | `DeviceState.identity.deviceId`           |
| `unlocked`                  | 设备是否解锁               | `DeviceState.status.unlocked`             |
| `init_states`               | 设备是否完成初始化         | `DeviceState.status.initialized`          |
| `backup_required`           | 是否需要备份               | `DeviceState.status.backupRequired`       |
| `passphrase_enabled`        | 是否启用 Passphrase 保护   | `DeviceState.status.passphraseProtection` |
| `attach_to_pin_enabled`     | 是否启用 Attach-to-PIN     | `DeviceState.status.attachToPinEnabled`   |
| `unlocked_by_attach_to_pin` | 当前是否由 Attach PIN 解锁 | `DeviceState.status.unlockedAttachPin`    |

`DeviceState.protocol` 表示 SDK 协议族（`V1`/`V2`），根级
`DeviceState.protocolVersion` 则保留设备消息中的 `protocol_version`。两者含义不同，
例如 Pro 2 可以同时返回 `protocol: 'V2'` 与 `protocolVersion: 1`。

### 6.2 状态字段可能为空

`passphrase_enabled`、`attach_to_pin_enabled` 和 `unlocked_by_attach_to_pin` 在 protobuf 中属于解锁后可用的私有状态。

因此：

- 字段为空不能直接解释为 `false`。
- 设备锁定时，调用方必须允许这些字段缺失。
- SDK 更新缓存时应按字段合并，不能因为一次轻量响应缺字段就清空之前的全部信息。

### 6.3 Onboarding 状态

设备初始化过程的具体步骤没有塞进 `DeviceStatus`，而是使用独立消息：

```text
OnboardingStatusGet -> OnboardingStatus
```

返回内容：

- `step`：当前 onboarding 粗粒度步骤。
- `phase`：步骤内的当前页面阶段。
- `setup`：创建或恢复类型及所选备份介质。
- `pin_set`：是否已设置 PIN。
- `wallet_initialized`：钱包是否已完成初始化。

`DeviceStatus.init_states` 只表示最终是否初始化完成，不能替代 onboarding 的详细阶段。

## 7. 用户设置

用户设置通过以下消息处理：

```text
DeviceSettingsGet      读取设置
DeviceSettingsSet      修改可以直接写入的设置
DeviceSettingsPageShow 打开必须在设备端确认的设置页面
```

### 7.1 设置字段

| 分类       | Protocol V2 字段              | 说明                         |
| ---------- | ----------------------------- | ---------------------------- |
| 设备展示   | `label`                       | 设备名称                     |
| 设备展示   | `device_name_display_enabled` | 首页是否显示型号和蓝牙标识   |
| 连接       | `bt_enable`                   | 蓝牙是否启用                 |
| 本地化     | `language`                    | 完整 BCP-47 语言标识         |
| 外观       | `wallpaper_path`              | 设备侧壁纸文件路径           |
| 外观       | `brightness`                  | 屏幕亮度                     |
| 外观       | `animation_enable`            | 动画是否启用                 |
| 唤醒与反馈 | `tap_to_wake`                 | 轻触唤醒                     |
| 唤醒与反馈 | `haptic_feedback`             | 触觉反馈                     |
| 电源与锁定 | `autolock_delay_ms`           | 自动锁屏时间                 |
| 电源与锁定 | `autoshutdown_delay_ms`       | 自动关机时间                 |
| 电源与锁定 | `usb_lock_enable`             | USB 锁定设置                 |
| 安全输入   | `random_keypad`               | PIN 键盘是否随机排列         |
| 能力开关   | `fido_enabled`                | FIDO 功能开关                |
| 设备端确认 | `passphrase_enable`           | 可读取，修改必须在设备端确认 |
| 设备端确认 | `airgap_mode`                 | 可读取，修改必须在设备端确认 |

`autolock_delay_ms` 与 `autoshutdown_delay_ms` 的“永不”值在 Protocol V1/V2 中均为
`0x10000000`（`268435456`）。应用应从
`getDeviceSettingsCapabilities(deviceType, 'V2')` 获取可选值。

Protocol V2 固件使用完整 BCP-47 语言标识；Core 对外保持与 Protocol V1
及 `getLanguageConfig()` 一致的公共语言代码。已存在的公共代码（例如
`en`、`zh_cn`、`pt_br`）在写入时转换为 BCP-47，读取到
`en-Latn-US`、`zh-Hans-CN`、`pt-Latn-BR` 时再转换回公共代码。
仅 Pro2 支持且没有历史公共代码的语言继续使用完整 BCP-47 标识。

### 7.2 直接修改与设备端确认

公共调用方只使用统一 `deviceSettings`。Core 内部通过 `DeviceSettingsSet`
执行可直接修改的部分字段更新。

`passphrase_enable` 和 `airgap_mode` 不能通过 `DeviceSettingsSet` 直接修改。
Core 会根据 `deviceSettings` 的目标布尔值读取当前状态，必要时通过
`DeviceSettingsPageShow` 打开相应设备页面，并在用户确认后再次读取状态校验结果。

可打开的页面包括：

| 页面               | 用途            |
| ------------------ | --------------- |
| `DeviceReset`      | 擦除设备确认    |
| `DevicePinChange`  | 修改 PIN        |
| `DevicePassphrase` | Passphrase 设置 |
| `DeviceAirgap`     | Air Gap 设置    |

底层成功响应只表示页面已经打开；公共 `deviceSettings` 只有在读取确认目标状态后才成功返回。

### 7.3 为什么这些字段不进入 DeviceInfo

label、语言、蓝牙开关、自动锁屏和振动反馈都属于用户配置，不属于设备型号、序列号或固件版本。

所以：

- `DeviceInfo` 不提供这些字段是设计结果，不是字段遗漏。
- `getDeviceState({ scope: 'settings' })` 和成功的高层设置操作都会把字段归一化合并到 `DeviceState`。
- 设备详情页只消费 `DeviceState`；外部接入方不直接调用原始 `DeviceSettingsGet`。

## 8. 钱包会话

钱包会话通过以下消息建立或恢复：

```text
DeviceSessionAskPassphrase({ seed_domains }) -> Success -> DeviceSessionGet() -> DeviceSession
DeviceSessionAskPin(Main/AttachToPin) -> Success -> DeviceSessionGet() -> DeviceSession
DeviceSessionAskPin(AttachToPin) -> Success
  -> DeviceSessionAskPassphrase({ passphrase: '', on_device: false, seed_domains: [Standard, Cardano] })
  -> Success -> DeviceSessionGet() -> DeviceSession
DeviceSessionGet({ session_id, btc_test_address }) -> DeviceSession
```

### 8.1 字段说明

| Protocol V2 字段/消息                     | 含义                             | SDK 当前处理                                                                                                                                                                        |
| ----------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeviceSessionGet.session_id`             | 尝试恢复之前的钱包 Session       | Core 内部传入当前钱包缓存值                                                                                                                                                         |
| `DeviceSessionGet.btc_test_address`       | 请求恢复的预期钱包身份           | 从内部 `passphraseState` 映射，和缓存 Session 一起发送                                                                                                                              |
| `DeviceSessionAskPassphrase.seed_domains` | 本次需要生成的种子域             | 开钱包 / 非 Cardano 为 `[Standard]`；Cardano 为 `[Standard, Cardano]`。Get 不携带该字段。Attach PIN 补 Cardano 发送空 Host passphrase。`DeviceSession` 响应用同一枚举回报已生成的域 |
| `DeviceSessionPinType`                    | `Any/Main/AttachToPin` PIN 路由  | 标准钱包固定 `Main`，Attach 选择固定对应类型                                                                                                                                        |
| `DeviceSessionAskPassphrase`              | 创建 Passphrase 隐藏钱包会话     | Host：`{ passphrase, on_device: false, seed_domains }`；设备：`{ on_device: true, seed_domains }`                                                                                   |
| 响应 `session_id`                         | 当前钱包 Session ID              | 保存到当前钱包缓存                                                                                                                                                                  |
| 响应 `DeviceSession.btc_test_address`     | 用于确认当前钱包上下文的稳定标识 | 映射为内部 `passphraseState`                                                                                                                                                        |

这里的 `btc_test_address` 用于确认当前打开的是不是预期钱包，不用于用户资产地址展示。

### 8.2 Session 恢复流程

```text
读取当前隐藏钱包缓存 session_id
    -> DeviceSessionGet({ session_id, btc_test_address })
    -> 返回 DeviceSession
    -> 校验 btc_test_address 是否符合预期钱包
```

如果缓存 Session 无效：

1. 固件可能返回 `DeviceSessionError_InvalidSession=2`，也可能返回最终实际 Session。
2. Core 清除失效句柄，或发现返回的 `btc_test_address` 与预期不一致。
3. Pro2 的公开 `openWalletSession({ mode: 'resume-hidden' })` 在同一次调用中重新完成
   PIN/Passphrase/Attach PIN 选择，并再次校验 `passphraseState`；最终不匹配才失败。
4. SDK 内部要求无交互的签名重试仍使用严格恢复，失效时直接返回
   `WalletSessionInvalid`，不会弹出钱包选择。

`DeviceSessionGet` 的成功响应必须同时携带非空 `session_id` 和
`btc_test_address`。缺少任一字段都视为协议响应不完整，Core 不会把它降级解释为标准钱包。

标准钱包不读取其他钱包的 Session Store 项；它只读取内部标准索引，必要时协商 eventless 模式并
发送 `DeviceSessionAskPin(Main)`。公共响应中的标准钱包 `passphraseState` 固定为 `null`，
隐藏钱包返回设备生成的 `passphraseState`；调用方必须以 `walletType` 判断钱包类型。
SDK 不注册可调用的原始 Session API，接入方不能通过低层 `call()` 绕过公共钱包流程。

App 不得直接调用原始 Session 请求。现有 App 可继续调用公共
`getPassphraseState()`，Core 会在 Pro2 上映射到新协议；新代码优先使用
`openWalletSession()` 的 `standard/select-hidden/resume-hidden` 显式表达意图。
`openWalletSession()` 必须显式传入 `mode`，且不接受旧的
`useEmptyPassphrase/initSession` 参数。旧调用继续通过 `getPassphraseState()` 兼容。

## 9. PIN 解锁结果

PIN 解锁使用：

```text
DeviceSessionAskPin -> DeviceSession -> DeviceStatusGet -> DeviceStatus
```

| `DeviceStatus` 字段         | SDK 字段                                  | 含义                         |
| --------------------------- | ----------------------------------------- | ---------------------------- |
| `unlocked`                  | `DeviceState.status.unlocked`             | 解锁是否成功                 |
| `unlocked_by_attach_to_pin` | `DeviceState.status.unlockedAttachPin`    | 是否通过 Attach PIN 解锁     |
| `passphrase_enabled`        | `DeviceState.status.passphraseProtection` | 解锁后确认的 Passphrase 状态 |

`DeviceSession` 表示设备端解锁及钱包会话创建完成；Core 随后读取 `DeviceStatus`，不从会话响应猜测设备设置状态。

## 10. 设备操作与固件管理

### 10.1 重启

`DeviceReboot.reboot_type` 支持：

| 值           | 目标       |
| ------------ | ---------- |
| `Normal`     | 正常应用   |
| `Romloader`  | romloader  |
| `Bootloader` | bootloader |

重启命令只负责切换运行阶段。重连后需要重新读取 `DeviceInfo`，不能沿用重启前的运行状态。

### 10.2 设备证书

| 消息                     | 用途                     |
| ------------------------ | ------------------------ |
| `DeviceCertificateWrite` | 写入证书、公钥和只写私钥 |
| `DeviceCertificateRead`  | 读取证书和公钥材料       |
| `DeviceCertificateSign`  | 使用设备证书能力签名数据 |

证书私钥只能写入、不能读回，也不应进入设备详情、`DeviceState` 或日志。

### 10.3 固件升级

固件升级不再用一个简单的“当前固件字段”表示，而是分为组件信息和安装任务两部分：

- 当前已经安装的版本：重新读取 `DeviceInfo`。
- 本次安装任务的状态：读取 `DeviceFirmwareUpdateStatus`。

主要结构：

| 消息或结构                      | 字段                                                                               | 用途                     |
| ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| `DeviceFirmwareTarget`          | `target_id`、`path`                                                                | 指定组件和设备侧固件路径 |
| `DeviceFirmwareUpdateStage`     | `targets[]`                                                                        | 暂存一组安装目标         |
| `DeviceFirmwareUpdateRequest`   | `reboot_after_update`                                                              | 触发已暂存目标的安装     |
| `DeviceFirmwareUpdateRecord`    | `target_id`、`status`、`progress_percent`、`phase_info`、`payload_version`、`path` | 保存每个组件的安装记录   |
| `DeviceFirmwareUpdateStatusGet` | `fields`                                                                           | 选择需要返回的记录字段   |
| `DeviceFirmwareUpdateStatus`    | `records[]`                                                                        | 返回所有安装记录         |

支持的安装目标包括 crate、romloader、bootloader、application P1、application P2、coprocessor、SE01、SE02、SE03 和 SE04。

SDK 内部原始 `deviceFirmwareUpdate` 只发送安装请求，不进入公共 `CoreApi`。完整升级流程还需要负责：

1. 校验升级包。
2. 将固件文件分块写入设备。
3. 选择安装目标。
4. 触发安装。
5. 轮询安装状态。
6. 处理安装期间断连和重连。
7. 重连后重新读取 `DeviceInfo` 确认最终版本。

## 11. 生产制造信息

生产制造信息使用独立消息，不与普通设备信息混合：

```text
DeviceFactoryInfoGet -> DeviceFactoryInfo
DeviceFactoryInfoSet -> Success
```

### 11.1 当前字段

| Protocol V2 字段         | 含义                         |
| ------------------------ | ---------------------------- |
| `version`                | 工厂数据结构版本             |
| `serial_number`          | 生产制造流程中的序列号记录   |
| `burn_in_completed`      | 是否完成老化测试             |
| `factory_test_completed` | 是否完成工厂功能测试         |
| `manufacture_time`       | 生产时间，拆分为年月日时分秒 |

### 11.2 相比旧结构的变化

| 旧内容               | 当前处理                                            |
| -------------------- | --------------------------------------------------- |
| CPU 描述字符串       | 已移除                                              |
| SPI Flash 描述字符串 | 已移除                                              |
| SE 描述字符串        | 已移除，普通 SE 版本改由 `DeviceInfo.se1..se4` 提供 |
| pre-firmware 描述    | 已移除                                              |
| NFT voucher          | 当前 `DeviceFactoryInfo` 不再提供                   |

其他生产操作包括：

- `DeviceFactoryPermanentLock`：执行永久锁定，要求两个固定校验值，降低误操作风险。
- `DeviceFactoryTest`：选择完整老化测试或功能测试。

即使工厂序列号与普通设备序列号值相同，SDK 也不能在两者之间静默兜底，因为它们具有不同的读取和写入权限。

## 12. SDK 如何转换字段

SDK 对外只有一条统一设备状态路径。

### 12.1 初始化设备

```text
DeviceInfoGet
    -> Protocol V2 Mapper
    -> DeviceStateStore
```

用途：建立基础设备身份和版本快照，不隐式读取实时状态。

### 12.2 获取统一设备状态

```text
getDeviceState()
    -> scope 省略时默认为 runtime
    -> normal 模式刷新 DeviceStatus；loader 模式跳过
    -> 返回完整 DeviceState（不含 raw 和钱包 session）

getDeviceState({ scope: 'settings' | 'firmware' })
    -> 在运行状态基础上按业务范围刷新设置或固件信息
    -> 合并到 DeviceStateStore
    -> 返回完整 DeviceState
```

`scope` 表示“本次主动刷新哪些分区”，不是返回字段过滤器。即使使用默认的 `runtime`，返回结果仍是完整的公共 `DeviceState` 快照，而不是只有 `status`；未在本次刷新的分区使用 `DeviceStateStore` 中已经归一化的当前值。

用途：设备详情、版本展示、设置页和运行状态读取。Protocol V1/V2 返回相同结构。

### 12.3 SDK 内部原始命令

```text
DeviceInfoGet / DeviceStatusGet / DeviceSettingsGet
    -> Mapper
    -> DeviceStateStore
```

这些命令仅供 SDK 内部流程使用，不属于公共 API。外部接入方不需要选择原始命令、请求范围或缓存策略。

## 13. 进入统一 DeviceState 的字段

| Protocol V2 来源                   | 标准 SDK 字段                 |
| ---------------------------------- | ----------------------------- |
| `protocol_version`                 | `protocol` / 内部 raw         |
| `hw.serial_no`                     | `identity.serialNo`           |
| `fw.application.version`           | `versions.firmware`           |
| `fw.bootloader.version`            | `versions.bootloader`         |
| `fw.romloader.version`             | `versions.board`              |
| `coprocessor.application.version`  | `versions.ble`                |
| `coprocessor.bt_adv_name`          | `identity.bleName`            |
| `se1..se4.application.version`     | `versions.se01..se04`         |
| `se1..se4.bootloader.version`      | `versions.se01Boot..se04Boot` |
| `status.device_id`                 | `identity.deviceId`           |
| `status.init_states`               | `status.initialized`          |
| `status.unlocked`                  | `status.unlocked`             |
| `status.backup_required`           | `status.backupRequired`       |
| `status.passphrase_enabled`        | `status.passphraseProtection` |
| `status.attach_to_pin_enabled`     | `status.attachToPinEnabled`   |
| `status.unlocked_by_attach_to_pin` | `status.unlockedAttachPin`    |

build ID 和 hash 只在 `getDeviceState({ scope: 'firmware' })` 中请求，并进入 `DeviceState.verification`。

## 14. 专用来源及其 DeviceState 投影

下面这些字段仍由专用消息读写，但跨设备通用字段会合并进标准 `DeviceState`：

| 内容            | Protocol V2 来源                       | 标准投影/管理方式              |
| --------------- | -------------------------------------- | ------------------------------ |
| label           | `DeviceSettings.label`                 | `identity.label/displayName`   |
| language        | `DeviceSettings.language`              | `settings.language`            |
| 蓝牙开关        | `DeviceSettings.bt_enable`             | `settings.bleEnabled`          |
| 自动锁屏        | `DeviceSettings.autolock_delay_ms`     | `settings.autoLockDelayMs`     |
| 自动关机        | `DeviceSettings.autoshutdown_delay_ms` | `settings.autoShutdownDelayMs` |
| 触觉反馈        | `DeviceSettings.haptic_feedback`       | `settings.hapticFeedback`      |
| 钱包 Session ID | `DeviceSession.session_id`             | Core 钱包 Session 管理         |
| 钱包标识        | `DeviceSession.btc_test_address`       | 内部 `passphraseState`         |
| 固件安装记录    | `DeviceFirmwareUpdateStatus`           | 固件升级 API                   |
| 生产制造信息    | `DeviceFactoryInfo`                    | 生产制造专用 API               |

设备详情页读取统一 `DeviceState`，不直接依赖原始 snake_case 设置结构；这些字段仍不应被重复塞回 `DeviceInfo`。

## 15. 当前缺失的 DeviceState 字段

必须把“已有独立来源但不合并”和“DeviceState 仍缺字段或稳定来源”区分开。

| 标准字段或能力                        | 当前 Protocol V2 情况                             | SDK 当前处理与需要修改的内容                           |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| 显式运行模式                          | `ProtocolInfo.build_fingerprint` 提供 binary 名称 | SDK 映射为 normal/bootloader/romloader                 |
| `applicationDataVersion/BuildId/Hash` | 已提供 `fw.application_data`                      | 当前只在内部 raw 中；如 App 需要，应新增明确的标准字段 |
| `safetyChecks`                        | DeviceInfo、DeviceStatus、DeviceSettings 均无来源 | 当前保持 `null`，需要固件提供读取来源                  |
| `batteryLevel`                        | 当前 Protocol V2 没有来源                         | 无可靠值，不能用于 Pro 2 升级前低电量拦截              |
| `noBackup` 等 V1 细分状态             | 当前只提供 `backup_required`                      | 不从一个布尔值推导其他状态；需要协议增加明确字段       |

当前 SDK 不再从 `DeviceInfo` 镜像结构猜测主控运行模式。标准 fingerprint 格式为
`<binary>__<version>__<commit>__<PROD|DEV>__<DEBUG|RELEASE>`，其中 binary 只接受
`application`、`bootloader`、`romloader`。fingerprint 无法识别时，只有
`supported_messages` 明确包含 `DeviceStatusGet` 才允许作为旧固件兼容路径读取状态；两者都
无法确认时初始化安全失败。版本刷新不得覆盖已经由 runtime 或 onboarding 确认的
`notInitialized/backupMode`。

## 16. 完整迁移矩阵

| 过去的集中式语义         | Protocol V2 当前位置                     | SDK 当前处理           | 变化类型               |
| ------------------------ | ---------------------------------------- | ---------------------- | ---------------------- |
| 设备型号                 | `DeviceInfo.hw.Device_type`              | 固定识别为 Pro 2       | 移动                   |
| 设备序列号               | `DeviceInfo.hw.serial_no`                | `serialNo`             | 移动                   |
| 设备 ID                  | `DeviceStatus.device_id`                 | `deviceId`             | 从硬件信息拆到实时状态 |
| 主应用版本               | `DeviceInfo.fw.application`              | `firmwareVersion`      | 结构化                 |
| bootloader 版本          | `DeviceInfo.fw.bootloader`               | `bootloaderVersion`    | 结构化                 |
| P2/application data      | `DeviceInfo.fw.application_data`         | 当前仅保留在 raw       | 新增独立组件           |
| romloader 版本           | `DeviceInfo.fw.romloader`                | `boardVersion`         | 旧 boardloader 重命名  |
| 蓝牙固件版本             | `DeviceInfo.coprocessor.application`     | `bleVersion`           | 移动                   |
| 蓝牙广播名               | `DeviceInfo.coprocessor.bt_adv_name`     | `bleName`              | 移动                   |
| 蓝牙开关                 | `DeviceSettings.bt_enable`               | 专用设置 API           | 从信息拆到设置         |
| SE1 至 SE4 版本          | `DeviceInfo.se1..se4`                    | 标准 SE 版本和校验字段 | 结构化                 |
| 初始化状态               | `DeviceStatus.init_states`               | `initialized`          | 移动并改名             |
| 解锁状态                 | `DeviceStatus.unlocked`                  | `unlocked`             | 移动                   |
| 备份状态                 | `DeviceStatus.backup_required`           | `backupRequired`       | 移动并改名             |
| Passphrase 是否启用      | `DeviceStatus.passphrase_enabled`        | `passphraseProtection` | 移动并改名             |
| Attach-to-PIN 是否启用   | `DeviceStatus.attach_to_pin_enabled`     | `attachToPinEnabled`   | 移动并改名             |
| Attach PIN 解锁来源      | `DeviceStatus.unlocked_by_attach_to_pin` | `unlockedAttachPin`    | 移动并改名             |
| label                    | `DeviceSettings.label`                   | 专用设置 API           | 从信息拆到设置         |
| language                 | `DeviceSettings.language`                | 专用设置 API           | 从状态拆到设置         |
| 自动锁屏、自动关机、振动 | `DeviceSettings`                         | 专用设置 API           | 独立设置               |
| 钱包 Session             | `DeviceSession.session_id`               | Core Session 缓存      | 从初始化拆到钱包会话   |
| 钱包标识                 | `DeviceSession.btc_test_address`         | `passphraseState`      | 独立钱包语义           |
| PIN 解锁结果             | `Success + DeviceStatus`                 | 合并回标准状态缓存     | 操作后刷新             |
| 固件安装目标和进度       | `DeviceFirmware*`                        | 高层升级流程           | 独立任务状态           |
| 工厂生产记录             | `DeviceFactoryInfo`                      | 生产制造专用 API       | 与普通设备信息隔离     |

## 17. 重要使用原则

### 17.1 不要把所有字段重新塞回 DeviceInfo

如果字段已经有明确来源，例如 `DeviceSettings` 或 `DeviceSession`，应该通过对应 API 获取。为了兼容旧 `Features` 把字段重复加入 `DeviceInfo`，会再次制造多份数据来源。

### 17.2 不要把空值当成 false

Protocol V2 大量字段是 optional。字段缺失可能表示：

- 本次请求没有选择对应 target 或 type。
- 当前运行阶段不提供该字段。
- 设备锁定，私有状态不可见。
- 组件不存在或当前无法读取。

只有字段明确返回 `false` 时，才能解释为关闭或未启用。

### 17.3 不要使用不相关字段兜底

典型禁止项：

- 不能用 `serial_no` 代替 `device_id`。
- 不能用工厂序列号代替普通设备序列号。
- 不能用 `DeviceSettings.passphrase_enable` 随意覆盖实时 `DeviceStatus.passphrase_enabled`。
- 不能用固件升级记录中的 `payload_version` 代替重连后实际读取的组件版本。

### 17.4 原始消息只在 SDK 内部保留

标准 `DeviceState` 用于跨设备统一能力；原始 `protocolV2DeviceInfo` 只保存在 SDK 内部 raw 分区。公共 `getDeviceState()` 不返回 raw；`includeRaw` 仅供 Core 内部 V1 兼容投影使用。

新增字段时需要明确选择：

1. 是否需要进入跨设备标准字段。
2. 是否只进入 Pro 2 原始数据。
3. 是否应该使用专用 API。
4. 是否涉及新的权限或锁定状态。

## 18. 新字段的接入流程

新增或迁移 Pro 2 字段时，建议按以下步骤执行：

1. 根据字段用途选择 protobuf 文件。
   - 静态硬件和组件版本：`messages_device_info.proto`。
   - 动态运行状态：`messages_device_status.proto`。
   - 钱包上下文：`messages_device_session.proto`。
   - 设置、重启、证书和固件操作：`messages_device_control.proto`。
   - 生产制造信息：`messages_device_factory.proto`。
2. 更新 firmware-pro2 protobuf 和对应 `.options`。
3. 运行 `yarn update-protobuf` 更新生成 schema 和 TypeScript 类型。
4. 检查 hd-transport 是否正确编码和解码新字段。
5. 决定 Core 的输出方式：标准 `DeviceState` 字段、内部 raw 或业务操作 API。
6. 如果进入缓存，定义轻量查询缺字段时的合并规则。
7. 如果字段在锁定状态下不可见，明确 `undefined/null/false` 的区别。
8. 增加 Core 和 Transport 测试。
9. 更新字段迁移文档和应用侧使用说明。

不能只在 SDK 中手写一个尚未进入 protobuf 的字段。TypeScript 即使能够编译，设备实际响应仍不会包含该字段。

## 19. 维护检查清单

protobuf 或 SDK 映射变化后，至少检查以下项目：

- [ ] firmware-pro2 `latest` proto 中的消息名、字段名和字段编号已经确认。
- [ ] `.options` 中的字符串长度、bytes 长度和 repeated 数量限制没有遗漏。
- [ ] `packages/hd-transport/messages-protocol-v2.json` 已更新。
- [ ] `packages/core/src/data/messages/messages-protocol-v2.json` 已更新。
- [ ] 初始化、轻量刷新、versions、verify/full 的请求范围符合新字段用途。
- [ ] `DeviceStateMapper` 的字段映射和 `DeviceStateStore` 的字段级合并正确。
- [ ] identity、versions、verification、status 和 settings 分区语义正确。
- [ ] 原始读取命令没有重新暴露为第二套公共状态 API。
- [ ] 锁定状态和 loader 阶段的字段缺失行为已经覆盖。
- [ ] 文档中的“已有独立 API”和“当前缺失的 Feature 字段”没有混写。

## 20. 代码事实来源

本文结论基于以下代码位置：

```text
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_info.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_status.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_session.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_control.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_factory.proto

packages/hd-transport/messages-protocol-v2.json
packages/core/src/data/messages/messages-protocol-v2.json
packages/core/src/protocols/protocol-v2/features.ts
packages/core/src/protocols/protocol-v2/walletSession.ts
packages/core/src/deviceProfile/buildDeviceFeatures.ts
packages/core/src/device/DeviceStateMapper.ts
packages/core/src/device/DeviceStateStore.ts
packages/core/src/device/DeviceStateProjector.ts
packages/core/src/api/protocol-v2/
```

## 21. 最终结论

Pro 2 Protocol V2 的字段迁移可以概括为三个原则：

1. 按用途拆分：设备基本信息、实时状态、用户设置、钱包会话、设备操作和生产制造信息分别管理。
2. 统一转换：SDK 把跨设备通用的身份、版本、状态和设置转换为唯一 `DeviceState`。
3. 单一来源：原始消息只负责生成 patch，不在 `DeviceInfo`、`DeviceStatus` 和 App 模型之间重复保存同一份事实。

理解这三个原则后，判断一个新字段应该放在哪里会比较直接：先判断它描述的是“设备是什么”“设备现在怎么样”“用户配置了什么”“当前打开哪个钱包”“要设备执行什么操作”，还是“生产阶段记录了什么”，再选择对应的 Protocol V2 消息和 SDK 输出方式。
