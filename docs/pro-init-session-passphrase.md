# Pro 初始化、Passphrase、Session 与 Attach to PIN 逻辑梳理

## 1. 范围与核心结论

本文梳理当前 SDK 中 Pro / Pro2 设备初始化、passphrase、session_id、deviceId 以及 Attach to PIN 相关逻辑。重点关注硬件层上下游如何协同管理 session，而不是单个 API 的参数说明。

当前代码里需要区分三类“会话/身份”：

| 名称                         | 所在层级                                | 含义                                                                                         | 生命周期                                    |
| ---------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| transport session / `mainId` | transport / Device                      | SDK 与 transport 占用设备的连接句柄。USB 下通常是 bridge/webusb session；BLE 下通常是 uuid。 | acquire 到 release                          |
| device `session_id`          | 固件/SE + V1 Features / Pro2 DeviceSession | 设备端 passphrase/seed session 的标识，用于复用已解锁的钱包上下文。                       | 设备端生成，SDK 缓存到 `deviceSessionCache` |
| `device_id`                  | V1 Features                             | 当前 seed 对应的身份，换 seed / wipe 后会变化。                                              | 随 seed 变化                                |
| serialNo / uuid              | 硬件身份                                | 硬件序列号，用于识别物理设备。                                                               | 物理设备稳定                                |
| Protocol V2 frame `seq`      | hd-transport ProtocolV2Session          | V2 帧级请求序号，解决分片/应答跟踪与日志定位。                                               | 每个 ProtocolV2Session 内递增               |

一句话总结：**transport session 解决“和哪台设备通信”，device `session_id` 解决“设备端当前解锁的是哪个 passphrase 上下文”，`device_id` 解决“当前 seed 身份是否匹配”，V2 `seq` 解决“这一帧属于哪个协议调用顺序”。**

## 2. 子模块职责

| 子模块                            | 关键文件                                                     | 职责                                                                                                 |
| --------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `packages/core/src/core`          | `core/index.ts`                                              | API 调度、请求队列、初始化参数组装、passphrase 安全检查、UI 事件转发。                               |
| `packages/core/src/device`        | `Device.ts`、`DeviceCommands.ts`、`DevicePool.ts`            | 设备 acquire/release、V1/V2 初始化分支、session 缓存、设备缓存、PIN/passphrase/Button 中间消息处理。 |
| `packages/core/src/utils`         | `deviceFeaturesUtils.ts`                                     | 获取 passphraseState，刷新 features，并把固件返回的 session_id 写入 SDK 内部缓存。                   |
| `packages/core/src/deviceProfile` | `buildDeviceFeatures.ts`、`buildDeviceProfile.ts`            | Pro2 / Protocol V2 设备信息归一化，生成 SDK 标准 `Features` 和 `DeviceProfile`。                     |
| `packages/hd-transport`           | `protocols/v2/session.ts`、`encode.ts`、`frame-assembler.ts` | Protocol V2 encode/decode、帧重组、seq 管理、调用串行化和超时控制。                                  |
| `packages/hd-transport-*`         | WebUSB、NodeUSB、RN BLE、lowlevel BLE transport              | 平台连接、读写、协议探测、按设备缓存或创建 ProtocolV2Session。                                       |
| `submodules/firmware-pro2`        | protobuf、SE session handler                                 | Pro2 schema 来源，以及 SE session 新建/打开/查询等固件侧基础能力。                                   |

## 3. 初始化链路

### 3.1 Core 调度入口

业务 API 进入 `callAPI()` 后，core 会通过 `parseInitOptions()` 从 payload 中取出：

- `initSession`
- `passphraseState`
- `deviceId`
- `deriveCardano`
- `connectProtocol`

这些参数会传入 `device.run(inner, runOptions)`。因此初始化不是业务方法自己散落完成，而是统一由 `Device.run()` 控制：

```text
callAPI
  -> findMethod / method.init
  -> DevicePool / DeviceList 找到 Device
  -> device.run(inner, runOptions)
  -> acquire
  -> initialize
  -> passphrase 安全检查
  -> method.run
  -> release 或 keepSession
```

这样设计的原因是：初始化涉及设备占用、transport session、features schema、passphrase 状态和 UI 交互，如果让每个链方法自己处理，容易出现设备还没释放、session 错复用、features 过期等问题。

### 3.2 Pro / Protocol V1 初始化

