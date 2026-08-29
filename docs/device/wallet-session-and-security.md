# 钱包 Session、Passphrase 与 Attach-to-PIN

> 文档类型：核心机制
> 适用读者：Core、App 钱包接入与安全审查人员
> 内容状态：兼容迁移中
> 代码范围：`packages/core`、App 钱包 Session 接入
> 最后代码核验：2026-08-06
> 前置阅读：[SDK 架构概览](../architecture/overview.md)

## 1. 范围与核心结论

本文梳理当前 SDK 中 Pro / Pro2 设备初始化、passphrase、session_id、deviceId 以及 Attach to PIN 相关逻辑。重点关注硬件层上下游如何协同管理 session，而不是单个 API 的参数说明。

当前代码里需要区分五类“会话/身份”：

| 名称                         | 所在层级                                   | 含义                                                                                         | 生命周期                                          |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| transport session / `mainId` | transport / Device                         | SDK 与 transport 占用设备的连接句柄。USB 下通常是 bridge/webusb session；BLE 下通常是 uuid。 | acquire 到 release                                |
| device `session_id`          | 固件/SE + V1 Features / Pro2 DeviceSession | 设备端 passphrase/seed session 的标识，用于复用已解锁的钱包上下文。                          | 设备端生成，SDK 缓存到 `DeviceWalletSessionStore` |
| `device_id`                  | V1 Features / Pro2 DeviceStatus            | 当前钱包初始化生命周期的标识；不是物理序列号，也不是由助记词确定性计算出的哈希。             | 普通重启保持，wipe / 重新初始化后变化             |
| `serialNo`                   | 硬件身份                                   | 硬件序列号，用于识别物理设备；`KnownDevice.uuid` 仅为历史兼容别名。                          | 物理设备稳定                                      |
| Protocol V2 frame `seq`      | hd-transport ProtocolV2Session             | V2 帧级请求序号，解决分片/应答跟踪与日志定位。                                               | 每个 Transport/设备 key 的 Cursor 内递增          |

一句话总结：**transport session 解决“和哪台设备通信”，device `session_id` 解决“设备端当前解锁的是哪个 passphrase 上下文”，`device_id` 解决“是否仍处于同一次钱包初始化生命周期”，V2 `seq` 解决“这一帧属于哪个协议调用顺序”。**

### 当前公共契约

以下规则代表当前 SDK 对外行为；本文后续保留的调查过程和历史问题记录只用于解释设计背景：

- Protocol V1 通过 `GetPassphraseState` 获取钱包标识；不支持时可以回退到固定测试网地址。
- Pro2 / Protocol V2 先协商 `eventless_wallet_session=true`；Ask 只切换钱包上下文并返回
  `Success`，`DeviceSessionGet` 负责获取当前 Session 或尝试恢复指定 Session。SDK 把
  `btc_test_address` 归一化为 `passphraseState`。
- 公开 `getPassphraseState()` 保留为现有 App 的跨协议兼容入口：V1 继续发送
  `GetPassphraseState`，V2 在 Core 内映射到新的 Ask/Get 钱包 Session 流程。
- Protocol V1/V2 都可以使用统一 `openWalletSession()`，显式区分 `standard`、
  `select-hidden` 和 `resume-hidden`。标准钱包统一返回 `passphraseState=null`；隐藏钱包返回设备
  生成的非空 `passphraseState`。钱包分类只看 `walletType`。隐藏钱包的 `passphraseState`
  可与 `deviceId` 组成钱包绑定；固件
  `session_id` 只写入 Core 内部 Store，不进入公共响应。显式 `mode` 是唯一流程意图，不得与
  `useEmptyPassphrase/initSession` 混用。TypeScript 调用方应使用 SDK 导出的
  `OpenWalletSessionMode.Standard/SelectHidden/ResumeHidden`，避免在业务代码中重复维护协议字符串。
- 参数校验错误通过统一失败响应返回
  `{ success: false, payload: { error, code } }`；缺少 `resume-hidden` 必填绑定时使用
  `CallMethodInvalidParameter`，不向调用方抛出只有 message 的裸异常。
- 未传 `mode` 时保留旧参数兼容：`useEmptyPassphrase=true` 进入标准钱包；否则
  `initSession=true` 重新选择隐藏钱包；否则完整钱包绑定恢复隐藏钱包，无绑定则开始隐藏钱包选择。
- Pro2 显式恢复会把预期 `passphraseState` 映射为 `DeviceSessionGet.btc_test_address`。本地有缓存时
  同时发送 `session_id`；没有缓存时固件可以先按地址静默复用当前 SE Session，无法复用时再完成
  设备端 passphrase 流程。缓存被固件拒绝或返回的钱包不匹配时，SDK 仍只接受与业务绑定一致的
  最终 `passphraseState`。V1 缺少本地 Session 缓存时仍返回 `WalletSessionInvalid`。
- Protocol V2 的 `DeviceSessionGet` 成功响应必须同时包含非空 `session_id` 和
  `btc_test_address`；缺少任一字段都按不完整协议响应处理，不得识别为标准钱包。
- Protocol V2 空参数 `DeviceSessionGet()` 只读取固件当前钱包 Session，不保证当前钱包是标准钱包。
  标准钱包首次打开时调用 `DeviceSessionAskPin(Main)`，成功后调用空 Host passphrase 的
  `DeviceSessionAskPassphrase` 再 `DeviceSessionGet()`；缓存有效时先调用
  `DeviceSessionGet(session_id, btc_test_address)` 恢复。Core 使用返回的真实
  `btc_test_address` 建立标准钱包内部索引，不引入 SDK 自造的 `STANDARD_WALLET_KEY`。
- Protocol V2 进入 `select-hidden` 时，如果实时状态明确设备已经由 Attach PIN 解锁，Core 会再次
  校验原始 `DeviceStatus`，然后用空参数 `DeviceSessionGet()` 读取当前隐藏钱包。需要 Cardano 且
  响应还没有时，再发送空 Host passphrase 的 `AskPassphrase({ seed_domains: [Standard, Cardano] })`，
  不弹出 passphrase UI。复核状态不一致时失败关闭，不回退到钱包重选。
