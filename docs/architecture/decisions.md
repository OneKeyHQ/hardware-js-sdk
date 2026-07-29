# SDK 关键架构决策

本文集中记录仍然约束当前实现的架构决策。它不是设计过程归档；已失效的讨论由 Git 历史和 PR 保存。

## Protocol V2 Link 与序列号生命周期

Protocol V2 响应依靠串行调用、消息类型和帧序号维持请求边界。当前采用以下规则：

- 每个 Transport 实例持有一个 `ProtocolV2LinkManager`，并按设备 key 隔离 Link。
- 同一设备的调用串行执行，Link 内复用 Session、frame assembler 和平台 adapter。
- `ProtocolV2SequenceCursor` 跨普通断开、重连和 Link 失效保持递增，只在 Transport `dispose` 时清除。
- 固件业务响应 sequence 是跨 channel/source 的全局发送序列。单个 Transport 只能拒绝连续
  重复的响应序号，不能要求相邻可见响应绝对连续；其他路由会形成合法间隙。
- 超时、断连、I/O、generation 和帧错误属于 link-fatal；protobuf `Failure` 等业务响应不自动判定为 link-fatal。
- Link 失效后允许 SDK 发送序列出现间隙，但不得回退或复用旧序列号。

主要实现：

- `packages/hd-transport/src/protocols/v2/link-manager.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`
- `packages/hd-transport/src/protocols/v2/sequence-cursor.ts`

## 公共协议层与 Transport 边界

为保证 USB 和 BLE 使用一致的调用与恢复语义，公共协议层和平台 Transport 的职责严格分离：

- 公共层负责 protobuf 编解码、帧组装、调用串行化、超时、序列号和 Link 生命周期。
- Transport adapter 只负责平台连接、原生读写、notification/endpoint 管理和平台错误映射。
- Protocol V2 BLE 的完整 frame 分片循环、调用取消和 generation 边界由共享
  `ProtocolV2BleFrameWriter` 负责；Electron、React Native 和 lowlevel adapter 只提供各自的
  单包容量、节流参数和原生写入。Protocol V1 的既有 BLE 分包不复用该路径。
- Node USB 与 WebUSB 复用 `ProtocolV2UsbTransportBase`。
- USB 在 open、claim、reset 或 reconnect 后轮换 generation，旧 generation 的异步读写必须失败。
- Transport 不自动重发 Protocol V2 业务命令；有副作用操作的重试由了解幂等性的 Core 流程决定。

主要实现：

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- `packages/hd-transport/src/protocols/v2/link-manager.ts`

## 钱包 Session 所有权与缓存键

Transport 连接、帧序号、设备端 `session_id` 和钱包标识是四类不同状态，不能共用缓存：

- V1/V2 的 `openWalletSession()` 对标准/隐藏钱包都只返回公开钱包身份
  `deviceId + passphraseState`；固件 `session_id` 只进入 Core 内部 Store，不通过公共响应透传。
- 现有 App 可继续调用 `getPassphraseState()`：V1 保持原固件消息流，V2 由 Core 将
  `useEmptyPassphrase/initSession` 意图映射到新的 Ask/Get Session 流程；这不代表 Pro2
  恢复了同名固件消息。
- 旧版 CLI 已保存在 OS Keychain 中的完整三元组可以继续通过 `preloadSessionCache()` 恢复，
  但新的公共钱包选择响应不再提供原始 `sessionId`，也不再创建新的跨进程 Session 缓存。
- V1/V2 共用 `DeviceWalletSessionStore`，缓存键为 `deviceKey + passphraseState`。
- `DeviceWalletSessionStore` 是 Core 内唯一可用于恢复的钱包 Session 缓存源；
  `DeviceState` 和协议 raw 快照都不是 Session 缓存。
- 没有 `passphraseState` 时不得扫描或复用其他钱包的缓存 Session。
- Protocol V1 请求携带 `deviceId` 时，Core 必须先发送不含 `session_id/passphrase_state`
  的 `Initialize` 确认实时 `deviceId`；身份一致后才允许读取并透传对应钱包 Session。
  业务方法只要接收 `deviceId`，也必须在业务命令前执行同一实时身份校验。
- `openWalletSession()` 的显式 `mode` 是唯一流程意图；一旦传入 `mode`，不得再混用
  `useEmptyPassphrase` 或 `initSession`。`standard/select-hidden` 也不得携带钱包绑定。
- `openWalletSession()` 必须显式传入 `mode`；旧参数兼容只保留在原
  `getPassphraseState()` 入口，避免新 API 同时存在两套意图表达。
- `resume-hidden` 只接收 `deviceId + passphraseState`，由 Core 从 Store 查找
  `sessionId`；缓存不存在时返回 `WalletSessionInvalid`，固件拒绝恢复时透传规范化错误，
  且都不自动选择其他钱包。
- V2 先通过 `ProtocolInfoRequest { eventless_wallet_session: true }` 协商无中间固件 Event；
  标准钱包锁定时显式使用 `DeviceSessionAskPin { type: Main }`，不会创建隐藏钱包 Session。
