# Protocol V2 Passphrase 与钱包 Session 对齐设计

## 背景

Pro2 当前使用 `DeviceSessionAskPin/DeviceSessionPinResult` 解锁设备，使用
`DeviceSessionGet/DeviceSession` 获取钱包 session。SDK 已把
`DeviceSession.btc_test_address` 映射为上层 `passphraseState`，但固件当前的
`device_session_only` 分支只返回 `session_id`，没有进入 BTC Testnet 地址派生和
passphrase seed session 流程。

截至 2026-07-14，官方 `firmware-pro2` 的 `origin/dev` 最新提交为
`d9382b0d7`。SDK 当前固定的 `04538b95b` 落后 7 个提交，但新增提交没有改变
DeviceSession、passphrase 或 seed session 主流程。

## 目标

- `deviceUnlock` 直接使用 `DeviceSessionPinResult` 更新 Features，不再额外调用
  `DeviceStatusGet`。
- `DeviceSessionGet` 返回完整的 `session_id + btc_test_address`。
- Pro2 复用现有 `PassphraseRequest/PassphraseAck`、设备输入和
  Attach-to-PIN 选择逻辑，不增加第二套 passphrase 协议。
- 有缓存 session 时尝试恢复；缓存失效时 SDK 清理缓存并无 session 重试一次。
- passphrase 选择完成后重新读取 SE 当前 session ID，避免返回切换前的旧 ID。
- Protocol V1 行为保持不变。

## 固件流程

```text
DeviceSessionGet(session_id?)
  -> 有 session_id：尝试打开指定 session
  -> 无 session_id：读取当前 session；不存在时创建并打开
  -> 请求内部 BTC Testnet 地址派生 0xF028
  -> se.derive_key() 调用 se_ensure_seed_session(false)
  -> seed_session_manager 处理 PassphraseRequest/PassphraseAck
  -> 普通钱包、隐藏钱包或 Attach-to-PIN 上下文生效
  -> 查询 passphrase space，并在地址和 space 就绪后重新读取当前 session ID
  -> DeviceSession { session_id, btc_test_address }
```

BTC Testnet 地址继续使用 `m/44'/1'/0'/0/0`。该地址只作为钱包上下文指纹，
SDK 不记录或输出用户 passphrase。

请求中的缓存 session 无法打开时，固件使用 Protocol V2 common Failure：

- `code = Failure_ProcessError`
- `subcode = 14`
- `message = "Failure_InvalidSession"`

`subcode=14` 保留 V1 `Failure_InvalidSession` 的语义，同时遵守 Protocol V2
“业务错误放入 subcode”的约定。

## SDK 流程

### 解锁

```text
DeviceSessionAskPin
  -> DeviceSessionPinResult
  -> 将 unlocked / unlocked_attach_pin / passphrase_protection
     合并进 Protocol V2 status 和标准 Features
  -> 返回 Features
```

该流程不再发送 `DeviceStatusGet`。如果 Features 尚不存在，仍通过相同的状态合并
入口构造最小 Protocol V2 Features，不调用 V1 `GetFeatures`。

### 钱包 Session

```text
从 DeviceWalletSessionStore 查找 deviceKey + passphraseState
  -> DeviceSessionGet(cached session_id?)
  -> 如果缓存 session 返回 Failure_InvalidSession：
       清理该缓存，DeviceSessionGet({}) 重试一次
  -> 校验 btc_test_address 与 expectPassphraseState
  -> 保存 btc_test_address -> session_id 映射
  -> 返回 passphraseState + newSession + unlockedAttachPin
```

没有 `passphraseState` 时仍不扫描或复用其他隐藏钱包的 session，避免主钱包请求
误入隐藏钱包。

## PassphraseRequest/Ack 与 Attach-to-PIN

`PassphraseRequest/Ack` 在 Pro2 中仍然有效。内部地址派生调用
`se_ensure_seed_session(false)` 后，`seed_session_manager` 会通过它完成：

- Host 输入 passphrase；
- 设备端输入 passphrase；
- 选择已有 Attach-to-PIN 用户。

本轮不传递 `allowCreateAttachPin` 到 Protocol V2 host；该能力等待硬件侧后续接口
合入。本轮也不为 Protocol V2 不支持的旧 API 增加额外守卫。

## 测试边界

- SDK 单测证明解锁只发送一次 `DeviceSessionAskPin`，并直接更新完整状态。
- SDK 单测证明缓存 session 失效时无 session 重试并保存新 session。
- 固件源码契约测试证明 DeviceSession 流程等待地址、space 和最终 session，且返回
  `btc_test_address` 和 InvalidSession subcode。
- 编译 `task_foreground_obj`，验证 nanopb 字段和状态机代码可编译。
- 现有 Protocol V1 解锁和 passphrase 测试继续通过。