- V1 `Initialize.derive_cardano` 仍是按次 opt-in。V2 由 `DeviceSessionAskPassphrase.seed_domains`
  决定这次生成哪些种子：开钱包和非 Cardano 调用发送 `[Standard]`；Cardano 调用发送
  `[Standard, Cardano]`。`DeviceSessionGet` 不携带、也不生成 Cardano（passphrase 关闭时固件
  Get 会自己要 Cardano）。`DeviceSession` 响应用同一套枚举回报已经生成的域。若 Get 显示还没有
  Cardano，而当前调用需要 ADA：Attach PIN / 标准钱包发送空 Host passphrase 的 Ask；隐藏
  passphrase 再 Ask 一次带上 Cardano，然后 Get。从 Attach PIN 切到另一个非空 passphrase 钱包前，
  SDK 会 `lockDevice`，然后抛出 `DeviceCheckUnlockTypeError`。
- `DeviceSessionAskPin` 的类型按业务意图选择：标准钱包和安全操作使用 `Main`；普通业务调用已携带目标
  `passphraseState` 时，预解锁使用 `Any`，允许主 PIN 或 Attach PIN 进入，随后仍以返回的
  `btc_test_address` 校验目标隐藏钱包；用户明确选择 Attach PIN 打开隐藏钱包时使用 `AttachToPin`。
  `unlockedAttachPin=true` 只描述当前上下文，不决定下一次 Ask 的 PIN 类型。
- 旧参数形式的 `initSession=true` 只使当前设备上明确指定的旧钱包 Session 失效；
  钱包标识不匹配、设备切换和显式 `clearSessionCache()` 也会按各自范围使缓存失效。
- Pro2 Session 的容量与淘汰完全由硬件管理。Core Store 只保存
  `deviceId + passphraseState -> sessionId` 的非权威恢复句柄，不复制硬件容量策略，也不实现 LRU。
  句柄被硬件判定失效时，Core 清除该项并按当前公共流程重新选择或解锁。
- 调用方提供预期 `passphraseState` 时，首次结果不一致会触发一次钱包类型对应的恢复；最终仍不一致
  才清理当前钱包缓存并抛出钱包状态校验错误。
- Protocol V2 钱包身份不一致时会刷新实时状态；如果实际上下文由 Attach PIN 解锁，则沿用 Pro V1
  的 fail-closed 策略：尝试锁定设备、清理当前钱包 Session，并返回
  `DeviceCheckUnlockTypeError`，不再进入钱包重选。非 Attach 的普通 Session 错配仍允许一次重选。
- Protocol V1 调用携带 `deviceId` 时，Core 先用不含 `session_id/passphrase_state` 的
  `Initialize` 校验实时身份；一致后才允许复用钱包 Session，避免把旧身份的 Session 发给当前硬件。
- Pro2 解锁后以刷新后的 `passphraseProtection` 判定钱包类型，不使用解锁前快照。
- `clearSessionCache()` 只清理 SDK 内存状态，不向 Pro1 或 Pro2 发送关闭 Session 命令；
  单独提供 `passphraseState` 属于参数错误，不会清理全局缓存。
- 当前没有独立的“查询设备当前打开哪个钱包”需求；`getDeviceState()` 只用于查询
  Passphrase/Attach PIN 功能与运行状态。App 以 `openWalletSession()` 的返回值作为本次
  钱包身份事实，不直接调用未公开的低层 Session 请求，也不在页面渲染时重复打开钱包。

App 可持久化 `deviceId + walletType + passphraseState` 作为钱包引用；不得保存
`sessionId`、Passphrase 明文、`initSession` 或本次调用的 `resumed`。旧版 CLI 已写入
操作系统 Keychain 的 Session 可以继续通过 `preloadSessionCache()` 迁移复用，但新的钱包选择
不会再获得或持久化原始 `sessionId`。没有旧缓存时，Core Store 仅在进程内维护 Session；SDK
重启或 Session 失效后，Pro2 的显式 `resume-hidden` 会在同一次调用中重新选择并校验目标钱包；
V1 无法安全恢复时仍返回 `WalletSessionInvalid`。

## 2. 子模块职责

| 子模块                            | 关键文件                                                     | 职责                                                                                                 |
| --------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `packages/core/src/core`          | `core/index.ts`                                              | API 调度、请求队列、初始化参数组装、passphrase 安全检查、UI 事件转发。                               |
| `packages/core/src/device`        | `Device.ts`、`DeviceCommands.ts`、`DevicePool.ts`            | 设备 acquire/release、V1/V2 初始化分支、session 缓存、设备缓存、PIN/passphrase/Button 中间消息处理。 |
| `packages/core/src/utils`         | `deviceFeaturesUtils.ts`                                     | 获取 passphraseState，维护 V1 兼容 Features，并把固件返回的 session_id 写入 SDK 内部缓存。           |
| `packages/core/src/deviceProfile` | `buildDeviceFeatures.ts`                                     | 协议消息的内部兼容投影；设备公共状态统一由 `device/DeviceStateMapper.ts` 写入 `DeviceState`。        |
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
2. 如果已有 `DeviceState` 且无需强制新 session，则复用缓存；普通业务调用不默认读取运行状态。
3. 否则调用 `_initializeProtocolV2()`。
4. `_initializeProtocolV2()` 先发送 `DeviceInfoGet`，再发送固定携带
   `eventless_wallet_session=true` 的 `ProtocolInfoRequest`。
5. normal 模式且能力清单包含 `DeviceStatusGet` 时读取实时状态；loader 模式不读取状态。
6. `DeviceStateMapper` 将响应合并进统一 `DeviceState`；V2 不对外构造第二套 `Features`。

为什么 Pro2 不复用 V1 Initialize：Protocol V2 当前是系统协议能力，设备信息来自 `Ping + DeviceInfoGet`，并且文档中已明确 V2 不支持传统 `GetFeatures`。SDK 统一输出 `DeviceState`，避免业务层直接理解 V2 原始 schema。

需要注意：当前实现只按 `firmware-pro2` 的真实响应映射。`device_id` 只来自显式
`DeviceStatusGet`，不会用 `hw.serial_no` 或 transport path 兜底。初始化只在 normal 模式按能力读取
一次状态；后续普通业务调用复用 `DeviceInfo/ProtocolInfo`，明确刷新 runtime/status 时才读取
`DeviceStatusGet`。

