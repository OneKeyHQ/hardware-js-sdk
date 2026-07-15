# OneKey Hardware SDK 硬件交互事件

本文只说明应用层需要关心的“硬件交互相关事件”：设备请求用户操作、设备状态变化、固件升级过程等。

不包含以下事件：

- React Native / Android / iOS 系统权限事件，例如蓝牙权限、定位权限、系统定位服务关闭。
- SDK bridge、iframe、callback、日志等内部事件。
- app-monorepo 自己的 UI 状态转换逻辑。

## 总体链路

应用层通过 `HardwareSDK.on(...)` 监听 SDK 转发出来的事件：

```ts
HardwareSDK.on(UI_EVENT, listener);
HardwareSDK.on(UI_REQUEST.REQUEST_PIN, listener);
HardwareSDK.on(UI_REQUEST.REQUEST_BUTTON, listener);
HardwareSDK.on(DEVICE.CONNECT, listener);
HardwareSDK.on(FIRMWARE_EVENT, listener);
```

需要用户输入时，应用层再通过 `HardwareSDK.uiResponse(...)` 把结果回传给 SDK：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PIN,
  payload: pin,
});
```

核心方向是：

```txt
硬件设备
  -> transport / core
  -> 外层 SDK EventEmitter
  -> HardwareSDK.on(...) listener
  -> 应用展示 UI 或回传 uiResponse
```

注意：不是所有 `UI_REQUEST` 都是硬件主动发出的。本文只保留与硬件交互直接相关的类型。

## 监听方式

`UI_EVENT` 有两种常用监听方式：

```ts
HardwareSDK.on(UI_EVENT, message => {
  // 收到完整 message: { event, type, payload }
});

HardwareSDK.on(UI_REQUEST.REQUEST_PIN, payload => {
  // 只收到 payload
});
```

`DEVICE` 事件通常按具体类型监听：

```ts
HardwareSDK.on(DEVICE.CONNECT, payload => {});
HardwareSDK.on(DEVICE.DISCONNECT, payload => {});
HardwareSDK.on(DEVICE.FEATURES, payload => {});
HardwareSDK.on(DEVICE.SUPPORT_FEATURES, payload => {});
```

`FIRMWARE_EVENT` 通常监听总事件，再根据 `message.type` 区分：

```ts
HardwareSDK.on(FIRMWARE_EVENT, message => {
  // message.type: FIRMWARE.RELEASE_INFO / FIRMWARE.BLE_RELEASE_INFO
});
```

## 需要应用回传的硬件交互

这些事件表示 SDK / 设备正在等待应用层给出结果。应用必须在用户操作完成后调用 `HardwareSDK.uiResponse(...)`。

| SDK 事件 | 来源 | 触发时机 | 应用需要做什么 | 回传事件 |
| --- | --- | --- | --- | --- |
| `UI_REQUEST.REQUEST_PIN` | 硬件设备请求 PIN，经 core 转成 UI 请求 | 设备返回 `PinMatrixRequest`，或进入 PIN / Attach PIN 输入流程 | 展示 PIN 输入界面，或让用户选择在设备端输入 | `UI_RESPONSE.RECEIVE_PIN` |
| `UI_REQUEST.REQUEST_PASSPHRASE` | 硬件设备请求 passphrase，经 core 转成 UI 请求 | 地址、签名、初始化等流程需要隐藏钱包上下文 | 展示 passphrase 输入界面，或让用户选择设备端输入 / Attach PIN | `UI_RESPONSE.RECEIVE_PASSPHRASE` |
| `UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` | 固件升级流程中的设备选择请求 | WebUSB 固件升级时，设备重启到 bootloader 后需要重新选择设备 | 展示设备选择或 Grant USB Access 入口 | `UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` |
| `UI_REQUEST.REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` | 固件切换流程中的设备选择请求 | 切换固件或重连后，需要应用确认目标设备 | 展示设备选择入口 | `UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` |

### PIN 回传

软件输入 PIN：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PIN,
  payload: '1234',
});
```

选择在设备端输入 PIN：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PIN,
  payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
});
```

### Passphrase 回传

软件输入 passphrase：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
  payload: {
    value: 'your passphrase',
    passphraseOnDevice: false,
    save: false,
  },
});
```

选择在设备端输入 passphrase：

```ts
HardwareSDK.uiResponse({
  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
  payload: {
    value: '',
    passphraseOnDevice: true,
    save: false,
  },
});
```

