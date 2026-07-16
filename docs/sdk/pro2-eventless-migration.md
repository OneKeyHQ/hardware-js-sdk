# Pro2 删除硬件交互 Event：代码迁移清单

产品交互与协议设计见：
[Pro2 无 Event 钱包交互设计](../superpowers/specs/2026-07-16-pro2-eventless-wallet-session-design.md)。

本文只回答两个工程问题：

1. 原 Pro 的产品交互现在由哪些 App、SDK 和固件代码完成。
2. Pro2 删除 Event 后，每个模块应该改成什么。

## 边界

需要删除的是请求过程中的硬件 UI 中间响应：

- `PassphraseRequest / PassphraseAck`
- `ButtonRequest / ButtonAck`
- `PinMatrixRequest / PinMatrixAck`

不删除：

- USB/BLE 请求响应通道。
- BLE notification。
- 文件、固件和 Portfolio 传输进度。
- 交易数据分片 Request/Ack。
- App 自己生成的 checking、processing 和 progress 状态。

原 Pro 继续使用原 Event 流程。Pro2 仍在开发阶段，SDK 与固件直接同时切换到无 Event 流程，
不维护旧 Pro2 固件兼容分支。

## 原 Pro 产品交互对应的代码

### App 一级钱包选择

App 已经主动区分标准钱包与隐藏钱包：

- `app-monorepo/packages/kit/src/views/Onboarding/pages/ConnectHardwareWallet/SelectAddWalletTypeDialog.tsx`
- `app-monorepo/packages/kit/src/views/Onboarding/pages/ConnectHardwareWallet/ConnectYourDevice.tsx`

`determineWalletCreationStrategy()` 根据设备状态和本地钱包情况决定：

- 直接创建标准钱包。
- 直接创建隐藏钱包。
- 弹出“标准钱包 / 隐藏钱包”选择。

这一层不依赖硬件 Event，Pro2 保持不变。

### App 隐藏钱包第二层交互

原 Pro 固件发送 `PassphraseRequest` 后，App 才展示隐藏钱包输入页面：

- `HardwareUiStateContainer.tsx` 处理 `REQUEST_PASSPHRASE`。
- `HardwareEnterPhase.tsx` 展示 Passphrase 输入、设备输入和 Hidden Wallet PIN 入口。
- `ServiceHardwareUI.ts` 将用户选择转换为 `UI_RESPONSE.RECEIVE_PASSPHRASE`。

原页面的三种响应：

```text
App 输入 Passphrase
  -> { value, passphraseOnDevice: false }

设备输入 Passphrase
  -> { value: '', passphraseOnDevice: true, attachPinOnDevice: false }

使用 Hidden Wallet PIN
  -> { value: '', passphraseOnDevice: false, attachPinOnDevice: true }
```

Pro2 不再进入这套 Event UI。App 需要增加主动分支：

- 隐藏钱包默认在设备输入 Passphrase。
- `attach_to_pin_enabled=true` 时，主动让用户选择 Passphrase 或 Hidden Wallet PIN。
- Pro2 页面不显示 App Passphrase 输入框。

### App 创建隐藏钱包

`ServiceAccount.createHWHiddenWallet()` 当前通过：

```text
getHwHiddenWalletPassphraseState()
  -> ServiceHardware.getPassphraseState(forceInputPassphrase=true)
  -> SDK getPassphraseState(initSession=true)
  -> 等待原 Pro Passphrase Event
```

Pro2 应改为先确定进入方式，再调用新的 SDK 钱包 session 方法：

```text
openPro2WalletSession({
  walletType: 'hidden',
  hiddenWalletAccess: 'passphrase' | 'attach-pin'
})
```

返回的 `btc_test_address` 继续作为 `passphraseState`，后续
`createHWWalletBase({ passphraseState })` 不需要引入新的钱包标识概念。

## SDK 当前 Event 链路

### DeviceCommands

`packages/core/src/device/DeviceCommands.ts` 的 `_filterCommonTypes()` 当前负责：

