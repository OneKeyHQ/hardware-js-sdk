# SDK Core 运行时与 Protocol V2 适配

> 文档类型：核心机制
> 适用读者：Core、Transport 与 App 硬件接入维护者
> 内容状态：兼容迁移中
> 代码范围：`packages/core`
> 最后代码核验：2026-07-30
> 前置阅读：[SDK 架构概览](../architecture/overview.md)

本页描述“协议消息如何进入 SDK 公共能力”，不重复壁纸、设备设置、固件升级等完整用户流程。

Pro2 的字段迁移、拆分和 Feature 缺口见 [Pro2 字段迁移](./pro2-field-migration.md)。传输帧、协议探测和 USB/BLE 实现见 [Protocol V1/V2 传输协议](../protocol/protocol-v1-v2.md)。

## 适配层级

```mermaid
flowchart TD
  Proto["Protocol V2 protobuf"] --> Commands["DeviceCommands.typedCall"]
  Commands --> Adapter["Core 状态/能力 adapter"]
  Adapter --> API["公共 SDK API"]
  API --> Business["业务流程与 UI 事件"]
```

## 设备信息与 DeviceState

V2 不支持传统 `GetFeatures`。Core 在初始化时发送默认范围的 `DeviceInfoGet`，再读取
`ProtocolInfo` 判断当前运行的是 application、bootloader 还是 romloader，并把结果映射进
Device 内唯一的 `DeviceState`。只有 application 且 `supported_messages` 声明支持时才读取
`DeviceStatus`。外部无需理解 `DeviceProfile` 或 V2 原始消息。

| 调用                                    | 语义                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| 初始化 adapter                          | 请求基础设备信息与协议运行阶段；按能力读取实时状态，并更新唯一 DeviceState 缓存 |
| `getDeviceState()`                      | 默认刷新运行状态并返回 V1/V2 统一的完整 `DeviceState` 快照                      |
| `getDeviceState({ scope: 'settings' })` | 刷新运行状态和设置                                                              |
| `getDeviceState({ scope: 'firmware' })` | 刷新运行状态、身份、完整版本与校验信息                                          |

`scope` 是可选参数；省略时等价于 `scope: 'runtime'`。这里的 scope 只决定本次读取需要主动刷新的数据分区，不裁剪返回值：三种 scope 最终都会返回完整的公共 `DeviceState` 快照。`runtime` 在 Protocol V1 刷新 `GetFeatures`，在 Protocol V2 normal 模式刷新 `DeviceStatusGet`；bootloader / romloader 模式会跳过不支持的状态命令并返回当前可用快照。

原始 `DeviceSettingsGet` 不属于公共 API，只供 SDK 内部 `getDeviceState({ scope: 'settings' })`
流程使用；Pro2 Debug 的状态诊断只保留 `deviceInfoGet` 与 `deviceStatusGet`。

### 状态消费与兼容 Selector 边界

外部业务层以 `getDeviceState()` 和 `DEVICE.STATE` 为统一入口。Protocol V1 的
`getFeatures()` 只用于旧接入兼容；外部不调用
`buildProtocolV1FeaturesPayload/buildProtocolV2FeaturesPayload`，也不直接消费
Transport protobuf 类型。

Core 包根保留以下设备信息 selector，供仍持有兼容 `Features` 的调用方渐进迁移：

| API / 字段                             | 当前语义                                        | 兼容状态                                                |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `getDeviceSerialNo()`                  | 读取稳定的物理设备序列号                        | 规范名称                                                |
| `getFirmwareType()`                    | 读取 Universal / Bitcoin-only 固件类型          | 保留原名                                                |
| `getDeviceFirmwareVersion()`           | 读取主固件版本                                  | 规范名称                                                |
| `getDeviceBootloaderVersion()`         | 读取 bootloader 版本                            | 规范名称                                                |
| `getDeviceBLEFirmwareVersion()`        | 读取 BLE / coprocessor 固件版本                 | 保留原名和大写 `BLE`                                    |
| `getDeviceBoardloaderVersion()`        | 读取 board / romloader 版本                     | 保留历史拼写，不增加 `getDeviceBoardVersion`            |
| `KnownDevice.serialNo`                 | 初始化后的稳定物理设备身份                      | 规范字段                                                |
| `KnownDevice.status`                   | 当前 transport 使用状态                         | `available` / `used` / `occupied`，供连接状态展示       |
| `SearchDevice.serialNo`                | 已初始化设备的序列号；未连接的 BLE 扫描结果为空 | 规范字段                                                |
| `getDeviceUUID()` / `KnownDevice.uuid` | 初始化后与 `serialNo` 相同                      | 废弃兼容；新业务不再使用                                |
| `SearchDevice.uuid`                    | 历史混合字段；BLE 扫描时可能是 Transport UUID   | 废弃兼容；路由使用 `connectId`，硬件身份使用 `serialNo` |

