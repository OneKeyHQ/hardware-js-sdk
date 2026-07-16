# Pro2 Passphrase 与 Attach-to-PIN 无 Event 设计

## 目标

Pro2 删除 Passphrase 和 Attach-to-PIN 相关的硬件中间 Event，同时保持原 Pro 的产品能力：

- 用户可以进入标准钱包。
- 用户可以在设备输入 Passphrase 进入隐藏钱包。
- 已存在 Attach PIN 绑定时，用户可以输入 Hidden Wallet PIN 进入对应隐藏钱包。
- App 仍保存并校验 `passphraseState`。
- Pro2 Passphrase 明文只存在于设备，不进入 App、SDK、Host 协议帧或日志。

Pro2 仍在开发阶段，本设计不处理旧 Pro2 固件兼容。原 Pro 继续使用原来的 Event 流程。

## 核心消息映射

完整变更如下：

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| `PassphraseRequest.exists_attach_pin_user` | 告诉 App 是否存在 Attach PIN 绑定，决定是否显示 Hidden Wallet PIN 入口 | `DeviceStatus.attach_to_pin_enabled` | 删除 `PassphraseRequest` 后，App 需要在发起 Session 前主动获取该状态 |
| `PassphraseRequest` | 通知 SDK/App 选择隐藏钱包进入方式 | 删除 | 改为 App 主动选择，不再由硬件 Event 驱动 |
| `PassphraseAck.on_device=true` | 告诉固件在设备输入 Passphrase | `DeviceSessionOpen(HIDDEN, PASSPHRASE)` | SDK 主动表达进入方式，固件直接打开设备 Passphrase 页面 |
| `PassphraseAck.on_device_attach_pin=true` | 告诉固件使用已有 Attach PIN | `DeviceSessionOpen(HIDDEN, ATTACH_PIN)` | SDK 主动表达使用 Hidden Wallet PIN |
| `PassphraseAck.passphrase` | 将 App 输入的 Passphrase 发送给固件 | 删除 | Pro2 只允许在设备输入 Passphrase |
| `ButtonRequest_PassphraseEntry` | 通知 App 即将进入设备 Passphrase 页面，并等待 `ButtonAck` | 删除 | 固件收到 `DeviceSessionOpen(HIDDEN, PASSPHRASE)` 后直接打开页面 |
| `ButtonRequest_AttachPin` | 通知 App 即将进入 Attach PIN 页面，并等待 `ButtonAck` | 删除 | 固件收到 `DeviceSessionOpen(HIDDEN, ATTACH_PIN)` 后直接打开页面 |
| `ButtonAck` | 允许固件继续显示 Passphrase/Attach PIN 页面 | 删除 | 新流程不需要 Host 确认 |
| `DeviceSession.btc_test_address` | 标识当前钱包上下文 | 保持不变，继续映射为 `passphraseState` | 已能稳定区分和校验钱包，无需增加新字段 |
| `DeviceSessionGet` | 当前可能触发钱包选择和 Passphrase Event | 改为仅恢复已有 Session | 查询与创建/切换职责分离 |
| 新增 `DeviceSessionOpen` | 原来不存在 | 主动打开标准或隐藏钱包 Session | 替代整个 `PassphraseRequest -> PassphraseAck -> ButtonRequest -> ButtonAck` 流程 |

这不是简单改消息名称，而是把流程控制权从“硬件 Event 驱动 Host”改成“App/SDK 主动表达意图，
硬件执行并返回最终结果”。

## 原流程

### 普通隐藏钱包

```text
业务请求或 GetPassphraseState
  -> 固件需要 seed session
  -> PassphraseRequest(exists_attach_pin_user)
  -> SDK 转成 REQUEST_PASSPHRASE
  -> App 让用户选择输入方式
  -> PassphraseAck(on_device=true)
  -> ButtonRequest_PassphraseEntry
  -> SDK 自动 ButtonAck
  -> 固件显示设备 Passphrase 页面
  -> 用户输入 Passphrase
  -> DeviceSession / PassphraseState
```

### 使用已有 Attach PIN