## 4. deviceId 与设备身份逻辑

### 4.1 Pro / Protocol V1

V1 `Features.device_id` 表示当前钱包初始化生命周期。它不是物理设备序列号，也不是由
助记词或 seed 确定性计算出的身份；普通重启保持不变，wipe / 重新初始化后重新生成。因此它适合用于：

- 校验 API 请求指定的 `deviceId` 是否仍然匹配当前钱包初始化生命周期。
- 作为 `DeviceWalletSessionStore` 的设备 key，避免不同 seed 的 session 混用。

`BaseMethod.checkDeviceId` 打开时，core 会调用 `device.checkDeviceId(method.deviceId)`。不一致时抛 `DeviceCheckDeviceIdError`。

### 4.2 物理设备标识

`Device.toMessageObject()` 中：

- BLE 下 `connectId` 使用 `mainId` / uuid。
- USB 下 `connectId` 使用 serialNo。
- `serialNo` 使用规范化的物理设备序列号。
- 废弃兼容字段 `uuid` 暂时返回同一个 serialNo。
- `deviceId` 使用当前 `features.device_id`。

`searchDevices()` 的 BLE 扫描阶段不会为了读取序列号而连接设备，因此
`SearchDevice.serialNo` 为 null；该阶段的历史 `uuid` 可能是 BLE Peripheral UUID /
Android MAC。业务路由使用 `connectId`，设备初始化后再使用 `serialNo` 作为硬件身份。

`DevicePool` 缓存设备时优先用 `getCurrentSerialNo()` 作为 `devicesCache` key，同时也会通过 descriptor `path` 查找旧 Device 实例。这样可以把“物理设备缓存”和“seed 身份校验”分开。

### 4.3 Pro2 / Protocol V2

Pro2 与 Pro 的 `deviceId` 生命周期语义一致。Pro2 固件在初始化生命周期内持久化
`DeviceStatus.device_id`，wipe / 重新初始化时生成新值。SDK 不把 V2 `serial_no` 当作
`device_id`，原因是二者语义不同：

- serialNo 是物理硬件身份。
- deviceId 是钱包初始化生命周期身份，普通重启稳定，wipe / 重新初始化后变化。

设备锁定或当前模式没有返回 `DeviceStatus.device_id` 时，SDK 保持为空或 null，不用
serialNo、transport path 或 BLE 名称补值。

## 5. device session_id 缓存逻辑

### 5.1 缓存位置与 key

`DeviceWalletSessionStore` 使用主映射保存全部钱包 Session，并为标准钱包维护一个指向主映射中
真实记录的内部索引：

```text
deviceKey
├─ passphraseState -> sessionId
└─ standard -> { passphraseState, sessionId }  # 仅内部索引，不是钱包标识
```

`deviceKey` 优先使用钱包生命周期身份 `deviceId`，设备身份尚未建立时可以使用当前物理设备缓存键。
只有“临时 descriptor/path key 首次提升为正式 `deviceId`”时，Store 才迁移已有 Session。
如果已稳定的身份从 A 变为 B，Core 会删除 A 的 Session，并保留 B 已有缓存，绝不会把 A
的隐藏钱包 Session 复制或覆盖到 B。

隐藏钱包的 `getInternalState()` 有一个重要安全不变量：

```text
没有 this.passphraseState 时，不查 session 缓存。
```

也就是说，恢复隐藏钱包必须带 `passphraseState`，不能扫描其他记录。显式标准钱包调用则使用
`getStandardInternalState()` 读取标准索引，所以 App 无需在后续标准钱包业务调用中回传
`passphraseState`。Store 可以暂存刚由设备返回、但尚未绑定钱包标识的 pending Session；pending
状态只用于同一次初始化链路，不能作为任意钱包的查询结果。

主映射按设备隔离保存已知的 `passphraseState -> sessionId` 句柄，不限制为固件当前容量，也不推断
硬件的淘汰顺序。更新已有钱包时以固件最新返回的 `sessionId` 覆盖旧句柄；固件拒绝某个句柄后只
清除对应记录。这样 SDK 不会因复制硬件内部策略而提前淘汰仍可恢复的 Session。

### 5.2 为什么必须带 passphraseState

旧逻辑如果在没有 passphraseState 时扫描 `${deviceId}@*`，会产生两个风险：

1. 用户要访问主钱包或空 passphrase，却被路由到某个隐藏钱包 session。
2. 同一 deviceId 下存在多个隐藏钱包，SDK 可能复用到错误的 passphrase session。

因此现在的策略是：**隐藏钱包必须以 passphraseState 定位；标准钱包必须以显式标准意图定位**。
V1/V2 的 `openWalletSession()` 只返回钱包身份 `deviceId + passphraseState`。调用方恢复隐藏钱包时
只传回这两个钱包身份字段，Core 再读取内部 `sessionId`。旧版 CLI 可以从自己受保护的
OS Keychain 恢复历史三元组，并通过 `preloadSessionCache()` 注入 Core Store；SDK 不再通过
公共响应导出 `sessionId`，也不接受业务 API payload 直接携带它。

`DeviceSessionGet` 请求和响应都属于敏感日志边界。Core 不记录该调用的 payload，
尤其不能输出响应中的 `session_id` 或 `btc_test_address`。

### 5.3 写缓存的入口

主要有三个入口：

1. `setInternalState(state, initSession)`  
   在 V1 `Initialize -> Features` 后调用。只有存在 `passphraseState` 或 `initSession=true` 时才写缓存。

2. `updateInternalState(enablePassphrase, passphraseState, deviceId, sessionId, featuresSessionId, walletType)`
   在 `getPassphraseStateWithRefreshDeviceInfo()` 之后调用。优先使用固件返回的 `session_id`，没有则使用 `features.session_id`。
   `walletType=standard` 时同时更新标准钱包内部索引；其他钱包仍只更新主映射。

3. `preloadSessionCache(deviceId, passphraseState, sessionId)`  
   仅为旧版 CLI 从 OS Keychain 恢复历史完整三元组而保留，不属于 App、网页、插件或新的
   钱包选择流程。

