# OneKey Hardware SDK 事件清单

本文梳理当前 SDK 事件的来源、触发时机和接收时机。只覆盖我们自己的 `packages/core`、`packages/hd-web-sdk`、`packages/hd-common-connect-sdk`、`packages/hd-ble-sdk`，不包含 `hwk-adapter-*` 适配器包。

## 事件链路

```ts
// 应用层接收
HardwareSDK.on(UI_EVENT, listener);
HardwareSDK.on(UI_REQUEST.REQUEST_PIN, listener);
HardwareSDK.on(DEVICE.CONNECT, listener);
HardwareSDK.on(FIRMWARE_EVENT, listener);
HardwareSDK.on(LOG_EVENT, listener);

// 应用层响应需要输入的 UI 请求
HardwareSDK.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: pin });
```

内部链路是：

1. `packages/core` 通过 `CORE_EVENT` 把 `CoreMessage` 发给外层 SDK。
2. Web SDK 通过 iframe bridge 接收；Common/BLE SDK 直接监听 core。
3. 外层 SDK 将事件转发到应用层的 `EventEmitter`。

当前外层 SDK 的转发规则：

| 来源事件 | 对外接收方式 | listener 收到的数据 |
| --- | --- | --- |
| `UI_EVENT` | `on(UI_EVENT)` | 完整 message：`{ event, type, payload }` |
| `UI_EVENT` | `on(UI_REQUEST.xxx)` | 只收到 `payload` |
| `LOG_EVENT` | `on(LOG_EVENT)` | 完整 message |
| `FIRMWARE_EVENT` | `on(FIRMWARE_EVENT)` | 完整 message |
| `DEVICE_EVENT` | `on(DEVICE.CONNECT / DEVICE.DISCONNECT / DEVICE.FEATURES / DEVICE.SUPPORT_FEATURES)` | 只收到 `payload` |

注意：`DEVICE.BUTTON`、`DEVICE.PIN`、`DEVICE.PASSPHRASE` 等是 core 内部设备事件。它们会被转换成 `UI_EVENT` 给应用层使用，当前外层 SDK 不会直接转发这些 `DEVICE.*` 类型。

## app-monorepo 使用对照

app-monorepo 的主要入口是 `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts` 的 `registerSdkEvents()`：

1. 后台 `ServiceHardware` 监听 SDK 事件。
2. `UI_EVENT` 会被转换为 `EHardwareUiStateAction`，写入 `hardwareUiStateAtom` 或触发 `appEventBus`。
3. 前端 `packages/kit/src/provider/Container/HardwareUiStateContainer/HardwareUiStateContainer.tsx` 根据 action 展示弹窗、toast 或权限操作界面。
4. 需要回传的事件由 `packages/kit-bg/src/services/ServiceHardwareUI/ServiceHardwareUI.ts` 调用 `sendUiResponse()` 返回 SDK。
5. CLI 场景在 `apps/cli/src/commands/device/hardware-sdk.ts` 单独监听 `UI_EVENT`，只处理 PIN、passphrase、button 和 passphrase-on-device。

### UI_EVENT 在 App 中的操作