为兼容业务侧已有的手写 mock 和持久化旧对象，`serialNo` 在当前 TypeScript
类型中暂时可选；当前 SDK 返回的 `KnownDevice` 一定带字符串值，`SearchDevice`
一定带字符串或 `null`。未连接的 BLE 扫描结果只知道 Transport UUID/MAC，
因此 `serialNo` 为 `null`，后续连接路由继续使用 `connectId`。

selector 的运行时兼容层可读取当前规范化 `Features` 和旧 Protocol V1 `Features`；
`DeviceFeaturesInput` 与旧字段解析不作为包根公共类型导出，业务层不负责协议归一化。

Core 内持有 `Device` 的业务流程使用 Device getter，避免把当前设备状态与另一个
`Features` 快照混在同一次判断中；处理离线快照、Release 配置或兼容投影的纯函数使用上述
selector。

## 状态与 PIN 解锁

- `DeviceInfoGet` 默认不请求 status target；初始化流程在读取 `ProtocolInfo` 后独立决定是否发送
  `DeviceStatusGet`。
- 每次公共 `getDeviceState()` 读取都会在 normal 模式刷新 `DeviceStatus`，调用方不需要管理缓存刷新参数。
- `build_fingerprint` 的 binary 段只用于识别 application、bootloader、romloader 运行阶段；
  `supported_messages` 才是消息能力来源，不能用版本号、commit 或 PROD/DEV 信息推导能力。
- bootloader / romloader 模式不会发送 `DeviceStatusGet`。
- Core 内部使用互斥的 `isBootloader()` / `isRomloader()` 判断；兼容字段
  `bootloaderMode` 只表示广义 loader，不能用于区分两种模式。romloader 固件升级直接使用当前
  连接，不发送 `DeviceReboot(Bootloader)`。
- `isRomloader()` 和上述直升行为仅适用于 Pro2 + Protocol V2。Pro Protocol V1 的历史
  boardloader 保持原有流程，不与 romloader 互转。
- 公共 `DeviceState` 与 `DEVICE.STATE` 不包含协议 raw 数据或钱包 `session_id`；两者只在 Core 内部用于 V1 兼容和会话恢复。
- V2 PIN 解锁使用 `DeviceSessionAskPin -> Success`，随后刷新 `DeviceStatus`；需要钱包 Session 时再调用 `DeviceSessionGet`。
- 需要钱包 Session 的方法由 `useDevicePassphraseState` 自动进入调用前解锁；非钱包管理方法可显式
  使用 `unlock-before-run`。两者都在 Wallet Session、Safety Check 和业务 I/O 前读取 fresh
  Status，先校验目标设备身份再按需解锁；业务阶段的 `DeviceLocked` 直接失败，Core 与 Transport
  都不重放业务请求。

## 统一设置与 DeviceState 更新

公共 `deviceSettings` 是 OneKey V1/V2 的协议无关写入入口。Core 根据协议选择
`ApplySettings` 或 `DeviceSettingsSet`，成功后把已确认参数合并进唯一的 DeviceState 缓存。
原始 V2 `DeviceSettingsGet/Set` 与 `DeviceSettingsPageShow` 只作为 SDK 内部命令保留，不生成 `CoreApi` 便捷方法。

设置能力按当前协议源定义：

