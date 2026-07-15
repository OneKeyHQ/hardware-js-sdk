# 硬件协议交互消息（Device → SDK）

> - 文档范围：只记录硬件在一次协议调用过程中返回给 SDK 的中间消息
> - 核验代码：`hardware-js-sdk`、`app-monorepo`
> - 不包含：SDK 自建事件、连接状态、系统权限、进度计算、页面关闭和固件 release 元数据
> - 上层映射：硬件消息转换后的 App 事件见 [OneKey `hd-*` SDK 公共事件](./events.md)

本文只回答“硬件固件在协议层给 SDK 返回了什么中间消息”。三层事件模型和阅读顺序见 [SDK 事件文档](./README.md)。

## 硬件中间消息列表

| 硬件消息                            | 当前协议                       | SDK 对 App 的映射                                                 | 当前状态           |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------- | ------------------ |
| `ButtonRequest`                     | Protocol V1；V2 兼容层也能识别 | `REQUEST_BUTTON`、`REQUEST_PIN` 或 `REQUEST_PASSPHRASE_ON_DEVICE` | 正在使用           |
| `PinMatrixRequest`                  | Protocol V1；V2 兼容层也能识别 | `REQUEST_PIN`                                                     | 正在使用           |
| `PassphraseRequest`                 | Protocol V1；V2 兼容层也能识别 | `REQUEST_PASSPHRASE`                                              | 正在使用           |
| `DeviceFirmwareUpdateStatus`        | Protocol V2 / Pro2             | `FIRMWARE_PROGRESS`，同时供升级状态机内部处理                     | 正在使用           |
| `EntropyRequest`                    | Protocol V1 兼容消息           | 无完整 App Event 映射                                             | 已识别，未实现处理 |
| `Deprecated_PassphraseStateRequest` | Protocol V1 历史消息           | 无 App Event 映射                                                 | 已识别，未实现处理 |
| `WordRequest`                       | Protocol V1 恢复流程消息       | 无 App Event 映射                                                 | 已识别，未实现处理 |

这里的“事件”指硬件在最终业务响应之前主动返回的中间协议消息。`UI_EVENT` 只是 SDK 对外的消息分组，并不等于硬件事件。

---

## `ButtonRequest`

### 消息结构

```ts
type ButtonRequest = {
  code?: ButtonRequestType;
  pages?: number;
};
```

设备通过 `ButtonRequest` 表示当前调用需要用户在硬件屏幕继续操作。SDK 收到后会自动发送 `ButtonAck`，不需要 App 回传 Button Ack。

### 完整 code 列表

| code                                       | 设备侧业务含义                  | SDK 对 App 的处理              |
| ------------------------------------------ | ------------------------------- | ------------------------------ |
| `ButtonRequest_Other`                      | 未归入其他类型的设备确认        | `REQUEST_BUTTON`               |
| `ButtonRequest_FeeOverThreshold`           | 手续费超过设备阈值，需要确认    | `REQUEST_BUTTON`               |
| `ButtonRequest_ConfirmOutput`              | 确认交易输出                    | `REQUEST_BUTTON`               |
| `ButtonRequest_ResetDevice`                | 初始化或重置设备确认            | `REQUEST_BUTTON`               |
| `ButtonRequest_ConfirmWord`                | 确认助记词单词                  | `REQUEST_BUTTON`               |
| `ButtonRequest_WipeDevice`                 | 擦除设备确认                    | `REQUEST_BUTTON`               |
| `ButtonRequest_ProtectCall`                | 受保护方法确认                  | `REQUEST_BUTTON`               |
| `ButtonRequest_SignTx`                     | 交易签名确认                    | `REQUEST_BUTTON`               |
| `ButtonRequest_FirmwareCheck`              | 固件相关确认                    | `REQUEST_BUTTON`               |
| `ButtonRequest_Address`                    | 地址上屏确认                    | `REQUEST_BUTTON`               |
| `ButtonRequest_PublicKey`                  | 公钥导出确认                    | `REQUEST_BUTTON`               |
| `ButtonRequest_MnemonicWordCount`          | 选择或确认助记词数量            | `REQUEST_BUTTON`               |
| `ButtonRequest_MnemonicInput`              | 输入助记词                      | `REQUEST_BUTTON`               |
| `_Deprecated_ButtonRequest_PassphraseType` | 已废弃的 Passphrase 类型选择    | `REQUEST_BUTTON` 兼容处理      |
| `ButtonRequest_UnknownDerivationPath`      | 非标准派生路径警告              | `REQUEST_BUTTON`               |
| `ButtonRequest_RecoveryHomepage`           | 恢复流程首页                    | `REQUEST_BUTTON`               |
| `ButtonRequest_Success`                    | 设备显示成功页面                | `REQUEST_BUTTON`               |
| `ButtonRequest_Warning`                    | 设备显示风险警告                | `REQUEST_BUTTON`               |
| `ButtonRequest_PassphraseEntry`            | 设备正在等待用户输入 Passphrase | `REQUEST_PASSPHRASE_ON_DEVICE` |
| `ButtonRequest_PinEntry`                   | 设备正在等待普通 PIN            | `REQUEST_PIN` 提示             |
| `ButtonRequest_AttachPin`                  | 设备正在等待隐藏钱包 Attach PIN | `REQUEST_PIN` 提示             |

