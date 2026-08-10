# OneKey Hardware SDK 架构概览

## 核心分层

Hardware SDK 的目标是让应用层只感知统一 API，不需要关心设备型号、传输介质或底层协议版本。

```mermaid
flowchart TD
  App["Application / DApp"]
  Api["SDK API 层 (@onekeyfe/hd-core)"]
  Device["Device / Protocol V2 feature adapter / DeviceCommands"]
  Manager["TransportManager"]
  Session["Protocol Session"]
  Transport["Transport 实现层"]
  WebUSB["WebUSB"]
  ElectronBLE["Electron BLE"]
  RNBLE["React Native BLE"]
  NodeUSB["Node USB"]
  Bridge["HTTP Bridge"]
  Other["Lowlevel / Emulator"]
  Hardware["OneKey 设备"]

  App --> Api --> Device --> Manager --> Session --> Transport
  Transport --> WebUSB
  Transport --> ElectronBLE
  Transport --> RNBLE
  Transport --> NodeUSB
  Transport --> Bridge
  Transport --> Other
  WebUSB --> Hardware
  ElectronBLE --> Hardware
  RNBLE --> Hardware
  NodeUSB --> Hardware
  Bridge --> Hardware
  Other --> Hardware
```

## 协议分层

当前 SDK 同时维护两套设备通信协议：

| 协议        | 设备范围                                | 传输方式            | 主要能力                                                    |
| ----------- | --------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Protocol V1 | Classic / Mini / Touch / Pro 等现有设备 | USB、BLE、Bridge 等 | 钱包业务能力，`Initialize -> Features` 握手，签名和地址派生 |
| Protocol V2 | Pro2、Neo，后续可扩展到 Pro 等机型      | USB、BLE            | 设备信息、钱包 Session、文件系统、设置、固件更新和协议探测  |

协议选择是传输层内部职责。外部调用方不需要显式选择 V1 或 V2，也不应该依赖 PID、设备名或 USB descriptor 来判断协议。

协议公共逻辑集中在 `packages/hd-transport` 的 Protocol Session 层：

- `ProtocolV2Session`：负责 V2 encode、frame 写入、frame 读取、decode、超时和统一日志。
- `ProtocolV2FrameAssembler`：负责 BLE/USB 分片后的 `0x5A` frame 重组和长度校验。
- `ProtocolV2LinkManager`：按设备复用 Session、串行调用，并在致命错误后使 Link 失效。
- `ProtocolV2SequenceCursor`：让普通断开和重连后的帧序号继续递增，Transport dispose 时再清除。
- `probeProtocolV2()`：公共 V2 probe helper，发送 `Ping { message: 'protocol-v2-probe' }` 并执行失败清理钩子。

各 transport 的 `detectProtocol()` 根据尚未确认的内部 hint 选择首次 V1/V2 probe 顺序。调用方显式传入的
`connectProtocol` 是严格预期，必须通过对应协议的活动响应验证；初次活动探测确认后，descriptor 和 App
持久化结果都作为后续连接的严格预期，不再回退到另一协议。只有显式 `forceProtocolDetection` 会让单次
调用忽略绑定并重新探测。

WebUSB、Electron BLE、React Native BLE 和 lowlevel BLE 只负责各自的物理连接、读写、订阅/桥接和平台错误映射，不再各自复制 V2 协议会话逻辑。

长期有效的设计约束集中记录在 [SDK 关键架构决策](./decisions.md)。

## 统一 DeviceState

`DeviceStateStore` 是设备身份、版本、设置和运行状态的唯一状态源。V1/V2 Mapper 只负责把协议响应转换为统一 patch；旧版 `Features` 仅由统一状态即时投影：

| 协议 | 数据来源                                                 | 标准输出      | 兼容输出                      |
| ---- | -------------------------------------------------------- | ------------- | ----------------------------- |
| V1   | `Initialize -> Features`                                 | `DeviceState` | `getFeatures()` 投影（仅 V1） |
| V2   | `Ping` probe + `DeviceInfoGet/ProtocolInfo/DeviceStatus` | `DeviceState` | 不支持 `getFeatures()`        |

`getDeviceState()` 和 `DEVICE.STATE` 共享同一份完整快照。normal 模式下只有明确请求 runtime/status
刷新时才读取 `DeviceStatus`；bootloader/romloader 模式自动跳过该命令。

公共刷新范围按业务语义定义，调用方不需要理解底层协议命令：

| scope      | V1 数据来源                       | V2 数据来源                                                 |
| ---------- | --------------------------------- | ----------------------------------------------------------- |
| `runtime`  | `GetFeatures`                     | normal 模式 `DeviceStatusGet`                               |
| `settings` | `GetFeatures`                     | normal 模式 `DeviceStatusGet + DeviceSettingsGet`           |
| `firmware` | `GetFeatures + OnekeyGetFeatures` | `DeviceInfoGet` 全组件 version/build ID/hash；normal 加状态 |