Pro 当前仍走 Protocol V1 初始化，入口在 `Device.initialize()`：

1. 如果 `initSession` 为 true，先 `clearInternalState(deviceId)`，清掉旧 session 缓存。
2. 根据当前 `passphraseState` 和 `deviceId` 调 `getInternalState()` 查缓存。
3. 如果查到缓存，把缓存的 device `session_id` 放进 `Initialize.session_id`。
4. 同时携带 `passphrase_state`、`derive_cardano`、`is_contains_attach=true`。
5. 调 `Initialize -> Features`。
6. `_updateFeatures()` 更新 features；如果返回了 `session_id`，通过 `setInternalState()` 写回缓存。
7. 根据 features 调 `TransportManager.reconfigure()` 选择合适的 V1 protobuf schema。

`is_contains_attach=true` 是 SDK 明确告诉固件：本次初始化需要包含 Attach to PIN 相关状态。这样 features 里可以反映 `unlocked_attach_pin` 等扩展字段，上层才能判断当前是否是 attach PIN 解锁。

### 3.3 Pro2 / Protocol V2 初始化

Pro2 不走传统 `Initialize/GetFeatures`。`Device.initialize()` 中如果 `isProtocolV2()` 为 true，会走专用分支：

1. 写入 `this.passphraseState = options?.passphraseState`。
2. 如果已有 features 且无需强制新 session，则每次 run 前调用 `_refreshProtocolV2Status()` 做轻量刷新。
3. 否则调用 `_initializeProtocolV2()`。
4. `_initializeProtocolV2()` 通过 `requestProtocolV2DeviceInfo()` 发送 `DeviceInfoGet`。
5. `updateProtocolV2Features()` 使用 `buildProtocolV2FeaturesPayload()` 映射出 SDK 标准 `Features`。

为什么 Pro2 不复用 V1 Initialize：Protocol V2 当前是系统协议能力，设备信息来自 `Ping + DeviceInfoGet`，并且文档中已明确 V2 不支持传统 `GetFeatures`。SDK 用 feature builder 统一输出结构化 features，避免业务层直接理解 V2 原始 schema。

需要注意：当前实现只按 `firmware-pro2` 的 `DeviceInfoGet` 真实响应映射。`device_id` 只来自 `DeviceInfo.status.device_id`，不会用 `hw.serial_no` 或 transport path 兜底。

## 4. deviceId 与设备身份逻辑

### 4.1 V1 设备

V1 `Features.device_id` 表示当前 seed 身份。它不是物理设备序列号，换 seed / wipe 后会变。因此它适合用于：

- 校验 API 请求指定的 `deviceId` 是否仍然匹配当前 seed。
- 作为 `deviceSessionCache` 的主 key，避免不同 seed 的 session 混用。

`BaseMethod.checkDeviceId` 打开时，core 会调用 `device.checkDeviceId(method.deviceId)`。不一致时抛 `DeviceCheckDeviceIdError`。

### 4.2 物理设备标识

`Device.toMessageObject()` 中：

- BLE 下 `connectId` 使用 `mainId` / uuid。
- USB 下 `connectId` 使用 serialNo。
- `uuid` 使用 serialNo。
- `deviceId` 使用当前 `features.device_id`。

`DevicePool` 缓存设备时优先用 `getCurrentSerialNo()` 作为 `devicesCache` key，同时也会通过 descriptor `path` 查找旧 Device 实例。这样可以把“物理设备缓存”和“seed 身份校验”分开。

### 4.3 Pro2 / V2 设备

`buildProfileFromProtocolV2()` 和 `buildDeviceFeatures` 都明确不把 V2 `serial_no` 当作 `device_id`。原因是二者语义不同：

- serialNo 是物理硬件身份。
- deviceId 是当前 seed 身份，wipe / 换 seed 后应该变化。

如果 Pro2 尚未提供等价 deviceId，就保持为空或 null。这样虽然会牺牲一部分 V1 风格的 deviceId 校验能力，但避免了更危险的误绑定。

## 5. device session_id 缓存逻辑

### 5.1 缓存位置与 key

`Device.ts` 中维护了模块级 `deviceSessionCache: Record<string, string>`。缓存 key 由 `generateStateKey(deviceId, passphraseState)` 生成：

```text
有 passphraseState: `${deviceId}@${passphraseState}`
无 passphraseState: `${deviceId}`
```