- 隐藏钱包选择先用 `DeviceSessionAskPassphrase` 或
  `DeviceSessionAskPin { type: AttachToPin }` 在设备端准备上下文，再用空参数
  `DeviceSessionGet` 取得最终 Session；恢复缓存使用带 `session_id` 的 `DeviceSessionGet`。
- Pro2 的 `DeviceSessionAskPassphrase.passphrase` 支持 Host 输入；字段缺省表示设备端输入。
  Pro2 尚未发布，不保留开发阶段旧固件的能力降级分支。
- 显式 `resume-hidden` 被固件拒绝时，Core 只清除当前隐藏钱包缓存并返回规范化错误，
  不自动退化为需要用户确认的隐藏钱包选择；`DeviceSessionError_InvalidSession=2`
  统一映射为 `WalletSessionInvalid`。
- V2 的 `DeviceSessionGet` 成功响应必须同时包含非空 `session_id` 和
  `btc_test_address`；缺少任一字段都视为协议响应不完整，不得降级为标准钱包。
- 返回的钱包标识与调用方预期不一致时，必须清理缓存并抛出安全错误。
- Pro2 在解锁流程刷新状态后，以刷新后的 `passphraseProtection` 判定标准/隐藏钱包，
  不得使用解锁前的状态快照路由钱包结果。
- `session_id` 不是钱包身份，必须与同一次返回的 `deviceId + passphraseState` 绑定使用。
- `session_id` 不出现在公共 `DeviceState`、设备消息顶层或 `openWalletSession()` 响应；
  Legacy `Features.sessionId` 的公共投影保持为空，仅允许 Core 内部缓存使用真实值。
- 公共 `clearSessionCache()` 只接受无参数、仅 `deviceId`、或完整
  `deviceId + passphraseState` 三种范围；单独传 `passphraseState` 返回参数错误，避免误清
  所有设备。该 API 只清理 `DeviceWalletSessionStore`，不发送 Protocol V1/V2 命令，
  也不表示设备端 Session 已关闭。
- 设备 wipe 只有在固件明确返回成功后，Core 才清除旧 `deviceId`、对应钱包 Session、
  Protocol V2 临时 descriptor Session、设备状态和预初始化元数据；下一次调用必须重新读取
  实时身份。wipe 后产生的新 `deviceId` 是新的钱包生命周期，调用方不得覆盖旧钱包绑定，
  也不得绕过原有 `deviceId` 不匹配校验。

主要实现：

- `packages/core/src/device/DeviceWalletSessionStore.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
- `packages/core/src/device/Device.ts`

## 受保护方法的单次解锁重试

自动解锁会产生用户交互，也可能造成有副作用请求重复执行，因此必须由方法显式声明：

- `BaseMethod` 默认使用 `unlockPolicy = 'none'`；安全重放方法由完整显式白名单声明
  `unlockPolicy = 'retry-on-locked'`。
- 有副作用的方法只能声明 `unlockPolicy = 'unlock-before-run'`：已知设备锁定时先解锁，
  但收到 locked 响应后不重放原操作。
- 只有结构化 `HardwareErrorCode.DeviceLocked` 会触发解锁。
- 解锁成功后原方法最多重试一次；取消、解锁失败或第二次调用失败时直接返回错误。
- Protocol V1、未声明策略的方法和其他错误不进入自动解锁流程。
- 锁定错误优先依据 Protocol V2 Failure 的 code/subcode，消息文本只作兼容回退。

主要实现：

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/protocols/protocol-v2/unlockRetry.ts`
- `packages/core/src/device/DeviceCommands.ts`

## 方法协议能力与固件版本边界

Core 在设备完成 acquire/initialize、协议类型已由真实设备响应确认后，必须先检查方法的协议
能力，再检查对应机型的固件版本范围，最后才允许进入方法实现和 `typedCall()`：

- `BaseMethod.getSupportedProtocols()` 默认只返回 Protocol V1，新增 Protocol V2 支持必须显式
  返回 `['V1', 'V2']`；Protocol V2 专属方法只返回 `['V2']`。
- 协议不匹配统一返回 `DeviceNotSupportMethod`，不得先向设备发送消息再依赖
  `UnknownMessage/UnexpectedMessage` 判断能力。
- `DeviceFirmwareRange` 只表达方法已受支持时的 `min/max` 固件版本，不表达协议不支持，禁止用
  `0.0.0`、虚构版本或布尔哨兵编码能力状态。
- 参数会改变协议能力时，由方法覆写 `getSupportedProtocols()` 动态判断；例如 BTC Neurai fork
  当前仅允许 Protocol V1，其固件版本范围仍单独维护。
- Core 主调用管线与 all-network 内部方法分发复用同一个 `BaseMethod` 协议断言。Transport 不维护
  SDK 公共方法白名单，也不承担业务能力判断。

主要实现：

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/core/index.ts`
- `packages/core/src/api/allnetwork/AllNetworkGetAddressBase.ts`

## 维护规则

- 只有持续影响多个模块、不能仅从代码局部理解的规则才进入本文。
- 决策变化时直接更新当前规则，并通过 Git 历史保留演进过程。
- 具体帧格式、字段映射和业务流程分别维护在协议、SDK 与业务文档中。
