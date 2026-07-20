# 钱包 Session、Passphrase 与 Attach-to-PIN

## 1. 范围与核心结论

本文梳理当前 SDK 中 Pro / Pro2 设备初始化、passphrase、session_id、deviceId 以及 Attach to PIN 相关逻辑。重点关注硬件层上下游如何协同管理 session，而不是单个 API 的参数说明。

当前代码里需要区分五类“会话/身份”：

| 名称                         | 所在层级                                   | 含义                                                                                         | 生命周期                                          |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| transport session / `mainId` | transport / Device                         | SDK 与 transport 占用设备的连接句柄。USB 下通常是 bridge/webusb session；BLE 下通常是 uuid。 | acquire 到 release                                |
| device `session_id`          | 固件/SE + V1 Features / Pro2 DeviceSession | 设备端 passphrase/seed session 的标识，用于复用已解锁的钱包上下文。                          | 设备端生成，SDK 缓存到 `DeviceWalletSessionStore` |
| `device_id`                  | V1 Features                                | 当前 seed 对应的身份，换 seed / wipe 后会变化。                                              | 随 seed 变化                                      |
| serialNo / uuid              | 硬件身份                                   | 硬件序列号，用于识别物理设备。                                                               | 物理设备稳定                                      |
| Protocol V2 frame `seq`      | hd-transport ProtocolV2Session             | V2 帧级请求序号，解决分片/应答跟踪与日志定位。                                               | 每个 Transport/设备 key 的 Cursor 内递增          |

一句话总结：**transport session 解决“和哪台设备通信”，device `session_id` 解决“设备端当前解锁的是哪个 passphrase 上下文”，`device_id` 解决“当前 seed 身份是否匹配”，V2 `seq` 解决“这一帧属于哪个协议调用顺序”。**

### 当前公共契约

以下规则代表当前 SDK 对外行为；本文后续保留的调查过程和历史问题记录只用于解释设计背景：

- Protocol V1 通过 `GetPassphraseState` 获取钱包标识；不支持时可以回退到固定测试网地址。
- Pro2 / Protocol V2 通过内部钱包会话流程调用 `DeviceSessionOpen(resume/select)`，并把 `btc_test_address` 归一化为公共概念 `passphraseState`。
- 公开 `getPassphraseState()` 返回 `string | undefined`，不会返回 session ID、Attach PIN 解锁结果或保护状态对象。
- 缓存 session 无效时，SDK 识别 `Failure_InvalidSession`，只清理当前隐藏钱包缓存，再在原调用内请求 App 重新选择进入方式。
- 标准钱包不使用 Session Store，也不调用 `DeviceSessionOpen`；不会引入 `STANDARD_WALLET_KEY`。
- `initSession=true`、钱包标识不匹配、设备切换或断开，以及显式 `clearSessionCache` 都会使缓存失效。
- 调用方提供预期 `passphraseState` 时，设备返回的钱包标识必须一致，否则 SDK 清缓存并抛出钱包状态校验错误。

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
- 作为 `DeviceWalletSessionStore` 的设备 key，避免不同 seed 的 session 混用。

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

`DeviceWalletSessionStore` 使用两级 Map 保存钱包 Session：

```text
deviceKey
└─ passphraseState -> sessionId
```

`deviceKey` 优先使用 seed 身份 `deviceId`，设备身份尚未建立时可以使用当前物理设备缓存键；身份从临时键迁移到正式 `deviceId` 时，Store 会迁移已有 Session。

当前 `getInternalState()` 有一个重要安全不变量：

```text
没有 this.passphraseState 时，不查 session 缓存。
```

也就是说，实际读取钱包 Session 时必须带 `passphraseState`。Store 可以暂存刚由设备返回、但尚未绑定钱包标识的 pending Session；pending 状态只用于同一次初始化链路，不能作为任意钱包的查询结果。

### 5.2 为什么必须带 passphraseState