但当前 `getInternalState()` 有一个重要安全不变量：

```text
没有 this.passphraseState 时，不查 session 缓存。
```

也就是说，虽然 `generateStateKey()` 保留了无 passphraseState 的 key 形式，实际读取缓存时必须带 passphraseState。

### 5.2 为什么必须带 passphraseState

旧逻辑如果在没有 passphraseState 时扫描 `${deviceId}@*`，会产生两个风险：

1. 用户要访问主钱包或空 passphrase，却被路由到某个隐藏钱包 session。
2. 同一 deviceId 下存在多个隐藏钱包，SDK 可能复用到错误的 passphrase session。

因此现在的策略是：**passphraseState 是 device session 复用的必要条件**。CLI 短生命周期场景如果要复用 session，需要先通过 `getPassphraseState()` 拿到 passphraseState 和 session_id，再用 `preloadSessionCache(deviceId, passphraseState, sessionId)` 预热缓存，并确保后续调用携带同一个 passphraseState。

### 5.3 写缓存的入口

主要有三个入口：

1. `setInternalState(state, initSession)`  
   在 V1 `Initialize -> Features` 后调用。只有存在 `passphraseState` 或 `initSession=true` 时才写缓存。

2. `updateInternalState(enablePassphrase, passphraseState, deviceId, sessionId, featuresSessionId)`  
   在 `getPassphraseStateWithRefreshDeviceInfo()` 之后调用。优先使用固件返回的 `session_id`，没有则使用 `features.session_id`。

3. `preloadSessionCache(deviceId, passphraseState, sessionId)`  
   给 CLI 等短生命周期进程使用，用外部已知 session 预填缓存。

`updateInternalState()` 还会删除旧的 `${deviceId}` 无 passphrase key。这是 attach-to-pin 修复逻辑的一部分：避免历史无 passphrase session 继续影响新路径。

### 5.4 清缓存的入口

1. `initSession=true` 时，初始化前调用 `clearInternalState(deviceId)`。
2. passphraseState 校验失败时，`checkPassphraseStateSafety()` 调 `clearInternalState()`。
3. 主钱包请求却通过 attach PIN 解锁、或传入 passphraseState 与 attach PIN 解锁出的 state 不一致时，设备会被 lock，并清 session。

清缓存的设计目标是：一旦发现设备端实际解锁状态与调用方预期不一致，SDK 不能继续信任本地 session 缓存。

## 6. passphraseState 获取与安全检查

### 6.1 getPassphraseState API

SDK 对外 API 仍叫 `getPassphraseState`，方法本身设置 `useDevicePassphraseState=false`，避免调用自己时又触发 passphrase 校验。执行流程：

1. 调 `getPassphraseStateWithRefreshDeviceInfo()`。
2. 该函数再调底层 `getPassphraseState()`。
3. Protocol V2 / Pro2 发送 `DeviceSessionGet`，如果本地命中缓存则携带 `session_id`。
4. Pro2 固件返回 `DeviceSession`：`session_id` 和 `btc_test_address`，SDK 将 `btc_test_address` 映射为上层 `passphraseState`。
5. Pro V1 仍走 `GetPassphraseState -> PassphraseState`，返回 `passphrase_state/session_id/unlocked_attach_pin`。
6. 如果设备之前 locked，或 features 显示未开启 passphrase 但现在拿到了 state，会刷新设备状态。
7. 调 `updateInternalState()` 写入 session 缓存。

对 Pro / Pro2，API 返回中即使 `passphrase_protection` 不是 true，也会返回 `passphraseState`。这是为了支持 Pro 系列的 passphrase / attach-to-pin 语义，不能简单套用 V1 设备“只有开启 passphrase 才返回 state”的规则。

### 6.2 支持判断

`getPassphraseState()` 的协议分支：

- Protocol V2 使用 `DeviceSessionGet -> DeviceSession`。
- features capability 包含 `Capability_AttachToPin`。
- Pro 且固件版本 `>= 4.15.0`。

如果 V1 设备不支持新接口，则静默调用 Testnet `GetAddress`，用返回地址作为 passphraseState。这个回退只适用于 V1 设备；Pro2 不走这条路径。

### 6.3 普通业务调用前的安全检查

普通业务方法如果 `useDevicePassphraseState=true`，core 会做两层检查：

