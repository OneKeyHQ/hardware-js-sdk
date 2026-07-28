# SDK 关键架构决策

本文集中记录仍然约束当前实现的架构决策。它不是设计过程归档；已失效的讨论由 Git 历史和 PR 保存。

## Protocol V2 Link 与序列号生命周期

Protocol V2 响应依靠串行调用、消息类型和帧序号维持请求边界。当前采用以下规则：

- 每个 Transport 实例持有一个 `ProtocolV2LinkManager`，并按设备 key 隔离 Link。
- 同一设备的调用串行执行，Link 内复用 Session、frame assembler 和平台 adapter。
- `ProtocolV2SequenceCursor` 跨普通断开、重连和 Link 失效保持递增，只在 Transport `dispose` 时清除。
- 超时、断连、I/O、generation 和帧错误属于 link-fatal；protobuf `Failure` 等业务响应不自动判定为 link-fatal。
- Link 失效后允许序列号出现间隙，但不得回退或复用旧序列号。

主要实现：

- `packages/hd-transport/src/protocols/v2/link-manager.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`
- `packages/hd-transport/src/protocols/v2/sequence-cursor.ts`

## 公共协议层与 Transport 边界

为保证 USB 和 BLE 使用一致的调用与恢复语义，公共协议层和平台 Transport 的职责严格分离：

- 公共层负责 protobuf 编解码、帧组装、调用串行化、超时、序列号和 Link 生命周期。
- Transport adapter 只负责平台连接、原生读写、notification/endpoint 管理和平台错误映射。
- Node USB 与 WebUSB 复用 `ProtocolV2UsbTransportBase`。
- USB 在 open、claim、reset 或 reconnect 后轮换 generation，旧 generation 的异步读写必须失败。
- Transport 不自动重发 Protocol V2 业务命令；有副作用操作的重试由了解幂等性的 Core 流程决定。

主要实现：

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- `packages/hd-transport/src/protocols/v2/link-manager.ts`

## 钱包 Session 所有权与缓存键

Transport 连接、帧序号、设备端 `session_id` 和钱包标识是四类不同状态，不能共用缓存：

- V1/V2 的 `openWalletSession()` 对标准/隐藏钱包都返回设备生成的
  `deviceId + passphraseState + sessionId`；`sessionId` 仅用于现有 CLI 兼容。
- 普通 App 调用方不接收、保存或传回 `sessionId`；短生命周期 CLI 可以将一次钱包选择
  得到的完整三元组保存到 OS Keychain，并通过 `preloadSessionCache()` 恢复到 Core Store。
- V1/V2 共用 `DeviceWalletSessionStore`，缓存键为 `deviceKey + passphraseState`。
- `DeviceWalletSessionStore` 是 Core 内唯一可用于恢复的钱包 Session 缓存源；
  `DeviceState` 和协议 raw 快照都不是 Session 缓存。
- 没有 `passphraseState` 时不得扫描或复用其他钱包的缓存 Session。
- `openWalletSession()` 的显式 `mode` 是唯一流程意图；一旦传入 `mode`，不得再混用
  `useEmptyPassphrase` 或 `initSession`。`standard/select-hidden` 也不得携带钱包绑定。
- 未传 `mode` 时只做旧参数兼容：`useEmptyPassphrase=true` 进入 `standard`；
  否则 `initSession=true` 进入新的 `select-hidden` 并使当前设备上明确指定的旧钱包
  Session 失效；否则完整的 `deviceId + passphraseState` 进入 `resume-hidden`，无绑定则
  进入 `select-hidden`。
- `resume-hidden` 只接收 `deviceId + passphraseState`，由 Core 从 Store 查找
  `sessionId`；缓存不存在时返回 `WalletSessionInvalid`，固件拒绝恢复时透传规范化错误，
  且都不自动选择其他钱包。
- V2 先通过 `ProtocolInfoRequest { eventless_wallet_session: true }` 协商无中间固件 Event；
  标准钱包直接使用默认空 Passphrase 上下文，不调用 `DeviceSessionOpen`。
- 隐藏钱包使用 `DeviceSessionOpen(select)` 明确选择 Host Passphrase、设备输入或 Attach PIN，
  使用 `DeviceSessionOpen(resume)` 恢复缓存，并把 `btc_test_address` 归一化为 `passphraseState`。
- 显式 `resume-hidden` 被固件拒绝时，Core 只清除当前隐藏钱包缓存并返回规范化错误，
  不自动退化为需要用户确认的隐藏钱包选择；`DeviceSessionError_InvalidSession=2`
  统一映射为 `WalletSessionInvalid`。
- V2 的 `DeviceSessionOpen` 成功响应必须同时包含非空 `session_id` 和
  `btc_test_address`；缺少任一字段都视为协议响应不完整，不得降级为标准钱包。
- 返回的钱包标识与调用方预期不一致时，必须清理缓存并抛出安全错误。
- `session_id` 不是钱包身份，必须与同一次返回的 `deviceId + passphraseState` 绑定使用。
- `session_id` 不出现在公共 `DeviceState` 或设备消息顶层；隐藏钱包的可选
  `openWalletSession().sessionId` 和 Legacy `Features.sessionId` 只用于 CLI 兼容，
  普通 App 不得把它们写入数据库。
- 公共 `clearSessionCache()` 只清理 `DeviceWalletSessionStore`，
  不发送 Protocol V1/V2 命令，也不表示设备端 Session 已关闭。

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

## 维护规则

- 只有持续影响多个模块、不能仅从代码局部理解的规则才进入本文。
- 决策变化时直接更新当前规则，并通过 Git 历史保留演进过程。
- 具体帧格式、字段映射和业务流程分别维护在协议、SDK 与业务文档中。
