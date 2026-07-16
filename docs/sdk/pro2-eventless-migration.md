# Pro2 无硬件交互 Event 迁移调研

## 目标与边界

目标是将 Pro2 调整为单向业务调用模型：SDK 发起请求，设备在本机完成 PIN、Passphrase、确认等交互，最后返回成功或失败；SDK 不再依赖硬件中间消息驱动 App UI。

这里的“硬件 Event”实际是请求中的同步中间响应：`ButtonRequest`、`PinMatrixRequest`、`PassphraseRequest`、`WordRequest` 和 `EntropyRequest`，不是独立异步推送。

以下内容不属于删除范围：Transport 连接/断开、BLE notification、SDK 生成的 `FEATURES/SUPPORT_FEATURES`、固件/文件进度、设备选择事件和最终业务响应。

## 链路变化

```mermaid
sequenceDiagram
    participant App
    participant SDK
    participant Pro2
    App->>SDK: 调用业务方法
    SDK->>Pro2: 请求
    Note over Pro2: 设备端完成 PIN、Passphrase、确认
    Pro2-->>SDK: 最终响应
    SDK-->>App: API Response
```

需要区分两个阶段：

- **UI Eventless**：SDK 不把交互中间响应转换为 App UI Event，但协议层仍可能自动 ACK。
- **Protocol Eventless**：固件不再发送交互中间响应，只返回最终成功或失败。

`alpha.15` 曾完成第一阶段，但为了兼容当前固件并继续调试完整交互，`alpha.16` 暂时恢复
Pro2 的全部 UI Event。`DeviceCommands._filterCommonTypes()` 仍会消费
`ButtonRequest/PinMatrixRequest/PassphraseRequest`；因此不能仅以“App 没弹窗”判断固件已经完成迁移。

## SDK Event 分类

下表描述完全 Eventless 的目标状态；`alpha.16` 兼容模式暂时继续注册前四类交互 Event。

| SDK Event | 来源 | Pro2 处理 |
| --- | --- | --- |
| `DEVICE.PIN` | `PinMatrixRequest` | 停止注册 |
| `DEVICE.BUTTON` | `ButtonRequest` | 停止注册 |
| `DEVICE.PASSPHRASE` | `PassphraseRequest` | 停止注册 |
| `DEVICE.PASSPHRASE_ON_DEVICE` | `ButtonRequest_PassphraseEntry` | 停止注册 |
| `DEVICE.FEATURES` | SDK 请求后更新缓存 | 保留 |
| `DEVICE.SUPPORT_FEATURES` | SDK 能力计算 | 保留 |
| `DEVICE.CONNECT/DISCONNECT` | Transport 生命周期 | 保留 |
| 固件设备选择 Event | SDK 升级流程 | 保留 |

SDK 主入口位于 `packages/core/src/core/index.ts`。`AllNetworkGetAddressBase` 还有一套独立的 Button/PIN/Passphrase 监听，Pro2 同样需要跳过。

## firmware-pro2/dev 当前仍依赖 Host ACK 的位置

| 场景 | 当前消息 | 固件位置 | 目标行为 |
| --- | --- | --- | --- |
| seed session 解锁 | `ButtonRequest_PinEntry` → `ButtonAck` | `seed_session_manager.c` | 直接打开设备 PIN 页 |
| Passphrase 钱包选择 | `PassphraseRequest` → `PassphraseAck` | `seed_session_manager.c` | 设备端完成钱包选择 |
| 设备端 Passphrase | `ButtonRequest_PassphraseEntry` → `ButtonAck` | `seed_session_manager.c` | 直接打开输入页 |
| 使用 Attach PIN | `ButtonRequest_AttachPin` → `ButtonAck` | `seed_session_manager.c` | 直接打开 Attach PIN 或增加显式命令 |
| 查询 Passphrase State 时解锁 | `ButtonRequest_PinEntry` → `ButtonAck` | `foreground_access_flow.c` | 直接打开设备 PIN 页 |
| 地址确认 | `ButtonRequest_Address` → `ButtonAck` | `task_foreground.c` | 直接显示地址确认页 |
| 公钥确认 | `ButtonRequest_PublicKey` → `ButtonAck` | `task_foreground.c` | 直接显示公钥确认页 |

