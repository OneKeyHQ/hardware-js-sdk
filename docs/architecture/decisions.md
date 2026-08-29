# SDK 关键架构决策

本文集中记录仍然约束当前实现的架构决策。它不是设计过程归档；已失效的讨论由 Git 历史和 PR 保存。

## Protocol V2 Link 与序列号生命周期

Protocol V2 响应依靠串行调用、消息类型和帧序号维持请求边界。当前采用以下规则：

- 每个 Transport 实例持有一个 `ProtocolV2LinkManager`，并按设备 key 隔离 Link。
- 同一设备的调用串行执行，Link 内复用 Session、frame assembler 和平台 adapter。
- `ProtocolV2SequenceCursor` 跨普通断开、重连和 Link 失效保持递增，只在 Transport `dispose` 时清除。
- 固件业务响应 sequence 是跨 channel/source 的全局发送序列。单个 Transport 只能拒绝连续
  重复的响应序号，不能要求相邻可见响应绝对连续；其他路由会形成合法间隙。
- 超时、断连、I/O、generation 和帧错误属于 link-fatal；protobuf `Failure` 等业务响应不自动判定为 link-fatal。
- Link 失效后允许 SDK 发送序列出现间隙，但不得回退或复用旧序列号。

主要实现：

- `packages/hd-transport/src/protocols/v2/link-manager.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`
- `packages/hd-transport/src/protocols/v2/sequence-cursor.ts`

## 用户 Cancel 的所有权

协议 `Cancel` 只由 SDK Core 决定是否发送。App 关闭 UI 可以随时调用 `sdk.cancel()`，但不得按机型、配对阶段或权限弹窗自行决定“这次要不要发 Cancel”。

当前规则：

- 未 acquire 的连接、配对、probe 或 initialize：只中止本地调用并断开物理链路，不发送协议 `Cancel`，也不为了发 `Cancel` 再 acquire。
- 已 acquire 且存在 PIN / passphrase / Button 的 `cancelableAction`，或 Protocol V2 已打开用户交互：才向设备发送 `Cancel`（V1 OneKey 设备上的 PIN 仍走既有 `Initialize` 取消）。
- 用户取消后，同一轮 acquire / initialize / BLE 重试必须立即失败，不得把 `BleConnectedError` 当成可重试错误继续连。
- 固件升级过程中是否关闭页面、是否继续安装属于 App 导航生命周期，不是协议 Cancel 策略。

主要实现：

- `packages/core/src/device/Device.ts` `interruptionFromUser()`
- `packages/core/src/device/DeviceCommands.ts` `cancelDeviceInPrompt()`
- `packages/core/src/core/index.ts` `cancel()` / `connectDeviceForBle()`

## 公共协议层与 Transport 边界

为保证 USB 和 BLE 使用一致的调用与恢复语义，公共协议层和平台 Transport 的职责严格分离：

- 公共层负责 protobuf 编解码、帧组装、调用串行化、超时、序列号和 Link 生命周期。
- Transport adapter 只负责平台连接、原生读写、notification/endpoint 管理和平台错误映射。
- Protocol V2 BLE 的完整 frame 分片循环、调用取消和 generation 边界由共享
  `ProtocolV2BleFrameWriter` 负责；Electron、React Native 和 lowlevel adapter 只提供各自的
  单包容量、节流参数和原生写入。Protocol V1 的既有 BLE 分包不复用该路径。
- Node USB 与 WebUSB 复用 `ProtocolV2UsbTransportBase`。
- USB 在 open、claim、reset 或 reconnect 后轮换 generation，旧 generation 的异步读写必须失败。
- Transport 不自动重发 Protocol V2 业务命令；有副作用操作的重试由了解幂等性的 Core 流程决定。

协议选择状态必须区分四种含义：

- `expectedProtocol` 来自调用方显式 `connectProtocol`，属于严格约束，活动探测不匹配时立即失败。
- `protocolHint` 只来自尚未确认的 Transport 内部缓存，只决定首次 probe 顺序，失败后允许切换协议。
- `detectedProtocol` 只来自当前活动连接响应，是初始化分支、方法能力检查和公共输出的唯一依据。
- 已确认的 `detectedProtocol` 会成为后续连接的严格预期；App 恢复的持久化协议通过
  `setDeviceConnectProtocol()` 按 connectId 绑定，并在所有后续调用中注入。只有显式
  `forceProtocolDetection` 可以让单次调用回到主动探测。

