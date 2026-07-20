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

- 应用持有稳定的钱包标识 `passphraseState`；SDK 只在运行期持有设备 `session_id`。
- V1/V2 共用 `DeviceWalletSessionStore`，缓存键为 `deviceKey + passphraseState`。
- 没有 `passphraseState` 时不得扫描或复用其他钱包的 Session。
- V2 使用 `DeviceSessionOpen(resume/select)` 恢复或显式选择隐藏钱包，并把 `btc_test_address` 归一化为 `passphraseState`。
- 标准钱包直接使用默认空 Passphrase 上下文，不调用 `DeviceSessionOpen`，也不读取或写入隐藏钱包 Session Store。
- `Failure_InvalidSession` 只清除当前隐藏钱包缓存，并在同一次调用中进入 SDK 钱包选择协调流程。
- 返回的钱包标识与调用方预期不一致时，必须清理缓存并抛出安全错误。
- `session_id` 不作为公共钱包身份，也不要求应用持久化。

主要实现：

- `packages/core/src/device/DeviceWalletSessionStore.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
- `packages/core/src/device/Device.ts`

## 受保护方法的单次解锁重试

自动解锁会产生用户交互，也可能造成有副作用请求重复执行，因此必须由方法显式声明：

- `BaseMethod` 默认使用 `unlockPolicy = 'none'`。
- 允许自动解锁的方法声明 `unlockPolicy = 'retry-on-locked'`。
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