`DeviceSessionAskPin` 已符合目标模型：设备直接显示 PIN 页面并返回最终 `Success/Failure`。

地址和公钥确认还有一个独立问题：`foreground_protobuf_send_display_button_request()`
当前固定使用 `IPC_SOURCE_USB`，即使原请求来自 BLE 也会把 ButtonRequest 发往 USB。删除这两个
ButtonRequest 后该路由问题自然消失；迁移前不能依赖它验证 BLE 确认流程。

当前固件代码未找到主动发送 `PinMatrixRequest`、`WordRequest` 或 `EntropyRequest` 的 Pro2
业务路径；它们目前主要是协议兼容定义。实际需要先迁移的是 ButtonRequest 和
PassphraseRequest。

## 必须兼容的模块

### Attach-to-PIN

最终状态继续读取 `DeviceStatus.attach_to_pin_enabled` 和 `unlocked_by_attach_to_pin`，并使用 `DeviceSession.btc_test_address` 校验实际钱包。

主要缺口是设备已通过主 PIN 解锁后如何切换到 Attach PIN 钱包。当前入口来自 `PassphraseRequest` 的 `on_device_attach_pin`。删除 Event 后建议新增显式“切换钱包/请求 Attach PIN”命令，由设备完成全部 UI。

### 标准钱包与隐藏钱包

当前 `PassphraseAck` 可选择空 Passphrase、App 输入、设备输入或 Attach PIN。单向流下敏感输入应只在设备进行，但 SDK/协议仍需表达标准钱包、隐藏钱包、Attach PIN 三种意图，并从最终响应取得可验证的钱包标识。

### PIN 与自动解锁

保留错误驱动流程：

```text
业务请求 -> DeviceLocked -> DeviceSessionAskPin -> 重试业务请求一次
```

该流程不依赖任何硬件 UI Event。

注意：seed session 和旧的 Passphrase State 查询目前还有各自的
`ButtonRequest_PinEntry -> ButtonAck` 解锁前置握手。它们必须改成与
`DeviceSessionAskPin` 相同的设备端直接交互模型，否则只是 SDK 的错误重试链路 eventless，
业务内部仍非 eventless。

### App UI

Pro2 不再产生 `ui-request_pin`、`ui-button`、`ui-request_passphrase`、`ui-request_passphrase_on_device`。这些 UI 继续供 Protocol V1 使用。Pro2 的等待提示应由业务调用主动展示，而不是等待硬件中间消息。

App 的 `DeviceChecking/ProcessLoading`、固件升级进度、蓝牙权限和设备选择 UI 都是 App/SDK
主动状态，不属于硬件交互 Event，必须保留。CLI 中对应四种 UI_REQUEST 的输入处理也继续为
Protocol V1 保留。

### 取消、超时和 BLE

用户在设备取消时必须返回明确失败；SDK 取消需要设备结束当前 UI；长交互继续使用方法级超时。BLE notification 是请求响应传输通道，不能删除。

### 地址、公钥、签名和进度

地址与公钥当前还发送 ButtonRequest；签名确认主要已经由设备内部 UIVIEW 完成。`FIRMWARE_PROCESSING`、`FIRMWARE_PROGRESS`、`FIRMWARE_TIP`、`DEVICE_PROGRESS` 是 SDK 主动生成的 UI，继续保留。Portfolio 已单独静默。

## 迁移顺序