| SDK 事件 | app-monorepo 后台处理 | 前端/CLI 操作 | 回传 SDK | 作用 |
| --- | --- | --- | --- | --- |
| `REQUEST_PIN` | `ServiceHardware.specialProcessingEvent()` 判断设备是否支持软件 PIN；不支持或用户设置在设备输入时转为 `EnterPinOnDevice`，否则保持 `REQUEST_PIN` | App 展示 `EnterPin` 软件 PIN 弹窗；可切换到设备端输入。CLI 永远提示在设备端输入 | 软件输入：`RECEIVE_PIN` + PIN；设备输入：`RECEIVE_PIN` + `@@ONEKEY_INPUT_PIN_IN_DEVICE` | 解锁 PIN 或 Attach PIN；避免不支持软件 PIN 的机型误弹软件键盘 |
| `REQUEST_BUTTON` | 写入 `hardwareUiStateAtom` | App 作为 toast 类确认提示处理，提示用户在设备上确认；CLI 输出确认提示 | 无 | 地址确认、签名确认、固件确认等设备端确认动作 |
| `REQUEST_PASSPHRASE` | 写入 `existsAttachPinUser`，再写入 `hardwareUiStateAtom` | App 展示 `EnterPhase` 隐藏钱包输入弹窗；可选择软件输入、设备端输入或 Attach PIN。CLI 使用 `passphraseProvider`，失败时回落到设备端输入 | 软件输入：`RECEIVE_PASSPHRASE { value, passphraseOnDevice: false }`；设备端：`passphraseOnDevice: true`；Attach PIN：`attachPinOnDevice: true` | 建立或切换隐藏钱包上下文，并控制是否走设备端/Attach PIN |
| `REQUEST_PASSPHRASE_ON_DEVICE` | 写入 `hardwareUiStateAtom` | App 展示 `EnterPassphraseOnDevice` 动画/说明；CLI 输出设备端输入提示 | 无 | 告知用户设备已进入在机输入 passphrase 的等待态 |
| `REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` | 不走普通弹窗，触发 `RequestDeviceInBootloaderForWebDevice` 事件总线 | 固件升级进度组件切到 `requestDeviceInBootloaderForWebDevice` 步骤，展示 Grant USB Access 按钮并调用浏览器授权 | `SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE { deviceId }` | WebUSB 固件升级时，设备重启到 bootloader 后让 SDK 绑定正确设备 |
| `REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` | 触发 `RequestDeviceForSwitchFirmwareWebDevice` 事件总线 | 固件升级进度组件切到 `requestDeviceForSwitchFirmwareWebDevice` 步骤，用户重新授权目标设备 | `SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE { deviceId }` | 切换固件/重连后让 SDK 继续使用正确设备 |
| `CLOSE_UI_WINDOW` | 属于 `SKIPPED_EVENTS`，不更新主 UI 状态；仍写入 completed atom | 前端不会因该事件重新开弹窗；已有弹窗由业务封装统一关闭 | 无 | 避免 `ui-close_window -> Dialog close -> sdk.cancel -> ui-close_window` 循环 |
| `CLOSE_UI_PIN_WINDOW` | 属于 `SKIPPED_EVENTS` | 不打开新 UI；用于结束 PIN 相关 UI | 无 | 收起 PIN 输入状态，避免残留 PIN 弹窗 |
| `DEVICE_PROGRESS` | 写入 `hardwareUiStateAtom`，但前端默认只有 `globalShowDeviceProgressDialogEnabled` 开启时才显示 dialog | 可作为设备长任务进度弹窗；默认多场景不展示 | 无 | 文件写入、批量地址等非固件长任务进度 |
| `FIRMWARE_PROCESSING` | 写入 `hardwareUiStateAtom` | 前端明确 `return undefined`，不展示普通 dialog | 无 | 记录固件处理阶段，避免干扰主固件升级页 |
| `FIRMWARE_PROGRESS` | `specialProcessingEvent()` 把 `progress`、`progressType` 写入 payload | 固件升级组件消费进度；硬件 UI 容器会关闭 toast，不弹普通 dialog | 无 | 驱动固件升级进度条，区分传输数据和安装阶段 |
| `FIRMWARE_TIP` | `specialProcessingEvent()` 把 `payload.data` 写入 `firmwareTipData` | `ConfirmOnDevice`、`InstallingFirmware` 等作为 toast；`GoToBootloaderSuccess`、`FirmwareEraseSuccess` 等用于关闭 toast/切步骤；固件升级进度条也监听 tip 更新步骤 | 无 | 固件升级流程文案、阶段切换和设备确认提示 |
| `PREVIOUS_ADDRESS_RESULT` | 属于 `SKIPPED_EVENTS` | 不展示硬件弹窗 | 无 | 批量地址场景的中间结果；当前 App 主硬件弹窗层忽略，避免频繁打扰 |
| `WEB_DEVICE_PROMPT_ACCESS_PERMISSION` | 属于 `NEW_DIALOG_EVENTS`，触发 `RequestHardwareUIDialog` | App 展示 WebUSB 授权 dialog；点击后调用 `promptWebUsbDeviceAccess` 或跳转授权页；Onboarding 中映射为 `device_not_connected` 错误提示 | 无直接 `uiResponse` | 浏览器环境请求用户授权访问硬件设备 |
| `BLUETOOTH_PERMISSION` | 属于 `NEW_DIALOG_EVENTS` | App 展示打开蓝牙设置/授权 dialog；Onboarding 中映射为启用蓝牙错误提示 | 无 | 引导用户授予蓝牙权限 |
| `BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE` | 属于 `NEW_DIALOG_EVENTS` | App 展示 BLE notify 变更失败 dialog；Onboarding 中提示重启蓝牙或重新配对 | 无 | BLE notify 订阅失败后的恢复指引 |
| `LOCATION_PERMISSION` | 写入 `hardwareUiStateAtom` | App 展示 `RequireBlePermissionDialog` | 无 | Android BLE 需要定位权限时引导授权 |
| `LOCATION_SERVICE_PERMISSION` | 写入 `hardwareUiStateAtom` | App 展示 `RequireBlePermissionDialog` | 无 | Android 系统定位服务关闭时引导打开 |
| `BLUETOOTH_UNSUPPORTED` | 属于 `SKIPPED_EVENTS` | 不展示主硬件 UI | 无 | 当前 App 主硬件弹窗层忽略该 SDK 提示 |
| `BLUETOOTH_POWERED_OFF` | 属于 `SKIPPED_EVENTS` | 不展示主硬件 UI | 无 | 当前 App 主硬件弹窗层忽略该 SDK 提示 |
| `INVALID_PIN` | 枚举中保留；后台会按普通 UI 事件写入状态 | CLI 输出 “Invalid PIN entered”；App 主容器当前没有专门分支 | 无 | PIN 错误提示，当前 App UI 处理不完整 |