```text
业务请求或 GetPassphraseState
  -> PassphraseRequest(exists_attach_pin_user=true)
  -> App 显示“输入 Hidden Wallet PIN”
  -> PassphraseAck(on_device_attach_pin=true)
  -> ButtonRequest_AttachPin
  -> SDK 自动 ButtonAck
  -> 固件显示 Attach PIN 页面
  -> 用户输入 Attach PIN
  -> SE 恢复绑定的 Passphrase
  -> DeviceSession / PassphraseState
```

原流程中：

- `exists_attach_pin_user` 只在固件已经发出 `PassphraseRequest` 后才到达 App。
- `PassphraseAck` 承担用户选择和输入方式回传。
- `ButtonRequest_AttachPin` 是固件请求 Host 允许继续显示 Attach PIN 页面。
- App 必须等待硬件 Event 才知道下一步应该展示什么。

## 新流程总览

```text
App 读取 DeviceStatus
  -> 根据 attach_to_pin_enabled 决定可展示的隐藏钱包进入方式
  -> 用户选择标准钱包、设备 Passphrase 或 Hidden Wallet PIN
  -> SDK 发送 DeviceSessionOpen
  -> 固件直接完成设备认证和设备 UI
  -> 固件返回最终 DeviceSession 或 Failure
  -> SDK 使用 btc_test_address 更新或校验 passphraseState
```

新流程不再出现：

- `PassphraseRequest`
- `PassphraseAck`
- `ButtonRequest_PassphraseEntry`
- `ButtonRequest_AttachPin`
- 对应的 `ButtonAck`
- Pro2 的 `REQUEST_PASSPHRASE` 和 `REQUEST_PASSPHRASE_ON_DEVICE` App Event

## 迁移一：`exists_attach_pin_user`

### 原语义

当前 firmware-pro2 在建立 seed session 时查询 SE 的 Passphrase PIN 空间：

```text
SEED_SESSION_STATE_PASSPHRASE_SPACE
  -> space < PASSPHRASE_MAX_SPACE
  -> g_exists_attach_pin_user = true
  -> PassphraseRequest.exists_attach_pin_user = true
```

SDK 收到后将其转换为：

```text
REQUEST_PASSPHRASE {
  existsAttachPinUser: true
}
```

App 再决定是否展示“输入 Hidden Wallet PIN”。

### 新位置

该状态迁移为：

```protobuf
message DeviceStatus {
  optional bool attach_to_pin_enabled = 11;
}
```

确定语义：

```text
attach_to_pin_enabled = SE 中至少存在一个 Attach PIN -> Passphrase 绑定
```

该字段属于解锁后可读取的私有状态：

- `true`：至少存在一个绑定。
- `false`：已经完成查询，并确认不存在绑定。
- 字段缺失：状态未知，通常表示设备尚未解锁或查询未完成；SDK/App 必须先解锁并重新读取，不能把
  缺失值当成 `false`。

它不是：

- 当前是否通过 Attach PIN 解锁。
- Attach-to-PIN 功能代码是否存在。
- 当前 wallet session 是否为隐藏钱包。

当前是否通过 Attach PIN 完成认证继续由下面的字段表达：

```protobuf
optional bool unlocked_by_attach_to_pin = 12;
```

### 当前实现缺口

协议和 SDK 已经存在 `attach_to_pin_enabled`：

- firmware protobuf：`messages_device_status.proto`
- SDK 类型：`DeviceStatus.attach_to_pin_enabled`
- SDK Features 映射：`attachToPinEnabled`

但当前 firmware-pro2 的 `devinfo_fill_status()` 只填充：

- `passphrase_enabled`
- `unlocked_by_attach_to_pin`

还没有填充 `attach_to_pin_enabled`。

硬件侧需要：

1. 提供可靠的“是否存在至少一个绑定”查询。
2. 在 `DeviceInfo` 和 `DeviceStatusGet` 返回的 `DeviceStatus` 中填充该字段。
3. 创建、更新或删除 Attach PIN 后立即刷新内部缓存。
4. App 从设备设置页返回后重新读取状态，不能继续使用旧值。
5. SDK 映射时保留 `true/false/unknown` 三态，不使用 `?? false` 抹掉未知状态。

### 新产品触发点

App 不再等待 `PassphraseRequest` 才知道是否存在 Attach PIN。

