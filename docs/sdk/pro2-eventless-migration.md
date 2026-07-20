# Pro2 无固件中间 Event：SDK / App / firmware 迁移清单

产品与协议总设计见：
[Pro2 无固件中间 Event 设计索引](../superpowers/specs/2026-07-16-pro2-eventless-index.md)。

## 一页结论

本次迁移不删除 SDK 与 App 之间的 Event。删除的是 Pro2 firmware 在业务请求中间发送并等待 Host ACK
的 UI 消息：

- `PassphraseRequest / PassphraseAck`。
- `ButtonRequest / ButtonAck`。
- `PinMatrixRequest / PinMatrixAck`。

迁移后的稳定分层是：

```text
App
  继续监听 SDK UI Event，并在阻塞选择场景调用 uiResponse()

hardware-js-sdk
  根据 API 参数、Session 状态和 DeviceLocked 合成 Event
  将用户选择转换为显式 Protocol V2 命令

firmware-pro2
  收到显式命令后直接显示设备 UI
  不发送 UI 中间消息，只返回最终业务结果
```

原 Pro / Protocol V1 保持现有 firmware Event + ACK 流程。App 可以继续使用同一套公共 Event UI，
SDK 内部根据协议版本选择 Event 来源和后续动作。

### 不是协议消息改名

`DeviceSessionOpen` 不是 `PassphraseAck` 的简单改名：

- `PassphraseAck` 是对 firmware `PassphraseRequest` 的中间回复，只表达 Host Passphrase、设备
  Passphrase 或 Attach PIN 三种隐藏钱包进入方式。
- `DeviceSessionOpen(select)` 主动执行钱包选择并返回最终 Session；它承接上述三种参数语义，同时
  还支持 `select STANDARD`。
- `DeviceSessionOpen(resume)` 承接原 `Initialize/DeviceSessionGet(session_id)` 的 Session 恢复语义，
  这不是 `PassphraseAck` 原有能力。
- `ButtonRequest/ButtonAck` 不改名；它们从 V2 firmware 状态机中删除，设备页面由 select 命令内部
  打开，对 App 的阶段提示由 SDK 合成。

```text
PassphraseAck(passphrase)                -> select HOST_PASSPHRASE
PassphraseAck(on_device)                 -> select DEVICE_PASSPHRASE
PassphraseAck(on_device_attach_pin)      -> select ATTACH_PIN
无 PassphraseAck 等价能力                -> select STANDARD
Initialize/DeviceSessionGet(session_id)  -> resume session_id
```

## 不在删除范围

- USB/BLE 请求响应与 BLE notification。
- 文件、固件、资源和 Portfolio 进度。
- 交易数据分片 Request/Ack。
- 设备连接、状态和能力事件。
- SDK 生成的 checking、processing、progress 和 UI Event。
- `CLOSE_UI_WINDOW/CLOSE_UI_PIN_WINDOW`。

## 模块迁移总表

| 模块         | SDK → App                       | App 响应             | SDK → firmware                     | firmware 行为                                            |
| ------------ | ------------------------------- | -------------------- | ---------------------------------- | -------------------------------------------------------- |
| 钱包 Session | `REQUEST_PASSPHRASE` 阻塞选择   | `RECEIVE_PASSPHRASE` | `DeviceSessionOpen(select/resume)` | Host/设备 Passphrase 或设备 Attach PIN，返回最终 Session |
| PIN / 解锁   | `REQUEST_PIN` 非阻塞提示        | 无                   | `DeviceSessionAskPin`              | 本地 PIN/指纹，返回解锁结果                              |
| 地址 / 公钥  | `REQUEST_BUTTON` 非阻塞提示     | 无                   | 原地址/公钥方法                    | 本地确认，返回最终数据                                   |
| 签名         | `REQUEST_BUTTON` 非阻塞通用提示 | 无                   | 原签名方法 + 数据握手              | 本地完成所有确认页                                       |
| 设备管理     | `REQUEST_BUTTON` 非阻塞提示     | 无                   | 页面命令或最终操作命令             | 本地设置/危险操作 UI                                     |
| Onboarding   | 可选非阻塞阶段通知              | 无                   | 状态查询/页面命令                  | 本地流程；状态查询为事实来源                             |
| Cancel       | 关闭 UI 可取消当前调用          | cancel API/调用取消  | `Cancel`                           | 关闭当前页面并结束原请求                                 |

## 钱包 Session：兼容现有 App Event UI

### App 现有链路

app-monorepo 已通过以下模块处理硬件钱包选择：