协议版本与设备型号互相独立。Protocol V2 设备型号读取 `DeviceInfo.hw.Device_type`；不能用 V2 推导
Pro2，也不能用 Pro/Pro2 型号反推协议。这样 Pro 后续迁移到 Protocol V2 时不需要改业务能力模型。

主要实现：

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- `packages/hd-transport/src/protocols/v2/link-manager.ts`

## 资源上传的跨运行时参数边界

TopLevel 与 LowLevel SDK 可能通过 Extension background/offscreen、React Native bridge 等只支持 JSON
语义的宿主桥接。公共业务 API 不提供递归二进制 codec，而是让确实需要跨运行时的资源使用明确、可校验
的字符串契约：

- Portfolio package、Pro2 壁纸 JPEG、NFT 原图 JPEG 与缩略图 JPEG 使用不带 data URL 前缀的标准
  Base64；LowLevel Core 在设备 I/O 前完成严格解码、大小和格式校验。
- Base64 只用于公共运行时边界；LowLevel 内部仍使用 `Uint8Array` 完成设备格式转换、protobuf 编码和
  文件分片，不在每个内部调用之间重复编解码。
- Protocol V1 的老 Pro/Touch 资源接口继续使用既有 hex 契约，不因 Protocol V2 的资源 API 改变。
- 固件升级在 LowLevel 所在运行时下载或读取 artifact；Extension background 不把原生二进制传入
  offscreen。Desktop Bridge 的直连二进制也不经过全局 Base64 包装。
- 非法、非规范或超过上限的 Base64，以及无效 JPEG 和错误图片尺寸，必须在设备 I/O 前返回
  `CallMethodInvalidParameter`。

主要实现：