1. `checkPassphraseEnableState()`

   - 设备开启 passphrase，但调用没有传 `passphraseState` 且不是 `useEmptyPassphrase`，抛 `DeviceOpenedPassphrase`。
   - 设备未开启 passphrase，但调用传了 `passphraseState`，抛 `DeviceNotOpenedPassphrase`。

2. `device.checkPassphraseStateSafety()`
   - 调 `getPassphraseStateWithRefreshDeviceInfo()` 获取设备当前真实 state。
   - 如果传入 state 与设备返回 state 不一致，清缓存并返回 false。
   - 如果请求主钱包 (`useEmptyPassphrase`) 但设备实际通过 attach PIN 解锁，lock 设备并抛 `DeviceCheckUnlockTypeError`。
   - 如果传入隐藏钱包 state，但 attach PIN 解锁出的 state 不一致，同样 lock 并清缓存。

这一层的目的不是“多一次校验”，而是防止 UI 或缓存把用户带到错误钱包。硬件钱包里地址派生和签名都是确定性的，一旦 passphrase 上下文错了，返回的地址或签名仍然是合法的，但对应的是另一个钱包。

## 7. Attach to PIN 交互链路

### 7.1 protobuf 字段

V1 固件 schema 中与 attach-to-pin 相关的字段包括：

- `Initialize.is_contains_attach`
- `Features.attach_to_pin_user`
- `Features.unlocked_attach_pin`
- `PassphraseRequest.exists_attach_pin_user`
- `PassphraseAck.on_device_attach_pin`
- `ButtonRequest_AttachPin`
- `GetPassphraseState.allow_create_attach_pin`
- `PassphraseState.unlocked_attach_pin`

Pro2 当前固件不再使用上述 passphrase 消息；状态来自 `DeviceInfo.status.passphrase_enabled`、`attach_to_pin_enabled`、`unlocked_by_attach_to_pin`，session 来自 `DeviceSession.session_id`，passphraseState 来自 `DeviceSession.btc_test_address`。

这些字段形成两个方向：

1. 固件告诉 SDK：当前是否存在 attach PIN 用户，当前是否通过 attach PIN 解锁。
2. SDK 告诉固件：用户选择走设备上的 attach PIN 输入，或允许创建 attach PIN。

### 7.2 UI 事件流

设备返回 `PassphraseRequest` 时，`DeviceCommands._filterCommonTypes()` 会读取 `exists_attach_pin_user`，再触发 `_promptPassphrase({ existsAttachPinUser })`。

core 的 `onDevicePassphraseHandler()` 把它转发给 UI：

```text
UI_REQUEST.REQUEST_PASSPHRASE {
  device,
  passphraseState: device.passphraseState,
  existsAttachPinUser
}
```

UI 返回后：

- 普通软件输入 passphrase：`PassphraseAck { passphrase }`
- 在设备上输入 passphrase：`PassphraseAck { on_device: true }`
- 选择 attach PIN 且固件表示存在 attach PIN 用户：`PassphraseAck { on_device_attach_pin: true }`

如果固件返回 `ButtonRequest_AttachPin` 或 `ButtonRequest_PinEntry`，core 会转发为 `UI_REQUEST.REQUEST_PIN`。对 Pro/Touch 这类设备，PIN 通常在设备屏幕输入；UI 主要负责展示“请在设备上操作”。

### 7.3 attach PIN 与 session 修复

Attach to PIN 的核心风险是：用户表面上没有手动输入 passphrase，但设备端已经根据绑定 PIN 切换到了某个隐藏钱包 passphrase 上下文。

因此 SDK 在获取设备 session 后必须用固件返回的真实 `passphraseState/session_id` 修正本地状态；attach PIN 解锁状态由 Pro2 `DeviceInfo.status.unlocked_by_attach_to_pin` 或 V1 `PassphraseState.unlocked_attach_pin` 提供：

```text
DeviceSessionGet / GetPassphraseState
  -> DeviceSession(btc_test_address, session_id) / PassphraseState(passphrase_state, session_id)
  -> updateInternalState()
  -> deviceSessionCache[deviceId@passphraseState] = session_id
```

同时普通业务调用前还会比较调用方传入的 passphraseState 和设备实际返回的 state。如果 attach PIN 解锁到的 hidden wallet 与调用方预期不一致，SDK 会锁设备并清缓存。

## 8. Protocol V2 transport session 与 seq 管理

