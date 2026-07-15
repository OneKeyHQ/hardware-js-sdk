# Pro 2 Protocol V2 字段迁移与职责拆分完整总结

## 1. 文档目的

本文完整说明 OneKey Pro 2 在 Protocol V2 中如何重新组织设备字段，以及 Hardware JS SDK Core 如何读取、转换和对外提供这些字段。

这次调整不是简单地把旧字段改名，而是把过去集中在一次初始化结果中的内容，按照实际用途拆成多组消息：

1. 设备基本信息：型号、序列号、主控固件、蓝牙芯片、安全芯片等相对稳定的信息。
2. 设备实时状态：是否初始化、是否解锁、是否需要备份、Passphrase 和 Attach-to-PIN 状态。
3. 用户设置：语言、设备名称、蓝牙开关、亮度、锁屏时间、振动反馈等可配置内容。
4. 钱包会话：当前打开的是哪个钱包、钱包 Session 是否可以恢复、PIN 解锁结果。
5. 设备操作与固件管理：重启、设备证书、固件安装目标和安装状态。
6. 生产制造信息：生产时间、工厂测试、老化测试、工厂序列号等生产阶段数据。
7. SDK 字段转换：SDK 将部分 Protocol V2 字段转换为公共 `Features` 和 `DeviceProfile`，其他字段保留独立 API。

本文可以独立阅读，不需要预先了解仓库内其他文档。

## 2. 一句话结论

Pro 2 不再使用一份不断扩张的设备信息对象承载所有数据，而是按照“基本信息、实时状态、用户设置、钱包会话、设备操作、生产制造”分别提供消息；SDK 只把通用的身份、版本和状态转换为公共设备模型，其余内容通过专用 API 获取。

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

| 分类               | Protocol V2 消息                                        | 主要内容                                      | 推荐读取方式                           |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| 设备基本信息       | `DeviceInfoGet -> DeviceInfo`                           | 型号、序列号、主控、蓝牙芯片、SE 芯片及版本   | 初始化或 `getDeviceInfo`               |
| 设备实时状态       | `DeviceStatusGet -> DeviceStatus`                       | 初始化、解锁、备份、Passphrase、Attach-to-PIN | 初始化时随 DeviceInfo 获取，或单独刷新 |
| 用户设置           | `DeviceSettingsGet/Set/PageShow`                        | label、语言、蓝牙、亮度、锁屏、振动等         | 设置专用 API                           |
| 钱包会话           | `DeviceSessionGet -> DeviceSession`                     | `session_id`、钱包标识                        | Core 内部钱包 Session 管理             |
| PIN 解锁结果       | `DeviceSessionAskPin -> DeviceSessionPinResult`         | 解锁结果及安全状态                            | 受保护方法的解锁流程                   |
| 设备操作与固件管理 | `DeviceReboot`、`DeviceCertificate*`、`DeviceFirmware*` | 重启、证书、固件安装                          | 对应专用 API 和升级流程                |
| 生产制造信息       | `DeviceFactoryInfo*`、`DeviceFactoryTest` 等            | 生产时间、工厂测试、永久锁                    | 生产制造专用 API                       |

字段流转关系可以简化为：

```text
Protocol V2 protobuf
    ├── DeviceInfo + DeviceStatus ──> SDK Features / DeviceProfile
    ├── DeviceSession ──────────────> SDK 钱包 Session 缓存
    ├── DeviceSettings ─────────────> 设置专用 API
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
└── status                 可选的设备状态快照
```

### 5.2 硬件信息

| Protocol V2 字段              | 含义                | SDK 当前处理                                           |
| ----------------------------- | ------------------- | ------------------------------------------------------ |
| `hw.Device_type`              | 设备型号            | SDK 当前识别为 Pro 2                                   |
| `hw.serial_no`                | 设备序列号          | 转换为 `Features.serialNo` 和 `DeviceProfile.serialNo` |
| `hw.hardware_version`         | 可读硬件版本        | 保留在原始 Protocol V2 数据中                          |
| `hw.hardware_version_raw_adc` | 硬件版本 ADC 原始值 | 保留在原始数据中                                       |

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

| Protocol V2 字段          | 含义                | SDK 当前处理              |
| ------------------------- | ------------------- | ------------------------- |
| `coprocessor.bootloader`  | 协处理器 bootloader | 保留在原始数据中          |
| `coprocessor.application` | 协处理器/蓝牙应用   | 转换为 `bleVersion`       |
| `coprocessor.bt_adv_name` | 蓝牙广播名称        | 转换为 `Features.bleName` |
| `coprocessor.bt_mac`      | 蓝牙 MAC 地址       | 保留在原始数据中          |

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

- `targets`：要读取哪些组件，例如 `hw`、`fw`、`coprocessor`、`se1` 至 `se4`、`status`。
- `types`：镜像信息需要包含 `version`、`build_id`、`hash` 还是组件特有信息 `specific`。