- `packages/core/src/api/helpers/base64Data.ts`
- `packages/core/src/api/UploadPortfolio.ts`
- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/api/protocol-v2/DeviceUploadNft.ts`

## 钱包 Session 所有权与缓存键

Transport 连接、帧序号、设备端 `session_id` 和钱包标识是四类不同状态，不能共用缓存：

- V1/V2 的 `openWalletSession()` 对标准/隐藏钱包都只返回公开钱包身份
  `deviceId + passphraseState`；固件 `session_id` 只进入 Core 内部 Store，不通过公共响应透传。
- 现有 App 可继续调用 `getPassphraseState()`：V1 保持原固件消息流，V2 由 Core 将
  `useEmptyPassphrase/initSession` 意图映射到新的 Ask/Get Session 流程；这不代表 Pro2
  恢复了同名固件消息。
- 旧版 CLI 已保存在 OS Keychain 中的完整三元组可以继续通过 `preloadSessionCache()` 恢复，
  但新的公共钱包选择响应不再提供原始 `sessionId`，也不再创建新的跨进程 Session 缓存。
- V1/V2 共用 `DeviceWalletSessionStore`，主映射键为 `deviceKey + passphraseState`。Protocol V2
  另按 `deviceKey` 保存一个指向真实标准钱包 `{ passphraseState, sessionId }` 的内部索引；该索引
  只服务显式 `standard/useEmptyPassphrase` 意图，不是伪造的钱包标识，也不能用于隐藏钱包查询。
- `DeviceWalletSessionStore` 是 Core 内唯一可用于恢复的钱包 Session 缓存源；
  `DeviceState` 和协议 raw 快照都不是 Session 缓存。
- 恢复隐藏钱包时，没有 `passphraseState` 不得扫描或复用其他钱包的缓存 Session。标准钱包由
  显式标准钱包意图读取专用索引，因此不需要 App 回传标准钱包 `passphraseState`。
- Protocol V1 请求携带 `deviceId` 时，Core 必须先发送不含 `session_id/passphrase_state`
  的 `Initialize` 确认实时 `deviceId`；身份一致后才允许读取并透传对应钱包 Session。
  业务方法只要接收 `deviceId`，也必须在业务命令前执行同一实时身份校验。
- `openWalletSession()` 的显式 `mode` 是唯一流程意图；一旦传入 `mode`，不得再混用
  `useEmptyPassphrase` 或 `initSession`。`standard/select-hidden` 也不得携带钱包绑定。
- `openWalletSession()` 必须显式传入 `mode`；旧参数兼容只保留在原
  `getPassphraseState()` 入口，避免新 API 同时存在两套意图表达。
- `resume-hidden` 只接收 `deviceId + passphraseState`，由 Core 从 Store 查找 `sessionId`；本地缓存
  对 V2 只是非权威恢复提示。V2 本地缓存不存在、句柄失效或固件返回的实际钱包不匹配时，Core
  允许一次显式钱包重选，最终仍不匹配才返回 `DeviceCheckPassphraseStateError`；V1 缺少缓存时
  仍返回 `WalletSessionInvalid`。
- Session 容量与淘汰由 Pro2 固件管理；Core Store 不实现 LRU 或镜像硬件容量，只在获得新句柄、
  固件拒绝旧句柄或钱包身份校验失败时更新对应映射。
- V2 先通过 `ProtocolInfoRequest { eventless_wallet_session: true }` 协商无中间固件 Event。
  `DeviceSessionAskPin` 和 `DeviceSessionAskPassphrase` 只返回 `Success`；Core 随后使用空参数
  `DeviceSessionGet` 读取当前 Session。恢复时使用带 `session_id + btc_test_address` 的
  `DeviceSessionGet`，让固件在复用句柄前校验目标钱包。
- Protocol V2 每次实际发送 `DeviceSessionAskPin` 前，Core 必须向 App 合成一次非阻塞
  `UI_REQUEST.REQUEST_PIN`：`Main` 映射为 `ButtonRequest_PinEntry`，`AttachToPin` 映射为
  `ButtonRequest_AttachPin`。App 只展示设备端操作提示，不回传 PIN；已有方法交互协调器发出提示的
  路径必须抑制底层重复 Event。`protocolV2UiMode='none'` 只抑制普通方法交互提示，
  不得抑制已实际触发的设备端 PIN 提示。
- `DeviceSessionGet` 的 `session_id` 和 `btc_test_address` 均可选：`session_id` 表示尝试恢复目标
  Session，`btc_test_address` 表示预期钱包身份；两者都缺省时读取当前 Session。Get 同时携带
  `seed_domains`：非 Cardano 调用发送 `[Standard]`，Cardano 调用发送 `[Standard, Cardano]`。
  Attach PIN 与 passphrase 关闭的钱包可在 Get 上补 GEN Cardano；隐藏 passphrase 钱包仍只能通过
  `DeviceSessionAskPassphrase` 生成 Cardano。所有调用都必须返回固件最终实际的完整
  `DeviceSession`，正常状态错配不返回 `InvalidSession`。
- Pro2 的 `DeviceSessionAskPassphrase` 必须显式携带输入来源：Host 输入发送
  `{ on_device: false, passphrase, seed_domains }`，设备输入发送 `{ on_device: true, seed_domains }`。
  `seed_domains` 在开钱包和非 Cardano 调用上发送 `[Standard]`；Cardano 调用发送
  `[Standard, Cardano]`。不得发送空列表。`DeviceSessionGet` 使用同一套 `seed_domains`
  在当前 SE 钱包上补齐 Cardano（仅 Attach PIN / passphrase 关闭）。
  不得省略 `on_device`，也不得同时发送设备输入标记和
  Host Passphrase。Attach-to-PIN 继续使用 `DeviceSessionAskPin(AttachToPin)`。
- `DeviceSessionAskPin` 的 PIN 类型由目标钱包意图决定，而不是由调用前的当前上下文决定：
  `Main` 用于选择标准钱包，也用于从 Attach-to-PIN 隐藏钱包上下文切回标准钱包；
  `AttachToPin` 只用于选择该 Attach PIN 绑定的隐藏钱包。`unlockedAttachPin=true` 是当前上下文状态，
  不表示后续请求应继续使用 `AttachToPin`。
- Pro2 的钱包 Session 协调器不得捕获 `DeviceLocked` 后隐式解锁或重放协议请求。需要选择或恢复
  隐藏钱包的业务方法必须先刷新 `DeviceStatus`；状态明确为锁定时先执行
  `DeviceSessionAskPin(Main)`，否则直接调用钱包 Session 协议。调用期间返回的结构化
  `DeviceLocked` 必须原样向上抛出，避免重复有副作用的请求。Attach-to-PIN 分支仍只执行
  `DeviceSessionAskPin(AttachToPin)`。
- `DeviceSessionGet({ seed_domains })` 只读取固件当前钱包 Session，不是标准钱包选择命令。标准钱包首次打开时
  执行 `AskPin(Main) -> Get(seed_domains)`；缓存恢复结果不匹配时执行一次相同流程重建。
  隐藏钱包缓存恢复结果不匹配时执行一次统一钱包选择，再执行 Ask 与 `Get()`。恢复不得删除同设备
  的其他钱包 Session。
- V2 的 `DeviceSessionGet` 成功响应必须同时包含非空 `session_id` 和
  `btc_test_address`；缺少任一字段都视为协议响应不完整，不得降级为标准钱包。
- 首次返回的钱包标识与调用方预期不一致时必须进入对应的一次性恢复；恢复后仍不一致时清理当前
  钱包缓存并抛出安全错误，不允许循环重试。
- Pro2 钱包身份不匹配时，Core 必须刷新 `DeviceStatus` 判断实际解锁来源。若
  `unlocked_by_attach_to_pin=true`，说明 Attach PIN 打开了非目标隐藏钱包，Core 必须按 Pro V1
  的 fail-closed 策略尝试 `LockDevice`、清理当前钱包 Session，并返回
  `DeviceCheckUnlockTypeError`，不得继续重选或执行后续业务。非 Attach 的普通 Session 错配仍允许
  一次统一钱包重选；即使旧固件不支持锁定，也必须清缓存并终止调用。
- Pro2 在解锁流程刷新状态后，以刷新后的 `passphraseProtection` 判定标准/隐藏钱包，
  不得使用解锁前的状态快照路由钱包结果。
- `session_id` 不是钱包身份，必须与同一次返回的 `deviceId + passphraseState` 绑定使用。
- `session_id` 不出现在公共 `DeviceState`、设备消息顶层或 `openWalletSession()` 响应；
  Legacy `Features.sessionId` 的公共投影保持为空，仅允许 Core 内部缓存使用真实值。
- 公共 `clearSessionCache()` 只接受无参数、仅 `deviceId`、或完整
  `deviceId + passphraseState` 三种范围；单独传 `passphraseState` 返回参数错误，避免误清
  所有设备。该 API 只清理 `DeviceWalletSessionStore`，不发送 Protocol V1/V2 命令，
  也不表示设备端 Session 已关闭。
- 设备 wipe 只有在固件明确返回成功后，Core 才清除旧 `deviceId`、对应钱包 Session、
  Protocol V2 临时 descriptor Session、设备状态和预初始化元数据；下一次调用必须重新读取
  实时身份。wipe 后产生的新 `deviceId` 是新的钱包生命周期，调用方不得覆盖旧钱包绑定，
  也不得绕过原有 `deviceId` 不匹配校验。

主要实现：

- `packages/core/src/device/DeviceWalletSessionStore.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
- `packages/core/src/device/Device.ts`