### SDK 处理分支

```text
硬件返回 ButtonRequest
  ├─ code = PassphraseEntry
  │    -> DEVICE.PASSPHRASE_ON_DEVICE
  │    -> UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE
  ├─ code = PinEntry / AttachPin
  │    -> DEVICE.BUTTON
  │    -> UI_REQUEST.REQUEST_PIN
  └─ 其他 code
       -> DEVICE.BUTTON
       -> UI_REQUEST.REQUEST_BUTTON

SDK 自动发送 ButtonAck
  -> 继续等待设备最终响应
```

### 普通 `ButtonRequest` 在 App 中的逻辑

除 PIN 和 Passphrase 特殊 code 外，SDK 对 App 发出：

```ts
UI_REQUEST.REQUEST_BUTTON; // ui-button
```

当前 App 处理如下：

1. `ServiceHardware.registerSdkEvents()` 收到 `UI_EVENT`。
2. 事件被写入 `hardwareUiStateAtom`。
3. `HardwareUiStateContainer` 将它识别为设备确认 Toast。
4. App 展示统一的“请在设备上确认”，不根据具体 Button code 展示不同文案。
5. App 不调用 `uiResponse()`。
6. 用户在硬件上确认后，设备返回最终成功响应，原 SDK Promise 完成。
7. 用户在硬件上拒绝时，设备返回 `Failure`，原 SDK Promise 失败。

需要注意：Core 虽然创建了包含 Button code 的内部 `DEVICE.BUTTON` 消息，但 `hd-web-sdk`、`hd-common-connect-sdk` 和 `hd-ble-sdk` 不会把 `DEVICE.BUTTON` 作为公开设备事件转发。App 的 `REQUEST_BUTTON` payload 目前主要只有设备信息，因此 App 实际拿不到具体 Button code。

### `ButtonRequest_PinEntry` 和 `ButtonRequest_AttachPin`

这两个 code 会被转换成 `REQUEST_PIN`，但它们只表示设备已经进入 PIN 页面，不一定代表 Core 此时已经建立 PIN 响应等待项。

当前 App 处理：

- `Touch`、`Pro`、`Pro2` 统一转换为 `EnterPinOnDevice`。
- `PinEntry` 使用普通设备 PIN 文案。
- `AttachPin` 使用隐藏钱包 PIN 文案。
- App 不应在收到 ButtonRequest 转换出的第一次 `REQUEST_PIN` 时同步自动回传 PIN。
- 真正需要 App 回传的节点是后续 `PinMatrixRequest`。

### `ButtonRequest_PassphraseEntry`

该 code 不进入普通 `REQUEST_BUTTON`，而是转换为：

```ts
UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE;
```

App 展示“请在设备上输入 Passphrase”，不回传新的 `uiResponse()`。原业务调用继续等待设备输入完成后的最终响应。

### Pro2 方向

如果 Pro2 最终确定不使用硬件 Event：

- 固件不再为设备页面新增 `ButtonRequest`。
- App 根据自己调用的方法决定是否展示设备确认提示。
- SDK 不再依赖 ButtonRequest 才知道需要显示 App UI。
- 确认、拒绝和取消通过原方法最终响应表达。