### 8.1 ProtocolV2Session 的职责

`ProtocolV2Session` 是 V2 通信的统一会话层，职责包括：

- 每次 call 前递增 `protoSeq`，范围 1-255，跳过 0。
- encode protobuf payload 到 `0x5A` V2 frame。
- 调 transport 的 `writeFrame()` 和 `readFrame()`。
- 按 expectedTypes / intermediateTypes 过滤响应。
- 串行化同一 session 上的调用，避免两个并发调用互相消费响应。
- 写阶段有 watchdog；读阶段按调用可选 timeout，避免用户确认和固件安装被默认短超时截断。

这里的 `seq` 是协议帧序号，不等同于设备 `session_id`。它用于 V2 帧级诊断和顺序控制；设备 wallet/passphrase session 仍由固件消息里的 `session_id` 表达。

### 8.2 transport 中的缓存差异

不同 transport 对 `ProtocolV2Session` 的持有策略不同：

- WebUSB / NodeUSB：按 path 缓存 `protocolV2Sessions`，这样同一设备路径上的 seq 可以跨 API 调用递增。
- React Native BLE：每次 V2 call 创建 session，但外层通过 `activeProtocolV2Call` 和 assembler 缓存保证同一 uuid 同时只有一个活跃 V2 调用。
- lowlevel BLE：每次 call 创建 session，并在调用前 reset assembler；适合原生插件只负责传 chunk 的模型。

无论哪种 transport，V2 调用都需要 `ProtocolV2FrameAssembler` 重组完整 `0x5A` frame，并校验 SOF、长度、header CRC。这样平台层不需要理解 protobuf，只负责可靠传输 bytes。

## 9. 固件/SE 侧 session 来源

Pro2 子模块里可以看到 SE session 的底层处理：

- `handle_session_new()` 调 `SE_CMD_SESSION_START` 生成 32 字节 session_id。
- `handle_session_open()` 调 `SE_CMD_SESSION_OPEN` 打开指定 session_id。
- `handle_session_get_current_id()` 调 `SE_CMD_SESSION_GET_CURRENT_ID` 查询当前 session_id。
- MicroPython 扩展 `se_start_session()` 在未打开 session 时会 new + open。

这说明 device `session_id` 本质上是安全芯片/固件侧的 seed/passphrase session 句柄。SDK 缓存它的目的不是绕过安全校验，而是在同一 passphraseState 下复用设备已经建立的上下文，减少重复输入 passphrase 或重复初始化成本。

## 10. 典型流程

### 10.1 访问隐藏钱包并缓存 session

```text
App 调 getPassphraseState(connectId)
  -> core 找到 Device
  -> Device.initialize()
  -> Pro2: DeviceSessionGet / Pro V1: GetPassphraseState
  -> UI 输入 passphrase 或选择设备输入/attach PIN
  -> 固件返回 passphraseState 与 session_id
  -> SDK updateInternalState(deviceId, passphraseState, sessionId)
  -> App 保存 passphraseState，后续业务调用携带它
```

后续签名/取地址：

```text
App 调 evmGetAddress({ passphraseState })
  -> Device.initialize({ passphraseState })
  -> getInternalState() 命中 deviceId@passphraseState
  -> Pro2 后续安全检查使用 DeviceSessionGet({ session_id })
  -> core 再 checkPassphraseStateSafety()
  -> method.run()
```

### 10.2 请求主钱包但设备通过 attach PIN 解锁

```text
App 调业务方法({ useEmptyPassphrase: true })
  -> checkPassphraseStateSafety()
  -> 获取当前设备 session / 状态
  -> 发现 unlockedAttachPin=true
  -> SDK 判断 mainWalletUseAttachPin
  -> lockDevice()
  -> clearInternalState()
  -> 抛 DeviceCheckUnlockTypeError
```

这样做是为了避免用户以为自己在主钱包，实际却进入了绑定 PIN 对应的隐藏钱包。

### 10.3 attach PIN 解锁到错误隐藏钱包

```text
App 调业务方法({ passphraseState: A })
  -> 获取当前设备 session / 状态
  -> 固件通过 attach PIN 返回 passphraseState B
  -> SDK 判断 A !== B
  -> lockDevice()
  -> clearInternalState()
  -> 抛错或返回 passphrase state mismatch
```

这样做是为了避免一个 passphraseState 的业务请求复用另一个 hidden wallet 的 session。