## 受保护方法的调用前解锁

自动解锁会产生用户交互，业务重放还可能重复执行有副作用请求，因此 Core 只允许调用前解锁：

- 地址、签名、加解密等需要钱包 Session 的方法以 `useDevicePassphraseState=true` 作为唯一事实源，
  不维护方法名白名单；新增钱包业务默认继承该值，因此必须先通过调用前解锁门。
- `UnlockPolicy` 只有 `none` 和 `unlock-before-run`。不使用钱包 Session、但固件仍要求设备已解锁
  的管理方法显式使用 `unlock-before-run`；状态、连接、loader 和公开资源方法显式关闭钱包
  Session 处理，且保持 `none`。
- 调用前解锁仅对 Pro2 / Protocol V2 生效。统一方法入口在 normal/application 模式下，先读取
  fresh `DeviceStatus`；携带目标 `deviceId` 时必须利用该状态先确认设备身份，再按需调用
  `device.unlockDevice()`。随后才进入 Wallet Session、Safety Check 和业务 I/O，并使用解锁流程
  返回的 post-unlock Status 确认设备已解锁。
- Bootloader 和 Romloader 不支持 `DeviceStatusGet`，必须跳过状态查询与解锁，直接进入已有
  loader 流程。
- all-network root、bundle 和内部链方法共享轻量 preflight context，因此每个 logical operation
  只执行一次 Status/Unlock；每个子链仍按固件语义独立恢复和校验 Wallet Session。
