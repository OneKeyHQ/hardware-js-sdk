# Attach-to-PIN 与 Pro2 解锁

## 1. 概念拆分

当前实现区分三个容易混淆的状态：

| 状态 | 来源 | 含义 |
| --- | --- | --- |
| `attach_to_pin_enabled` | `DeviceStatus` | 设备是否配置了 Attach-to-PIN |
| `unlocked_by_attach_to_pin` | `DeviceStatus` | 当前设备解锁是否由 Attach PIN 完成 |
| `unlocked_attach_pin` | `DeviceSessionPinResult` | 本次 PIN 解锁结果是否命中 Attach PIN |

Core 将相关结果归一化为 `features.unlockedAttachPin`；`getPassphraseState` 仅返回钱包标识字符串。

## 2. Pro2 PIN 解锁流程

1. 调用 `DeviceSessionAskPin`。
2. 用户在设备上输入 PIN，固件返回 `DeviceSessionPinResult`。
3. 若 `unlocked=false`，解锁失败。
4. 成功后调用 `DeviceStatusGet` 刷新设备动态状态。
5. 使用 PIN 结果补齐 `unlocked_by_attach_to_pin` 和 `passphrase_protection`，再更新标准 Features。

该流程不通过软件 PIN 输入事件，PIN 始终由设备端处理。

## 3. 自动解锁重试策略

需要设备已解锁的 V2 方法可声明：

```ts
this.unlockPolicy = 'retry-on-locked';
```

Core 首次正常执行；只有同时满足以下条件才自动重试：

- 当前设备是 Protocol V2；
- 方法显式允许 `retry-on-locked`；
- 首次错误被标准化为 `HardwareErrorCode.DeviceLocked`。

随后执行一次 `device.unlockDevice()`，并重新运行原方法一次。第二次失败直接向上抛出，不循环重试。

## 4. 错误映射

`DeviceCommands` 将固件 `Failure_ProcessError` 且 `subcode=9` 统一映射为 `DeviceLocked`。这是自动解锁机制能够稳定工作的前提；调用方不应再通过错误文本判断设备是否锁定。

## 5. 与 Passphrase 的关系

- Attach PIN 决定解锁后落入主钱包还是已绑定的隐藏钱包。
- `DeviceSessionGet` 返回的钱包标识负责验证具体钱包。
- `unlockedAttachPin` 只描述解锁来源，不能替代 `passphraseState` 的钱包一致性校验。

## 6. 关键代码

- `packages/core/src/device/Device.ts`：`unlockDevice`
- `packages/core/src/protocols/protocol-v2/unlockRetry.ts`
- `packages/core/src/device/DeviceCommands.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