SDK 当前使用的典型范围：

| 场景        | 读取内容                                                   | 原因                                |
| ----------- | ---------------------------------------------------------- | ----------------------------------- |
| 初始化      | hw、fw、coprocessor、status；version、specific             | 建立基础 Features                   |
| 轻量刷新    | hw、coprocessor、status；version、specific                 | 刷新状态，不重复读取全部 SE 和 hash |
| versions    | hw、fw、coprocessor、se1 至 se4、status；version、specific | 展示所有组件版本                    |
| verify/full | 所有 target；version、build_id、hash、specific             | 设备完整校验                        |

## 6. 设备实时状态

设备实时状态通过以下两种方式获取：

```text
DeviceInfoGet(targets.status=true) -> DeviceInfo.status
DeviceStatusGet -> DeviceStatus
```

前者适合初始化时顺带获取状态，后者适合快速刷新。

### 6.1 字段映射

| Protocol V2 字段            | 含义                       | SDK 字段                        |
| --------------------------- | -------------------------- | ------------------------------- |
| `device_id`                 | 设备唯一 ID                | `Features.deviceId`             |
| `unlocked`                  | 设备是否解锁               | `Features.unlocked`             |
| `init_states`               | 设备是否完成初始化         | `Features.initialized`          |
| `backup_required`           | 是否需要备份               | `Features.backupRequired`       |
| `passphrase_enabled`        | 是否启用 Passphrase 保护   | `Features.passphraseProtection` |
| `attach_to_pin_enabled`     | 是否启用 Attach-to-PIN     | `Features.attachToPinEnabled`   |
| `unlocked_by_attach_to_pin` | 当前是否由 Attach PIN 解锁 | `Features.unlockedAttachPin`    |

### 6.2 状态字段可能为空

`passphrase_enabled`、`attach_to_pin_enabled` 和 `unlocked_by_attach_to_pin` 在 protobuf 中属于解锁后可用的私有状态。

因此：

- 字段为空不能直接解释为 `false`。
- 设备锁定时，调用方必须允许这些字段缺失。
- SDK 更新缓存时应按字段合并，不能因为一次轻量响应缺字段就清空之前的全部信息。

### 6.3 Onboarding 状态

设备初始化过程的具体步骤没有塞进 `DeviceStatus`，而是使用独立消息：

```text
DevGetOnboardingStatus -> DevOnboardingStatus
```

返回内容：

- `stage`：当前初始化阶段。
- `status_code`：阶段状态码。
- `detail_code`：更具体的状态或错误码。

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
| 能力开关   | `experimental_features`       | 实验功能开关                 |
| 设备端确认 | `passphrase_enable`           | 可读取，修改必须在设备端确认 |
| 设备端确认 | `airgap_mode`                 | 可读取，修改必须在设备端确认 |

### 7.2 直接修改与设备端确认

`DeviceSettingsSet` 支持部分字段更新，不要求每次提交完整设置。

但是 `passphrase_enable` 和 `airgap_mode` 不能通过 `DeviceSettingsSet` 直接修改。App 只能使用 `DeviceSettingsPageShow` 打开相应设备页面，由用户在设备上确认。

可打开的页面包括：

| 页面               | 用途            |
| ------------------ | --------------- |
| `DeviceReset`      | 擦除设备确认    |
| `DevicePinChange`  | 修改 PIN        |
| `DevicePassphrase` | Passphrase 设置 |
| `DeviceAirgap`     | Air Gap 设置    |

成功响应只表示页面已经打开，不表示用户最终启用、关闭或完成了操作。

### 7.3 为什么这些字段不进入 DeviceInfo

label、语言、蓝牙开关、自动锁屏和振动反馈都属于用户配置，不属于设备型号、序列号或固件版本。

所以：

- `DeviceInfo` 不提供这些字段是设计结果，不是字段遗漏。
- 当前标准 V2 `Features` 和 `DeviceProfile` 也不会自动合并这些设置。
- 设备详情页需要展示设置时，应调用 `deviceSettingsGet`。

## 8. 钱包会话

钱包会话通过以下消息建立或恢复：

```text
DeviceSessionGet(session_id?) -> DeviceSession
```

### 8.1 字段说明

| Protocol V2 字段   | 含义                             | SDK 当前处理                 |
| ------------------ | -------------------------------- | ---------------------------- |
| 请求 `session_id`  | 尝试恢复之前的钱包 Session       | Core 内部传入缓存值          |
| 响应 `session_id`  | 当前钱包 Session ID              | 保存到当前钱包缓存           |
| `btc_test_address` | 用于确认当前钱包上下文的稳定标识 | 映射为内部 `passphraseState` |