---

## `PinMatrixRequest`

### 消息结构

```ts
type PinMatrixRequest = {
  type?: PinMatrixRequestType;
};
```

### 完整 type 列表

| type                                  | 业务含义                      |
| ------------------------------------- | ----------------------------- |
| `PinMatrixRequestType_Current`        | 输入当前 PIN                  |
| `PinMatrixRequestType_NewFirst`       | 第一次输入新 PIN              |
| `PinMatrixRequestType_NewSecond`      | 再次确认新 PIN                |
| `PinMatrixRequestType_WipeCodeFirst`  | 第一次输入 Wipe Code          |
| `PinMatrixRequestType_WipeCodeSecond` | 再次确认 Wipe Code            |
| `PinMatrixRequestType_BackupFirst`    | 备份相关的第一次 PIN 输入     |
| `PinMatrixRequestType_BackupSecond`   | 备份相关的第二次 PIN 输入     |
| `PinMatrixRequestType_AttachToPin`    | 输入或设置隐藏钱包 Attach PIN |

### SDK 处理流程

```text
硬件返回 PinMatrixRequest(type)
  -> DeviceCommands._promptPin(type)
  -> DEVICE.PIN
  -> Core 创建 RECEIVE_PIN 等待项
  -> UI_REQUEST.REQUEST_PIN
  -> 等待 App 回传
```

App 软件输入时回传：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PIN,
  payload: pin,
});
```

SDK 随后发送：

```text
PinMatrixAck { pin }
```

如果 App 选择在设备输入，会回传特殊值：

```text
@@ONEKEY_INPUT_PIN_IN_DEVICE
```

SDK 随后调用历史的 `BixinPinInputOnDevice`，让 Classic、1S、Mini、Pure 等设备切换到设备输入流程。

### App 当前逻辑

1. App 根据 `deviceType` 判断是否强制设备输入。
2. `Touch`、`Pro`、`Pro2` 直接展示 `EnterPinOnDevice`。
3. 其他设备根据 SDK 能力和用户设置决定软件输入或设备输入。
4. `PinMatrixRequestType_AttachToPin` 会使用隐藏钱包 PIN 文案。
5. 软件 PIN 输入后调用 `ServiceHardwareUI.sendPinToDevice()`。
6. 当前 Core 以 `RECEIVE_PIN` 类型匹配等待项，没有 requestId，因此两个 PIN 请求不能安全并行。

### Pro2 方向

Pro2 如果删除该 Event，PIN 需要在设备端闭环。SDK 方法最终返回以下结果之一：

- 解锁成功并继续原业务。
- 用户取消。
- PIN 错误或仍需重试。
- PIN 重试次数耗尽或设备锁定。
- 设备断开或交互超时。

App 不再通过 `RECEIVE_PIN` 向 Pro2 回传 PIN。

---

## `PassphraseRequest`

### 消息结构

```ts
type PassphraseRequest = {
  _on_device?: boolean;
  exists_attach_pin_user?: boolean;
};
```

当前 SDK 实际使用的重点字段是 `exists_attach_pin_user`，它表示设备是否存在可选择的 Attach PIN 隐藏钱包。

### SDK 处理流程

```text
硬件返回 PassphraseRequest
  -> DeviceCommands._promptPassphrase()
  -> DEVICE.PASSPHRASE
  -> Core 创建 RECEIVE_PASSPHRASE 等待项
  -> UI_REQUEST.REQUEST_PASSPHRASE
  -> 等待 App 选择输入方式