- `HardwareUiStateContainer.tsx` 监听 `REQUEST_PASSPHRASE`。
- `HardwareEnterPhase.tsx` 展示 Passphrase/Hidden Wallet PIN 进入方式。
- `ServiceHardwareUI.ts` 通过 `UI_RESPONSE.RECEIVE_PASSPHRASE` 返回选择。
- `ServiceAccount.createHWHiddenWallet()` 继续使用 `passphraseState` 标识隐藏钱包。

Pro2 继续进入这套 Event UI，但 payload 必须声明：

```ts
{
  device: KnownDevice,
  source: 'wallet-session-coordinator',
  passphraseState: expectedPassphraseState,
  existsAttachPinUser: boolean,
  reason: 'open-wallet' | 'session-recovery',
  expectedPassphraseState?: string,
}
```

App 的 Pro2 分支继续接受现有三种选择：

- App 输入 Passphrase。
- `passphraseOnDevice=true`。
- `attachPinOnDevice=true`，且 `existsAttachPinUser=true`。
- 用户取消。

SDK 将响应转换为 `DeviceSessionOpen(select)`，而不是 `PassphraseAck`。`resume` 只恢复指定 Session，
不能打开设备钱包选择 UI；隐藏钱包 resume 失效时，SDK 在原业务调用内发 Event、执行 select、校验
`btc_test_address`，然后继续原业务，不要求 App 重放请求。

## SDK 公共 Event 适配

### Protocol V1

保留当前 DeviceCommands 和 Core handler：

```text
firmware Request -> Core Event -> App uiResponse -> firmware Ack
```

### Protocol V2

- `_filterCommonTypes()` 不消费 Pro2 `ButtonRequest/PinMatrixRequest/PassphraseRequest`。
- 收到这些消息时记录协议回归并结束请求，不能静默 ACK。
- 不删除公共 `REQUEST_PIN/REQUEST_PASSPHRASE/REQUEST_BUTTON` listener。
- Event 改由 method lifecycle、unlock coordinator 或 wallet session coordinator 发出。
- Event payload 带 `source/reason`，App 不应依赖“Event 必然来自 firmware”。

### 阻塞与非阻塞

```text
阻塞选择 Event
  emit -> 建立受控 UI 等待 -> uiResponse -> 显式业务命令

非阻塞提示 Event
  emit -> 直接发送业务命令 -> 等待最终结果
```

当前 Core `_uiPromises` 只按 `UI_RESPONSE` 类型匹配。新增合成阻塞 Event 时必须继续串行，或增加
requestId/connectId 关联，并在取消、超时、断连和方法结束时清理。

## 自动解锁

```text
业务请求
  -> DeviceLocked（必须发生在副作用前）
  -> SDK emit REQUEST_PIN(deviceOnly, source=unlock-coordinator)
  -> DeviceSessionAskPin
  -> 解锁成功后 method.run() 只重试一次
```

- App 不回传 PIN，也不重发业务请求。
- Pro2 `REQUEST_PIN` 是非阻塞设备提示。
- 非幂等方法只有在 firmware 保证 locked 发生于副作用前时才能启用自动重试。
- 同一设备并发调用共享串行解锁任务。

## 地址、公钥、签名和设备管理

这些场景统一使用 SDK 合成的非阻塞 `REQUEST_BUTTON`：

- 地址/公钥：仅 `showOnOneKey=true` 时发送。
- 签名：进入设备签名交互时发送一次通用提示，不逐页复刻输出/费用/风险 Button code。
- 设备管理：根据页面导航或危险操作发送；明确区分“页面已接受”和“操作已完成”。

App 继续展示现有设备确认 UI，不调用 `uiResponse()`。成功、失败、取消、超时和断连时统一关闭。

## Onboarding 安全边界

- Pro2 禁止 `WordRequest/WordAck` 与 `EntropyRequest/EntropyAck`。
- SDK 不得为兼容 App 而合成这些敏感数据请求。
- `DevOnboardingStatus` 是事实来源。
- SDK 可以发不含敏感信息的阶段通知，但 App 必须能通过查询恢复。

## Cancel 与 UI 生命周期

Event UI 仍是有效取消入口：

- 阻塞钱包选择 UI 关闭：结束 UI Promise；设备命令已开始时同时发送 `Cancel`。
- 非阻塞设备提示 UI 关闭：取消当前 API 调用并发送 `Cancel`。
- Onboarding/进度等状态通知普通关闭：不默认取消后台任务。
- `CLOSE_UI_WINDOW` 是 SDK → App 的关闭通知，App 收到后不得反向触发第二次 Cancel。

Cancel 必须绑定当前设备和 Transport source；断连时清理请求、UI Promise 和提示状态。

## firmware-pro2 实施清单