```text
连接并解锁设备
  -> 读取 DeviceStatus.attach_to_pin_enabled
  -> false：隐藏钱包直接进入设备 Passphrase 流程
  -> true：展示“设备 Passphrase / Hidden Wallet PIN”选择
```

## 迁移二：`PassphraseAck`

### 原职责

原 `PassphraseAck` 可能表达三种不同意图：

```text
PassphraseAck { passphrase: "..." }
PassphraseAck { on_device: true }
PassphraseAck { on_device_attach_pin: true }
```

Pro2 只允许设备输入 Passphrase，因此第一种 Host 明文输入路径直接删除。

### 新命令

`DeviceSessionOpen` 替代整个 `PassphraseRequest -> PassphraseAck` 往返：

```protobuf
enum DeviceWalletType {
  DEVICE_WALLET_TYPE_STANDARD = 0;
  DEVICE_WALLET_TYPE_HIDDEN = 1;
}

enum DeviceHiddenWalletAccess {
  DEVICE_HIDDEN_WALLET_ACCESS_PASSPHRASE = 0;
  DEVICE_HIDDEN_WALLET_ACCESS_ATTACH_PIN = 1;
}

message DeviceSessionOpen {
  required DeviceWalletType wallet_type = 1;
  optional DeviceHiddenWalletAccess hidden_wallet_access = 2;
}
```

有效组合：

| 用户意图 | DeviceSessionOpen |
| --- | --- |
| 标准钱包 | `wallet_type=STANDARD`，不携带 `hidden_wallet_access` |
| 在设备输入 Passphrase | `wallet_type=HIDDEN, hidden_wallet_access=PASSPHRASE` |
| 输入 Hidden Wallet PIN | `wallet_type=HIDDEN, hidden_wallet_access=ATTACH_PIN` |

无效组合必须返回参数错误：

- `STANDARD + PASSPHRASE`
- `STANDARD + ATTACH_PIN`
- `HIDDEN` 但没有进入方式
- 未知的 wallet type 或 access type

### 控制权变化

原流程：

```text
固件发现需要 Passphrase
  -> 固件发送 PassphraseRequest
  -> App 被动选择
  -> SDK 发送 PassphraseAck
```

新流程：

```text
App 已经知道用户选择
  -> SDK 主动发送 DeviceSessionOpen
  -> 固件直接执行对应流程
```

因此准确的迁移关系是：

```text
PassphraseRequest + PassphraseAck
  => DeviceSessionOpen
```

不是只将 `PassphraseAck` 改名为 `DeviceSessionOpen`。

## 迁移三：`ButtonRequest_AttachPin`

### 原职责

固件消费 `PassphraseAck.on_device_attach_pin=true` 后，并不会立即显示 Attach PIN 页面，而是：

```text
固件发送 ButtonRequest_AttachPin
  -> SDK/App 显示“请在设备输入 Hidden Wallet PIN”
  -> SDK 自动发送 ButtonAck
  -> 固件显示 Attach PIN 页面
```

`ButtonRequest_AttachPin` 同时承担：

- 告知 App 当前进入 Attach PIN 阶段。
- 等待 Host ACK 后才启动设备页面。

### 新职责分配

App 已经在调用前知道用户选择了 Hidden Wallet PIN，因此不再需要固件通知 App。

```text
App：用户选择 Hidden Wallet PIN
  -> App：立即显示设备处理中/请在设备输入
  -> SDK：DeviceSessionOpen(HIDDEN, ATTACH_PIN)
  -> 固件：直接显示 Attach PIN 页面
  -> 固件：返回最终 DeviceSession 或 Failure
```

这里“由 SDK 触发”的准确含义是：

- SDK 发送 `DeviceSessionOpen(HIDDEN, ATTACH_PIN)` 业务命令。
- 固件收到业务命令后直接创建 Attach PIN UI。
- SDK 不发送新的 `ButtonRequest` 或 `ButtonAck`。
- App 的等待提示由用户动作和 API 生命周期主动维护，不依赖硬件 Event。

### 普通设备 Passphrase 同样处理

`ButtonRequest_PassphraseEntry` 使用相同方式删除：

```text
DeviceSessionOpen(HIDDEN, PASSPHRASE)
  -> 固件直接显示 Passphrase 页面
  -> 不发送 ButtonRequest_PassphraseEntry
  -> 不等待 ButtonAck
```