## 只需要展示的硬件交互

这些事件来自设备状态或硬件流程，应用层只需要展示提示，不需要回传 `uiResponse`。

| SDK 事件 | 来源 | 触发时机 | 应用建议 |
| --- | --- | --- | --- |
| `UI_REQUEST.REQUEST_BUTTON` | 硬件设备按钮请求，经 core 转成 UI 请求 | 地址确认、交易签名、固件确认等流程中，设备屏幕等待用户确认 | 展示“请在设备上确认”的提示 |
| `UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE` | 硬件设备进入在机输入 passphrase 状态 | 用户选择或设备要求在硬件上输入 passphrase | 展示“请在设备上输入 passphrase”的提示 |
| `UI_REQUEST.CLOSE_UI_WINDOW` | core 关闭当前硬件交互流程 | 当前调用结束、取消或错误退出 | 收起硬件交互弹窗 |
| `UI_REQUEST.CLOSE_UI_PIN_WINDOW` | core 关闭 PIN 相关 UI | PIN 输入结束或流程取消 | 收起 PIN 输入弹窗 |
| `UI_REQUEST.DEVICE_PROGRESS` | core 上报设备任务进度 | 文件写入、批量地址等长耗时任务执行中 | 展示进度 |
| `UI_REQUEST.PREVIOUS_ADDRESS_RESULT` | core 上报批量地址中间结果 | 批量获取地址时，每个地址完成后 | 按需增量展示地址结果 |

## 固件升级相关交互

固件升级不是单一的设备消息，而是 SDK 固件流程、transport 和设备状态共同驱动的一组事件。

| SDK 事件 | 来源 | 触发时机 | 应用建议 |
| --- | --- | --- | --- |
| `UI_REQUEST.FIRMWARE_PROCESSING` | SDK 固件流程 | 下载、处理、进入 bootloader、安装等阶段切换 | 更新固件升级步骤 |
| `UI_REQUEST.FIRMWARE_PROGRESS` | SDK 固件流程 / 设备传输进度 | 固件数据传输或安装过程中多次触发 | 更新进度条 |
| `UI_REQUEST.FIRMWARE_TIP` | SDK 固件流程 / 设备确认节点 | 需要用户确认、擦除完成、安装中、完成等节点 | 展示阶段提示或设备确认提示 |
| `FIRMWARE.RELEASE_INFO` | SDK 查询固件版本信息 | 设备绑定到业务方法后检查固件版本 | 更新主固件升级信息 |
| `FIRMWARE.BLE_RELEASE_INFO` | SDK 查询 BLE 固件版本信息 | 设备绑定到业务方法后检查 BLE 固件版本 | 更新 BLE 固件升级信息 |

监听固件 UI 进度：

```ts
HardwareSDK.on(UI_EVENT, message => {
  if (message.type === UI_REQUEST.FIRMWARE_PROGRESS) {
    // message.payload.progress
  }
});
```

监听固件版本信息：

```ts
HardwareSDK.on(FIRMWARE_EVENT, message => {
  if (message.type === FIRMWARE.RELEASE_INFO) {
    // message.payload
  }
});
```

## 设备状态事件

这些事件表示 SDK 观察到的设备连接状态或能力变化。它们不是用户输入请求，但和硬件设备状态直接相关。

| SDK 事件 | 来源 | 触发时机 | listener 数据 |
| --- | --- | --- | --- |
| `DEVICE.CONNECT` | transport / DevicePool | 设备被枚举、连接并初始化后 | `{ device }` |
| `DEVICE.DISCONNECT` | transport / DevicePool | 设备拔出、BLE 断开或会话失效 | `{ device }` |
| `DEVICE.FEATURES` | core / Device | 设备 features 被刷新 | `Features` |
| `DEVICE.SUPPORT_FEATURES` | core / BaseMethod | 业务方法执行前检查当前设备支持能力 | `{ inputPinOnSoftware, modifyHomescreen, device }` |

示例：

```ts
HardwareSDK.on(DEVICE.CONNECT, ({ device }) => {
  // 设备已连接
});

HardwareSDK.on(DEVICE.DISCONNECT, ({ device }) => {
  // 设备已断开
});
```

## app-monorepo 使用情况

app-monorepo 的主入口是后台服务：

```txt
packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts
  registerSdkEvents()
```

整体链路是：