旧逻辑如果在没有 passphraseState 时扫描 `${deviceId}@*`，会产生两个风险：

1. 用户要访问主钱包或空 passphrase，却被路由到某个隐藏钱包 session。
2. 同一 deviceId 下存在多个隐藏钱包，SDK 可能复用到错误的 passphrase session。

因此现在的策略是：**passphraseState 是 device session 复用的必要条件**。公开 `getPassphraseState()` 只返回 `passphraseState`，不会暴露 `session_id`。CLI 短生命周期场景如果要跨进程复用 session，必须从 CLI 自己的受控持久化中同时恢复 `deviceId + passphraseState + sessionId`，再用 `preloadSessionCache(deviceId, passphraseState, sessionId)` 预热缓存，并确保后续调用携带同一个 passphraseState。

### 5.3 写缓存的入口

主要有三个入口：

1. `setInternalState(state, initSession)`  
   在 V1 `Initialize -> Features` 后调用。只有存在 `passphraseState` 或 `initSession=true` 时才写缓存。

2. `updateInternalState(enablePassphrase, passphraseState, deviceId, sessionId, featuresSessionId)`  
   在 `getPassphraseStateWithRefreshDeviceInfo()` 之后调用。优先使用固件返回的 `session_id`，没有则使用 `features.session_id`。

3. `preloadSessionCache(deviceId, passphraseState, sessionId)`  
   给 CLI 等短生命周期进程使用，用外部已知 session 预填缓存。

`updateInternalState()` 会把设备返回的最终 Session 绑定到真实 `passphraseState`，并删除当前设备的 pending Session，避免未绑定状态继续影响后续请求。

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
3. Protocol V2 / Pro2 的标准钱包直接使用设备默认空 Passphrase 上下文；隐藏钱包缓存发送 `DeviceSessionOpen(resume session_id)`。
4. 缓存 `session_id` 无法打开时，固件返回 InvalidSession；SDK 清理当前钱包缓存，通过既有 `REQUEST_PASSPHRASE/uiResponse` 获取进入方式，再发送 `DeviceSessionOpen(select access)`。
5. Host Passphrase 由 App 输入并做 NFKD 规范化；设备 Passphrase 和 Attach PIN 只在设备输入，SDK 会合成对应的第二阶段等待 Event。
6. Pro2 固件返回 `DeviceSession`：`session_id` 和 `btc_test_address`，SDK 将 `btc_test_address` 映射为上层 `passphraseState`。
7. Pro V1 仍走 `GetPassphraseState -> PassphraseState`，返回 `passphrase_state/session_id/unlocked_attach_pin`。
8. 如果 features 显示未开启 passphrase 但现在拿到了 state，会按需刷新设备状态。
9. 调 `updateInternalState()` 写入 session 缓存。

对 Pro / Pro2，API 返回中即使 `passphrase_protection` 不是 true，也会返回 `passphraseState`。这是为了支持 Pro 系列的 passphrase / attach-to-pin 语义，不能简单套用 V1 设备“只有开启 passphrase 才返回 state”的规则。

### 6.2 支持判断

`getPassphraseState()` 的协议分支：

- Protocol V2 使用 `DeviceSessionOpen -> DeviceSession`。
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
    │ sessionId             │                                  │
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

```text
getPassphraseState({
  initSession: true,
  allowCreateAttachPin: true
})
  -> GetPassphraseState { allow_create_attach_pin: true }
```

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
`PassphraseRequest/PassphraseAck/ButtonRequest/ButtonAck` 中间状态。SDK 主动发送
`DeviceSessionOpen(select/resume)`；普通 Passphrase 可由 App 或设备输入，主 PIN 与 Attach PIN
只在设备输入。最终 session 来自 `DeviceSession.session_id`，passphraseState 来自
`DeviceSession.btc_test_address`。

Pro2 的状态字段来自 `DeviceInfo.status.passphrase_enabled`、
`attach_to_pin_enabled`、`unlocked_by_attach_to_pin`，解锁响应则直接来自
`DeviceSessionPinResult`。`deviceUnlock` 不需要再调用 `DeviceStatusGet`。

