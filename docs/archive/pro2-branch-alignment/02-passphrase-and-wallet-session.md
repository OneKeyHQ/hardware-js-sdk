# Passphrase 与钱包会话

## 1. V1 与 V2 的实现分流

| 场景 | Protocol V1 | Pro2 / Protocol V2 |
| --- | --- | --- |
| 获取钱包标识 | `GetPassphraseState`；不支持时回退测试网地址 | `DeviceSessionGet` |
| 钱包标识字段 | `passphrase_state` | `btc_test_address` |
| 会话字段 | `session_id` | `session_id` |
| 状态刷新 | 必要时重新获取 Features | `DeviceStatusGet` / DeviceInfo 状态 |
| 无效会话 | 旧流程错误处理 | 识别 `Failure_InvalidSession`，清缓存后无 session 重试一次 |

Pro2 的 `btc_test_address` 在 SDK 中继续映射为公共概念 `passphraseState`，以减少上层业务分叉；它是钱包身份校验值，不应被理解为用户输入的 passphrase 明文。

## 2. Pro2 会话流程

1. 若设备状态明确为锁定，直接抛出锁定错误。
2. `initSession=true` 时先清理 SDK 内部钱包会话。
3. Core 内部钱包会话流程可携带缓存 `session_id` 调用 `DeviceSessionGet`；公开的低阶 `deviceSessionGet` 不暴露该参数并发送空请求。
4. 固件返回 invalid session 时清缓存，并不带 session 再请求一次。
5. 如果调用方传入预期 `passphraseState`，与 `btc_test_address` 不一致则清缓存并抛出 `DeviceCheckPassphraseStateError`。
6. 将钱包标识、设备 ID、新 session 和前序 session 写回内部状态。

## 3. 公共输入

`getPassphraseState(connectId, params)` 现在支持：

- `passphraseState`：预期钱包标识，用于防止误复用其他钱包会话。
- `useEmptyPassphrase`：V1 主钱包查询语义。
- `initSession`：清理旧缓存并创建/获取新会话。

最新 firmware-pro2 `dev` 协议已经从 `GetPassphraseState` 删除 `_only_main_pin` 和 `allow_create_attach_pin`，SDK 不再发送或公开这两个旧字段。

## 4. 公共输出

```ts
string | undefined
```

- Pro / Pro2 返回当前钱包的 `passphraseState` 字符串。
- 其他旧设备仅在 passphrase protection 开启时返回该字符串。
- session ID、Attach PIN 解锁结果和 passphrase protection 仍由 Core 内部更新，不进入公共返回值。

## 5. 缓存失效时机

- 显式 `initSession`
- V2 `Failure_InvalidSession`
- 预期钱包标识与设备返回不一致
- 设备切换、断开或上层调用 `clearSessionCache`

## 6. 关键代码

- `packages/core/src/api/GetPassphraseState.ts`
- `packages/core/src/utils/deviceFeaturesUtils.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
- `packages/core/src/device/DeviceWalletSessionStore.ts`