```text
ButtonRequest
  -> DEVICE.BUTTON / DEVICE.PASSPHRASE_ON_DEVICE
  -> ButtonAck

PinMatrixRequest
  -> DEVICE.PIN
  -> PinMatrixAck

PassphraseRequest
  -> DEVICE.PASSPHRASE
  -> PassphraseAck
```

Pro2 目标：

- 不将这些响应转换为 App Event。
- 不发送对应 ACK。
- 收到这些消息时直接记录协议错误并结束请求，防止固件回归被静默掩盖。

原 Pro 保持当前处理。

### Core Event 注册

`packages/core/src/core/index.ts` 当前通过
`packages/core/src/core/deviceEventRegistration.ts` 的 `registerHardwareUiEventListeners()` 注册：

- PIN
- Button
- Passphrase
- PassphraseOnDevice

Pro2 调用不注册这些监听器。原 Pro 调用继续注册。

`packages/core/src/api/allnetwork/AllNetworkGetAddressBase.ts` 还有独立的
`DEVICE.BUTTON/PIN/PASSPHRASE` 监听，必须同步处理，不能只修改 Core 主入口。

### Session 与钱包标识

Pro2 当前已经使用：

```text
DeviceSession {
  session_id
  btc_test_address
}
```

这里不需要新增 `wallet_fingerprint`。

SDK 保持现有公共语义：

```text
DeviceSession.btc_test_address
  -> SDK passphraseState
  -> App wallet.passphraseState
```

缓存继续使用：

```text
deviceId + passphraseState -> session_id
```

安全检查继续使用：

- 新隐藏钱包：保存固件返回的 `btc_test_address`。
- 已有隐藏钱包：比较返回的 `btc_test_address` 与调用参数 `passphraseState`。
- 不一致时清 session、锁定或终止业务，不能继续地址和签名。

## Pro2 固件当前剩余 Event

当前重点位于 `seed_session_manager.c`：

- `PassphraseRequest -> PassphraseAck`
- `ButtonRequest_PassphraseEntry -> ButtonAck`
- `ButtonRequest_AttachPin -> ButtonAck`

PIN、地址和公钥流程已经在向“设备直接显示、返回最终结果”迁移。

Passphrase/Attach PIN 不能只删除发送函数，需要用显式钱包 session 状态机替代：

```text
DeviceSessionOpen(STANDARD)
  -> 主设备认证（如需要）
  -> 空 Passphrase seed
  -> DeviceSession

DeviceSessionOpen(HIDDEN, PASSPHRASE)
  -> 主设备认证（如需要）
  -> 设备 Passphrase 页面
  -> 隐藏钱包 seed
  -> DeviceSession

DeviceSessionOpen(HIDDEN, ATTACH_PIN)
  -> 设备 Attach PIN 页面
  -> SE 恢复绑定 Passphrase
  -> 隐藏钱包 seed
  -> DeviceSession
```

三条路径都必须返回最终 `session_id + btc_test_address`。

`DeviceSessionOpen` 返回成功时，这两个字段都必须非空；否则 SDK 按协议错误处理，不能建立或缓存
钱包 session。

## Attach-to-PIN 的工程边界

必须区分“管理绑定”和“使用绑定”。

### 管理绑定

由设备设置页负责：

- 创建 Attach PIN。
- 更新 Attach PIN。
- 删除 Attach PIN。
- 验证主 PIN、输入并确认 Passphrase。
- SE 保存 PIN 到 Passphrase 的安全映射。

SDK/App 只负责打开 `DeviceSettingsPageShow(DevicePassphrase)` 并在结束后刷新
`DeviceStatus.attach_to_pin_enabled`。

### 使用绑定

由业务钱包 session 负责：

```text
App 选择 Hidden Wallet PIN
  -> DeviceSessionOpen(HIDDEN, ATTACH_PIN)
  -> 设备输入 Attach PIN
  -> DeviceSession(session_id, btc_test_address)
```

