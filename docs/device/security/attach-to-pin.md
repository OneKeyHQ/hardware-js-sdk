# OneKey Attach-to-PIN 技术说明

> - 文档状态：当前 SDK 与 Protocol V1/V2 行为
> - 最后代码核验：2026-07-15
> - 事实来源：Core 公共类型、`Device`、`DeviceCommands`、`deviceFeaturesUtils` 与 firmware-pro2 Device Session protobuf
> - 维护要求：Attach PIN 管理协议、Passphrase Session 或公共 API 返回类型变化后同步更新。

## 1. 能力边界

Attach-to-PIN 将一个设备端 PIN 与特定 passphrase 钱包上下文关联。用户输入该 PIN 后，设备可以恢复对应隐藏钱包，而无需再次输入完整 passphrase。

必须区分三件事：

| 状态                 | 含义                                                  |
| -------------------- | ----------------------------------------------------- |
| 设备已解锁           | 主 PIN 或 Attach PIN 已通过，允许访问受保护能力。     |
| 通过 Attach PIN 解锁 | 当前解锁来源是 Attach PIN。                           |
| 当前钱包身份         | 当前 seed/passphrase 上下文对应的 `passphraseState`。 |

“设备已解锁”不代表当前钱包就是调用方期望的钱包。SDK 仍必须比较实际 `passphraseState`，避免对错误隐藏钱包取地址或签名。

## 2. 公共 SDK API

### `getFeatures`

```ts
getFeatures(connectId?: string, params?: CommonParams): Response<Features>;
```

返回标准化 Features。当前结构化字段使用 camelCase，例如：

```ts
features.passphraseProtection;
features.attachToPinEnabled;
features.unlockedAttachPin;
features.sessionId;
```

V1 原始 protobuf 字段可能保留在 `features.raw`，应用不应继续把公共 Features 当成原始 snake_case protobuf。

### `getPassphraseState`

```ts
getPassphraseState(
  connectId?: string,
  params?: CommonParams
): Response<string | undefined>;
```

公开 API 只返回 `passphraseState`：

```ts
const response = await HardwareSDK.getPassphraseState(connectId, {
  initSession: true,
});

if (response.success) {
  const passphraseState = response.payload;
}
```

它不会公开返回：

- 设备 `session_id`。
- `newSession`。
- `unlockedAttachPin` 对象字段。

这些数据由 Device 内部钱包 Session 流程消费和缓存。应用后续调用只需保存并传回 `passphraseState`。

## 3. UI 事件

Attach-to-PIN 复用现有 PIN 和 Passphrase UI 事件：

```ts
HardwareSDK.on(UI_EVENT, message => {
  if (message.type === UI_REQUEST.REQUEST_PIN) {
    // 展示 PIN 输入或“请在设备上输入 PIN”提示。
  }

  if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
    const canUseAttachPin = message.payload.existsAttachPinUser === true;
    // 根据 canUseAttachPin 决定是否展示“使用 Attach PIN”入口。
  }
});
```

选择已有 Attach PIN 钱包时：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
  payload: {
    value: '',
    attachPinOnDevice: true,
    save: false,
  },
});
```

只有设备返回的 `PassphraseRequest.exists_attach_pin_user` 为真时，Core 才会把该选择转换为：

```text
PassphraseAck { on_device_attach_pin: true }
```

普通 Button 确认由 Core 自动发送 `ButtonAck`；应用只展示提示，不应调用 `uiResponse()`。

## 4. Protocol V1 流程

V1 设备可能使用以下字段和消息：

- `Initialize.is_contains_attach`
- `Features.attach_to_pin_user`
- `Features.unlocked_attach_pin`
- `PassphraseRequest.exists_attach_pin_user`
- `PassphraseAck.on_device_attach_pin`
- `GetPassphraseState.allow_create_attach_pin`
- `PassphraseState.passphrase_state`
- `PassphraseState.session_id`
- `PassphraseState.unlocked_attach_pin`

当前 Core 的 V1 分支：

1. 对支持 `Capability_AttachToPin` 的设备调用 `GetPassphraseState`。
2. V1 Pro 固件 `>= 4.15.0` 也走该原生消息。
3. 其他 V1 设备回退到固定 Bitcoin Testnet 地址派生，将地址作为 `passphraseState`。
4. 内部读取 `session_id` 和 `unlocked_attach_pin`，但公开 API 仍只返回 `passphraseState`。

能力应优先通过固件 capability 判断，不要仅复制设备型号和固件版本硬编码到应用层。

## 5. Pro2 / Protocol V2 流程

Pro2 不使用传统 `GetPassphraseState -> PassphraseState`。相关职责拆分为：

| 消息/字段                                     | 职责                                     |
| --------------------------------------------- | ---------------------------------------- |
| `DeviceInfo.status.attach_to_pin_enabled`     | 设备是否配置过 Attach-to-PIN。           |
| `DeviceInfo.status.unlocked_by_attach_to_pin` | 当前设备是否由 Attach PIN 解锁。         |
| `DeviceSessionAskPin`                         | 请求设备显示 PIN 输入流程。              |
| `DeviceSessionPinResult.unlocked_attach_pin`  | 本次 PIN 解锁是否命中 Attach PIN。       |
| `DeviceSessionGet(session_id?)`               | 创建或恢复当前 seed/passphrase Session。 |
| `DeviceSession.btc_test_address`              | 归一化为 SDK `passphraseState`。         |

Pro2 PIN 始终在设备端输入：

```text
DeviceSessionAskPin
  -> 设备显示 PIN 页面
  -> DeviceSessionPinResult
  -> Core 更新 unlocked/passphrase/Attach PIN 状态