```

### App 的三种响应

#### 软件输入 Passphrase

```ts
{
  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
  payload: {
    value: passphrase,
    passphraseOnDevice: false,
    attachPinOnDevice: false,
    save: false,
  },
}
```

SDK 转换为：

```text
PassphraseAck { passphrase }
```

#### 在设备上输入

```ts
{
  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
  payload: {
    value: '',
    passphraseOnDevice: true,
    attachPinOnDevice: false,
    save: false,
  },
}
```

SDK 转换为：

```text
PassphraseAck { on_device: true }
```

#### 选择 Attach PIN 隐藏钱包

```ts
{
  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
  payload: {
    value: '',
    passphraseOnDevice: false,
    attachPinOnDevice: true,
    save: false,
  },
}
```

只有 `exists_attach_pin_user=true` 时，SDK 才会转换为：

```text
PassphraseAck { on_device_attach_pin: true }
```

### App 当前逻辑

- 有 `passphraseState` 时，App 使用已有隐藏钱包验证模式。
- 没有 `passphraseState` 时，App 使用新增隐藏钱包流程。
- `existsAttachPinUser=true` 时允许用户选择 Attach PIN。
- 软件输入后，App 会主动显示处理中，因为设备不一定再发一个加载事件。
- 当前 Core 以 `RECEIVE_PASSPHRASE` 类型匹配等待项，没有 requestId，多个 Passphrase 请求不能安全并行。

### Pro2 方向

如果 Pro2 不再使用该 Event，需要明确选择以下一种方式：

1. Passphrase 完全在设备端输入，SDK 只等待最终结果。
2. App 在调用方法前通过参数明确选择普通钱包、隐藏钱包或 Attach PIN。
3. 使用显式的钱包 Session 方法分阶段完成选择，不能重新引入全局 Event。

---

## `DeviceFirmwareUpdateStatus`

### 消息结构

```ts
type DeviceFirmwareUpdateStatus = {
  records: Array<{
    target_id: DeviceFirmwareTargetType;
    status?: DeviceFirmwareUpdateTaskStatus;
    payload_version?: number;
    path?: string;
  }>;
};
```

这是 Protocol V2 / Pro2 固件升级过程中由设备返回的中间状态消息。

### target 类型

| target                          | 含义                                                                   |
| ------------------------------- | ---------------------------------------------------------------------- |
| `FW_MGMT_TARGET_CRATE`          | 固件容器或整体目标                                                     |
| `FW_MGMT_TARGET_ROMLOADER`      | ROM loader；当前 `firmwareUpdateV4` 不接受通过普通 bootloader 请求安装 |
| `FW_MGMT_TARGET_BOOTLOADER`     | Bootloader                                                             |
| `FW_MGMT_TARGET_APPLICATION_P1` | Application P1                                                         |
| `FW_MGMT_TARGET_APPLICATION_P2` | Application P2                                                         |
| `FW_MGMT_TARGET_COPROCESSOR`    | Coprocessor                                                            |
| `FW_MGMT_TARGET_SE01` - `SE04`  | 安全芯片目标                                                           |

### status 类型

| status                       | 含义                  |
| ---------------------------- | --------------------- |
| `PENDING`                    | 等待处理              |
| `IN_PROGRESS`                | 正在处理              |
| `FINISHED`                   | 已完成                |
| `FAILED_FILE_NOT_FOUND`      | 暂存文件不存在        |
| `FAILED_FILE_READ`           | 读取暂存文件失败      |
| `FAILED_FILE_WRITE`          | 写入失败              |
| `FAILED_VERIFY`              | 校验失败              |
| `FAILED_INSTALL`             | 安装失败              |
| `FAILED_ABORT`               | 任务被中止            |
| `FAILED_BUSY`                | 设备或升级服务忙      |
| `FAILED_ENTRY_OUT_OF_BOUNDS` | target 或记录索引越界 |

### SDK 当前处理

`firmwareUpdateV4` 发出 `DeviceFirmwareUpdateRequest` 时把 `DeviceFirmwareUpdateStatus` 注册为中间响应：

```text
DeviceFirmwareUpdateRequest
  -> DeviceFirmwareUpdateStatus
  -> SDK 标记 installingFirmware 进度
  -> 后续主动轮询 DeviceFirmwareUpdateStatusGet
  -> 判断各 target 完成、失败或仍在处理中
