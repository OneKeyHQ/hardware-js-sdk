# ADR-003：钱包 Session 的所有权与缓存键

> - 状态：已采纳
> - 决策日期：2026-07-13
> - 最后核验：2026-07-15
> - 适用范围：Protocol V1/V2 passphrase、Attach-to-PIN 与钱包 Session

## 背景

Transport 连接、Protocol V2 帧序号、设备端 `session_id` 和钱包标识是四种不同状态。如果把它们共用同一缓存或暴露给应用持久化，可能把主钱包请求错误路由到隐藏钱包或 Attach-to-PIN 钱包。

## 决策

- 应用持有稳定的钱包标识 `passphraseState`，SDK 只在运行期持有设备 `session_id`。
- V1 与 V2 共用 `DeviceWalletSessionStore`，缓存键为 `deviceKey + passphraseState`。
- 没有 `passphraseState` 时不得扫描或复用其他钱包的 Session。
- Protocol V2 通过 `DeviceSessionGet` 恢复或创建 SE Session，并把返回的 `btc_test_address` 归一化为 `passphraseState`。
- 缓存 Session 返回 `Failure_InvalidSession` 时，只删除当前钱包缓存，并且只允许进行一次不带 Session 的重试。
- 设备返回的钱包标识与调用方期望不一致时，清理缓存并抛出安全错误。
- `session_id` 不作为公共钱包身份，也不要求应用写入钱包数据库。
- Transport Link Session 和 Protocol V2 frame `seq` 不参与钱包 Session 缓存。

## 结果

- 主钱包、隐藏钱包和 Attach-to-PIN 钱包之间不会隐式复用 Session。
- 设备断开、切换钱包、显式清缓存或身份校验失败时，可以按钱包粒度失效缓存。
- CLI 等短生命周期进程可以显式预热缓存，但必须同时提供设备键、钱包标识和 Session ID。

## 实现位置

- `packages/core/src/device/DeviceWalletSessionStore.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
- `packages/core/src/device/Device.ts`