## 11. 为什么要这么设计

### 11.1 安全优先：不能把“连接成功”当成“钱包上下文正确”

硬件钱包通信里有多个状态：设备是否连接、是否被 SDK acquire、是否已输入 PIN、当前 passphrase 是哪个、当前 seed 是哪个。只要 passphrase 上下文错了，地址和签名仍然能成功返回，但对应的是错误钱包。因此 SDK 必须在业务调用前校验 passphraseState。

### 11.2 用户体验：复用 session，减少重复输入

`session_id` 缓存让同一个 `deviceId@passphraseState` 可以复用设备端已建立的 session。对 CLI、DApp 和移动端来说，这能减少重复 passphrase 输入，尤其是隐藏钱包和 Cardano 派生这类耗时流程。

### 11.3 兼容性：Pro / Touch / V1 设备 / Pro2 协议并存

SDK 需要同时支持：

- V1 设备没有 `GetPassphraseState` 时，只能用 Testnet `GetAddress` 回退。
- Pro V1 新固件支持 Attach to PIN，需要使用 `GetPassphraseState` 和扩展字段。
- Pro2 V2 不走 `Initialize/GetFeatures/GetPassphraseState`，使用 `DeviceInfoGet` 与 `DeviceSessionGet`，但仍要向上层暴露兼容 features。

因此现在的实现是“能力检测 + 协议分支 + features adapter”，而不是只按设备型号硬编码。

### 11.4 身份隔离：serialNo、deviceId、sessionId 不能混用

serialNo 稳定指向硬件，deviceId 指向 seed，session_id 指向设备端解锁会话。把它们混用会产生两类问题：

- 把旧 seed 的 session 用到新 seed。
- 把物理设备身份误当 seed 身份，导致 wipe 后仍误认为是同一钱包。

所以 Pro2 里即使有 serialNo，也不填充 deviceId；session cache 也优先以 deviceId + passphraseState 作为 key。

### 11.5 并发与可靠性：V2 call 必须串行

Protocol V2 的响应当前主要按类型匹配。如果同一 session 上两个 call 并发，一个调用可能消费另一个调用的响应。`ProtocolV2Session.pendingCall` 强制串行，是为了保证响应归属确定。

## 12. 当前实现注意点

1. `getInternalState()` 没有 passphraseState 就不会查 session cache，这是当前最重要的安全边界。
2. Pro2 的 `DeviceInfoGet` 使用当前固件真实字段，`status.passphrase_enabled` 映射到 SDK `passphrase_protection`。
3. `DevicePool._sendDisconnectMessage()` 当前用 `this.connectedPool[i]` 取 descriptor，看起来应为 `disconnectPool[i]`，这与本文主线无关，但属于设备断开事件可疑点。
4. `supportProSeriesAttachPinPassphrase()` 只适用于 V1 Pro，Pro2 在 `getPassphraseState()` 中直接走 `DeviceSessionGet`。
5. 业务方法如设置、固件、文件、设备状态类通常会设置 `useDevicePassphraseState=false`，避免无意义触发 passphrase 校验。

## 13. 关键源码索引

- Core 调度与 passphrase 校验：`packages/core/src/core/index.ts`
- Device 生命周期与 session 缓存：`packages/core/src/device/Device.ts`
- PIN / passphrase / attach PIN 中间消息：`packages/core/src/device/DeviceCommands.ts`
- passphraseState 获取与 attach-to-pin session 修复：`packages/core/src/utils/deviceFeaturesUtils.ts`
- `getPassphraseState` API：`packages/core/src/api/GetPassphraseState.ts`
- 设备池与物理设备缓存：`packages/core/src/device/DevicePool.ts`
- Protocol V2 session：`packages/hd-transport/src/protocols/v2/session.ts`
- Protocol V2 frame seq：`packages/hd-transport/src/protocols/v2/encode.ts`
- Protocol V2 frame 重组：`packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- Pro2 features adapter：`packages/core/src/protocols/protocol-v2/features.ts`
- Protocol V2 标准 features 构建：`packages/core/src/deviceProfile/buildDeviceFeatures.ts`
- Pro2 session protobuf：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_session.proto`
- Pro2 status protobuf：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_status.proto`
- 固件 SE session handler：`submodules/firmware-pro2/tasks/task_se_agent/handlers/se_handlers_session.c`