### DEVICE_EVENT 在 App 中的操作

| SDK 事件 | app-monorepo 当前操作 | 作用 |
| --- | --- | --- |
| `DEVICE.CONNECT` | `ServiceHardware` 读取 `features` 和 raw device id；仅对 Pro、Classic1s、ClassicPure 等目标机型做一次连接埋点 `hwDeviceConnected`，并用 `connectedDeviceTracked` 去重 | 统计硬件连接事件和设备/固件类型，不直接驱动 UI |
| `DEVICE.DISCONNECT` | 当前 app-monorepo 没有直接订阅 | 断开处理主要走调用失败、连接管理或 transport 侧逻辑；不是通过该 SDK 事件驱动 |
| `DEVICE.FEATURES` | 当前 app-monorepo 没有直接订阅 | App 不直接消费该事件；features 更新主要依赖 API 返回和 `SUPPORT_FEATURES` 中携带的 device features |
| `DEVICE.SUPPORT_FEATURES` | `ServiceHardware` 从 `message.device.features` 取 features，校验 raw device id 后调用 `localDb.updateDevice({ features })` | 刷新本地设备 features 缓存，让后续 UI、固件判断、PIN 输入能力判断使用更新后的能力信息 |

### FIRMWARE_EVENT 在 App 中的操作

| SDK 事件 | app-monorepo 当前操作 | 作用 |
| --- | --- | --- |
| `FIRMWARE.RELEASE_INFO` | `ServiceHardware` 组装 `features`、`connectId` 后调用 `serviceFirmwareUpdate.setFirmwareUpdateInfo(payload)` | 写入主固件升级检测结果，用于后续升级入口、提示和版本判断 |
| `FIRMWARE.BLE_RELEASE_INFO` | `ServiceHardware` 组装 payload 后调用 `serviceFirmwareUpdate.setBleFirmwareUpdateInfo(payload)` | 写入 BLE 固件升级检测结果，用于 BLE 固件升级提示和流程判断 |