`attach_to_pin_enabled` 告诉 SDK 是否展示已有 Attach PIN 入口；
`unlocked_by_attach_to_pin` 用于最终安全检查。创建、更新或删除绑定仍属于设备设置页，不塞入钱包
Session 打开请求。

### 8.2 UI 事件流

Protocol V2 的钱包会话协调器主动发送兼容 UI Event：

```text
UI_REQUEST.REQUEST_PASSPHRASE {
  device,
  passphraseState: device.passphraseState,
  existsAttachPinUser,
  source: 'wallet-session-coordinator',
  reason: 'open-wallet' | 'session-recovery'
}
```

UI 返回后：

- 普通软件输入 passphrase：`DeviceSessionOpen(select HIDDEN, host_passphrase)`
- 在设备上输入 passphrase：先补发 `REQUEST_PASSPHRASE_ON_DEVICE`，再发送 `select HIDDEN, passphrase_on_device`
- 选择 attach PIN：先补发兼容的 `REQUEST_PIN/ButtonRequest_AttachPin`，再发送 `select HIDDEN, attach_pin_on_device`

这些 Event 来自 SDK coordinator，不是伪造的 firmware protobuf Request。Protocol V1 继续保留原
`PassphraseRequest -> PassphraseAck` 行为。

### 8.3 attach PIN 与 session 修复

Attach to PIN 的核心风险是：用户表面上没有手动输入 passphrase，但设备端已经根据绑定 PIN 切换到了某个隐藏钱包 passphrase 上下文。

因此 SDK 在获取设备 session 后必须用固件返回的真实 `passphraseState/session_id` 修正本地状态；attach PIN 解锁状态由 Pro2 `DeviceInfo.status.unlocked_by_attach_to_pin` 或 V1 `PassphraseState.unlocked_attach_pin` 提供：

```text
DeviceSessionOpen / GetPassphraseState
  -> DeviceSession(btc_test_address, session_id) / PassphraseState(passphrase_state, session_id)
  -> updateInternalState()
  -> DeviceWalletSessionStore.set(deviceId, passphraseState, session_id)
```

同时普通业务调用前还会比较调用方传入的 passphraseState 和设备实际返回的 state。如果 attach PIN 解锁到的 hidden wallet 与调用方预期不一致，SDK 会锁设备并清缓存。

## 9. Pro2 Firmware / SDK 职责边界

Protocol V2 采用“Host 显式选择、Firmware 本地完成设备交互”的边界：

| 能力                | Firmware / SE 职责                                           | SDK / Host 职责                                                         |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 标准钱包            | 保持默认空 Passphrase seed 上下文                             | 不调用 `DeviceSessionOpen`，不访问隐藏钱包缓存                          |
| Host Passphrase     | 使用请求携带的 Passphrase 建立隐藏钱包 Session               | 通过既有 UI Event 获取输入、NFKD 规范化、发送 `host_passphrase`         |
| 设备 Passphrase     | 直接显示设备 Passphrase 页面并建立 Session                   | 先补发等待设备 Event，再发送 `passphrase_on_device`                     |
| 使用已有 Attach PIN | 直接显示 Attach PIN 页面，恢复绑定 Passphrase 并建立 Session | 根据 `attach_to_pin_enabled` 展示入口，发送 `attach_pin_on_device`      |
| Session 恢复        | 打开指定 Session，失败返回稳定 InvalidSession                | 按 `deviceKey + passphraseState` 缓存，失效时只删除当前项并重新协调选择 |
| 钱包标识            | 返回最终 `btc_test_address + session_id`                     | 映射为 `passphraseState + newSession`，校验预期钱包                     |
| 主 PIN / 解锁       | 在设备显示 PIN/指纹页面并返回结果                            | 发送 `DeviceSessionAskPin`，不收集 Host PIN                             |
| Attach PIN 绑定管理 | 在设备设置页创建、更新或删除绑定                             | 打开设置页并刷新状态，不把管理动作塞进 `DeviceSessionOpen`              |