Attach PIN 只是隐藏钱包进入方式。因此 SDK/App 不应创建“Attach PIN 钱包类型”，也不应为同一
隐藏钱包保存第二份钱包标识。

## 模块前后差异

| 模块 | 原 Pro | Pro2 目标 |
| --- | --- | --- |
| App 钱包一级选择 | 主动选择标准/隐藏 | 保持不变 |
| App 隐藏钱包 UI | Event 到达后弹 Passphrase 输入页 | 主动展示设备输入/Hidden Wallet PIN 选择 |
| App Passphrase 输入 | 支持 | 删除 Pro2 分支 |
| SDK Passphrase Event | 转发并等待 UI_RESPONSE | Pro2 不注册、不消费 |
| SDK Attach PIN Event | `existsAttachPinUser` + ACK | 读取 DeviceStatus，主动调用 session API |
| SDK Session 标识 | passphraseState | `btc_test_address -> passphraseState`，保持不变 |
| 固件 Passphrase | 等 Host ACK 后显示设备页 | 直接显示设备页 |
| 固件 Attach PIN | 等 Host ACK 后显示设备页 | 直接显示设备页 |
| 最终结果 | 中间 Event + 最终结果 | 只有最终结果 |

## 实施清单

### 协议/类型

- 增加 `DeviceSessionOpen`。
- 钱包类型只有 `STANDARD/HIDDEN`。
- 隐藏钱包进入方式为 `PASSPHRASE/ATTACH_PIN`。
- 保留 `DeviceSession.session_id` 和 `btc_test_address`。

### firmware-pro2

- 实现三条钱包 session 路径。
- 删除 seed session 中的 Passphrase/Button Host ACK 状态。
- 补齐通用 `Cancel` 对设备页面的取消。
- 正确维护 `attach_to_pin_enabled` 和 `unlocked_by_attach_to_pin`。
- 保证同一隐藏钱包两种进入方式返回相同 `btc_test_address`。

### hardware-js-sdk

- 增加打开标准/隐藏钱包 session 的 API。
- Pro2 不注册硬件交互 Event。
- Pro2 收到硬件交互中间响应时报告协议错误。
- `DeviceSessionGet` 只恢复 session，不触发钱包选择。
- 继续使用 `btc_test_address` 维护 `passphraseState` 和缓存。
- 统一处理锁定、取消、InvalidSession 和钱包状态不匹配。

### app-monorepo

- 保留标准钱包/隐藏钱包一级选择。
- Pro2 隐藏钱包页面不允许 App 输入 Passphrase。
- 根据 `attach_to_pin_enabled` 决定是否展示 Hidden Wallet PIN。
- 用户选择后主动调用 SDK，不等待硬件 UI Event。
- 继续保存 `passphraseState`，不新增 wallet fingerprint 字段。

## 测试项

### 产品流程

- 添加标准钱包。
- 首次通过设备 Passphrase 添加隐藏钱包。
- 通过已有 Hidden Wallet PIN 添加/进入隐藏钱包。
- 没有 Attach PIN 时不显示 Hidden Wallet PIN 入口。
- App 全程无法输入或读取 Pro2 Passphrase。

### 钱包一致性

- 相同 Passphrase 多次进入返回相同 `btc_test_address`。
- Passphrase 与其 Attach PIN 返回相同 `btc_test_address`。
- 不同 Passphrase 返回不同 `btc_test_address`。
- 返回值与已有 `passphraseState` 不一致时业务失败。

### Eventless

- Pro2 不产生 `PassphraseRequest`。
- Pro2 不产生 `ButtonRequest_PassphraseEntry/AttachPin/PinEntry`。
- SDK 不发送 `PassphraseAck/ButtonAck/PinMatrixAck`。
- 用户完成或取消后只收到最终成功或失败。

### 状态与传输

- 锁定后自动调用设备解锁并只重试一次。
- USB 与 BLE 产品行为一致。
- 主动取消、设备取消、超时和断连都能结束 App 等待状态。
- 多设备时请求不会路由到其他设备。
