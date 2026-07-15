# SDK 文档

`docs/sdk` 记录 Core 对底层协议的适配方式，以及 SDK/Adapter 对 App 暴露的公共事件。传输帧、协议探测和 USB/BLE 读写统一放在 `docs/protocol/`。

## Protocol V2 适配

| 文档                                                           | 内容                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Protocol V2 的 Core 适配](./protocol-v2/README.md)            | 原始协议消息如何进入 Features、DeviceProfile、公共文件 API 和固件升级流程 |
| [Pro 2 字段迁移](./protocol-v2/pro2-field-migration/README.md) | 设备信息、状态、设置、Session 等字段如何拆分和转换                        |

## 事件文档

SDK Event 分为三个不同层级。判断一个 Event 时，先确认它的生成方和消费方，不能只根据名称中是否包含 `UI`、`DEVICE` 或 `Event` 判断来源。

```text
OneKey 硬件设备
  -> 硬件协议中间消息
  -> hd-core 转换或补充流程状态
  -> hd-* SDK 公共事件
  -> OneKey App

第三方硬件 / Connector
  -> 厂商 Connector 事件
  -> hwk-* Adapter 归一化
  -> hwk-* Adapter 公共事件
  -> OneKey App
```

### 三类事件文档

| 文档                                                | 数据方向                    | 生成方                         | 消费方                       | 记录内容                                                                              |
| --------------------------------------------------- | --------------------------- | ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| [硬件协议交互消息](./event-business-flows.md)       | `Device -> SDK`             | OneKey 硬件固件                | `hd-core` / Transport        | `ButtonRequest`、`PinMatrixRequest`、`PassphraseRequest`、Pro2 固件状态等硬件中间消息 |
| [OneKey `hd-*` SDK 公共事件](./events.md)           | `SDK/Core/Transport -> App` | `hd-core`、外层 SDK、Transport | OneKey App 或 SDK 接入方     | `UI_EVENT`、具体 `UI_REQUEST`、设备生命周期、进度、权限和固件元数据                   |
| [`hwk-*` Adapter 公共事件](./hwk-adapter-events.md) | `Adapter/Connector -> App`  | 多厂商 Adapter 和 Connector    | OneKey App 或 Adapter 接入方 | Ledger/Trezor 等设备的类型化 UI 请求、交互通知和设备生命周期                          |

## 如何判断事件属于哪一层

### 硬件协议交互消息

同时满足以下条件：

1. 消息由设备固件通过 USB/BLE 协议返回。
2. 消息发生在一次业务请求和最终响应之间。
3. SDK 需要消费该消息、发送 Ack、继续调用或更新内部状态。

例如 `ButtonRequest` 是硬件消息；SDK 将它转换为 `REQUEST_BUTTON` 后，`REQUEST_BUTTON` 就是 SDK 公共事件。

### `hd-*` SDK 公共事件

只要事件通过 `HardwareSDK.on()` 暴露给 App，就属于 SDK 公共事件。它的来源可能是：

- 硬件协议消息转换。
- Core 业务流程生成。
- Transport 或操作系统状态生成。
- SDK 根据缓存、Features 或远端配置计算生成。

所以 `UI_EVENT` 不是“硬件事件”分组，而是 SDK 面向 App 的 UI 消息通道。

### `hwk-*` Adapter 公共事件

这类事件属于新的多厂商 Adapter 契约。事件可能来自厂商 Connector，也可能由 Adapter 的业务流程主动生成。它们不使用 `hd-*` 的事件字符串和等待注册表，也不等同于硬件 protobuf 消息。

## 常见误区

| 误解                                     | 正确理解                                             |
| ---------------------------------------- | ---------------------------------------------------- |
| `UI_EVENT` 都是硬件发出的                | `UI_EVENT` 混合了硬件转换、SDK 流程和系统环境消息    |
| `DEVICE.CONNECT` 是设备协议消息          | 它来自 Transport 枚举和 DevicePool 生命周期          |
| `PREVIOUS_ADDRESS_RESULT` 是硬件增量事件 | 它由 SDK 在收到普通地址结果后主动生成                |
| `FIRMWARE.RELEASE_INFO` 是固件主动上报   | 它由 SDK 根据远端 release 配置计算                   |
| `hwk-* ui-event` 等于 `REQUEST_BUTTON`   | `ui-event` 是 Adapter 归一化的交互阶段通知，契约不同 |

## 文档维护规则

1. 新增硬件协议中间消息时，先更新硬件协议交互消息文档。
2. 新增 App 可监听事件时，再更新对应的 SDK 或 Adapter 公共事件文档。
3. 每个公共事件必须标明来源：硬件转换、Core、Transport/系统、Adapter/Connector 或远端配置。
4. 不把方法最终响应、普通错误码或 Features 正常响应写成硬件 Event。
5. Pro2 如果取消 App 公共 Event，仍可在 SDK 内部消费必要的硬件协议中间消息。