```txt
HardwareSDK.on(...)
  -> ServiceHardware.registerSdkEvents()
  -> hardwareUiStateAtom / appEventBus
  -> packages/kit/src/provider/Container/HardwareUiStateContainer
  -> 弹窗、toast、固件升级页或业务状态
```

CLI 也有一套独立处理：

```txt
apps/cli/src/commands/device/hardware-sdk.ts
```

### UI_EVENT 使用对照

| SDK 事件 | 主要用途 | app-monorepo 是否使用 | App 中的处理 |
| --- | --- | --- | --- |
| `REQUEST_PIN` | 设备需要 PIN，调用会暂停等待输入 | 有使用 | 后台判断机型和 `inputPinOnSoftware` 设置；支持软件输入时展示 `EnterPin`，否则切到 `EnterPinOnDevice`；用户输入后通过 `RECEIVE_PIN` 回传 |
| `REQUEST_BUTTON` | 设备屏幕等待用户确认，例如地址、签名、固件确认 | 有使用 | 写入 `hardwareUiStateAtom`；前端通常作为 toast 展示“请在设备上确认”，不回传 `uiResponse` |
| `REQUEST_PASSPHRASE` | 设备需要隐藏钱包 passphrase | 有使用 | 展示 `EnterPhase`；用户可软件输入、设备端输入或 Attach PIN；最终通过 `RECEIVE_PASSPHRASE` 回传 |
| `REQUEST_PASSPHRASE_ON_DEVICE` | 设备已经进入在机输入 passphrase 状态 | 有使用 | 展示 `EnterPassphraseOnDevice`，只提示用户在硬件上继续操作，不回传 |
| `CLOSE_UI_WINDOW` | 当前硬件交互流程结束或需要收起 UI | 有使用，但主状态更新会跳过 | 属于 `SKIPPED_EVENTS`，避免弹窗关闭和 SDK cancel 互相触发循环；前端仍会在部分流程中用它关闭 toast / 固件页状态 |
| `CLOSE_UI_PIN_WINDOW` | PIN 相关流程结束 | 有使用，但主状态更新会跳过 | 属于 `SKIPPED_EVENTS`；前端用于收起 PIN 相关 UI |
| `DEVICE_PROGRESS` | 设备长任务进度，例如文件写入、批量任务 | 有接入，但默认不展示 | 写入 `hardwareUiStateAtom`；前端只有 `globalShowDeviceProgressDialogEnabled` 开启时才展示进度弹窗 |
| `PREVIOUS_ADDRESS_RESULT` | 批量地址的中间结果 | 基本忽略主 UI | 属于 `SKIPPED_EVENTS`；避免批量地址时频繁打扰用户 |
| `FIRMWARE_PROCESSING` | 固件处理阶段变化 | 有接入，但普通硬件弹窗不展示 | 写入状态；`HardwareUiStateContainer` 明确不展示普通 dialog，主要给固件流程使用 |
| `FIRMWARE_PROGRESS` | 固件传输或安装进度 | 有使用 | 后台把 `progress` / `progressType` 存入 payload；前端固件升级进度条消费进度，并关闭普通确认 toast |
| `FIRMWARE_TIP` | 固件升级阶段提示或设备确认提示 | 有使用 | 后台把 `payload.data` 存成 `firmwareTipData`；前端根据 tip 展示确认 toast、切换升级步骤或关闭提示 |
| `REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` | WebUSB 固件升级时，设备进入 bootloader 后需要重新授权/选择设备 | 有使用 | 后台触发 `RequestDeviceInBootloaderForWebDevice`；固件升级页展示 Grant USB Access，并通过 `SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE` 回传 deviceId |
| `REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` | 切换固件或重连后需要重新选择设备 | 有使用 | 后台触发 `RequestDeviceForSwitchFirmwareWebDevice`；固件升级页重新授权设备，并通过 `SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE` 回传 deviceId |

CLI 中只处理最核心的四类硬件交互：

- `REQUEST_PIN`：直接提示用户在设备端输入，并回传 `@@ONEKEY_INPUT_PIN_IN_DEVICE`。
- `REQUEST_PASSPHRASE`：使用 `passphraseProvider`，失败则回退到设备端输入。
- `REQUEST_BUTTON`：打印“请在设备确认”。
- `REQUEST_PASSPHRASE_ON_DEVICE`：打印“请在设备输入 passphrase”。