- Pro2 设置按固件锁定边界分类：语言、亮度、动画、轻触唤醒、振动反馈和设备名称显示
  无需解锁；自动锁定、自动关机、蓝牙、FIDO、USB Lock、随机键盘和设备名称修改需要先解锁；
  Change PIN、Passphrase、Air-gap 与 Wipe 先解锁后打开设备确认页。未知新增设置默认要求解锁。
  壁纸和 NFT 文件上传（`deviceUploadWallpaper`、`deviceUploadNft`）写文件系统，显式使用
  `unlock-before-run`。
- 业务 callback 只执行一次。业务阶段返回结构化 `HardwareErrorCode.DeviceLocked` 时直接失败，
  不捕获、不解锁、不重放；解锁取消、失败或 post-unlock Status 仍锁定时，业务发送次数为零。
- Protocol V1，以及同时满足 `useDevicePassphraseState=false` 和 `unlockPolicy='none'` 的方法，
  不进入调用前解锁流程。

主要实现：

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/protocols/protocol-v2/unlockPolicyRunner.ts`
- `packages/core/src/device/DeviceCommands.ts`

## 方法协议能力与固件版本边界

Core 在设备完成 acquire/initialize、协议类型已由真实设备响应确认后，必须先检查方法的协议
能力，再检查对应机型的固件版本范围，最后才允许进入方法实现和 `typedCall()`：

- `BaseMethod.getSupportedProtocols()` 默认只返回 Protocol V1，新增 Protocol V2 支持必须显式
  返回 `['V1', 'V2']`；Protocol V2 专属方法只返回 `['V2']`。
- 协议不匹配统一返回 `DeviceNotSupportMethod`，不得先向设备发送消息再依赖
  `UnknownMessage/UnexpectedMessage` 判断能力。
- `DeviceFirmwareRange` 只表达方法已受支持时的 `min/max` 固件版本，不表达协议不支持，禁止用
  `0.0.0`、虚构版本或布尔哨兵编码能力状态。
- Pro2 与 Neo 的共享公链版本范围使用 `model_pro2`；解析时先读取精确的 `pro2` / `neo` 范围，
  再回退到产品模型。该模型不得用于推导摄像头、NFC、指纹或 Find My 等硬件能力。
- 参数会改变协议能力时，由方法覆写 `getSupportedProtocols()` 动态判断；例如 BTC Neurai fork
  当前仅允许 Protocol V1，其固件版本范围仍单独维护。
- Core 主调用管线与 all-network 内部方法分发复用同一个 `BaseMethod` 协议断言。Transport 不维护
  SDK 公共方法白名单，也不承担业务能力判断。

主要实现：

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/core/index.ts`
- `packages/core/src/api/allnetwork/AllNetworkGetAddressBase.ts`

## Protocol V2 运行阶段与消息能力分离

Pro2 acquire 后的初始化、重连和固件升级重连统一读取 `ProtocolInfo`：

- Core 的所有 `ProtocolInfoRequest` 固定携带 `eventless_wallet_session=true`。固件必须保证同一
  source 上重复的 `true -> true` 请求幂等，不得清除活动 wallet session；空请求与显式 `false`
  继续保留旧的重置语义。
- `ProtocolInfo` 是活动 Link 的运行时上下文。Core 对首次并发读取做 single-flight，并在 transport
  disconnect、reboot、wipe 后失效；普通 status/settings/wallet 调用复用缓存，不重复协商。
- `build_fingerprint` 固定为
  `<binary>__<version>__<commit>__<PROD|DEV>__<DEBUG|RELEASE>`；Core 只使用 binary
  识别 application、bootloader、romloader，并分别映射为 normal、bootloader、romloader。