| 能力范围   | 公共参数                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| V1/V2 共有 | `label`、`language`、`usePassphrase`、`autoLockDelayMs`、`autoShutdownDelayMs`、`hapticFeedback`、`bluetoothEnabled`                        |
| 仅 V1      | `homescreen`、`passphraseSource`、`displayRotation`、`passphraseAlwaysOnDevice`、`safetyChecks`、`experimentalFeatures`、`changeBrightness` |
| 仅 V2      | `brightness`、`airgapMode`、`animationEnabled`、`tapToWake`、`deviceNameDisplayEnabled`、`fidoEnabled`、`usbLockEnabled`、`randomKeypad`    |

`bluetoothEnabled` 在 V1/V2 分别映射为 `use_ble` / `bt_enable`。当前 Protocol V2
protobuf 没有 `experimental_features`，所以该参数只支持 V1。请求包含当前协议不支持的字段时，
Core 会在发送任何命令前返回参数错误，避免同一请求中的其他字段被部分应用。

`getDeviceSettingsCapabilities(deviceType, protocol)` 是字段、语言、时长选项、数值范围和设备端确认
要求的单一公共来源；调用方必须传入已通过设备响应确认的协议，不能从 PID 或设备名推断。
Protocol V2 的自动锁屏和自动关机使用 `0x10000000` 表示“永不”，Protocol V1 仍使用 `0`。
`safetyChecks` 在公共写入参数、`DeviceState` 和事件中统一使用数值枚举
`Strict=0`、`PromptAlways=1`、`PromptTemporarily=2`。

每次实际状态变化都会发送 `DEVICE.STATE`。宿主应用应监听该事件并持久化完整状态，
不需要为 label、language、auto-lock 等字段分别维护手工数据库 patch。Protocol V1 额外发送
兼容事件 `DEVICE.FEATURES`；Protocol V2 不发送该事件。Protocol V2 设置写入成功后会强制刷新
`status` 与 `settings`，状态只以设备读回结果为准，对应事件来源为 `device-status` 和
`settings-read`；不会再用请求参数生成 `settings-write` patch。App 在设置页进入或重新聚焦时仍可
显式调用 `getDeviceState({ scope: 'settings' })`，用于发现设备端或其他客户端产生的外部变化。