`PassphraseAck` 只属于 Protocol V1 的 firmware 中间请求流程。Pro2 的
`DeviceSessionOpen` 不是简单改名：它承载三种隐藏钱包选择和 `resume session_id`；标准钱包不进入该协议流程。

## 10. Protocol V2 transport session 与 seq 管理

### 10.1 ProtocolV2Session 的职责

`ProtocolV2Session` 是 V2 通信的统一会话层，职责包括：

- 每次 call 前递增 `protoSeq`，范围 1-255，跳过 0。
- encode protobuf payload 到 `0x5A` V2 frame。
- 调 transport 的 `writeFrame()` 和 `readFrame()`。
- 按 expectedTypes / intermediateTypes 过滤响应。
- 串行化同一 session 上的调用，避免两个并发调用互相消费响应。
- 写阶段有 watchdog；读阶段按调用可选 timeout，避免用户确认和固件安装被默认短超时截断。

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
- `handle_session_get_current_id()` 调 `SE_CMD_SESSION_GET_CURRENT_ID` 查询当前 session_id。
- MicroPython 扩展 `se_start_session()` 在未打开 session 时会 new + open。

这说明 device `session_id` 本质上是安全芯片/固件侧的 seed/passphrase session 句柄。SDK 缓存它的目的不是绕过安全校验，而是在同一 passphraseState 下复用设备已经建立的上下文，减少重复输入 passphrase 或重复初始化成本。

## 12. 典型流程

### 12.1 访问隐藏钱包并缓存 session

```text
App 调 getPassphraseState(connectId)
  -> core 找到 Device
  -> Device.initialize()
  -> Pro2: DeviceSessionOpen(select) / Pro V1: GetPassphraseState
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
  -> Pro2 后续安全检查使用 DeviceSessionOpen(resume session_id)
  -> core 再 checkPassphraseStateSafety()
  -> method.run()
```

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
- Pro2 V2 不走 `Initialize/GetFeatures/GetPassphraseState` 固件消息，使用 `DeviceInfoGet` 与 `DeviceSessionOpen`，但仍要向上层暴露兼容 features 和 `getPassphraseState()` API。

因此现在的实现是“能力检测 + 协议分支 + features adapter”，而不是只按设备型号硬编码。

### 13.4 身份隔离：serialNo、deviceId、sessionId 不能混用

serialNo 稳定指向硬件，deviceId 指向 seed，session_id 指向设备端解锁会话。把它们混用会产生两类问题：

- 把旧 seed 的 session 用到新 seed。
- 把物理设备身份误当 seed 身份，导致 wipe 后仍误认为是同一钱包。

所以 Pro2 里即使有 serialNo，也不填充 deviceId；session cache 也优先以 deviceId + passphraseState 作为 key。

### 13.5 并发与可靠性：V2 call 必须串行

Protocol V2 的响应当前主要按类型匹配。如果同一 session 上两个 call 并发，一个调用可能消费另一个调用的响应。`ProtocolV2Session.pendingCall` 强制串行，是为了保证响应归属确定。

## 14. 当前实现注意点

1. `getInternalState()` 没有 passphraseState 就不会查 session cache，这是当前最重要的安全边界。
2. Pro2 的 `DeviceInfoGet` 使用当前固件真实字段，`status.passphrase_enabled` 映射到 SDK `passphrase_protection`。
3. `supportProSeriesAttachPinPassphrase()` 只适用于 V1 Pro，Pro2 在 `getPassphraseState()` 中直接走 `DeviceSessionOpen` 协调流程。
4. 业务方法如设置、固件、文件、设备状态类通常会设置 `useDevicePassphraseState=false`，避免无意义触发 passphrase 校验。

## 15. 关键源码索引

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
