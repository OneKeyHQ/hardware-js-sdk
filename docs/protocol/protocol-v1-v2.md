# Protocol V1/V2 传输协议

本文是 SDK 传输协议的唯一维护入口，说明协议探测、Schema、帧格式、Link 生命周期以及 USB/BLE 平台边界。业务字段如何转换为公共 API 不属于本文，见 [SDK Core 运行时](../sdk/core-runtime.md)。

## 分层与职责

```text
Core / DeviceCommands
  -> Protocol Session：消息编解码、帧、序列号、超时、调用串行化
  -> Transport adapter：连接、原生读写、订阅、平台错误映射
  -> USB / BLE
  -> Hardware
```

传输层的职责终止于：识别设备协议、建立可用 Link、发送一个已编码请求并返回对应响应。Features 映射、钱包 Session、设置、文件上传和固件升级编排由 Core 负责。

## V1 与 V2 核心差异

| 维度     | Protocol V1                  | Protocol V2                              |
| -------- | ---------------------------- | ---------------------------------------- |
| 当前设备 | Classic、Mini、Touch、Pro 等 | 当前为 Pro2，后续可扩展到 Pro 等机型     |
| 初始化   | `Initialize -> Features`     | `Ping` 探测，随后 `DeviceInfoGet` 初始化 |
| 消息编号 | protobuf message type        | `MessageType`，按系统模块分组            |
| 帧       | V1 分包格式                  | `0x5A` 帧头、长度、序列号、CRC8          |
| Schema   | 可按固件版本切换             | 独立 `messages-protocol-v2.json`         |
| 调用模型 | 既有 Transport 调用链        | 每设备 Link、串行队列、持续递增 sequence |
| 失败恢复 | 沿用 V1 Transport 语义       | link-fatal 失效 Link，不自动重放业务命令 |

V1 与 V2 的判断必须依据连接后的设备响应，不能只依赖 PID、设备名或 USB descriptor。

## 自动协议探测

Transport 在 `acquire()` 完成物理连接后执行协议探测：

1. 存在已确认的 V2 hint 或连接缓存时，优先发送 V2 `Ping` probe。
2. 没有 V2 hint 时，默认先验证 V1 `Initialize`。
3. WebUSB 的 V1 probe 失败后必须关闭并重新打开连接，再执行 V2 probe，避免未取消的
   `transferIn` 消费 V2 响应。
4. 两者均失败时，清理本次连接资源并返回协议探测错误。

协议选择输入分为两种语义，二者都不能替代活动响应验证：

- 公共请求中的 `connectProtocol` 映射为严格的 `expectedProtocol`。它用于调用方确实要求某一协议的
  场景，不允许静默回退。
- descriptor、历史活动探测结果和设备名推导值映射为非严格的 `protocolHint`。它只改变 probe 顺序，
  首次失败后必须尝试另一协议。

严格预期的验证规则：

- `connectProtocol='V1'`：必须收到有效的 V1 响应。
- `connectProtocol='V2'`：必须收到有效的 V2 `Ping` 响应；固件升级重连也不能只信任 PID、
  设备名或旧连接缓存。

V2 probe 使用 `Ping { message: 'protocol-v2-probe' }`。探测消息只用于确认链路，不等同于查询协议版本或设备信息。

公共设备对象同样使用 `connectProtocol` 字段作为输出，但输出语义是当前连接已经活动探测确认的协议，
不是原请求值。Core 的方法能力检查只读取该确认结果。设备型号独立来自 V1 `Features` 或 V2
`DeviceInfo.hw.Device_type`；例如未来 Pro 返回 V2 时仍应识别为 Pro，而不是因为协议为 V2 被改成 Pro2。

主要实现：

- `packages/hd-transport/src/protocols/v2/session.ts`
- 各 Transport 的 `detectProtocol()` / `acquire()`
- `packages/core/src/device/Device.ts`

## Schema 与消息分类

`TransportManager` 同时加载：

- V1 默认 Schema：`packages/hd-transport/messages.json`
- V2 Schema：`packages/hd-transport/messages-protocol-v2.json`

