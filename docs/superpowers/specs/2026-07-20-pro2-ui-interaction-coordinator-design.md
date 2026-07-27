# Pro2 UI 交互协调器设计

## 目标

为 Protocol V2 / Pro2 增加统一的 SDK UI 交互协调层。在 firmware 不再发送
`ButtonRequest`、`PinMatrixRequest`、`PassphraseRequest` 等 UI 中间消息的前提下，SDK 根据业务方法、
设备锁定状态和钱包 Session 阶段合成既有公共 `UI_EVENT`，保证 App 可以继续复用当前硬件等待 UI。

首批实施范围包括：

- 自动解锁：`DeviceLocked -> REQUEST_PIN -> DeviceSessionAskPin -> retry once`。
- `deviceChangePin`：Protocol V1 保持 `ChangePin`；Protocol V2 路由到
  `DeviceSettingsPageShow(DevicePinChange)`。
- `deviceSettingsPageShow`：在打开 Pro2 设置页前发出统一的设备操作提示。
- `deviceWipe`：Protocol V1 保持 `WipeDevice`；Protocol V2 路由到
  `DeviceSettingsPageShow(DeviceReset)`，成功表示擦除确认页已打开。
- 公共 Event payload：增加稳定的来源、原因、设备输入约束和完成语义。

`uploadPortfolio` 是明确的无 UI Event 例外：文件分片不发送进度 Event，`PortfolioUpdate` 也不需要
设备确认提示。即使设备锁定后由 SDK 自动调用 `DeviceSessionAskPin`，该方法仍禁止合成
`REQUEST_PIN/REQUEST_BUTTON`，最终结果只以 firmware 的 `Success/Failure` 为准。

地址、公钥、签名和其他危险设备管理操作不在首批迁移范围，但必须能直接复用本设计的协调器和元数据。

## 设计原则

1. 不修改 Pro2 firmware 协议。
2. 不伪造 firmware protobuf UI Request，也不发送无意义的 ACK。
3. Protocol V1 保持现有 firmware Event + App `uiResponse()` + ACK 流程。
4. Protocol V2 的 `REQUEST_PIN`、`REQUEST_BUTTON` 是 SDK 合成的非阻塞提示，不等待 App 响应。
5. PIN、指纹、设备 Passphrase 和新旧 PIN 始终只在设备上输入。
6. 页面导航命令的成功表示 `page-accepted`，不表示用户已经完成设置。
7. Event 的打开、阶段切换、去重和关闭由协调器统一负责，业务方法不直接拼装 Event payload。
8. 后台数据同步方法可以声明 `protocolV2UiMode='none'`，关闭包括自动解锁提示在内的全部合成 Event。

## 方案

采用“统一协调器 + 方法交互元数据”的组合方案。

```text
BaseMethod interaction metadata
              |
              v
ProtocolV2UiInteractionCoordinator
  - enterMethodInteraction()
  - enterUnlockInteraction()
  - resumeMethodInteraction()
  - close()
              |
              v
        Core postMessage(UI_EVENT)
```

protobuf 命令层不自动推断 UI，因为同一个底层命令可能服务于不同产品场景，无法稳定表达文案、完成语义、
取消策略和重试策略。业务方法只声明语义，Core 和自动解锁流程负责调用协调器。

## 组件边界

### `ProtocolV2UiInteractionCoordinator`

新增独立模块，负责：

- 仅为 Protocol V2 设备生成合成 Event。
- 将交互描述转换成 `REQUEST_PIN` 或 `REQUEST_BUTTON`。
- 记录当前设备、方法和交互阶段，避免同一阶段重复 emit。
- 从方法交互切换到解锁提示，并在解锁完成后恢复方法交互提示。
- 在成功、失败、取消和异常退出时幂等发送 `CLOSE_UI_WINDOW`。
- 不创建 `_uiPromises`，也不消费 `RECEIVE_PIN`、`RECEIVE_BUTTON` 等响应。

协调器不负责：

- 发送 protobuf 命令。
- 判断业务方法是否允许自动重试。
- 保存 PIN、Passphrase 或其他敏感数据。
- 根据 `DeviceStatusGet` 猜测用户是否完成了设备页面操作。

### 方法交互元数据

`BaseMethod` 增加可选的 Protocol V2 交互描述：