统一字段遵循以下语义：

- `identity.label` 只保存用户设置的真实 label，不使用 BLE 名称或型号兜底。
- `identity.bleName` 只保存广播/连接名称。
- 面向用户的展示名称继续使用兼容设备对象的 `name`；`DeviceState.identity` 不保存派生展示字段。
- V1 原始 `model` 只用于协议兼容，不作为产品展示名。
- Protocol V2 的设备型号来自 `DeviceInfo.hw.Device_type`，不得根据 V2 协议反推为 Pro2。
- Protocol V2 的 SE 镜像存在与否不决定主控运行模式；应用镜像存在时保持 normal 或已确认的 onboarding mode。
- `raw` 按协议来源键字段级合并，只供 SDK 内部兼容逻辑使用；钱包 session 也只用于 Core 运行时恢复。公共 `getDeviceState()` 和 `DEVICE.STATE` 均不暴露二者。

## 自动协议探测

支持 Protocol V2 的传输实现会在 `acquire()` 后主动探测协议。没有 V2 hint 时默认先验证 V1，V1
失败后再 probe V2；有 V2 hint 或 V2 连接缓存时会先验证 V2，失败后仍会回退验证 V1。显式
`connectProtocol='V1'` 或 `'V2'` 都是严格预期，只验证指定协议并在不匹配时失败：

```mermaid
flowchart TD
  Enumerate["enumerate()"]
  Acquire["acquire()"]
  Connect["connect / subscribe"]
  ProbeV1["Protocol V1 Initialize"]
  V1["Initialize 成功: 标记 Protocol V1"]
  ProbeV2["Protocol V2 Ping probe"]
  V2["V2 probe 成功: 标记 Protocol V2"]
  DetectionError["V1/V2 均失败: 抛出协议探测错误"]
  Init["Device.initialize()"]
  InitV1["V1: Initialize -> Features"]
  InitV2["V2: DeviceInfoGet -> DeviceState"]

  Enumerate --> Acquire --> Connect --> ProbeV1
  ProbeV1 --> V1 --> Init
  ProbeV1 --> ProbeV2
  ProbeV2 --> V2 --> Init
  ProbeV2 --> DetectionError
  Init --> InitV1
  Init --> InitV2
```

这样可以解决共享 PID 或 descriptor 不稳定带来的误判问题，并避免把没有响应的未知设备错误归类为 V1。

## TransportManager 职责

`TransportManager` 负责初始化当前运行环境对应的 transport，并在初始化时同时配置：

- 默认 V1 protobuf schema：`messages.json`
- Protocol V2 protobuf schema：`messages-protocol-v2.json`

V1 设备仍可在 `Initialize` 后通过 `TransportManager.reconfigure(features)` 切换到适配固件版本的 schema。V2 设备不走 `Initialize/GetFeatures`，因此不依赖 features 重新选择协议；协议选择由 transport 的 `getProtocolType(path)` 返回。

## Device 层职责

`Device.acquire()` 完成后会从 transport 读取检测到的协议类型，并写回
`originalDescriptor.protocolType`。该字段在下一次连接时只作为 hint，在当前活动连接中则是能力判断的
唯一协议结果。后续 `Device.initialize()` 基于该字段选择初始化路径：

- V1：发送 `Initialize`，使用真实 `Features`
- V2：Transport acquire 已用 `Ping` probe 确认链路；初始化依次读取不含 status target 的
  `DeviceInfoGet`、固定启用 eventless wallet session 的 `ProtocolInfoRequest`，并仅在 normal
  模式且能力已声明时读取 `DeviceStatusGet`

Protocol V2 没有传统 `GetFeatures`。公共调用方统一读取 `getDeviceState()`；原始 `DeviceInfoGet`、`DeviceStatusGet` 和 `DeviceSettingsGet` 只保留在 SDK 内部。设备身份以 `serialNo/deviceId` 的语义区分为准。

## Protocol V2 文件和固件更新链路

Protocol V2 固件更新使用系统消息：

```mermaid
flowchart TD
  Prepare["refresh config + prepare firmware binaries"]
  Enter["normal -> reboot Bootloader / loader -> reuse connection"]
  Inventory["loader only: resource size + header hash"]
  Download["download changed resource bundles"]
  Mkdir["FilesystemDirMake"]
  Write["FilesystemFileWrite(resource / bootloader / firmware)"]
  Install{"firmware targets?"}
  Update["DeviceFirmwareUpdate(targets)"]
  Done["resource sync complete"]

  Prepare --> Enter
  Enter --> Inventory --> Download --> Mkdir
  Enter --> Mkdir
  Mkdir --> Write --> Install
  Install -->|yes| Update
  Install -->|resource files only| Done
```