### LOG_EVENT 在 App 中的操作

| SDK 事件 | app-monorepo 当前操作 | 作用 |
| --- | --- | --- |
| `LOG.OUTPUT` | `ServiceHardware` 只转存 payload 第一项包含 `@onekey/hd-core`、`@onekey/hd-transport`、`@onekey/hd-ble-transport` 的日志到 `defaultLogger.hardware.sdkLog.log()` | 收集硬件 SDK/transport 关键日志，避免普通日志噪声过大 |

## UI_EVENT

`UI_EVENT` 用于把需要应用层展示或响应的交互请求发给调用方。除明确需要 `uiResponse` 的请求外，其余事件只用于展示状态。

### 需要 uiResponse 的请求

| `UI_REQUEST` | 触发时机 | 应用层接收时机 | 应答事件 |
| --- | --- | --- | --- |
| `REQUEST_PIN` | 设备返回 `PinMatrixRequest`；或设备先返回 `ButtonRequest_PinEntry` / `ButtonRequest_AttachPin`，需要提示 PIN / Attach PIN 输入 | 在业务调用进行中，设备等待 PIN 时收到 | `UI_RESPONSE.RECEIVE_PIN`，`payload` 为 PIN 字符串；特殊值 `@@ONEKEY_INPUT_PIN_IN_DEVICE` 表示在设备端输入 |
| `REQUEST_PASSPHRASE` | 设备返回 `PassphraseRequest`，且本次调用需要软件端或应用层选择 passphrase 输入方式 | 在地址、签名、初始化等需要隐藏钱包上下文的调用中收到 | `UI_RESPONSE.RECEIVE_PASSPHRASE`，`payload` 包含 `value`、`passphraseOnDevice`、`attachPinOnDevice`、`save` |
| `REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` | Web Device 固件升级流程需要用户选择 bootloader 设备 | 设备重启到 bootloader 后，需要应用确认目标设备时收到 | `UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE`，`payload: { deviceId }` |
| `REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` | Web Device 切换固件或重连阶段需要用户选择设备 | 固件切换后需要应用确认目标设备时收到 | `UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE`，`payload: { deviceId }` |

### 仅展示或提示的请求

| `UI_REQUEST` | 触发时机 | 应用层接收时机 |
| --- | --- | --- |
| `REQUEST_BUTTON` | 设备返回普通 `ButtonRequest`，需要用户在硬件上确认 | 设备屏幕等待确认时收到；应用只展示“请在设备确认” |
| `REQUEST_PASSPHRASE_ON_DEVICE` | 设备返回 `ButtonRequest_PassphraseEntry`，表示用户需要在设备端输入 passphrase | 设备已经进入在机输入 passphrase 的等待态时收到；应用只展示“请在设备输入” |
| `CLOSE_UI_WINDOW` | core 主动关闭交互窗口 | 当前调用结束、取消或需要收起全局交互 UI 时收到 |
| `CLOSE_UI_PIN_WINDOW` | PIN 输入流程结束或地址批量流程需要收起 PIN UI | PIN 相关交互结束时收到 |
| `DEVICE_PROGRESS` | 文件写入、批量地址等长耗时任务上报进度 | 任务运行中按进度收到 |
| `FIRMWARE_PROCESSING` | 固件、BLE、bootloader、resource 处理阶段切换 | 固件更新流程开始下载、处理或安装阶段时收到 |
| `FIRMWARE_PROGRESS` | 固件数据传输或安装进度更新 | 固件更新过程中多次收到 |
| `FIRMWARE_TIP` | 固件更新流程的阶段性提示 | 下载、切 bootloader、传输、安装、完成等节点收到 |
| `PREVIOUS_ADDRESS_RESULT` | 批量地址流程产生上一条地址结果 | 地址批量任务中，每个地址结果可用于 UI 增量展示 |
| `WEB_DEVICE_PROMPT_ACCESS_PERMISSION` | Web Device transport 需要浏览器授权访问设备 | 浏览器设备授权前收到 |
| `BLUETOOTH_UNSUPPORTED` | Common SDK 捕获到环境不支持 BLE | BLE 调用失败并被映射为 UI 提示时收到 |
| `BLUETOOTH_POWERED_OFF` | Common SDK 捕获到蓝牙关闭 | BLE 调用失败并被映射为 UI 提示时收到 |
| `BLUETOOTH_PERMISSION` | Common/BLE SDK 捕获到蓝牙权限错误 | BLE 调用失败并被映射为 UI 提示时收到 |
| `LOCATION_PERMISSION` | React Native BLE 捕获到定位权限错误 | Android BLE 调用失败并被映射为 UI 提示时收到 |
| `LOCATION_SERVICE_PERMISSION` | React Native BLE 捕获到系统定位服务关闭 | Android BLE 调用失败并被映射为 UI 提示时收到 |
| `BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE` | BLE notify characteristic 状态切换失败 | BLE 通知订阅失败时收到 |