- 实现 `DeviceSessionOpen(select/resume)`，成功返回非空 `session_id + btc_test_address`。
- `select` 明确支持 STANDARD、HOST_PASSPHRASE、DEVICE_PASSPHRASE 和 ATTACH_PIN。
- 删除 seed session 中 Passphrase/Button Host ACK 状态。
- `DeviceSessionAskPin` 直接显示设备 PIN/指纹页面。
- 地址、公钥、签名、设置和危险操作直接显示本地 UI。
- locked 错误在方法副作用前返回。
- 保留签名业务数据 Request/Ack。
- `Cancel` 能关闭当前 source 的页面并清理敏感状态。
- 正确维护 `attach_to_pin_enabled`、`unlocked_by_attach_to_pin` 和 onboarding 查询状态。
- 不发送 `WordRequest/EntropyRequest`。

## hardware-js-sdk 实施清单

- 增加并统一使用钱包 Session coordinator。
- `passphraseState` 非空时优先表示隐藏钱包；`useEmptyPassphrase=true` 表示标准钱包。
- Host Passphrase、设备 Passphrase、Attach PIN 分别映射到对应 `DeviceSessionOpen(select)` 分支。
- `DeviceWalletSessionStore` 继续只缓存 `deviceKey + passphraseState`；标准钱包不增加缓存 key，每次显式
  `select STANDARD`。
- 复用公共 UI Event 层，不伪造 Transport protobuf Request。
- V2 收到 firmware UI 中间消息时报告协议错误。
- 为合成 Event 增加稳定 `source/reason/device` payload。
- 区分阻塞选择 Event 与非阻塞提示 Event。
- 设备 Passphrase 必须合成一次 `REQUEST_PASSPHRASE_ON_DEVICE`；Attach PIN 必须合成一次兼容现有
  App 的设备 PIN 阶段提示。
- 自动解锁只重试一次，并验证方法重试安全契约。
- 保留签名数据握手、进度、Transport 和生命周期事件。
- 统一 cancel/timeout/disconnect 的 UI Promise 和 Event 清理。
- `DeviceSessionOpen(resume)` 后校验 `btc_test_address`，不匹配时禁止继续业务。

## app-monorepo 实施清单

- 保留现有 Hardware UI Event 容器和 `uiResponse()` 通道。
- `REQUEST_PASSPHRASE` 继续保留软件 Passphrase 输入；`source/reason` 仅作为可选文案增强，不作为
  完成流程的必填 App 改造。
- Pro2 主 PIN 与 Hidden Wallet PIN 不显示软件输入框；普通 Passphrase 继续支持 App 输入。
- Hidden Wallet PIN 入口由 `existsAttachPinUser` 决定。
- `REQUEST_BUTTON/REQUEST_PIN` 的 Pro2 非阻塞场景不发送 `uiResponse()`。
- 用户关闭硬件交互 UI 时取消当前调用；收到 `CLOSE_UI_WINDOW` 时只幂等收起。
- 继续保存 `passphraseState`，不暴露或保存 firmware `session_id`。
- 不把 onboarding 阶段 Event 当成唯一状态来源。

## 回归测试

### Event 来源与兼容

- V1 仍由 firmware UI 消息触发 Event 并完成 ACK。
- V2 App 收到同类公共 Event，但 firmware 不产生 UI 中间消息。
- V2 Event payload 能区分 coordinator/method lifecycle 来源。
- V2 收到意外 firmware UI Request 时以协议错误结束。

### 钱包与解锁

- 标准钱包每次显式 select STANDARD，不读取或写入隐藏钱包 Session Store。
- Host Passphrase、设备 Passphrase、Attach PIN 三种隐藏钱包选择都返回正确钱包标识。
- 首次隐藏钱包、Session 恢复、Session 失效重选保持原 API 调用不重放。
- Passphrase 与对应 Attach PIN 返回相同 `btc_test_address`。
- 钱包标识不一致时终止业务。
- locked 后提示、AskPin、内部重试最多一次；取消时不重试。

### 非阻塞提示

- 地址/公钥仅在 `showOnOneKey=true` 时提示。
- 每次签名只发预期数量的通用提示，数据 Request/Ack 正常。
- 设置页 accepted 与最终操作 completed 不混淆。
- 非阻塞 Event 不创建 `uiResponse` 等待项。

### 生命周期与安全

- UI 取消、设备取消、超时和断连都能结束 App 等待状态。
- `CLOSE_UI_WINDOW` 不触发重复 Cancel。
- 多设备、USB/BLE 和同类型 UI 响应不串线。
- PIN、助记词、熵和完整交易不进入 Event payload 或日志；App 输入的 Passphrase 只存在于
  `RECEIVE_PASSPHRASE` 与当前 Session 打开请求中，不进入日志或持久化状态。