这里的 `btc_test_address` 用于确认当前打开的是不是预期钱包，不用于用户资产地址展示。

### 8.2 Session 恢复流程

```text
读取缓存 session_id
    -> DeviceSessionGet(session_id?)
    -> 必要时进行 PassphraseRequest / PassphraseAck
    -> 返回 DeviceSession
    -> 校验 btc_test_address 是否符合预期钱包
```

如果缓存 Session 无效：

1. 设备返回 `Failure_InvalidSession`。
2. Core 清除当前钱包的 Session 缓存。
3. Core 使用空 Session 再尝试一次。
4. 不允许无限重试。

公开的 `deviceSessionGet` 当前发送空请求，主要用于协议调试；它不替代 Core 内部的 Session 恢复和钱包标识校验。

## 9. PIN 解锁结果

PIN 解锁使用：

```text
DeviceSessionAskPin -> DeviceSessionPinResult
```

| 返回字段                | SDK 字段                        | 含义                         |
| ----------------------- | ------------------------------- | ---------------------------- |
| `unlocked`              | `Features.unlocked`             | 解锁是否成功                 |
| `unlocked_attach_pin`   | `Features.unlockedAttachPin`    | 是否通过 Attach PIN 解锁     |
| `passphrase_protection` | `Features.passphraseProtection` | 解锁后确认的 Passphrase 状态 |

PIN 解锁结果是一次操作的返回值，`DeviceStatus` 是之后可以重新读取的设备状态。Core 会先合并解锁结果，并可继续刷新 `DeviceStatus` 进行确认。

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

证书私钥只能写入、不能读回，也不应进入设备详情、标准 Features 或日志。

### 10.3 固件升级

固件升级不再用一个简单的“当前固件字段”表示，而是分为组件信息和安装任务两部分：

- 当前已经安装的版本：重新读取 `DeviceInfo`。
- 本次安装任务的状态：读取 `DeviceFirmwareUpdateStatus`。

主要结构：

| 消息或结构                      | 字段                                             | 用途                     |
| ------------------------------- | ------------------------------------------------ | ------------------------ |
| `DeviceFirmwareTarget`          | `target_id`、`path`                              | 指定组件和设备侧固件路径 |
| `DeviceFirmwareUpdateRequest`   | `targets[]`                                      | 提交一组安装目标         |
| `DeviceFirmwareUpdateRecord`    | `target_id`、`status`、`payload_version`、`path` | 保存每个组件的安装记录   |
| `DeviceFirmwareUpdateStatusGet` | `fields`                                         | 选择需要返回的记录字段   |
| `DeviceFirmwareUpdateStatus`    | `records[]`                                      | 返回所有安装记录         |

支持的安装目标包括 crate、romloader、bootloader、application P1、application P2、coprocessor、SE01、SE02、SE03 和 SE04。

SDK 原始 `deviceFirmwareUpdate` 只发送安装请求。完整升级流程还需要负责：

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

SDK 存在三条不同的设备信息路径。

### 12.1 初始化设备

```text
DeviceInfoGet
    -> buildProtocolV2FeaturesPayload
    -> Device 内部标准 Features 缓存
```

用途：建立基础设备身份、版本和实时状态。

### 12.2 获取标准设备详情

```text
getDeviceInfo(scope)
    -> 按 scope 请求 DeviceInfo
    -> buildDeviceProfile
    -> 返回 DeviceProfile
```

用途：设备详情、版本展示和固件校验。

### 12.3 获取原始 Protocol V2 数据

```text
deviceInfoGet(targets, types)
    -> 返回原始 DeviceInfo
```

用途：协议调试和专用查询。该方法不构建 Profile，也不更新标准 Features 缓存。

三条路径虽然最终都可能调用 `DeviceInfoGet`，但请求范围、返回结构和缓存副作用不同，不能合并理解成同一个 API。

## 13. 进入标准 Features 和 DeviceProfile 的字段

| Protocol V2 来源                   | 标准 SDK 字段                      |
| ---------------------------------- | ---------------------------------- |
| `protocol_version`                 | `protocolVersion`                  |
| `hw.serial_no`                     | `serialNo`                         |
| `fw.application.version`           | `firmwareVersion`                  |
| `fw.bootloader.version`            | `bootloaderVersion`                |
| `fw.romloader.version`             | `boardVersion`                     |
| `coprocessor.application.version`  | `bleVersion`                       |
| `coprocessor.bt_adv_name`          | `bleName`                          |
| `se1..se4.application.version`     | `se01Version..se04Version`         |
| `se1..se4.bootloader.version`      | `se01BootVersion..se04BootVersion` |
| `status.device_id`                 | `deviceId`                         |
| `status.init_states`               | `initialized`                      |
| `status.unlocked`                  | `unlocked`                         |
| `status.backup_required`           | `backupRequired`                   |
| `status.passphrase_enabled`        | `passphraseProtection`             |
| `status.attach_to_pin_enabled`     | `attachToPinEnabled`               |
| `status.unlocked_by_attach_to_pin` | `unlockedAttachPin`                |