`updateInternalState()` 会把设备返回的最终 Session 绑定到真实 `passphraseState`，并删除当前设备的 pending Session，避免未绑定状态继续影响后续请求。

### 5.4 清缓存的入口

1. `initSession=true` 时，初始化前调用 `clearInternalState(deviceId)`。
2. passphraseState 校验失败时，`checkPassphraseStateSafety()` 调 `clearInternalState()`。
3. 主钱包请求却通过 attach PIN 解锁、或传入 passphraseState 与 attach PIN 解锁出的 state 不一致时，设备会被 lock，并清 session。
4. App 显式调用 `clearSessionCache()`，按参数清理一个钱包、一个设备或全部 SDK
   钱包 Session 缓存。

删除标准钱包真实 `passphraseState`、删除整台设备或清除全部缓存时，标准索引会同步失效；只
替换标准钱包 Session 不会删除同设备下的隐藏钱包记录。

清缓存的设计目标是：一旦发现设备端实际解锁状态与调用方预期不一致，SDK 不能继续信任本地 session 缓存。

`clearSessionCache()` 的参数语义：

```ts
// 清理全部 SDK 钱包 Session 缓存
await HardwareSDK.clearSessionCache();

// 清理指定设备的全部钱包 Session 缓存
await HardwareSDK.clearSessionCache({ deviceId });

// 清理指定设备的指定隐藏钱包 Session 缓存
await HardwareSDK.clearSessionCache({ deviceId, passphraseState });
```

`clearSessionCache()` 设置 `useDevice=false`，不会 acquire 设备或发送 Protocol V1/V2 消息。
它只清理唯一缓存源 `DeviceWalletSessionStore`，不修改 `DeviceState` 或协议 raw 快照。它不等价于锁定设备、取消当前
请求或关闭固件/SE 中仍然存在的 Session。

## 6. passphraseState 获取与安全检查

### 6.1 按协议分层的钱包打开 API

现有 App 在 Protocol V1/V2 都可以继续使用兼容 `getPassphraseState()`；新调用方优先使用
`openWalletSession()` 显式表达钱包意图。两个入口都设置
`useDevicePassphraseState=false`，避免打开钱包时再次触发 passphrase 校验。V1
`getPassphraseState()` 保持原有无参数固件语义；V2 兼容层消费
`useEmptyPassphrase/initSession`，但不把调用方的 Passphrase 明文或
`passphraseState` 写入协议请求。标准钱包、隐藏钱包选择和显式恢复仍以
`openWalletSession()` 的 `mode` 语义最完整。

1. V1 兼容入口无参数调用 `getPassphraseStateWithRefreshDeviceInfo()`。
2. V2 兼容入口把 `useEmptyPassphrase=true` 映射为主 PIN 标准钱包，把
   `initSession=true` 映射为清理旧缓存后重新选择隐藏钱包。
3. 统一入口根据 `standard/select-hidden/resume-hidden` 映射到 V1 或 V2 实现。
4. 未传 `mode` 时按旧参数优先级归一化：`useEmptyPassphrase=true` 为 `standard`；
   否则 `initSession=true` 为新的 `select-hidden`；否则完整钱包绑定为 `resume-hidden`，
   无绑定为 `select-hidden`。
5. 旧 `initSession=true` 同时携带 `passphraseState` 时，只删除当前连接设备上该
   `deviceId + passphraseState` 对应的本地 Session，不清空该设备的其他隐藏钱包。
6. Protocol V2 / Pro2 每次钱包预检都发送
   `ProtocolInfoRequest { eventless_wallet_session: true }`。标准钱包首次打开时：passphrase 开启则
   `AskPin(Main) -> AskPassphrase('', seed_domains) -> Get()`；passphrase 关闭则
   `AskPin(Main) -> Get()`。缓存存在时发送
   `DeviceSessionGet(session_id, btc_test_address)`。隐藏钱包恢复时携带 `btc_test_address`，按新钱包
   选择时通常先发送 Ask，成功后发送 `DeviceSessionGet()`；设备已经由 Attach PIN 解锁时则复核
   实时状态并直接读取当前 `DeviceSession`，避免弹出 passphrase UI 或重复输入 Attach PIN。
7. 固件按 `btc_test_address` 校验当前 SE Session，并对带 `session_id` 的 Get 尝试恢复指定 Session。
   若首次 `passphraseState` 不匹配，标准钱包执行一次
   `AskPin(Main) -> AskPassphrase('', seed_domains) -> Get()`（passphrase 关闭则只 AskPin 再 Get）；
   隐藏钱包执行一次统一钱包选择及 `Ask -> Get()`。第二次仍不
   匹配才抛出 `DeviceCheckPassphraseStateError`。SDK 不为普通过期主动 `LockDevice`。
8. Pro2 隐藏钱包选择通过统一弹窗提供 Host 输入、设备输入和 Attach PIN。Host Passphrase 编码为
   `{ passphrase, on_device: false, seed_domains }`，仅用于当前阻塞请求，不缓存、记录或写入钱包引用；设备输入
   编码为 `{ on_device: true, seed_domains }`，不携带明文。Attach PIN 独立使用 `DeviceSessionAskPin`；
   需要 Cardano 时再发送空 Host passphrase 的 `AskPassphrase`，不弹出 UI。
9. Pro2 固件返回 `DeviceSession`：`session_id` 和 `btc_test_address`，SDK 将 `btc_test_address` 映射为上层 `passphraseState`。
10. Pro V1 仍走 `GetPassphraseState -> PassphraseState`，返回 `passphrase_state/session_id/unlocked_attach_pin`。
11. 如果 features 显示未开启 passphrase 但现在拿到了 state，会按需刷新设备状态。
12. 调 `updateInternalState()` 写入 session 缓存。

对 Pro / Pro2，API 返回中即使 `passphrase_protection` 不是 true，也可能返回
`passphraseState`。这是为了支持 Pro 系列的 passphrase / attach-to-pin 语义，不能简单套用
V1 设备“只有开启 passphrase 才返回 state”的规则。

### 6.2 支持判断

底层钱包状态获取的协议分支：

- Protocol V2 隐藏钱包使用 `AskPin/AskPassphrase -> Success -> DeviceSessionGet()`，
  标准钱包使用主 PIN 上下文。