1. SDK 对 Pro2 停止注册四类硬件交互 UI Event，Protocol V1 保持不变。
2. 固件 seed session 和 Passphrase State 查询改为设备端直接处理 PIN。
3. 固件在设备端完成标准钱包、隐藏钱包、Attach PIN 选择和敏感输入。
4. 固件地址、公钥确认删除 ButtonRequest/ButtonAck 前置握手。
5. 固件通过协议版本或 capability 声明 `protocol-eventless`，SDK 才启用严格模式。
6. App 对 Pro2 停止依赖四类 UI_REQUEST，同时保留 V1 UI。
7. 回归 USB、BLE、取消、超时、自动解锁和钱包一致性。

当前 `isProtocolV2()` 在 SDK 的设备画像中只映射到 Pro2，因此可作为过渡判断；长期应使用
明确的 Pro2 device type 或 capability，避免未来新增 Protocol V2 设备时被自动套用相同策略。

## 当前行为矩阵

| 固件中间响应 | Pro2 不注册监听后的 SDK 行为 | 当前结果 |
| --- | --- | --- |
| `ButtonRequest` | 即使没有监听器仍自动发送 `ButtonAck` | 方法通常继续，但协议仍依赖 Event/ACK |
| `ButtonRequest_PassphraseEntry` | 不再通知 App，自动 ACK | 设备可打开输入页 |
| `ButtonRequest_AttachPin` | 不再通知 App，自动 ACK | 仅在已经选中 Attach PIN 后可继续 |
| `PinMatrixRequest` | `_promptPin()` 因 listenerCount=0 拒绝 | 方法失败，设备等待超时 |
| `PassphraseRequest` | `_promptPassphrase()` 因 listenerCount=0 拒绝 | Passphrase-enabled seed session 稳定失败 |
| `WordRequest/EntropyRequest` | 当前没有完整 SDK 交互处理 | Pro2 固件不应发送 |

因此迁移期不能把所有交互中间响应统一“静默忽略”。ButtonRequest 的自动 ACK 可以作为短期兼容，
PassphraseRequest 则必须由固件先删除或由 capability/version 精确分流。固件完成迁移后，SDK
严格模式应把任何 Pro2 交互中间响应记录为协议违约，避免自动 ACK 长期掩盖回归。

## 最小回归矩阵

| 连接 | 锁状态 | 钱包状态 | 必测动作 |
| --- | --- | --- | --- |
| USB/BLE | 已锁定 | 无 Passphrase | 获取地址、签名、自动解锁、设备取消 |
| USB/BLE | 已解锁 | 无 Passphrase | 地址/公钥显示确认、签名 |
| USB/BLE | 已锁定 | Passphrase enabled | 主 PIN、Attach PIN、隐藏钱包输入 |
| USB/BLE | 已解锁 | Passphrase enabled | 标准钱包、隐藏钱包、切换 Attach PIN |
| USB/BLE | 任意 | 任意 | App 主动取消、设备取消、断连、方法超时 |

## 风险

- 只改 SDK、不改固件时，`ButtonRequest` 仍会被协议层 ACK，但 `PinMatrixRequest` 和 `PassphraseRequest` 会因没有监听器而失败。
- Attach PIN 没有新入口时，用户可能无法从已解锁主钱包切换到 Attach PIN 钱包。
- 固件未声明 eventless capability 时直接启用严格模式，会破坏当前仍依赖 ButtonAck 的版本。
- 只观察 App UI 会误判迁移完成，因为 ButtonRequest 可能仍被 SDK 静默 ACK。
- 误删连接/断开或 BLE notification 会直接破坏通讯。

## ADR

状态：调研中，`alpha.16` 使用完整 UI Event 兼容模式。

目标决策：Pro2 最终不注册硬件交互 UI Event；敏感交互全部在设备端完成。SDK 只消费最终响应和状态，并保留错误驱动自动解锁。当前 `alpha.16` 尚未启用该决策。

后果：SDK/App 状态机显著简化，但固件必须补齐钱包选择、Attach PIN、取消和超时语义；迁移期间必须严格区分固件版本。