详见 [钱包 Session 与设备安全](../device/wallet-session-and-security.md) 和 [SDK 关键架构决策](../architecture/decisions.md#受保护方法的调用前解锁)。

## 钱包 Session

公共钱包 Session API 按协议明确分层：

| 公共 API               | 语义                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `getPassphraseState()` | 现有 App 跨协议兼容入口；V1 保持旧流程，V2 由 Core 映射到 Ask/Get 流程 |
| `openWalletSession()`  | Protocol V1/V2 统一钱包入口；支持标准、隐藏、Attach-to-PIN 与显式恢复  |
| `clearSessionCache()`  | 仅清除 `DeviceWalletSessionStore`，不发送设备协议命令                  |
| 原始 Session 请求      | `DeviceSessionAskPin/AskPassphrase/Get` 仅供 Core 内部编排             |

当前没有“只读查询设备当前打开哪个钱包”的公共需求，因此不提供
原始钱包 Session 查询接口。`getDeviceState()` 只返回 Passphrase、Attach PIN 等设备功能和运行状态，
不返回钱包身份。App 在 `openWalletSession()` 成功后保存返回的
`deviceId + walletType + passphraseState`；固件响应中的 `session_id` 只写入 Core 内部
`DeviceWalletSessionStore`，不通过公共响应导出。

Core 先把公共钱包意图归一化，再映射到各协议：

```text
标准钱包
  -> V1: PassphraseRequest 自动回复空字符串
  -> V2 首次/状态错配: 协商 eventless；AskPin(Main) -> Success -> DeviceSessionGet()
  -> V2 已解锁且缓存有效: 协商 eventless；DeviceSessionGet(session_id) -> DeviceSession

隐藏钱包 / Attach-to-PIN
  -> V1: GetPassphraseState -> PassphraseRequest / PassphraseAck
  -> V2: REQUEST_PASSPHRASE 选择 -> AskPassphrase 或 AskPin(AttachToPin)
         -> Success -> DeviceStatusGet -> DeviceSessionGet()

恢复隐藏钱包
  -> V1: 先用无钱包绑定字段的 Initialize 校验实时 deviceId，
         再按 passphraseState 校验并复用兼容 Session
  -> V2: DeviceSessionGet({ session_id })
```

显式调用只使用 `mode` 表达意图，不能再混入旧参数：

| `mode`          | 可携带的钱包绑定             | 行为             |
| --------------- | ---------------------------- | ---------------- |
| `standard`      | 无                           | 打开标准钱包     |
| `select-hidden` | 无                           | 重新选择隐藏钱包 |
| `resume-hidden` | `deviceId + passphraseState` | 恢复指定隐藏钱包 |

为了支持 App 按设备分流的调试迁移，未传 `mode` 时保留旧参数归一化，优先级如下：

1. `useEmptyPassphrase=true`：进入 `standard`，优先于其他旧字段。
2. 否则 `initSession=true`：进入 `select-hidden`；如果同时提供旧
   `passphraseState`，Core 只使当前设备上该钱包的旧 Session 失效。
3. 否则完整提供 `deviceId + passphraseState`：进入 `resume-hidden`。
4. 否则没有钱包绑定：进入 `select-hidden`；绑定字段不完整则返回参数错误。

`useEmptyPassphrase=false` 和 `initSession=false` 不会单独选择模式。显式 `mode` 与
`useEmptyPassphrase/initSession` 混用，或给 `standard/select-hidden` 携带钱包绑定，
都会返回 `CallMethodInvalidParameter`，避免同一请求存在两个流程意图。

`openWalletSession()` 的成功结果以 `walletType` 作为判别字段：

| `walletType` | `passphraseState` | 含义                             |
| ------------ | ----------------- | -------------------------------- |
| `standard`   | `null`            | 使用设备默认空 Passphrase 上下文 |
| `hidden`     | 非空字符串        | 设备返回隐藏钱包标识             |

Pro2 标准钱包仍使用硬件 `DeviceSession` 中的 `btc_test_address` 建立内部索引，但不会把该内部
指纹暴露给 App。隐藏钱包的公共 `passphraseState` 直接来自同一次硬件响应；Core 不从 Features、
descriptor 或 Store 补造钱包标识。跨协议钱包类型只看 `walletType`。
Pro2 需要解锁时，钱包类型以解锁完成并刷新后的设备状态为准，不使用解锁前的
`passphraseProtection` 快照。

参数校验失败也遵循 Core 的统一响应结构，不以 rejected Promise 暴露裸异常。例如
`resume-hidden` 缺少 `deviceId` 时返回：

```json
{
  "success": false,
  "payload": {
    "error": "Missing required parameter: deviceId",
    "code": "CallMethodInvalidParameter"
  }
}
```

`openWalletSession({ mode: 'resume-hidden' })` 在 Protocol V1/V2 都只接收
`deviceId + passphraseState`。Core 按该 key 从唯一 Store 读取内部 `sessionId`：
V1 通过 `Initialize.session_id` 恢复，V2 通过 `DeviceSessionGet({ session_id })` 恢复。
V1 缓存不存在时返回 `HardwareErrorCode.WalletSessionInvalid`。V2 缓存不存在、固件拒绝缓存
Session 或返回钱包指纹不匹配时，Core 清理对应句柄并在同一次公开调用中重新选择目标钱包；只有
最终 `passphraseState` 与业务绑定一致才成功。
`DeviceSessionGet` 成功时必须同时返回非空
`session_id + btc_test_address`，否则 Core 将其视为不完整响应，而不是标准钱包。

标准钱包不要求 App 提供钱包绑定。Core 在同一个 Store 中维护
`deviceKey -> { passphraseState, sessionId }` 标准钱包内部索引：首次或设备已锁定时通过
`DeviceSessionAskPin(Main)` 获取标准 Session；设备已解锁且索引有效时通过
`DeviceSessionGet(session_id)` 复用。缓存失效会在同一次明确的标准钱包调用中重建；返回地址与
缓存地址不一致时则执行一次 `AskPin(Main) -> Get()` 重建；最终地址仍不一致才清除标准索引并
终止业务。以上操作都不会清除同设备的隐藏钱包记录。

`clearSessionCache()` 对 V1 和 V2 执行相同的 Core 本地操作：

- 没有参数时清除全部设备和钱包的缓存。
- 只传 `deviceId` 时清除该设备的全部钱包缓存。
- 同时传 `deviceId + passphraseState` 时只清除指定钱包缓存。
- 单独传 `passphraseState` 时返回 `CallMethodInvalidParameter`，不会退化成全局清理。
- 不修改 `DeviceState` 或协议 raw 快照，也不执行 Lock、Cancel 或设备端 Session Close。

V1 被清理的是由 `Initialize/Features` 或 `GetPassphraseState` 获得的本地 `session_id`
映射；V2 被清理的是由 `DeviceSessionGet` 返回的本地 `session_id` 映射。下次打开钱包时，
Core 会重新执行对应协议的钱包 Session 建立或恢复流程。

Protocol V1 的业务调用同时提供 `deviceId` 与钱包绑定时，Core 先发送不含
`session_id/passphrase_state` 的 `Initialize` 获取实时设备身份；只有实时 `deviceId`
与调用方一致，才会发送第二次 `Initialize` 复用该钱包的缓存 Session。身份不一致时立即返回
`DeviceCheckDeviceIdError`，不会把旧设备或旧初始化生命周期的 Session 发给当前硬件。
所有接收 `deviceId` 的钱包业务方法都应在业务命令前启用同一身份检查。

新 App 在“打开/切换钱包”阶段优先调用 `openWalletSession()`；已有 V1/V2 集成可以继续使用
兼容 `getPassphraseState()`。地址、签名和 `preInitialize` 仍沿用原来的
`passphraseState` / `useEmptyPassphrase` 参数，不应在每条业务指令前重复打开 Session。
因此 App 的钱包 key 无需加入 `sessionId`；V1/V2 的 `sessionId` 都由 Core 统一按
`deviceId + passphraseState` 管理。

### App Passphrase 接入约定

已经使用 Pro V1 `getPassphraseState()` 通讯流程的 App 接入 Pro2 时，公共调用方式和业务数据
模型保持不变：

```ts
const result = await HardwareSDK.getPassphraseState({
  connectId,
  deviceId,
});

if (result.success) {
  const { passphraseState } = result.payload;
  // 仍以 deviceId + passphraseState 作为钱包引用。
}
```

App 不应按型号或 PID 自行选择协议，也不应直接发送
`DeviceSessionAskPin/DeviceSessionAskPassphrase/DeviceSessionGet`。Core 会在完成设备响应探测后
自动分流：

| App 意图               | Pro V1 固件流程                         | Pro2 Protocol V2 固件流程                                           |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| 标准钱包               | 空 Passphrase 兼容流程                  | AskPin(Main) -> Success -> Get()，或 Get(标准 Session)              |
| Host Passphrase 钱包   | `GetPassphraseState -> PassphraseState` | AskPassphrase({ on_device: false, passphrase }) -> Success -> Get() |
| 设备端 Passphrase 钱包 | `GetPassphraseState -> PassphraseState` | AskPassphrase({ on_device: true }) -> Success -> Get()              |
| Attach-to-PIN          | `GetPassphraseState -> PassphraseState` | AskPin(AttachToPin) -> Success -> Get()                             |
| 恢复已选隐藏钱包       | Core 管理 V1 Session 复用               | `DeviceSessionGet({ session_id })`                                  |

Pro2 Protocol V2 的 `DeviceSessionAskPassphrase.on_device` 是必填字段。Host 输入必须同时携带
非空 `passphrase` 和 `on_device: false`；设备输入只携带 `on_device: true`。Attach-to-PIN 不复用
空 Passphrase 请求，始终使用 `DeviceSessionAskPin(AttachToPin)`。

对 App 的最小回归检查是：

1. Pro V1 的标准钱包、隐藏钱包和 Attach-to-PIN 流程保持原行为。
2. Pro2 能通过同一 `getPassphraseState()` 入口打开隐藏钱包，并返回非空
   `passphraseState`。
3. 后续地址和签名调用继续传入该 `passphraseState`，不持久化、打印或作为
   钱包主键使用 `sessionId`。
4. 切换钱包、断开重连和 Session 失效后，不会把一个
   `deviceId + passphraseState` 的 Session 路由到另一个钱包。

新集成建议用 `openWalletSession({ mode })` 显式表达意图，但这是渐进式迁移，不是
Pro2 接入的强制前置条件。

`openWalletSession()` 的标准/隐藏钱包结果都不包含固件 `sessionId`。Legacy
`Features.session_id/sessionId` 的公共投影保持为空；旧版 CLI 已存在的受控 OS Keychain
记录仍可通过兼容入口预加载，但不会再从新的公共钱包响应创建记录。

详见 [钱包 Session 与设备安全](../device/wallet-session-and-security.md) 和 [SDK 关键架构决策](../architecture/decisions.md#钱包-session-所有权与缓存键)。

## 文件能力

原始文件、目录、路径、权限修复和格式化方法都不属于公共 `CoreApi`。App 应调用受控业务
接口，例如 `uploadPortfolio`、`deviceUploadWallpaper` 和 `firmwareUpdateV4`；这些方法
固定目标目录、校验输入，并在 Core 内部编排分片。Transport 只发送已经编码好的单个请求帧。

## 固件更新

需要区分两层 API：

| 层级                        | 职责                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| 内部 `DeviceFirmwareUpdate` | 规范化 targets，发送 `DeviceFirmwareUpdateRequest`，接收中间 `DeviceFirmwareUpdateStatus` |
| 高层固件升级                | 校验包、创建目录、分块暂存 resource/bootloader/firmware、触发安装、轮询、处理断连与重连   |

“功能拆分”应记录在本适配页和对应业务文档，不能写进帧格式或 Transport 文档。

完整流程见 [Pro2 设备管理](../business/pro2-device-management.md)。

## Protocol V2 公共边界

正式业务应使用按业务语义组织的公共 API。只读诊断接口可以暂时保留，但会直接改变设备、
文件系统或安装状态的底层命令必须留在 Core 内部：

| 分类          | 正式业务 API                                             | 保留的只读/诊断 API                                       | Core 内部命令                                                            |
| ------------- | -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| 状态          | `getDeviceState`                                         | `deviceInfoGet`、`deviceStatusGet`                        | 无                                                                       |
| 设置          | `deviceSettings`、`deviceChangePin`、`deviceWipe`        | 无                                                        | 无                                                                       |
| 钱包 Session  | `openWalletSession`、`clearSessionCache`                 | 无                                                        | `deviceSessionOpen`                                                      |
| 固件          | `firmwareUpdateV4` 等高层流程                            | `deviceGetFirmwareUpdateStatus`                           | `deviceFirmwareUpdate`                                                   |
| 文件维护      | `uploadPortfolio`、`deviceUploadWallpaper`、高层固件升级 | `fileRead`、`dirList`、`pathInfo`，以及受约束的 `dirMake` | `fileWrite`、`fileDelete`、`dirRemove`、`filesystemFormat/PermissionFix` |
| Pro2 工厂接口 | 工厂信息/证书读取、挑战签名                              | `protocolInfoRequest`、`ping`                             | 写入能力由 `@onekeyfe/hd-test-api` 显式扩展                              |

生产 `CoreApi` 保留 `deviceReadFactoryInfo`、`deviceReadFactoryCertificate` 和
`deviceSignFactoryChallenge` 三项 attestation 能力。`deviceProvisionFactoryInfo` 与
`deviceWriteFactoryCertificate` 只由 `@onekeyfe/hd-test-api` 注册，并要求显式启用
`allowDestructiveOperations`。旧 `test/api` 方法也只在该扩展包创建的 Core 实例中注册。

`getFeatures`、`getOnekeyFeatures` 仅作为 Protocol V1 兼容入口保留并标记废弃，新接入使用 `getDeviceState`。

## 其他 Protocol V2 专属能力

`deviceGetOnboardingStatus` 与 `uploadPortfolio` 是明确的 Pro2 独立公共能力。
`deviceReboot`、`deviceUploadWallpaper` 也继续公开；它们统一通过 Protocol V2 设备守卫。
原始文件系统方法只保留在 Core 内部调度，不进入 App 可见的 `CoreApi`。面向用户的行为分别记录在：

- [Pro2 设备管理](../business/pro2-device-management.md)
- [设备能力矩阵](../device/capabilities.md)