- Protocol V1 在 features capability 包含 `Capability_AttachToPin`，或 Pro 固件版本
  `>= 4.15.0` 时使用 `GetPassphraseState`。

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

## 7. Pro1 Passphrase 与 Attach to PIN 行为基线

本节把 OneKey Pro（下文简称 Pro1、Protocol V1）的现有行为作为 Pro2 对齐基线。需要先区分三种凭据：

```text
设备主 PIN
├─ 解锁设备访问权限
└─ 不直接决定进入哪个钱包

Passphrase
├─ 参与 seed 派生并选择隐藏钱包
├─ 不同 passphrase 对应不同钱包
└─ 空 passphrase 对应标准钱包

Attach PIN
├─ 是绑定到特定 passphrase 的独立 PIN
├─ 输入后由设备恢复对应隐藏钱包上下文
└─ 不是设备主 PIN，也不是 passphrase 明文
```

可以把三者理解为：主 PIN 打开设备大门，passphrase 选择门内的保险箱，Attach PIN 是某个保险箱的快捷钥匙。

### 7.1 主 PIN 解锁与钱包选择是两个阶段

Pro1 先通过 `UnLockDevice -> UnLockDeviceResponse` 完成设备解锁：

```text
Host                                      Pro1
  │                                         │
  │ UnLockDevice                            │
  ├────────────────────────────────────────>│
  │                                         │ 设备显示主 PIN 输入
  │ UnLockDeviceResponse                    │
  │   unlocked                              │
  │   unlocked_attach_pin                   │
  │   passphrase_protection                 │
  │<────────────────────────────────────────┤
```

`UnLockDevice` 只确认设备访问权限和解锁类型，不保证隐藏钱包上下文已经建立。解锁后还要调用 `getPassphraseState()`，由 `GetPassphraseState` 触发真正的钱包选择与 seed session 建立。

### 7.2 GetPassphraseState 请求语义

支持原生 Attach to PIN 的 Pro1 使用：

```text
GetPassphraseState {
  passphrase_state?: string
  _only_main_pin?: bool
  allow_create_attach_pin?: bool
}
```

- 普通隐藏钱包请求：发送已知的 `passphrase_state`，首次进入时通常为空。
- 强制标准钱包：发送 `_only_main_pin=true`，对应上层 `useEmptyPassphrase=true`。
- 允许创建 Attach PIN：发送 `allow_create_attach_pin=true`，对应上层 `allowCreateAttachPin=true`。该字段只是允许固件进入创建流程，不等于主机直接创建绑定。

Pro1 的 passphrase 输入界面不是由请求参数直接打开，而是固件在建立 seed session 时发送 `PassphraseRequest` 后，由 SDK 和 UI 继续交互。

### 7.3 普通 passphrase 完整流程

```text
App / CLI                  SDK                         Pro1 Firmware / SE
    │                       │                                  │
    │ getPassphraseState    │                                  │
    ├──────────────────────>│                                  │
    │                       │ GetPassphraseState               │
    │                       ├─────────────────────────────────>│
    │                       │                                  │ 检查 seed session
    │                       │ PassphraseRequest                │
    │                       │<─────────────────────────────────┤
    │ REQUEST_PASSPHRASE    │                                  │
    │<──────────────────────┤                                  │
    │                       │                                  │
    │ 选择输入方式           │                                  │
    ├──────────────────────>│                                  │
    │                       │ PassphraseAck                    │
    │                       ├─────────────────────────────────>│
    │                       │                                  │ 派生钱包并建立 session
    │                       │ PassphraseState                  │
    │                       │<─────────────────────────────────┤
    │ passphraseState       │                                  │
    │ unlockedAttachPin     │                                  │
    │<──────────────────────┤                                  │
```

`PassphraseRequest` 可携带 `exists_attach_pin_user`，告诉 SDK 当前是否存在可选择的 Attach PIN 用户。SDK 将它转成 `UI_REQUEST.REQUEST_PASSPHRASE.existsAttachPinUser`。

UI 有三种响应方式：

```text
1. 主机输入 passphrase
   PassphraseAck { passphrase: "..." }

2. 设备输入 passphrase
   PassphraseAck { on_device: true }
   -> ButtonRequest_PassphraseEntry
   -> 设备显示 passphrase 输入框

3. 使用已有 Attach PIN
   前提：exists_attach_pin_user=true
   PassphraseAck { on_device_attach_pin: true }
   -> ButtonRequest_AttachPin
   -> 设备显示 Attach PIN 输入框
```

主机输入的 passphrase 在 SDK 中会先做 NFKD 规范化，再写入 `PassphraseAck.passphrase`。选择设备输入时，主机不传递 passphrase 明文。

### 7.4 标准钱包、隐藏钱包和 Attach PIN 三条路径

标准钱包：

```text
GetPassphraseState { _only_main_pin: true }
  -> 建立空 passphrase 的 seed session
  -> PassphraseState {
       passphrase_state: MainWalletState,
       session_id: MainSession,
       unlocked_attach_pin: false
     }
```

普通隐藏钱包：

```text
GetPassphraseState {}
  -> PassphraseRequest
  -> PassphraseAck { passphrase } 或 { on_device: true }
  -> 建立隐藏钱包 seed session
  -> PassphraseState {
       passphrase_state: HiddenWalletState,
       session_id: HiddenSession,
       unlocked_attach_pin: false
     }
```

使用已有 Attach PIN：

```text
GetPassphraseState {}
  -> PassphraseRequest { exists_attach_pin_user: true }
  -> PassphraseAck { on_device_attach_pin: true }
  -> ButtonRequest_AttachPin
  -> 用户在设备输入 Attach PIN
  -> SE 恢复 Attach PIN 绑定的 passphrase
  -> PassphraseState {
       passphrase_state: HiddenWalletState,
       session_id: HiddenSession,
       unlocked_attach_pin: true
     }
```

### 7.5 创建 Attach PIN

创建和使用已有 Attach PIN 是两条不同流程。创建入口由 host 显式授权：

公共调用方优先通过 `openWalletSession({ mode: 'select-hidden' })` 进入钱包选择流程，再由
`REQUEST_PASSPHRASE/uiResponse` 明确选择 Attach PIN。兼容 `getPassphraseState()` 在 Pro2
也可以沿用相同 UI 选择通道，但不提供显式恢复模式。