Application 模式只允许宿主访问 `vol1:/wallpapers`、`vol1:/portfolio` 和 `vol1:/nft`，读取
`vol0:/bundles/**` 会返回 `Path not allowed`。因此普通模式下的版本检查把资源状态保留为
`unknown`；`FirmwareUpdateV4` 先切换到 Bootloader，再通过 `FilesystemPathInfoQuery` 和
`FilesystemFileRead` 比较资源大小及文件头哈希，最后只下载和写入有差异的资源。设备已经在
Bootloader 或 Romloader 时复用当前 loader 连接，不重复 reboot。

`DeviceFirmwareUpdate.targets` 只包含需要安装的固件。稳定 RESC bundle 与 boot resource manifest
中的文件都通过 `FilesystemFileWrite` 同步；普通资源写入最终路径，但 bootloader 当前挂载的
`boot_resource.okpkg` 必须写入 `.staging` 路径，由下次启动在挂载前完成替换，避免 FatFs 因文件已打开而拒绝覆盖。
资源单独更新时不发送空的安装请求。SDK 不假设固件端会隐式扫描其他已写入路径。

远程正式升级必须先通过最新配置生成 `FirmwareUpdatePlan`，宿主下载后再生成带完整收据的
`PreparedPlan`；文件大小和 SHA-256 必须与远程 Plan 完全一致。执行阶段以 `PreparedPlan` 为唯一事实源，
组件引用、升级目标和预期版本不需要调用方重复传入，也不重新依赖可能已变化的在线 release 记录。
`hostBindingGeneration` 只允许与完整 `preparedPlan` 同时提交；不再接受把已注册 generation 用于
非 Prepared 组件更新的旧调用方式。

本地开发升级与远程 Plan 严格分离：组件可以继续通过 `firmwareUpdateV4` 的各组件 `ArrayBuffer` 字段传入；
完整资源 ZIP 通过 `resourceArchiveBinary` 传入。Core 会把本地组件和资源 ZIP 转换成本地 Plan、PreparedPlan、
receipt 与内存 `ArtifactReader`；该路径不读取或匹配远程配置，但仍会在修改设备前校验 ZIP 声明展开大小、
manifest 合约、允许写入路径、条目集合、文件大小和 SHA-256；设备端继续负责签名包的最终验证与启用。
旧的 `resourceFiles` 与 `resourceBundleArtifacts` 裸文件参数已在 Protocol V2 alpha 阶段删除。新调用方必须
迁移到 `resourceArchiveBinary` 或完整 `PreparedPlan`；SDK 不再维护第二套逐文件资源输入和远程 release 绑定流程。
不得把本地文件作为远程 Plan 的 override 来绕过远程收据校验。

## 包职责速查

| 包                                   | 职责                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| `packages/core`                      | SDK API、Device 生命周期、固件更新流程、事件输出               |
| `packages/hd-transport`              | protobuf 加载、V1/V2 encode/decode、Protocol Session、类型定义 |
| `packages/hd-transport-web-device`   | WebUSB 和 Electron BLE transport                               |
| `packages/hd-transport-react-native` | React Native BLE transport                                     |
| `packages/hd-common-connect-sdk`     | 根据 env 选择 transport，向桌面/Web 示例暴露统一入口           |
| `submodules/firmware-pro2`           | Pro2 protobuf schema 来源                                      |

## 设计原则

- 协议判断必须基于连接后的设备响应，而不是静态 PID、名称或 descriptor。
- 当前 Pro2 支持 USB 和 BLE；WebUSB、Electron BLE 和 React Native BLE 都应通过活动响应选择
  Protocol V2，且不得假设 Pro 永远使用 V1。
- 协议探测、V2 frame 重组和 V2 call 路由应复用 Protocol Session 层，避免在具体 transport 中重复实现。
- Electron BLE 默认入口是 `desktop-web-ble`，不再提供按设备型号拆分的 env alias。
- V1 schema 兼容逻辑和 V2 schema 路由逻辑分离，避免为了新协议改动现有设备的初始化路径。
- Device 层通过 Protocol Mapper 暴露统一 `DeviceState`；`Features` 只保留给 Protocol V1 兼容，业务方法不直接消费 Protocol V2 原始 `DeviceInfo`。

传输协议细节见 [Protocol V1/V2 传输协议](../protocol/protocol-v1-v2.md)；Core 的运行时和字段适配见 [SDK Core 运行时](../sdk/core-runtime.md) 与 [Pro2 字段迁移](../sdk/pro2-field-migration.md)。