- `supported_messages` 是当前固件阶段的实时 handler 清单，也是消息能力的唯一判断来源。
  禁止根据 fingerprint 的版本、commit、环境、构建类型或 `DeviceInfo` 镜像结构推导能力。
- bootloader 与 romloader 不调用 `DeviceStatusGet`。application 也只有在
  `supported_messages` 包含对应 MessageType 时才调用。
- `Device.isBootloader()` 与 `Device.isRomloader()` 是互斥的精确模式判断。兼容
  `Features.bootloaderMode/bootloader_mode` 仍表示广义 loader 状态，不能用于区分两种 loader；
  新流程必须读取 `DeviceState.status.mode` 或上述精确判断。
- romloader 语义当前严格限定为 Pro2/Neo + Protocol V2，并由
  `DeviceInfo.hw.Device_type=PRO2|NEO` 与活动 V2 响应共同确认。Pro Protocol V1 的历史
  boardloader 是另一套状态，不得映射为 romloader，也不得进入 Pro2 FirmwareUpdateV4 直升流程。
- fingerprint 无法解析但明确声明支持 `DeviceStatusGet` 时，可读取状态作为旧固件兼容路径；
  fingerprint 与能力均无法确认时必须安全失败，不能向未知阶段试探性发送状态命令。
- `DeviceInfo` 负责硬件身份、镜像版本和校验信息，`ProtocolInfo` 负责运行阶段与消息能力，
  `DeviceStatus` 负责实时钱包/锁定状态。三者一同保存在 Core 内部 raw 状态；公共
  `DeviceState` 和事件不暴露协议原始响应。

主要实现：

- `packages/core/src/protocols/protocol-v2/features.ts`
- `packages/core/src/device/Device.ts`
- `packages/core/src/api/FirmwareUpdateV4.ts`

## Prepared 固件 Artifact 完整性边界

Prepared 固件更新将 artifact 获取与设备执行分离，完整性责任按以下边界划分：

- 外部固件 Host（例如 App 的 native/desktop artifact store）负责从可信发布元数据取得预期大小和
  SHA-256，对实际下载字节完成校验，并在首次设备变异前生成 receipt。
- `artifactRef` 必须引用已经校验的内容寻址对象；Host 必须在 lease 和 reader 生命周期内保持对象
  不可变，并在对象缺失或损坏时让 `open` 失败。
- SDK 负责校验 Plan、PreparedPlan 和 receipt 的元数据绑定、artifact 大小、读取范围与 EOF，
  但不在执行期重新计算 artifact 内容的 SHA-256。`FirmwareArtifactReceiptMismatch` 表示绑定或
  reader 契约不匹配，不表示 SDK 已独立认证实际字节内容。
- “首次设备变异前已完成完整性校验”的保证依赖外部 Host 履行上述契约。设备端固件签名校验是
  独立防线，不能替代 Host 对资源 artifact 的完整性校验。
- Protocol V2 资源归档必须作为 `role: resourceBundle`、`target: resource`、`container: zip`
  的 Plan artifact 参与统一下载。App 等具备持久化 artifact store 的宿主生成 `PreparedPlan`，
  SDK 通过 `ArtifactReader` 分块读取。资源包的设备写入路径来自已签名 OKPP header 的
  `flexible_metadata`，ZIP 内其他条目不参与更新。
- 本地开发、CLI、Web 示例没有持久化 artifact store 时，下载或选择文件后直接把组件
  `ArrayBuffer` 与完整资源 ZIP（`resourceArchiveBinary`）交给 `firmwareUpdateV4`。Core
  解析 ZIP、比对 RESC header，再写入有差异的包，不再包装成内存 PreparedPlan。
- 不得恢复 SDK 内部联网下载；也不得用本地文件覆盖远程 Plan receipt 来绕过远程校验。

主要实现：

- `packages/core/src/api/firmware/FirmwareUpdatePreparedPlan.ts`
- `packages/core/src/api/firmware/FirmwareArtifactSource.ts`
- `packages/core/src/api/FirmwareUpdateV4.ts`

## 维护规则

- 只有持续影响多个模块、不能仅从代码局部理解的规则才进入本文。
- 决策变化时直接更新当前规则，并通过 Git 历史保留演进过程。
- 具体帧格式、字段映射和业务流程分别维护在协议、SDK 与业务文档中。