概念上的设备流程如下：

```text
选择或输入目标 passphrase
          │
          ▼
建立并确认目标隐藏钱包
          │
          ▼
设备进入 Attach PIN 创建流程
          │
          ▼
验证设备主 PIN / 用户授权
          │
          ▼
输入并确认新的 Attach PIN
          │
          ▼
SE 安全保存 Attach PIN -> passphrase 的受保护映射
          │
          ▼
返回最终 passphrase_state + session_id
```

SDK 不保存 Attach PIN 或 passphrase 映射；映射创建、验证、存储和恢复均属于固件与 SE 的安全边界。

### 7.6 PassphraseState 与 session 缓存

Pro1 最终返回：

```text
PassphraseState {
  passphrase_state
  session_id
  unlocked_attach_pin
}
```

- `passphrase_state` 是当前钱包的稳定指纹，不是 passphrase 明文。SDK 的兼容路径使用 BTC Testnet 固定地址作为状态指纹。
- `session_id` 是设备端 seed/passphrase session 句柄，用于复用已经建立的钱包上下文。
- `unlocked_attach_pin` 表示当前上下文是否通过 Attach PIN 恢复。

SDK 使用 `deviceId + passphraseState` 隔离不同钱包的 session：

```text
DeviceWalletSessionStore
└─ deviceId
   ├─ MainWalletState    -> MainSession
   ├─ HiddenWalletStateA -> HiddenSessionA
   └─ HiddenWalletStateB -> HiddenSessionB
```

没有明确 `passphraseState` 时，SDK 不应扫描或复用任意隐藏钱包 session，避免把主钱包请求路由到错误的隐藏钱包。

### 7.7 Attach PIN 安全校验

Attach PIN 的核心风险是：调用方认为自己正在访问主钱包或隐藏钱包 A，但设备实际通过 Attach PIN 恢复了隐藏钱包 B。SDK 因此会重新获取设备实际状态并比较：

```text
业务请求
  -> getPassphraseState
  -> 获取 actualPassphraseState + unlockedAttachPin
  -> 与 expectedPassphraseState / useEmptyPassphrase 比较

  ├─ 状态一致
  │   └─ 继续取地址或签名
  │
  ├─ 请求主钱包，但 unlockedAttachPin=true
  │   └─ lockDevice + clearInternalState + 抛错
  │
  └─ 请求隐藏钱包 A，但设备返回隐藏钱包 B
      └─ lockDevice + clearInternalState + 抛错
```

这里不能只检查“设备是否已解锁”。错误 passphrase 上下文仍能返回格式合法的地址和签名，但它们属于另一个钱包。

## 8. Attach to PIN 交互链路

### 8.1 protobuf 字段

V1 固件 schema 中与 attach-to-pin 相关的字段包括：

- `Initialize.is_contains_attach`
- `Features.attach_to_pin_user`
- `Features.unlocked_attach_pin`
- `PassphraseRequest.exists_attach_pin_user`
- `PassphraseAck.on_device_attach_pin`
- `ButtonRequest_AttachPin`
- `GetPassphraseState.allow_create_attach_pin`
- `PassphraseState.unlocked_attach_pin`

Pro2 不再使用旧的 `GetPassphraseState/PassphraseState`，也不依赖 firmware
`PassphraseRequest/PassphraseAck/ButtonRequest/ButtonAck` 中间状态。SDK 通过现有 UI Event
收集设备 Passphrase/Attach PIN 意图，再发送 `DeviceSessionAskPassphrase` 或
`DeviceSessionAskPin(AttachToPin)`，Ask 成功后使用 `DeviceSessionGet()` 读取当前 Session；恢复使用
`DeviceSessionGet({ session_id })`。
最终 session 来自 `DeviceSession.session_id`，passphraseState 来自
`DeviceSession.btc_test_address`。

Pro2 的状态字段来自 `DeviceStatus.passphrase_enabled`、
`attach_to_pin_enabled`、`unlocked_by_attach_to_pin`。`DeviceSessionAskPin` 成功后
Core 刷新 `DeviceStatus`，以确认实际解锁和钱包功能状态。

`attach_to_pin_enabled` 告诉 SDK 是否展示已有 Attach PIN 入口；
`unlocked_by_attach_to_pin` 用于最终安全检查。创建、更新或删除绑定仍属于设备设置页，不塞入钱包
Session 打开请求。

### 8.2 UI 事件流

Protocol V2 的钱包选择由 SDK 主动发起带 `deviceOnly=false` 的 `REQUEST_PASSPHRASE`，并通过
`existsAttachPinUser` 告知 App 是否展示 Attach PIN。App 回传 Host Passphrase 时发送
`{ passphrase }`，回传 `passphraseOnDevice` 时进入设备输入，回传 `attachPinOnDevice` 时进入
Attach PIN。三种 Ask 路径均返回 `Success`，随后由 Get 读取 Session。Host Passphrase 只在该次
交互中转交给固件，不进入日志、缓存或钱包 Session 公共响应。
如果 `select-hidden` 开始时设备已由 Attach PIN 解锁，则该选择已经在设备端完成；Core 不再触发
上述 UI/Ask 路径，而是复核 `DeviceStatus` 后直接读取当前 Session。
`DeviceSessionAskPassphrase` 必须显式携带 `on_device`：Host 输入发送
`{ passphrase, on_device: false }`，设备输入发送 `{ on_device: true }`。
Core 会再次执行幂等 NFKD 规范化，并按固件上限拒绝空值、NUL 或超过 50 个 UTF-8 字节的
Host Passphrase；正式 App 和 Expo Playground 的表单进一步限制为 1–50 个可打印 ASCII 字符。
`DeviceSessionGet` 的 `session_id` 可选。无 ID 返回当前 Session，带 ID 尝试恢复；固件始终返回
最终实际 Session，由 SDK 比较 `passphraseState` 并决定是否执行一次恢复。
Protocol V1 继续保留原
`PassphraseRequest -> PassphraseAck` 行为。

### 8.3 attach PIN 与 session 修复