## 新的三条完整流程

### 标准钱包

```text
App 选择标准钱包
  -> DeviceSessionOpen(STANDARD)
  -> 固件必要时完成主设备认证
  -> 固件加载空 Passphrase seed
  -> DeviceSession(session_id, btc_test_address)
```

### 隐藏钱包：设备 Passphrase

```text
App 选择隐藏钱包
  -> attach_to_pin_enabled=false 时直接进入
     或用户选择“在设备输入 Passphrase”
  -> DeviceSessionOpen(HIDDEN, PASSPHRASE)
  -> 固件必要时完成主设备认证
  -> 固件直接显示 Passphrase 页面
  -> 用户在设备输入 Passphrase
  -> 固件加载隐藏钱包 seed
  -> DeviceSession(session_id, btc_test_address)
```

### 隐藏钱包：Attach PIN

```text
DeviceStatus.attach_to_pin_enabled=true
  -> App 展示 Hidden Wallet PIN 入口
  -> 用户选择 Hidden Wallet PIN
  -> DeviceSessionOpen(HIDDEN, ATTACH_PIN)
  -> 固件直接显示 Attach PIN 页面
  -> 用户在设备输入 Attach PIN
  -> SE 恢复绑定的 Passphrase
  -> 固件加载隐藏钱包 seed
  -> DeviceSession(session_id, btc_test_address)
```

## Session 响应与钱包校验

继续使用现有响应：

```protobuf
message DeviceSession {
  optional bytes session_id = 1;
  optional string btc_test_address = 2;
}
```

不增加新的钱包标识字段。

确定语义：

```text
DeviceSession.btc_test_address == SDK/App passphraseState
```

要求：

- `DeviceSessionOpen` 成功时，`session_id` 与 `btc_test_address` 必须同时非空。
- 新建隐藏钱包时，App 保存 `btc_test_address` 为 `passphraseState`。
- 进入已有隐藏钱包时，SDK 校验返回值与预期 `passphraseState` 相同。
- 同一隐藏钱包通过 Passphrase 和对应 Attach PIN 进入时，必须返回相同的 `btc_test_address`。
- 不同 Passphrase 必须返回不同的 `btc_test_address`。
- 校验失败时禁止继续获取地址、公钥或签名。

缓存继续使用：

```text
deviceId + passphraseState -> session_id
```

## `DeviceSessionGet` 的边界

`DeviceSessionGet` 只恢复已有 session：

- 不打开 Passphrase 页面。
- 不打开 Attach PIN 页面。
- 不选择标准钱包或隐藏钱包。
- 不发送任何硬件 UI Event。

```text
DeviceSessionGet(session_id)
  -> 有效：返回 DeviceSession，并校验 btc_test_address
  -> 无效：返回 InvalidSession
  -> SDK/App 再决定调用哪个 DeviceSessionOpen
```

`initSession=true` 只清 SDK 缓存而不能强制设备选择钱包的问题，由显式 `DeviceSessionOpen` 解决。

## Attach PIN 管理不属于本命令

必须区分：

```text
管理 Attach PIN 绑定
  !=
使用 Attach PIN 进入隐藏钱包
```

创建、更新和删除绑定继续由设备设置页负责：

```text
DeviceSettingsPageShow(DevicePassphrase)
  -> 设备验证主 PIN
  -> 设备输入/确认 Passphrase
  -> 设备创建、更新或删除 Attach PIN 绑定
  -> App 重新读取 DeviceStatus.attach_to_pin_enabled
```

`DeviceSessionOpen(HIDDEN, ATTACH_PIN)` 只使用已有绑定，不创建或修改绑定。

## App 改动

### 原 Pro

继续保留：

- `REQUEST_PASSPHRASE` 对话框。
- App 输入 Passphrase。
- 设备输入 Passphrase 切换按钮。
- `existsAttachPinUser` 控制的 Hidden Wallet PIN 按钮。
- `uiResponse(RECEIVE_PASSPHRASE)`。

### Pro2

不再进入上述 Event UI 分支。

App 主动流程：