build ID 和 hash 只在 verify/full 查询中请求，并进入 SDK 的校验信息结构。

## 14. 已有独立来源，但不进入标准 Features 的字段

下面这些字段不是协议缺失，只是 SDK 要求调用专用 API：

| 内容            | Protocol V2 来源                       | 获取方式               |
| --------------- | -------------------------------------- | ---------------------- |
| label           | `DeviceSettings.label`                 | `deviceSettingsGet`    |
| language        | `DeviceSettings.language`              | `deviceSettingsGet`    |
| 蓝牙开关        | `DeviceSettings.bt_enable`             | `deviceSettingsGet`    |
| 自动锁屏        | `DeviceSettings.autolock_delay_ms`     | `deviceSettingsGet`    |
| 自动关机        | `DeviceSettings.autoshutdown_delay_ms` | `deviceSettingsGet`    |
| 触觉反馈        | `DeviceSettings.haptic_feedback`       | `deviceSettingsGet`    |
| 钱包 Session ID | `DeviceSession.session_id`             | Core 钱包 Session 管理 |
| 钱包标识        | `DeviceSession.btc_test_address`       | 内部 `passphraseState` |
| 固件安装记录    | `DeviceFirmwareUpdateStatus`           | 固件升级 API           |
| 生产制造信息    | `DeviceFactoryInfo`                    | 生产制造专用 API       |

设备详情页需要这些内容时，应组合调用对应 API，而不是要求 `DeviceInfo` 重复返回。

## 15. 当前缺失的 Feature 字段

必须把“已有独立 API 但不合并”和“Feature 仍缺字段或稳定来源”区分开。

| Feature 字段或能力                    | 当前 Protocol V2 情况                             | SDK 当前处理与需要修改的内容                                  |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| 显式运行模式                          | 没有 normal/bootloader/romloader 字段             | SDK 暂按响应结构区分；后续应由固件增加明确字段                |
| `applicationDataVersion/BuildId/Hash` | 已提供 `fw.application_data`                      | 当前只在 raw 中；如 App 需要，应新增独立 Feature/Profile 字段 |
| `safetyChecks`                        | DeviceInfo、DeviceStatus、DeviceSettings 均无来源 | 当前保持 `null`，需要固件提供读取来源                         |
| `batteryLevel`                        | 当前 Protocol V2 没有来源                         | Feature 无可靠值，不能用于 Pro 2 升级前低电量拦截             |
| `noBackup` 等 V1 细分状态             | 当前只提供 `backup_required`                      | 不从一个布尔值推导其他状态；需要协议增加明确字段              |

当前 SDK 的兼容判断规则是：正常应用在请求 status 时会返回 `DeviceInfo.status`；romloader 当前只返回 hw、`fw.romloader` 和 `fw.bootloader`；其他不带 status 的 loader 响应按 bootloader 处理。该规则依赖当前返回结构，不是固件正式字段契约。

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
| PIN 解锁结果             | `DeviceSessionPinResult`                 | 合并回标准状态缓存     | 操作结果回写           |
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

### 17.4 原始消息和标准模型同时保留

标准 `Features` 和 `DeviceProfile` 用于跨设备统一能力；原始 `protocolV2DeviceInfo` 用于保留 Pro 2 专属结构。

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
5. 决定 Core 的输出方式：标准 Features、DeviceProfile、raw 或专用 API。
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
- [ ] `buildProtocolV2FeaturesPayload` 的字段映射和缓存合并正确。
- [ ] `buildDeviceProfile` 的版本、状态和校验字段映射正确。
- [ ] 专用 API 没有被错误地合并进标准 Features。
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
packages/core/src/deviceProfile/buildDeviceProfile.ts
packages/core/src/api/protocol-v2/
```

## 21. 最终结论

Pro 2 Protocol V2 的字段迁移可以概括为三个原则：

1. 按用途拆分：设备基本信息、实时状态、用户设置、钱包会话、设备操作和生产制造信息分别管理。
2. 有限转换：SDK 只把跨设备通用的身份、版本和状态转换为标准 `Features` 与 `DeviceProfile`。
3. 单一来源：已有专用消息的字段通过专用 API 获取，不在 `DeviceInfo`、`DeviceStatus` 和 `Features` 之间重复保存同一份事实。

理解这三个原则后，判断一个新字段应该放在哪里会比较直接：先判断它描述的是“设备是什么”“设备现在怎么样”“用户配置了什么”“当前打开哪个钱包”“要设备执行什么操作”，还是“生产阶段记录了什么”，再选择对应的 Protocol V2 消息和 SDK 输出方式。
