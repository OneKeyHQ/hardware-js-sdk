# Pro 2 钱包 Session 字段迁移

Protocol V2 将钱包上下文从设备初始化信息中拆到 `DeviceSession`。Core 必须分别管理物理设备状态与当前钱包生命周期。

## Session 字段

| Protocol V2 字段                 | 含义                                                    | SDK 处理                                     |
| -------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `DeviceSessionGet.session_id`    | 尝试恢复的 Session ID；空值表示创建或打开当前钱包上下文 | Core 内部钱包 Session 会传缓存值             |
| `DeviceSession.session_id`       | 设备返回的当前钱包 Session ID                           | 保存到当前 Device/钱包缓存                   |
| `DeviceSession.btc_test_address` | 当前钱包的稳定测试地址标识                              | 映射为 `passphraseState`，用于校验钱包上下文 |

## 内部钱包流程

```text
缓存 session_id?
  -> DeviceSessionGet(session_id?)
  -> PassphraseRequest / PassphraseAck（设备需要时）
  -> DeviceSession(session_id, btc_test_address)
  -> 校验期望的 passphraseState
```

缓存 Session 返回 `Failure_InvalidSession` 时，Core 会清除当前钱包缓存，并使用空 Session 再尝试一次。这个重试属于钱包 Session 管理，不是 Transport 的请求重放。

公开的 `deviceSessionGet` 当前发送空请求，适合协议调试和显式查询；它不替代 Core 内部的缓存恢复、无效 Session 清理和钱包标识校验。

## PIN 解锁结果

PIN 解锁使用独立消息：

```text
DeviceSessionAskPin -> DeviceSessionPinResult
```

| 返回字段                | SDK 标准状态                    | 说明                               |
| ----------------------- | ------------------------------- | ---------------------------------- |
| `unlocked`              | `Features.unlocked`             | 设备是否已解锁                     |
| `unlocked_attach_pin`   | `Features.unlockedAttachPin`    | 本次是否通过 Attach PIN 解锁       |
| `passphrase_protection` | `Features.passphraseProtection` | 解锁后可确认的 Passphrase 保护状态 |

Core 会把解锁结果合并回标准 Features，并按需刷新 `DeviceStatus`。因此 `DeviceSessionPinResult` 是一次操作结果，`DeviceStatus` 是后续可重新读取的设备状态，两者不能互相替代。

## 从集中式初始化中拆出的边界

| 语义                 | Protocol V1 常见位置                   | Protocol V2 归属                          |
| -------------------- | -------------------------------------- | ----------------------------------------- |
| 初始化后的设备状态   | `Features`                             | `DeviceStatus`                            |
| 钱包 Session ID      | `Initialize.session_id` 等初始化上下文 | `DeviceSession`                           |
| Passphrase 钱包标识  | `GetPassphraseState` 等历史流程        | `DeviceSession.btc_test_address`          |
| PIN 解锁后的状态变化 | 多个交互消息和 Features 刷新           | `DeviceSessionPinResult` + `DeviceStatus` |

## 安全与缓存约束

- Session 缓存必须按物理设备和钱包上下文隔离，不能跨设备复用。
- `btc_test_address` 只用于确认钱包上下文，不作为用户资产地址展示。
- 无效 Session 最多执行一次清缓存重试，不能形成无限重试。
- Transport 只负责请求/响应匹配，不拥有钱包 Session，也不能自动重放受保护业务请求。
- App 不应把 `session_id` 当作长期持久身份；物理设备身份仍来自设备描述符、`device_id` 和序列号。