```

当前收到一次中间状态时，SDK 会通过 `postProgressMessage(99, 'installingFirmware')` 映射为 App 的 `FIRMWARE_PROGRESS`。低阶 `deviceFirmwareUpdate` 也会映射成 99% 安装进度。

实际 target 成功或失败不能只根据这个 99% UI Event 判断，SDK 仍会继续查询 `DeviceFirmwareUpdateStatusGet` 并检查每条 record。

### Pro2 方向

这个消息是硬件升级任务状态，不是设备弹窗 Event。即使 Pro2 最终不向 App 暴露公共 Event，SDK 内部仍需要消费它。

需要删除的是 App 侧 `FIRMWARE_PROGRESS` 推送，而不是硬件和 SDK 之间的 `DeviceFirmwareUpdateStatus` 协议消息。App 如果需要升级状态，可以：

- 只等待 `firmwareUpdateV4` 最终结果；或
- 调用明确的升级任务状态查询 API。

---

## 已识别但当前未完整处理的硬件消息

### `EntropyRequest`

- Protocol V1 交互消息白名单包含该类型。
- `DeviceCommands` 能识别它，但当前分支只有 `TODO: EntropyRequest`。
- 没有转换成 App `UI_EVENT`，也没有找到完整 Ack 流程。
- 不能把它视为当前 App 已支持的业务事件。

### `Deprecated_PassphraseStateRequest`

- 用于早期固件返回 Passphrase state。
- 当前代码说明新设计已从 `features.session_id` 获取状态。
- 分支只有 TODO，没有对 App 发 Event。
- 仅作为历史协议兼容类型保留。

### `WordRequest`

- 属于设备恢复/助记词输入流程的中间消息。
- `DeviceCommands` 当前只识别类型，分支仍是 TODO。
- 没有公开 App Event 和 `WordAck` 处理闭环。

---

## 不属于“硬件给我们的事件”

以下内容不应出现在硬件事件主清单中：

| SDK/App Event                                   | 为什么不是硬件事件                                                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE`   | 旧 V1/V2 固件升级代码为浏览器 WebUSB 重新授权主动创建；Pro2 `firmwareUpdateV4` 不调用该事件                                                  |
| `REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` | 旧固件切换流程主动创建的 Host 交互，不是设备协议消息                                                                                         |
| `PREVIOUS_ADDRESS_RESULT`                       | SDK 在每次地址方法得到正常结果后主动生成；不是硬件中间消息。当前 SDK 仍会发，但 OneKey App 将其加入 `SKIPPED_EVENTS`，生产业务未找到消费逻辑 |
| `CLOSE_UI_WINDOW` / `CLOSE_UI_PIN_WINDOW`       | Core 为管理 Host UI 主动创建                                                                                                                 |
| `DEVICE_PROGRESS`                               | SDK 根据文件写入或循环进度计算生成                                                                                                           |
| `FIRMWARE_PROCESSING` / `FIRMWARE_TIP`          | SDK 固件升级状态机生成                                                                                                                       |
| 蓝牙、定位、WebUSB 权限事件                     | Transport、操作系统或浏览器环境产生                                                                                                          |
| `DEVICE.CONNECT` / `DEVICE.DISCONNECT`          | Transport 枚举和连接生命周期产生，不是设备协议中间消息                                                                                       |
| `DEVICE.FEATURES` / `SUPPORT_FEATURES`          | Features 是正常响应或 SDK 计算结果，不是交互 Event                                                                                           |
| `FIRMWARE.RELEASE_INFO` / `BLE_RELEASE_INFO`    | SDK 根据远端 release 配置计算生成                                                                                                            |
| `ButtonRequest_FirmwareUpdate`                  | SDK 上传固件前自行模拟的内部 Button code，不是硬件返回的正式 protobuf code                                                                   |

## 代码核验位置

### `hardware-js-sdk`

- `packages/core/src/device/DeviceCommands.ts`
- `packages/core/src/core/index.ts`
- `packages/core/src/events/device.ts`
- `packages/core/src/events/ui-request.ts`
- `packages/core/src/events/ui-response.ts`
- `packages/core/src/api/FirmwareUpdateV4.ts`
- `packages/core/src/api/protocol-v2/DeviceFirmwareUpdate.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`
- `packages/hd-transport/src/types/messages.ts`

### `app-monorepo`

- `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- `packages/kit-bg/src/services/ServiceHardwareUI/ServiceHardwareUI.ts`
- `packages/shared/types/hardwareUi.ts`
- `packages/kit/src/provider/Container/HardwareUiStateContainer/HardwareUiStateContainer.tsx`