以下 `UI_REQUEST` 是常量层保留的设备状态提示，通常由具体方法或 UI 流程按需使用：`BOOTLOADER`、`NOT_IN_BOOTLOADER`、`REQUIRE_MODE`、`NOT_INITIALIZE`、`SEEDLESS`、`FIRMWARE_OLD`、`FIRMWARE_NOT_SUPPORTED`、`FIRMWARE_NOT_COMPATIBLE`、`FIRMWARE_NOT_INSTALLED`、`NOT_USE_ONEKEY_DEVICE`。

## UI_RESPONSE

`UI_RESPONSE` 是应用层调用 `HardwareSDK.uiResponse(...)` 发回 core 的事件，不应通过 `on(...)` 监听。

| `UI_RESPONSE` | 发送时机 | core 接收时机 |
| --- | --- | --- |
| `RECEIVE_PIN` | 用户完成 PIN 输入或选择在设备端输入 PIN 后发送 | core 正在等待 `REQUEST_PIN` 对应的 `UiPromise` |
| `RECEIVE_PASSPHRASE` | 用户完成 passphrase 输入、在 `REQUEST_PASSPHRASE` 中选择设备端输入或 Attach PIN 后发送 | core 正在等待 `REQUEST_PASSPHRASE` 对应的 `UiPromise` |
| `SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` | 用户在 Web Device bootloader 选择界面选中设备后发送 | core 正在等待 bootloader 设备选择结果 |
| `SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` | 用户在切换固件后的设备选择界面选中设备后发送 | core 正在等待 switch firmware 设备选择结果 |

## DEVICE_EVENT

`DEVICE_EVENT` 表示设备状态或能力快照。当前 Web/Common/BLE SDK 只对外转发以下四类事件，并且是按具体 `DEVICE.*` 名称订阅，不是订阅 `DEVICE_EVENT`。

| `DEVICE` | 触发时机 | 应用层接收时机 | listener 数据 |
| --- | --- | --- | --- |
| `CONNECT` | `DevicePool` 枚举到新设备，并完成创建、连接、初始化和 release | 调用会触发设备枚举的 API 时，或底层 transport 上报设备变化后 | `{ device }` |
| `DISCONNECT` | `DevicePool` 检测到设备从当前列表移除，或底层 transport 上报断开 | 设备拔出、BLE 断开、会话失效时 | `{ device }` |
| `FEATURES` | `Device._updateFeatures()`、`updateProtocolV2Features()` 或 `getFeatures()` 刷新设备 features | 初始化、解锁、获取 features、Protocol V2 设备信息刷新后 | `Features` 快照 |
| `SUPPORT_FEATURES` | `BaseMethod.checkDeviceSupportFeature()` 根据当前设备能力计算支持矩阵 | 业务方法绑定设备后、执行前检查能力时 | `{ inputPinOnSoftware, modifyHomescreen, device }` |