```ts
type ProtocolV2InteractionDescriptor = {
  request: 'button';
  source: 'method-lifecycle';
  reason:
    | 'change-pin'
    | 'settings-page'
    | 'address-confirmation'
    | 'public-key-confirmation'
    | 'signing-confirmation'
    | 'device-management';
  completion: 'page-accepted' | 'operation-completed';
  deviceOnly: true;
  page?: string | number;
  operation?: string;
};
```

首批方法设置如下：

| 方法 | 条件 | reason | completion |
| --- | --- | --- | --- |
| `deviceChangePin` | Protocol V2 | `change-pin` | `page-accepted` |
| `deviceSettingsPageShow` | Protocol V2 | `settings-page` | `page-accepted` |

Protocol V1 忽略该元数据，继续依赖 firmware UI 消息。

### 自动解锁描述

自动解锁不属于普通方法元数据，因为它只在收到结构化 `DeviceLocked` 后发生。协调器生成：

```ts
{
  type: UI_REQUEST.REQUEST_PIN,
  payload: {
    device,
    source: 'unlock-coordinator',
    reason: 'device-locked',
    deviceOnly: true,
    method: method.name,
  },
}
```

该 Event 只用于提示 App 展示“请在设备上输入 PIN 或使用指纹”，App 不调用 `uiResponse()`。

## 公共 Event 类型

扩展 `REQUEST_PIN` 和 `REQUEST_BUTTON` payload，使 V1 与 V2 可以共用 Event 名称，同时明确来源和响应规则：

```ts
type ProtocolV2UiEventSource =
  | 'unlock-coordinator'
  | 'wallet-session-coordinator'
  | 'method-lifecycle';

type ProtocolV2UiCompletion = 'page-accepted' | 'operation-completed';
```

V2 合成 Event 可以携带：

- `source`
- `reason`
- `deviceOnly`
- `completion`
- `method`
- `page`
- `operation`

这些字段均不包含 PIN、Passphrase、交易正文或其他敏感数据。V1 现有 payload 保持兼容，新增字段均为可选。

## 调用流程

### 未锁定的 Change PIN

```text
App -> SDK: deviceChangePin(remove=false)
SDK -> App: REQUEST_BUTTON(change-pin, page-accepted, deviceOnly=true)
SDK -> Pro2: DeviceSettingsPageShow(DevicePinChange)
Pro2 -> SDK: Success
SDK -> App: CLOSE_UI_WINDOW
SDK -> App: API Success
```

API Success 只表示设备已接受请求并打开修改 PIN 页面。App 可以提示“请继续在设备上完成操作”，但不能显示
“PIN 修改成功”。用户随后在设备上完成或取消，SDK 不再等待最终结果。

### 锁定状态下的 Change PIN

```text
SDK -> App: REQUEST_BUTTON(change-pin)
SDK -> Pro2: DeviceSettingsPageShow(DevicePinChange)
Pro2 -> SDK: Failure(DeviceLocked)
SDK -> App: REQUEST_PIN(unlock-coordinator, deviceOnly=true)
SDK -> Pro2: DeviceSessionAskPin
Pro2 -> SDK: Success
SDK -> Pro2: DeviceStatusGet
SDK -> App: REQUEST_BUTTON(change-pin)
SDK -> Pro2: DeviceSettingsPageShow(DevicePinChange)
Pro2 -> SDK: Success
SDK -> App: CLOSE_UI_WINDOW
SDK -> App: API Success
```

恢复方法提示是一次明确的阶段切换，不算重复 Event。原方法最多重试一次。

### 设置页

`deviceSettingsPageShow` 使用相同流程，payload 包含具体 `page`。页面命令成功后立即关闭 SDK 等待 UI；
App 后续通过 `DeviceSettingsGet`、`DeviceStatusGet` 或重新连接刷新事实状态，但不以轮询推断页面是否完成。

## `deviceChangePin` 协议路由

公共 API 保持不变：

```text
Protocol V1 -> ChangePin(remove)
Protocol V2 -> DeviceSettingsPageShow(DevicePinChange)
```

Protocol V2 的 `remove=true` 不可静默忽略。当前 firmware 页面协议没有独立的移除 PIN 语义，因此 SDK 应返回
明确的参数或不支持错误；`remove=false` 才路由到 `DevicePinChange` 页面。

## Core 集成

Core 在设备初始化、协议识别和方法模式检查完成后执行：