### DEVICE_EVENT 使用对照

| SDK 事件 | 主要用途 | app-monorepo 是否使用 | App 中的处理 |
| --- | --- | --- | --- |
| `DEVICE.CONNECT` | SDK 发现并初始化设备 | 有使用，但不是主 UI 驱动 | 只对 Pro、Classic1s、ClassicPure 等机型做一次连接埋点 `hwDeviceConnected` |
| `DEVICE.DISCONNECT` | 设备断开 | 当前主入口未直接订阅 | 断开更多依赖调用失败、扫描状态或连接管理逻辑处理，不靠这个事件直接驱动 UI |
| `DEVICE.FEATURES` | 设备 features 更新 | 当前主入口未直接订阅 | App 主要通过 API 返回和 `SUPPORT_FEATURES` 更新本地 features |
| `DEVICE.SUPPORT_FEATURES` | 执行业务方法前的设备能力检查结果 | 有使用 | 从 `message.device.features` 取最新 features，写入 `localDb.updateDevice({ features })`，供 PIN 输入能力、固件判断、设备展示等后续逻辑使用 |

### FIRMWARE_EVENT 使用对照

| SDK 事件 | 主要用途 | app-monorepo 是否使用 | App 中的处理 |
| --- | --- | --- | --- |
| `FIRMWARE.RELEASE_INFO` | SDK 检查主固件版本信息 | 代码有监听，但当前被开关跳过 | `ServiceHardware` 中 `SKIP_APP_FIRMWARE_UPDATE_EVENT = true`，所以监听存在但不会写入 `serviceFirmwareUpdate` |
| `FIRMWARE.BLE_RELEASE_INFO` | SDK 检查 BLE 固件版本信息 | 代码有监听，但当前被开关跳过 | 同上，当前不会通过这个事件自动更新 BLE 固件升级信息 |

因此，对 app-monorepo 来说，真正影响用户硬件交互 UI 的核心事件是：

```txt
REQUEST_PIN
REQUEST_BUTTON
REQUEST_PASSPHRASE
REQUEST_PASSPHRASE_ON_DEVICE
FIRMWARE_PROGRESS
FIRMWARE_TIP
REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE
REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE
```

`DEVICE.CONNECT` / `SUPPORT_FEATURES` 更偏后台状态维护和埋点，不是弹窗流程的主驱动。

## 不属于硬件发送的事件

下面这些事件虽然也是 `UI_REQUEST`，但来源是宿主环境、浏览器或 SDK 外层适配逻辑，不是硬件设备发出的消息：

| SDK 事件 | 实际来源 | 说明 |
| --- | --- | --- |
| `UI_REQUEST.BLUETOOTH_PERMISSION` | React Native / 系统 BLE 权限 | 蓝牙权限未授权 |
| `UI_REQUEST.LOCATION_PERMISSION` | React Native / Android 权限 | Android BLE 扫描缺少定位权限 |
| `UI_REQUEST.LOCATION_SERVICE_PERMISSION` | React Native / Android 系统服务 | Android 系统定位服务关闭 |
| `UI_REQUEST.BLUETOOTH_UNSUPPORTED` | 运行环境能力检测 | 当前环境不支持 BLE |
| `UI_REQUEST.BLUETOOTH_POWERED_OFF` | 系统蓝牙状态 | 蓝牙关闭 |
| `UI_REQUEST.BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE` | BLE transport | BLE notify 订阅失败 |
| `UI_REQUEST.WEB_DEVICE_PROMPT_ACCESS_PERMISSION` | 浏览器 WebUSB 授权流程 | 浏览器要求用户授权访问 USB 设备 |

如果只关心“硬件设备让应用做什么”，可以先忽略这一组。

## 接入建议

1. 对硬件输入类事件必须回传 `uiResponse`，否则当前硬件调用会一直等待。
2. 对展示类事件不要回传 `uiResponse`，只展示状态或提示。
3. 多设备场景要根据 `payload.device.connectId` / `payload.device.deviceId` 维护 UI 状态，避免把 A 设备的提示显示到 B 设备流程里。
4. 固件升级流程不要只依赖最终 API 返回值，应同时监听 `FIRMWARE_PROGRESS` / `FIRMWARE_TIP` 做进度展示。
5. RN 权限、WebUSB 授权、BLE 环境错误不是硬件发送事件，应放在权限或连接引导逻辑里处理。