Attach to PIN 的核心风险是：用户表面上没有手动输入 passphrase，但设备端已经根据绑定 PIN 切换到了某个隐藏钱包 passphrase 上下文。

因此 SDK 在获取设备 session 后必须用固件返回的真实 `passphraseState/session_id` 修正本地状态；attach PIN 解锁状态由 Pro2 `DeviceInfo.status.unlocked_by_attach_to_pin` 或 V1 `PassphraseState.unlocked_attach_pin` 提供：

```text
DeviceSessionGet / GetPassphraseState
  -> DeviceSession(btc_test_address, session_id) / PassphraseState(passphrase_state, session_id)
  -> updateInternalState()
  -> DeviceWalletSessionStore.set(deviceId, passphraseState, session_id)
```

同时普通业务调用前还会比较调用方传入的 passphraseState 和设备实际返回的 state。如果 attach PIN 解锁到的 hidden wallet 与调用方预期不一致，SDK 会锁设备并清缓存。

## 9. Pro2 Firmware / SDK 职责边界

Protocol V2 采用“Host 明确选择入口、Firmware 在设备端执行钱包切换、Core 校验身份”的边界：

| 能力                | Firmware / SE 职责                           | SDK / Host 职责                                                        |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| 标准钱包            | AskMain 时按需解锁或重置为标准钱包上下文     | 协商 eventless；发送 AskMain，再由 Get 读取实际 Session                |
| Passphrase 钱包     | 接收 Host 明文并切换钱包上下文               | 发送非空 `passphrase`，再由 Get 读取实际 Session；设备端输入明确不支持 |
| 使用已有 Attach PIN | 在设备端验证 Attach PIN，恢复绑定 Passphrase | 刷新状态并校验 `unlocked_by_attach_to_pin`                             |
| Session 获取/恢复   | Get 无 ID 返回当前 Session；带 ID 尝试恢复   | 比较实际 `passphraseState`，不匹配时最多恢复一次                       |
| 钱包标识            | 返回最终 `btc_test_address + session_id`     | 映射为 `passphraseState + newSession`，校验预期钱包                    |
| 主 PIN / 解锁       | 按需显示 PIN/指纹，并返回成功或失败          | 发送带明确类型的 `DeviceSessionAskPin`，随后刷新状态和读取 Session     |
| Attach PIN 绑定管理 | 在设备设置页创建、更新或删除绑定             | 打开设置页并刷新状态，不把管理动作塞进钱包 Session 请求                |

`PassphraseAck` 只属于 Protocol V1 的 firmware 中间请求流程。Pro2 的
拆分后的 Session 请求是 Core 内部选择/恢复隐藏钱包的协议命令，不是公共查询 API。
Host passphrase 在 Core 中先执行 NFKD 规范化；结果必须为 1–50 个合法 UTF-8 字节，且不含
NUL 或孤立 UTF-16 surrogate。这样可以避免 JavaScript/Protobuf 编码器替换非法字符串后进入
与用户输入不同的钱包。
公共 `Features`、`DeviceState.raw`、设备事件和日志均不得包含 `session_id`；
Session 仅保存在按设备和 `passphraseState` 隔离的内部缓存中。

## 10. Protocol V2 transport session 与 seq 管理

### 10.1 ProtocolV2Session 的职责

`ProtocolV2Session` 是 V2 通信的统一会话层，职责包括：

- 每次 call 前递增 `protoSeq`，范围 1-255，跳过 0。
- encode protobuf payload 到 `0x5A` V2 frame。
- 调 transport 的 `writeFrame()` 和 `readFrame()`。
- 按 expectedTypes / intermediateTypes 过滤响应。
- 串行化同一 session 上的调用，避免两个并发调用互相消费响应。
- 写阶段有 watchdog；读阶段使用调用指定 timeout，未指定时使用共享的 5 分钟上限，
  避免无限等待，同时允许用户确认和固件安装设置更合适的业务超时。

这里的 `seq` 是协议帧序号，不等同于设备 `session_id`。它用于 V2 帧级诊断和顺序控制；设备 wallet/passphrase session 仍由固件消息里的 `session_id` 表达。

### 10.2 transport 中的 Link 管理

当前 USB、WebUSB 和 BLE Transport 都通过 `ProtocolV2LinkManager` 按设备 key 管理 V2 Link：

- 同一设备的调用进入串行队列，避免两个请求互相消费响应。
- Link 内复用 `ProtocolV2Session`、frame assembler 和平台 adapter。
- `ProtocolV2SequenceCursor` 在普通 Link 失效、release 和 reconnect 后继续保留。
- Transport dispose 才清除 Cursor 和全部 Link 状态。
- USB 使用 generation 隔离旧 endpoint 回调；BLE adapter 负责 notification、receiver 和原生订阅清理。

所有 Transport 都使用 `ProtocolV2FrameAssembler` 重组完整 `0x5A` frame，并校验 SOF、长度和 CRC。平台层不理解 protobuf，只负责可靠传输 bytes。完整生命周期见 [SDK 关键架构决策](../architecture/decisions.md) 和 [Protocol V1/V2 传输协议](../protocol/protocol-v1-v2.md)。

## 11. 固件/SE 侧 session 来源

Pro2 子模块里可以看到 SE session 的底层处理：

- `handle_session_new()` 调 `SE_CMD_SESSION_START` 生成 32 字节 session_id。
- `handle_session_open()` 调 `SE_CMD_SESSION_OPEN` 打开指定 session_id。
- MicroPython 扩展 `se_start_session()` 在未打开 session 时会 new + open。

这说明 device `session_id` 本质上是安全芯片/固件侧的 seed/passphrase session 句柄。SDK 缓存它的目的不是绕过安全校验，而是在同一 passphraseState 下复用设备已经建立的上下文，减少重复输入 passphrase 或重复初始化成本。

## 12. 典型流程

### 12.1 访问隐藏钱包并缓存 session

```text
App 在“打开钱包”阶段读取并缓存 protocol
  -> V1 暂时保持 App 现有 Legacy 钱包流程
  -> V2 调 openWalletSession(standard | select-hidden | resume-hidden)
  -> core 找到 Device
  -> Device.initialize()
  -> Pro2: AskPin/AskPassphrase（创建）或 DeviceSessionGet（恢复） / Pro V1: GetPassphraseState
  -> 固件返回 passphraseState；session_id 只写入 Core 内部 Store
  -> SDK updateInternalState(deviceId, passphraseState, optional sessionId)
  -> App 仍只用 passphraseState 标识钱包，后续业务调用参数不变
```