1. 为当前调用创建协调器上下文。
2. 在首次 `method.run()` 前进入方法交互阶段。
3. `runMethodWithUnlockRetry()` 捕获 `DeviceLocked` 后进入解锁阶段。
4. `DeviceSessionAskPin` 和 `DeviceStatusGet` 成功后恢复原方法交互阶段。
5. 原方法只重试一次。
6. Core 的统一 `finally` 调用协调器 `close()`。

已有的全局 `closePopup()` 保留作为兼容兜底，但协调器的 `close()` 必须幂等，防止重复关闭造成 App 反向取消。

## 错误与取消

- `DeviceSessionAskPin` 用户取消：不重试原方法，关闭 UI，原 API 返回取消错误。
- PIN 错误或次数耗尽：不重试，关闭 UI，保留结构化设备错误。
- 第二次仍返回 `DeviceLocked`：不再次解锁，直接失败并关闭 UI。
- `DeviceSettingsPageShow` 返回失败：关闭 UI，向调用方返回原始映射错误。
- App 主动取消：沿用当前 Core cancel 路径，并由统一 `finally` 关闭 UI。
- 断连或 Transport 超时：清除当前交互状态并关闭 UI。
- 页面已 accepted 后用户在设备上取消：不改变已经返回的 SDK API 结果。

## V1/V2 兼容边界

- V1 `PinMatrixRequest` 仍建立 `RECEIVE_PIN` 等待并发送 `PinMatrixAck`。
- V1 `ButtonRequest` 仍转换为 `REQUEST_BUTTON` 并发送 `ButtonAck`。
- V1 `PassphraseRequest` 仍等待 `RECEIVE_PASSPHRASE`。
- V2 合成 `REQUEST_PIN/REQUEST_BUTTON` 不建立 UI Promise，也不发送 ACK。
- 首批实现不删除当前 Pro2 对旧 firmware UI 中间消息的过渡兼容；待所有合成 Event 场景迁移并完成真机验证后，
  再单独将 V2 收到旧 UI Request 改为协议回归错误。

## 测试设计

### 协调器单元测试

- Protocol V1 不生成合成 Event。
- Protocol V2 根据描述生成正确的 `REQUEST_BUTTON` payload。
- 解锁阶段生成 `REQUEST_PIN`，包含 `deviceOnly=true` 和方法名。
- 相同阶段重复进入不重复 emit。
- 解锁完成后可以恢复方法交互提示。
- `close()` 多次调用只产生一次有效关闭。

### 自动解锁测试

- 首次 `DeviceLocked` 时顺序为：方法提示、PIN 提示、AskPin、状态刷新、方法提示、retry。
- 不等待 `RECEIVE_PIN`。
- 解锁取消后不重试。
- 第二次 locked 后不再次解锁。
- 非 Protocol V2 方法不进入协调器。

### Change PIN 测试

- V1 仍发送 `ChangePin`。
- V2 `remove=false` 发送 `DeviceSettingsPageShow(DevicePinChange)`。
- V2 `remove=true` 返回明确的不支持错误。
- V2 API Success 表示 page accepted。
- V2 Change PIN 生成 `REQUEST_BUTTON(reason=change-pin, completion=page-accepted)`。

### 设置页测试

- 每个允许页面都携带正确的 `page`。
- 页面打开成功后 API 立即结束并关闭 UI。
- locked 设置页复用统一自动解锁阶段切换。

## 文档更新

实现完成后同步更新：

- `docs/sdk/events.md`
- `docs/sdk/pro2-eventless-migration.md`
- `docs/business/pro2-device-management.md`
- developer portal 的 PIN 与 `deviceChangePin` 页面

文档必须明确 `page-accepted` 与 `operation-completed` 的差异，以及 Pro2 非阻塞 Event 不调用
`uiResponse()`。

## 验收标准

1. Pro2 锁定业务会向 App 发一次可识别的设备 PIN 提示，并在设备解锁后自动继续原调用。
2. Pro2 `deviceChangePin(remove=false)` 打开设备修改 PIN 页面，并以 page accepted 结束 API。
3. Pro2 Change PIN 和设置页都由统一协调器生成 Event，业务方法不直接拼装公共 UI payload。
4. Protocol V1 的 UI Request、`uiResponse()` 和 ACK 行为不发生回归。
5. 所有成功、失败、取消和异常路径都会幂等关闭 UI。
6. Event payload 不包含 PIN、Passphrase 或其他敏感数据。