core 内部还定义了这些 `DEVICE` 常量：`CONNECT_UNACQUIRED`、`CHANGED`、`ACQUIRE`、`RELEASE`、`ACQUIRED`、`RELEASED`、`USED_ELSEWHERE`、`UNREADABLE`、`LOADING`、`BUTTON`、`PIN`、`PASSPHRASE`、`PASSPHRASE_ON_DEVICE`、`WORD`、`SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE`、`SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE`。其中交互类事件会被转换成 `UI_EVENT`；其余常量当前没有在外层 SDK 的 `handleMessage` 中直接转发。

## FIRMWARE_EVENT

`FIRMWARE_EVENT` 用于固件版本信息通知。应用层统一通过 `HardwareSDK.on(FIRMWARE_EVENT, listener)` 接收完整 message，并根据 `message.type` 区分类型。

| `FIRMWARE` | 触发时机 | 应用层接收时机 |
| --- | --- | --- |
| `RELEASE_INFO` | `BaseMethod.checkFirmwareRelease()` 根据当前 V1 设备 features 查询固件 release 元数据 | 设备完成初始化并绑定到业务方法后；Protocol V2 设备当前跳过该检查 |
| `BLE_RELEASE_INFO` | `BaseMethod.checkFirmwareRelease()` 查询 BLE 固件 release 元数据 | 同上，用于提示 BLE 固件升级信息 |

## LOG_EVENT

`LOG_EVENT` 用于 SDK 日志输出。应用层通过 `HardwareSDK.on(LOG_EVENT, listener)` 接收完整 message。

| `LOG` | 触发时机 | 应用层接收时机 |
| --- | --- | --- |
| `OUTPUT` | core logger 输出日志，并且外层 SDK 调用了 `setLoggerPostMessage` | debug / log / warn / error 产生时收到，通常只在调试或埋点场景订阅 |

## 内部事件

以下事件是 SDK 内部 bridge / call / core 协议的一部分，通常不作为业务层订阅对象。

| 事件 | 作用 | 调用时机 |
| --- | --- | --- |
| `CORE_EVENT` | core 到外层 SDK 的统一事件通道 | core `postMessage` 时 emit |
| `IFRAME.INIT` | iframe 初始化消息 | Web SDK 创建 iframe 时 |
| `IFRAME.INIT_BRIDGE` | iframe bridge 握手 | Web iframe 与 host 建立 JSBridge 时 |
| `IFRAME.CALL` | 外层 SDK 调用 core API | `HardwareSDK.xxx(...)` 或 `HardwareSDK.call(...)` 时 |
| `IFRAME.CANCEL` | 取消指定 `connectId` 的调用 | `HardwareSDK.cancel(connectId)` 时 |
| `IFRAME.SWITCH_TRANSPORT` | Web SDK 切换 transport 环境 | `HardwareSDK.switchTransport(env)` 时 |
| `IFRAME.CALLBACK` | core 回调外层注册的 callback | 需要 callbackId 的异步回调场景 |
| `RESPONSE_EVENT` | 方法响应消息类型 | core 生成 API 响应时使用，不通过 `on(...)` 分发 |

## 接入建议

1. 应用启动后统一注册 `UI_EVENT`、`FIRMWARE_EVENT`、`LOG_EVENT` 以及需要的 `DEVICE.*` 监听。
2. UI 请求只对“需要输入”的类型调用 `uiResponse`；展示型事件不要回传响应。
3. 多设备场景必须使用事件 payload 中的 `device.connectId` / `device.deviceId` 路由 UI 状态。
4. 固件升级期间不要只依赖最终 API 返回值，应该同时监听 `FIRMWARE_PROGRESS` / `FIRMWARE_TIP` 做进度展示。
5. 退出页面或销毁 SDK 时调用 `off` / `removeAllListeners`，避免重复弹窗和重复响应。