1. 解锁设备并读取 `DeviceStatus.attach_to_pin_enabled`；字段缺失时不得继续猜测。
2. 用户选择标准钱包或隐藏钱包。
3. 隐藏钱包且存在绑定时，展示 Passphrase/Hidden Wallet PIN 二选一。
4. 立即显示设备处理中提示。
5. 调用对应的 SDK session API。
6. 根据最终成功、取消或失败关闭提示。

Pro2 页面不提供 App Passphrase 输入框。

## SDK 改动

1. 增加 `DeviceSessionOpen` 类型和公开 API。
2. 将 App 参数转换为有效的 wallet type/access type 组合。
3. 保持 `btc_test_address -> passphraseState` 映射。
4. 保持 `deviceId + passphraseState` session 缓存。
5. `DeviceSessionGet` 只执行恢复。
6. Pro2 不注册 `DEVICE.PASSPHRASE` 和 `DEVICE.PASSPHRASE_ON_DEVICE`。
7. Pro2 收到 `PassphraseRequest`、`ButtonRequest_PassphraseEntry` 或
   `ButtonRequest_AttachPin` 时按协议错误处理，不自动 ACK。
8. 统一处理取消、`InvalidSession`、钱包不匹配和设备断连。

## firmware-pro2 改动

1. 在 `DeviceStatus` 中正确填充 `attach_to_pin_enabled`。
2. 实现 `DeviceSessionOpen` handler。
3. 将 STANDARD、HIDDEN+PASSPHRASE、HIDDEN+ATTACH_PIN 映射到三条设备本地状态机。
4. 删除 `seed_session_send_passphrase_request()`。
5. 删除 `PassphraseAck` 解析和等待状态。
6. 删除 `ButtonRequest_PassphraseEntry/AttachPin` 发送与 `ButtonAck` 等待状态。
7. 设备页面成功后返回 `session_id + btc_test_address`。
8. 用户取消时返回最终 `UserCancelled`。
9. 没有 Attach PIN 绑定时返回 `AttachPinUnavailable`。
10. 临时 Passphrase、PIN 和 seed 数据在成功、失败、取消、超时后都必须清零。

## 错误处理

| 错误 | SDK/App 行为 |
| --- | --- |
| `UserCancelled` | 关闭等待 UI，返回上一步，不自动重试 |
| `InvalidSession` | 清 session 缓存，重新进入 `DeviceSessionOpen` 流程 |
| `AttachPinUnavailable` | 刷新 DeviceStatus，隐藏或禁用 Hidden Wallet PIN 入口 |
| `PassphraseDisabled` | 提示在设备设置中开启 Passphrase |
| `WalletMismatch` | 清缓存并终止业务 |
| `Busy` | 不并发打开第二个设备交互页面 |
| `DeviceDisconnected` | 清理等待状态，不将请求切换到其他设备 |

SDK 主动取消继续使用通用 `Cancel`。固件收到后关闭当前 Passphrase/Attach PIN 页面，清理临时状态，
并让原 `DeviceSessionOpen` 以 `UserCancelled` 结束。

## 验收清单

### 状态迁移

- `DeviceStatus.attach_to_pin_enabled=false` 时 App 不显示 Hidden Wallet PIN。
- 至少存在一个绑定时字段为 true。
- 创建或删除绑定后重新查询能立即得到新值。
- `unlocked_by_attach_to_pin` 与 `attach_to_pin_enabled` 语义不混用。

### Passphrase

- `DeviceSessionOpen(HIDDEN, PASSPHRASE)` 直接显示设备 Passphrase 页面。
- Host 不出现 Passphrase 明文。
- 不产生 `PassphraseRequest/PassphraseAck`。
- 不产生 `ButtonRequest_PassphraseEntry/ButtonAck`。

### Attach PIN

- `DeviceSessionOpen(HIDDEN, ATTACH_PIN)` 直接显示设备 Attach PIN 页面。
- 不产生 `ButtonRequest_AttachPin/ButtonAck`。
- 没有绑定时返回 `AttachPinUnavailable`。
- Passphrase 和对应 Attach PIN 返回相同 `btc_test_address`。

### Session

- 标准钱包、隐藏钱包都返回非空 `session_id + btc_test_address`。
- 已有钱包恢复时校验 `btc_test_address == passphraseState`。
- session 失效后只通过显式 `DeviceSessionOpen` 重新进入钱包。
- USB 和 BLE 行为一致。