```

该流程不会请求应用提交软件 PIN。

钱包 Session 流程为：

```text
DeviceSessionGet(session_id?)
  -> 必要时 PassphraseRequest / PassphraseAck
  -> DeviceSession(session_id, btc_test_address)
  -> Core 缓存 session_id
  -> 对外返回 btc_test_address 作为 passphraseState
```

缓存 session 无效时，Core 只在请求确实携带缓存 session 的情况下处理 `Failure_InvalidSession`：清理缓存，并使用空 session 重试一次。

## 6. 钱包身份安全检查

普通地址或签名方法携带 `passphraseState` 时，Core 会获取设备当前实际状态并比较：

```text
expected passphraseState
  vs
actual passphraseState from device
```

下列情况必须停止业务调用：

1. 调用方请求标准钱包，但设备实际通过 Attach PIN 进入隐藏钱包。
2. 调用方请求隐藏钱包 A，但 Attach PIN 解锁后设备返回隐藏钱包 B。
3. 缓存 session 打开的实际钱包与调用方预期不一致。

当前处理会锁定设备、清理对应钱包 Session 缓存，并返回钱包状态校验错误。不能为了减少一次交互而跳过该检查。

## 7. Session 缓存边界

内部 `DeviceWalletSessionStore` 使用：

```text
deviceKey
└─ passphraseState -> sessionId
```

其中：

- `deviceId` 表示 seed 身份，不等于物理序列号。
- `passphraseState` 表示钱包上下文。
- `sessionId` 是设备端 Session 句柄。

没有 `passphraseState` 时，SDK 不应任意扫描并复用某个隐藏钱包 session。设备断开、身份变化、`initSession=true`、状态校验失败或显式清理都会使相关缓存失效。

CLI 的 `preloadSessionCache(deviceId, passphraseState, sessionId)` 只适用于 CLI 已经从自身安全存储恢复这三个值的场景。公开 `getPassphraseState()` 不会提供 session ID。

## 8. 创建和管理 Attach PIN

“使用已有 Attach PIN”与“创建、删除或覆盖 Attach PIN”是不同能力。

- V1 存在 `GetPassphraseState.allow_create_attach_pin` 等历史语义。
- 当前 V2 `DeviceSessionGet` 没有等价的创建字段。
- 当前 V2 host 已支持选择已有 Attach PIN 用户。
- 创建、删除、覆盖和列举 Attach PIN 仍需要独立的协议与产品交互定义。

在 V2 协议明确之前，应用不应通过普通 `DeviceSettingsSet` 或自行拼接未定义字段尝试管理 Attach PIN。

## 9. 错误处理

应用应按 SDK 返回的 `HardwareErrorCode` 和结构化错误处理，不要依赖英文错误文本，也不要自行定义一套并不存在于公共 API 的 `AttachToPinErrorCode`。

建议区分：

- 用户取消：结束当前流程并关闭 UI。
- 设备锁定：仅由声明了 `retry-on-locked` 的 V2 方法自动解锁并重试一次。
- Session 无效：由内部钱包 Session 流程清缓存后重试一次。
- 钱包状态不匹配：锁设备并要求用户重新选择正确钱包，不自动重试签名。
- Transport 断开：先重新连接和初始化，不复用无法验证的钱包状态。

## 10. 关键源码

- 公共 API 类型：`packages/core/src/types/api/getPassphraseState.ts`
- API 实现：`packages/core/src/api/GetPassphraseState.ts`
- V1/V2 状态获取：`packages/core/src/utils/deviceFeaturesUtils.ts`
- Device 解锁与状态检查：`packages/core/src/device/Device.ts`
- PIN/Passphrase 交互：`packages/core/src/device/DeviceCommands.ts`
- V2 钱包 Session：`packages/core/src/protocols/protocol-v2/walletSession.ts`
- Session 缓存：`packages/core/src/device/DeviceWalletSessionStore.ts`
- V2 Session protobuf：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_session.proto`
- Passphrase 与 Session 深入说明：[Pro / Pro2 Passphrase 与钱包 Session](../session/pro-passphrase-session.md)