V1 可以在 `Initialize` 后根据 Features 和固件版本切换兼容 Schema。V2 不走传统 `GetFeatures`，其 Schema 路由与 V1 版本兼容逻辑保持分离。

V2 消息编号以 firmware-pro2 的 `MessageType` 定义为准，按系统能力分组，例如设备信息、设备状态、Session、设置、文件系统和固件更新。新增消息时的更新顺序是：

1. 修改 firmware-pro2 protobuf 来源。
2. 运行 `yarn update-protobuf` 更新 Schema 与生成类型。
3. 在 `DeviceCommands` 或 Core method 中接入消息。
4. 若消息改变公共能力，再更新 SDK 文档。

不要在传输协议文档中重复记录每个业务字段；字段归属见 [Pro2 字段迁移](../sdk/pro2-field-migration.md)。

## Protocol V2 帧格式

V2 帧用于承载 protobuf payload。维护时重点关注以下字段：

| 字段           | 作用                                                 |
| -------------- | ---------------------------------------------------- |
| magic          | 固定帧标识 `0x5A`                                    |
| message type   | 请求或响应的消息编号                                 |
| payload length | protobuf payload 长度                                |
| sequence       | 每个发送方向独立、跨 channel/source 递增的全局帧序号 |
| payload        | protobuf 编码结果                                    |
| CRC8           | 帧完整性校验                                         |

编码、解码和长度校验必须使用同一套公共实现。BLE notification 或 USB 读取可能返回半帧、多帧或旧连接数据，因此原生读取结果不能直接交给 protobuf 解码。

完整 V2 frame 的 SDK 上限与 firmware Proto Link runtime 一致，固定为 **4200 bytes**，
包含帧头、protobuf message type、payload 和 CRC。业务分片必须在编码前预留 protobuf
开销；不能把文件 chunk 大小直接当成 frame 上限。

主要实现：

- `packages/hd-transport/src/protocols/v2/encode.ts`
- `packages/hd-transport/src/protocols/v2/decode.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`

## Link、Sequence 与调用队列

每个 Transport 实例持有一个 `ProtocolV2LinkManager`：

- Link 按设备 key 隔离。
- 同一设备的 V2 调用串行执行。
- Session、frame assembler 与平台 adapter 在活动 Link 内复用。
- `ProtocolV2SequenceCursor` 的生命周期长于一次连接；普通断开和重连不会把 sequence 重置为 1。
- Transport `dispose` 时才清除 cursor、队列和全部 Link。
- ACK 的 sequence 必须回显本次请求 sequence；设备业务响应使用固件全局发送序列，
  该序列会被其他 channel/source 占用。SDK 必须允许合法间隙，但拒绝当前 Link 中连续收到
  相同业务响应序号；不能把业务响应 sequence 与请求 sequence 强行比较。
- 同一个有限 watchdog 覆盖 `prepareCall`、完整 frame 写入和响应读取；调用未指定时使用
  共享的 5 分钟默认值，超时信号必须传给平台 adapter 以取消当前 generation 的工作。
- ACK 与业务响应共用同一个调用超时，不设置独立的交付看门狗；未在 5 秒内收到 ACK
  不能判定链路失败，因为设备可能正在正常等待用户输入。
- Session 不自动重发请求；文件写入、设置和固件安装等副作用请求的重试只能由了解
  业务幂等性的 Core 流程决定。

Link-fatal 错误包括响应超时、断连、I/O、generation 失效和帧错误。发生后必须先使 Link
失效，再取消读取、清空 assembler、关闭平台连接并清理协议缓存。

protobuf `Failure` 属于设备业务响应，默认不使 Link 失效。Transport 也不得自动重发业务
命令，因为文件写入、设置和固件安装可能已经在设备端产生副作用。

## Generation 与旧异步结果隔离

USB open、claim、reset 或 reconnect 后需要轮换 generation。BLE 重新订阅 notification 时也必须隔离旧订阅回调。