后续签名/取地址：

```text
App 调 evmGetAddress({ passphraseState })
  -> Device.initialize({ deviceId, passphraseState })
  -> V1 先用无钱包绑定字段的 Initialize 校验实时 deviceId
  -> getInternalState() 命中 deviceId@passphraseState
  -> V1 身份一致后才通过第二次 Initialize 透传 session_id/passphrase_state
  -> Pro2 后续安全检查使用 DeviceSessionGet({ session_id })
  -> core 再 checkPassphraseStateSafety()
  -> method.run()
```

App 不应在每次 signer 或地址调用之前重复执行 `openWalletSession()`。迁移只发生在创建、
恢复或切换钱包的阶段：V1 保持原有入口及参数，V2 使用统一入口。这样 App 现有的
`deviceId + passphraseState` 钱包 key、预热初始化和所有业务指令参数都无需改变；
`sessionId` 仍由 Core 的 `DeviceWalletSessionStore` 管理，不进入公共响应、App 的钱包主键或
`DeviceState`。

### 12.2 请求主钱包但设备通过 attach PIN 解锁

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

### 12.3 attach PIN 解锁到错误隐藏钱包

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

## 13. 为什么要这么设计

### 13.1 安全优先：不能把“连接成功”当成“钱包上下文正确”

硬件钱包通信里有多个状态：设备是否连接、是否被 SDK acquire、是否已输入 PIN、当前 passphrase 是哪个、当前 seed 是哪个。只要 passphrase 上下文错了，地址和签名仍然能成功返回，但对应的是错误钱包。因此 SDK 必须在业务调用前校验 passphraseState。

### 13.2 用户体验：复用 session，减少重复输入

`session_id` 缓存让同一个 `deviceId@passphraseState` 可以复用设备端已建立的 session。对 CLI、DApp 和移动端来说，这能减少重复 passphrase 输入，尤其是隐藏钱包和 Cardano 派生这类耗时流程。

### 13.3 兼容性：Pro / Touch / V1 设备 / Pro2 协议并存

SDK 需要同时支持：

- V1 设备没有 `GetPassphraseState` 时，只能用 Testnet `GetAddress` 回退。
- Pro V1 新固件支持 Attach to PIN，需要使用 `GetPassphraseState` 和扩展字段。
- Pro2 V2 不走 `Initialize/GetFeatures/GetPassphraseState` 固件消息，使用 `DeviceInfoGet` 与
  `DeviceStatusGet/DeviceSessionAskPin/DeviceSessionAskPassphrase/DeviceSessionGet`；Core 同时通过
  兼容 `getPassphraseState()` 和显式 `openWalletSession()` 暴露钱包语义。

因此现在的实现是“V1/V2 兼容 `getPassphraseState()` + V1/V2 显式
`openWalletSession()` + 协议能力检测 + 状态 adapter”，而不是只按设备型号硬编码。

### 13.4 身份隔离：serialNo、deviceId、sessionId 不能混用

serialNo 稳定指向硬件，deviceId 指向钱包初始化生命周期，session_id 指向设备端解锁会话。把它们混用会产生两类问题：

- 把旧 seed 的 session 用到新 seed。
- 把物理设备身份误当 seed 身份，导致 wipe 后仍误认为是同一钱包。

所以 Pro2 即使有 serialNo，也只接受 `DeviceStatus.device_id` 作为 deviceId；session cache
也优先以 deviceId + passphraseState 作为 key。

### 13.5 并发与可靠性：V2 call 必须串行

Protocol V2 的响应当前主要按类型匹配。如果同一 session 上两个 call 并发，一个调用可能消费另一个调用的响应。`ProtocolV2Session.pendingCall` 强制串行，是为了保证响应归属确定。

## 14. 当前实现注意点

1. `getInternalState()` 没有 passphraseState 就不会查 session cache，这是当前最重要的安全边界。
2. Pro2 的 `DeviceInfoGet` 使用当前固件真实字段，`status.passphrase_enabled` 映射到 SDK `passphrase_protection`。
3. `supportProSeriesAttachPinPassphrase()` 只适用于 V1 Pro；统一
   `openWalletSession()` 在 V1 映射到旧 Passphrase 交互，在 Pro2 映射到
   拆分后的 Ask/Get 钱包流程。
4. 业务方法如设置、固件、文件、设备状态类通常会设置 `useDevicePassphraseState=false`，避免无意义触发 passphrase 校验。
5. 钱包业务方法只要接收 `deviceId`，就必须启用实时设备身份检查；Protocol V1 在身份确认前不得透传缓存 Session。

## 15. 关键源码索引

- Core 调度与 passphrase 校验：`packages/core/src/core/index.ts`
- Device 生命周期与 session 缓存：`packages/core/src/device/Device.ts`
- PIN / passphrase / attach PIN 中间消息：`packages/core/src/device/DeviceCommands.ts`
- passphraseState 获取与 attach-to-pin session 修复：`packages/core/src/utils/deviceFeaturesUtils.ts`
- 统一钱包打开 API：`packages/core/src/api/GetPassphraseState.ts`
- 统一钱包缓存清理 API：`packages/core/src/api/ClearSessionCache.ts`
- 设备池与物理设备缓存：`packages/core/src/device/DevicePool.ts`
- Protocol V2 session：`packages/hd-transport/src/protocols/v2/session.ts`
- Protocol V2 frame seq：`packages/hd-transport/src/protocols/v2/encode.ts`
- Protocol V2 frame 重组：`packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- Pro2 features adapter：`packages/core/src/protocols/protocol-v2/features.ts`
- Protocol V2 标准 features 构建：`packages/core/src/deviceProfile/buildDeviceFeatures.ts`
- Pro2 session protobuf：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_session.proto`
- Pro2 status protobuf：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_status.proto`
- 固件 SE session handler：`submodules/firmware-pro2/tasks/task_se_agent/handlers/se_handlers_session.c`