任何异步读取在完成时都要确认自己仍属于当前 generation；否则立即丢弃或失败。这个规则用于防止：

- 旧连接的迟到响应被新请求消费。
- dispose 后仍有读取任务写入 assembler。
- 重连后旧 notification 继续触发解码。

## USB Transport

Node USB 与 WebUSB 共享 `ProtocolV2UsbTransportBase`，差异只存在于原生设备 API：

- 发现 interface 和 IN/OUT endpoint。
- open、select configuration、claim interface。
- 按完整 V2 frame 写入 OUT endpoint。
- 从 IN endpoint 持续读取并交给公共 assembler。
- 在 reset、reconnect 和 dispose 时轮换 generation 并取消旧读取。

WebUSB 还需要处理浏览器授权、页面生命周期和浏览器返回的 `USBInTransferResult`；Node USB 负责原生设备句柄与 transfer 错误映射。这些差异不能改变公共 Session 的超时和重试语义。
WebUSB 不得在每次调用前单独清空 assembler；assembler 与响应序列链只随 link generation
一起失效。router、packet source、ACK/响应 sequence、framing/CRC 和超时统一使用类型化
Link 错误，并触发 session、assembler、读取状态和平台连接重建。

主要实现：

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- `packages/hd-transport-web-device/src/` 下的 WebUSB 与 Node USB 实现

## BLE Transport

BLE 平台实现包括 Electron、React Native 和 lowlevel 插件。公共约束如下：

- 连接后发现服务和特征，先建立 notification 订阅，再开始协议调用。
- Protocol V2 完整 frame 统一由 `ProtocolV2BleFrameWriter` 按平台 MTU 或插件上限分包；
  平台 adapter 只提供单包写入、容量、节流参数和平台错误映射。Protocol V1 保持原有分包协议，
  不进入该 writer。
- React Native 的大 frame 写入使用有界 burst 和 flush pause；只对明确的
  `GATT_CONGESTED` 做有界退避重试，断连或 generation 变化立即中止，不能跨连接继续写。
- notification 数据统一进入 `ProtocolV2FrameAssembler`，不能假设一次通知就是一帧。
- 重连或重新订阅后，旧回调必须通过 generation/token 失效。
- lowlevel 插件只提供连接、读写和订阅能力，不复制协议状态机。

BLE 分包大小是平台传输参数，不属于 protobuf 或业务 API。性能结论见 [Pro2 BLE 传输测速记录](../testing/pro2-ble-performance.md)。

## 错误与重试边界

| 错误类型                            | 处理层                    | 默认行为                     |
| ----------------------------------- | ------------------------- | ---------------------------- |
| protobuf `Failure`                  | Core / method             | 保持 Link，根据业务语义处理  |
| `DeviceLocked`                      | 显式声明解锁策略的 method | 解锁后最多重试一次           |
| 超时、断连、I/O                     | Protocol Link / Transport | 使 Link 失效并清理平台资源   |
| CRC、长度、sequence/generation 异常 | Protocol Session          | 拒绝响应并使 Link 失效       |
| 文件写入、设置、固件更新失败        | Core 业务流程             | 只有确认幂等时才允许上层重试 |

## 维护检查清单

修改协议或 Transport 时至少检查：

1. V1 与 V2 探测顺序是否仍能覆盖共享 PID 设备。
2. 新 Transport 是否只实现平台 adapter，而不是复制 Session 状态机。
3. sequence 是否跨普通重连保持递增。
4. 旧 generation 的异步结果是否会被丢弃。
5. Link-fatal 后是否同时清理读取、assembler、连接和协议缓存。
6. 是否错误地在 Transport 层重放了可能有副作用的请求。
7. protobuf 来源、生成 Schema 和 Core 类型是否同步。

## 事实来源

- V2 protobuf：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/`
- V2 公共实现：`packages/hd-transport/src/protocols/v2/`
- USB/BLE 实现：各 `packages/hd-transport-*` 包
- 持续有效的架构约束：[SDK 关键架构决策](../architecture/decisions.md)
