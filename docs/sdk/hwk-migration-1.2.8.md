# `hwk-*` 升级到 1.2.8-alpha.13 迁移说明

> - 文档类型：迁移说明
> - 读者：接入 `@onekeyfe/hwk-*` 的宿主（App、Electron 主进程与 preload）
> - 范围：`packages/hwk-*`；不涉及 `hd-*`
> - 基线：`origin/onekey` = `git merge-base HEAD origin/onekey` = `5c9d05581`（`1.2.8-alpha.12`）
> - 目标：PR #943（`feat/keystone-integration`），`1.2.8-alpha.13`，含工作区中尚未提交的 BLE vendor allowlist
> - 事实来源：`packages/hwk-adapter-core/src/types/{wallet,device,errors,qr,electronBle}.ts`、
>   `packages/hwk-desktop-noble-ble/src`、`packages/hwk-trezor-core/src/index.ts`

错误码的分类和映射原则见 [Hardware SDK Error Contract](./error-contract.md)；`hwk-*` 事件与
`hd-*` 事件的边界见 [SDK 事件](./events.md)。

## 适用范围与版本

- 所有已发布的 `hwk-*` 包版本一致，从 `1.2.8-alpha.12` 升到 `1.2.8-alpha.13`，需整体升级。
- 新包：`@onekeyfe/hwk-desktop-noble-ble`、`@onekeyfe/hwk-keystone-adapter`、
  `@onekeyfe/hwk-keystone-connector-usb`、`@onekeyfe/hwk-ledger-connector-electron-ble`。
- package entry 层面唯一的删除发生在 `@onekeyfe/hwk-trezor-connector-electron-ble`；其他包的
  `src/index.ts` 和子路径入口只有新增导出。
- 第 1、2 项只影响 Electron BLE 宿主；第 3–5 项影响所有调用 `IHardwareWallet` 的宿主。

## 必须修改

### 1. Trezor Electron BLE 主进程入口迁到 `@onekeyfe/hwk-desktop-noble-ble`

`@onekeyfe/hwk-trezor-connector-electron-ble` 的 `exports` 删除了 `./main` 和 `./constants`，只保留
`.`；`@stoprocent/noble`、`electron` 这两个 optional peerDependencies 改由
`@onekeyfe/hwk-desktop-noble-ble` 声明。新包入口为 `.` 和 `./constants`（只含常量，可在 preload 中引用）。

| 旧（`hwk-trezor-connector-electron-ble`）                                           | 新                                                                                                                                |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `./main`：`initTrezorBleSupport(webContents, options)`                              | `@onekeyfe/hwk-desktop-noble-ble`：`initThirdPartyBleSupport(webContents, options)`                                               |
| `./main`：`InitTrezorBleSupportOptions`、`TrezorBleSupportHandle`                   | `InitThirdPartyBleSupportOptions`、`ThirdPartyBleSupportHandle`                                                                   |
| `./main`：`NobleBleHandler`、`NobleBleHandlerOptions`、`IpcMainLike`                | 同名，从 `@onekeyfe/hwk-desktop-noble-ble` 导入                                                                                   |
| `.` / `./main`：`TREZOR_BLE_CHANNELS`、类型 `TrezorBleChannel`                      | `THIRD_PARTY_BLE_CHANNELS`、`ThirdPartyBleChannel`（`.` 或 `./constants`）                                                        |
| `.`：`TREZOR_BLE_SCAN_DURATION_MS`、`TREZOR_BLE_POWER_ON_TIMEOUT_MS`                | `THIRD_PARTY_BLE_SCAN_DURATION_MS`、`THIRD_PARTY_BLE_POWER_ON_TIMEOUT_MS`                                                         |
| `./constants`：`TREZOR_BLE_SCAN_IDLE_STOP_MS`、`TREZOR_BLE_DEVICE_TTL_MS`           | `THIRD_PARTY_BLE_SCAN_IDLE_STOP_MS`、`THIRD_PARTY_BLE_DEVICE_TTL_MS`                                                              |
| `.` / `./main`：类型 `TrezorBleApi`、`TrezorBleAvailability`、`TrezorBleDeviceInfo` | `ThirdPartyBleApi`、`ThirdPartyBleAvailability`、`ThirdPartyBleDeviceInfo`                                                        |
| `.`：`TREZOR_BLE_WRITE_CHUNK_DELAY_MS`                                              | 不变，仍从 `hwk-trezor-connector-electron-ble` 导出（新增 `TREZOR_BLE_VENDOR`、`TREZOR_BLE_MATCH`、`TREZOR_BLE_CONNECT_PROFILE`） |

```ts
// 旧：主进程
import { initTrezorBleSupport } from '@onekeyfe/hwk-trezor-connector-electron-ble/main';
const ble = initTrezorBleSupport(mainWindow.webContents);

// 新：主进程。一次调用同时服务 Ledger 与 Trezor，不要按 vendor 分别初始化
import { initThirdPartyBleSupport } from '@onekeyfe/hwk-desktop-noble-ble';
const ble = initThirdPartyBleSupport(mainWindow.webContents, { logger });
// 退出渲染进程：await ble.dispose()；退出应用：await ble.disposeForAppQuit()
```

`initThirdPartyBleSupport` 的 options 为 `NobleBleHandlerOptions` 加 `ipcMain?: IpcMainLike`：
`nobleFactory`、`connectTimeoutMs`（默认 31s）、`logger`、`vendors`（见“行为变化”）。

### 2. preload 的 IPC 通道和参数

通道前缀从 `$onekey-trezor-ble-*` 改为 `$onekey-3p-ble-*`，通道键名不变（`scan`、`stopScan`、
`connect`、`disconnect`、`write`、`subscribe`、`unsubscribe`、`availability`、`getDevice`、
`readRssi`、`cancelPairing`、推送 `notification`、`disconnected`）。旧通道已无主进程 handler。

renderer API 签名变化（`ThirdPartyBleApi`；`hwk-adapter-core` 的 `ElectronBleApi` 是 connector
使用的子集）：

| 方法            | 旧                               | 新                                                                                                             |
| --------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `scan`          | `{ serviceUuids?, durationMs? }` | `ElectronBleScanOptions`：`{ vendor?, match?, serviceUuids?（deprecated）, durationMs? }`；主进程要求 `vendor` |
| `connect`       | `connect(id)`                    | `connect(id, options: ElectronBleConnectOptions)`                                                              |
| `stopScan`      | `stopScan()`                     | `stopScan(vendor?)`                                                                                            |
| `cancelPairing` | `cancelPairing()`                | `cancelPairing(options?: { vendor; id? })`                                                                     |

preload 必须把所有参数原样转发给 `ipcRenderer.invoke`，否则 `connect` 收不到 GATT profile 会被拒绝。

```ts
// 旧
connect: id => ipcRenderer.invoke(TREZOR_BLE_CHANNELS.connect, id),
stopScan: () => ipcRenderer.invoke(TREZOR_BLE_CHANNELS.stopScan),

// 新
import { THIRD_PARTY_BLE_CHANNELS as C } from '@onekeyfe/hwk-desktop-noble-ble/constants';
connect: (id, options) => ipcRenderer.invoke(C.connect, id, options),
stopScan: vendor => ipcRenderer.invoke(C.stopScan, vendor),
cancelPairing: options => ipcRenderer.invoke(C.cancelPairing, options),
```

Trezor transport 未传 `bridge` 时仍读取 `window.desktopApi.trezorBle`；Ledger Electron BLE connector
要求显式传入 `ElectronBleApi`（`createLedgerElectronBleConnector(bridge)`）。两者可以共用同一个 bridge 对象。

### 3. `IHardwareWallet` 设备生命周期

| 旧                                                                          | 新                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `connectDevice(connectId): Promise<Response<string>>`，成功返回 `connectId` | `connectDevice(searchTargetId)`，成功返回 runtime-only 的 operation id（`hwk:runtime` 前缀）        |
| `disconnectDevice(connectId)`                                               | `releaseOperation(operationId)`                                                                     |
| `getSupportedChains()`                                                      | 已删除，无替代                                                                                      |
| —                                                                           | 必选：`searchDeviceTargets(options?)`、`releaseOperation(operationId)`、`readonly cancelCapability` |
| —                                                                           | 可选：`bindBleDevice?(params)`、`acquireOperation?(connectId, context)`                             |

- `connectDevice()` 的返回值不能再当 `connectId` 持久化或展示。后续调用通过
  `ICommonCallParams.operationId`（或 Device Manager 方法的 `operationContext.operationId`）绑定；
  带 `operationId` 时 adapter 不做 discovery 和 fallback。
- Trezor、Ledger 的 `searchTargetId` 目前等于 `searchDevices()` 返回的 `connectId`；Keystone 的 QR
  入口是虚拟 target，必须通过 `searchDeviceTargets()` 获取。
- operation 默认空闲 10 分钟（`OPERATION_DEFAULT_TTL_MS`）后结束；断开连接时自动结束。结束时发出
  `SDK.OPERATION_ENDED`（`payload: { operationId, reason }`，`reason` 为 `explicit` /
  `disconnect` / `timeout` / `runtime-reset`）。
- `acquireOperation` 目前只有 Ledger 实现；`bindBleDevice` 由 Trezor、Ledger 实现。
- 自行实现或 mock `IHardwareWallet` 的代码需要补齐上表的必选成员，否则编译失败。
- Device Manager 方法（`getFeatures`、`deviceSettings`、`setBrightness`、`changePin`、`wipeDevice`、
  `authenticateDevice`、`getPassphraseState`）末尾新增可选 `operationContext`，旧调用不受影响。

### 4. 设备选择响应必须回传 `requestId`

`REQUEST_SELECT_DEVICE` 的 payload 从 `{ devices }` 改为 `DeviceSelectionRequest`
（`devices`、`requestId`、`context`、`operationId?`、`scanning?`、`bindingSessionId?`、
`rejectedConnectId?`、`extra?`）。adapter 等待时带 `requestId`，`UiRequestRegistry` 会忽略
`requestId` 不匹配的响应，所以旧响应不会报错，只会一直等到超时（默认 10 分钟）。

```ts
// 旧
sdk.uiResponse({ type: UI_RESPONSE.RECEIVE_SELECT_DEVICE, payload: { sdkConnectId } });

// 新
sdk.uiResponse({
  type: UI_RESPONSE.RECEIVE_SELECT_DEVICE,
  payload: { requestId: request.requestId, sdkConnectId },
});
// 用户取消：payload: { requestId, cancelled: true } → 调用以 UserAborted 失败
```

`scanning: true` 的重复事件携带同一个 `requestId`，用于更新同一个选择界面。

### 5. 联合类型扩展

以下联合类型新增成员，穷举 `switch` / `never` 检查会编译失败：

- `VendorType` 新增 `'keystone'`；`ConnectionType` 新增 `'qr'`；`TransportType` 新增 `'qr'`。
- `ChainCapability` 新增 `'zcash'`。
- `AllNetworkDeviceIdentity` 改为 `WalletIdentity`，新增 `{ vendor: 'keystone'; type: 'walletId'; value }`。
- `UiRequestEvent` 新增 `REQUEST_SAVE_DEVICE_BINDING`、`DEVICE_BINDING_STATUS`；`SdkEvent` 新增
  `OPERATION_ENDED`。

### 6. 直接使用 `@onekeyfe/hwk-trezor-protobuf` 的 Solana 消息

`SolanaSignMessage.message` 从 `string` 改为 `SolanaOffchainMessageV1`（`{ message, signers }`）；
`SolanaVerifyMessage` 删除 `envelope`，改为 `message` + `signatures`；`SolanaMessageSignature`
新增可选 `signed_data`。只通过 adapter 的 `solSignMessage` 调用的宿主不受影响，
`SolSignMsgParams` 只新增可选的 `messageVersion: 1` + `requiredSigners`。

## 行为变化

### Electron BLE 主进程 vendor allowlist（工作区未提交改动）

- `NobleBleHandlerOptions.vendors` / `initThirdPartyBleSupport(..., { vendors })` 决定主进程服务哪些
  vendor，默认 `DEFAULT_THIRD_PARTY_BLE_VENDORS`（`ledger`、`trezor`）。传入 `vendors` 会**替换**默认表；
  需要扩展时展开默认表再加。每个 vendor 是一个 `ThirdPartyBleVendorProfile`：
  `isServiceUuid`、可选 `isName`、`acceptsConnect`。
- `scan` 未带或带未注册的 `vendor` 时抛出 `Unsupported BLE vendor`，不启动扫描。
- 扫描结果只由 vendor profile 判定：renderer 的 `match.namePatterns` 不再被编译或执行；
  `match.serviceUuids`（或 deprecated 的 `serviceUuids`）只能在 profile 允许的集合内缩小范围，不能扩大。
- `connect` 只接受该 vendor 自己的 GATT profile 和写入 framing，否则抛出
  `BLE GATT profile not allowed for <vendor>`。Trezor：固定的 service/write/notify UUID、
  `write.mode: 'padded'`、`chunkSize: 244`、`chunkDelayMs` 为 0–50 的整数或省略、不带 `maxLength`。
  Ledger：同一型号段的 `13d63400-2c97-MMMM-000R-4c6564676572` service/notify/write UUID、
  `write.mode: 'raw'`、`maxLength` 为 1–255、不带 `chunkSize` / `chunkDelayMs`。
- `getDevice(id)` 只返回属于已注册 vendor 的设备，其他返回 `null`；`raw` 写入的帧必须是合法
  hex 且不超过 `maxLength`。
- 通过 `TREZOR_BLE_CONNECT_PROFILE`、`ledgerBleConnectProfile()` 生成参数的官方 connector
  不受影响；自行拼 `connect` 参数的宿主需要按上面的规则对齐。

### Trezor Bluetooth 强制 THP

- BLE 连接上若对端以 Protocol V1 应答且不在 bootloader 模式，`hwk-trezor-core` 拒绝继续，
  adapter 返回 `ThpPairingFailed`（Trezor 固件的 Bluetooth 只提供 THP；bootloader 不持有密钥）。
- 设备声称已配对但没有对应的已存凭据，或选定方法未完成就结束配对（`SkipPairing` 除外），
  同样返回 `ThpPairingFailed`。
- 默认 `pairingMethods` 从 `['CodeEntry', 'QrCode', 'NFC', 'SkipPairing']` 改为
  `['CodeEntry', 'QrCode', 'NFC']`。依赖 `SkipPairing` 的模拟器或调试固件需要在 `thp` 选项里显式传入。
- `DEVICE.TREZOR_THP_CREDENTIALS_CHANGED` 的 payload 新增 `removed?`：设备拒绝的凭据。

### BLE 绑定流程

- 需要选择 BLE 设备时，adapter 发出 `REQUEST_SELECT_DEVICE`，`context.kind` 为
  `'bind-connection'`（`reason`：`missing-binding` / `known-connection-unavailable` /
  `manual-rebind`）；没有监听者时以 `DeviceNotFound` 失败。`allowDeviceSelection: false` 时直接失败。
- 选中后发出 `REQUEST_SAVE_DEVICE_BINDING`，以 `RECEIVE_SAVE_DEVICE_BINDING`
  （`{ requestId, saved, reason? }`）应答；进度通过 `DEVICE_BINDING_STATUS`
  （`verifying` / `saved` / `failed` / `cancelled`）通知。没有监听者、未应答或拒绝时记为 `skipped`，
  业务调用继续，但显式的 `bindBleDevice` 会失败。
- `IHardwareConnectionContext.supportedTransports` 限定 discovery 只打开宿主允许的 transport。

### 错误对象

- `createHwkError` 现在总是带 `recovery`（`HwkRecoveryHint`，未显式给出时由
  `defaultRecoveryForCode` 推导），可选带 `origin`（`device` / `transport` / `host`）。
  `recovery.scope` 只说明重试前需要替换的最小资源，不代表允许自动重放签名。
- 发出请求后丢失响应的非幂等调用带 `params.operationMayHaveCompleted: true` 和 `params.method`。
- 所有 UI 请求 payload 新增可选 `operationId`（`UiRequestOperationAttribution`），用于区分
  不同 operation 的提示；结束或取消一个 operation 不再清掉另一个 operation 的 PIN / QR 等待。
- `cancelCapability` 在 Trezor、Ledger、Keystone 上均为 `'stops-waiting'`：取消只停止 SDK 等待，
  设备上的确认界面仍在。

### 依赖

`hwk-ledger-adapter`、`hwk-ledger-connector-ble`、`hwk-ledger-connector-webhid` 的 `@ledgerhq/*`
依赖从 `^` 范围改为精确版本（如 `@ledgerhq/device-management-kit` `1.9.0`），并新增 `rxjs` `7.8.2`。
宿主自己也依赖 DMK 时需检查是否出现重复安装。

## 宿主需要承担的责任

### Keystone `accountKey` 固定

- `evmGetAddress`、`btcGetAddress`、`tronGetAddress`、`btcGetPublicKey` 的结果带
  `accountKey: ExportedAccountKey`（`path`、`publicKey`、`chainCode`、`xpub`）；`solGetAddress`
  只带 `path` 和 `publicKey`。字段在类型上可选，只有 Keystone 填写。
- SDK 不在多次调用之间比较导出的 key。宿主在首次导出时按“钱包 + network + 账户路径”保存
  `publicKey` 和 `chainCode`，之后同一键下任何不一致都必须拒绝使用该结果。比较 `publicKey` +
  `chainCode`，不要比较 `xpub` 字符串（编码字段可能不同）。
- master fingerprint（`WalletIdentity` 的 Keystone `walletId`）只用于路由和匹配钱包，不能证明对方持有私钥；
  不能用它代替 `accountKey` 校验。

### 错误码映射

宿主需要为以下 `HardwareErrorCode` 提供文案和恢复动作：

| 代码                          | 值    | 状态 | 含义 / 处理                                                                       |
| ----------------------------- | ----- | ---- | --------------------------------------------------------------------------------- |
| `OperationNotFound`           | 10112 | 新增 | operation id 不属于当前 adapter 实例；重新 `connectDevice`                        |
| `OperationEnded`              | 10113 | 新增 | operation 已结束，不可恢复；重新连接                                              |
| `DeviceSearchMismatch`        | 10114 | 新增 | 找到了设备但都不是期望的钱包；提示连接正确的设备                                  |
| `LedgerSecureChannelError`    | 10311 | 新增 | Ledger manager-api WebSocket 中断，设备链路正常；可重试                           |
| `LedgerFirmwareMetadataError` | 10312 | 新增 | 厂商元数据服务返回不可用数据；不要按断链处理                                      |
| `AppAlreadyInstalled`         | 10504 | 新增 | 应用已安装；只需要该应用时可视为成功                                              |
| `PayloadTooLarge`             | 10600 | 新增 | 超出 transport 帧上限（Keystone USB 约 12.5KB）；换通道或缩小数据，同通道重试无效 |
| `DeviceOneDeviceOnly`         | 10109 | 已有 | 新增 Keystone USB 触发路径：平台无法区分多台已连接设备                            |
| `DeviceBusyInternal`          | 10111 | 已有 | Trezor、Keystone 自身请求占用设备；等待后重试，不要提示关闭其他应用               |
| `ThpPairingFailed`            | 10306 | 已有 | 新增上文 Trezor BLE 拒绝路径                                                      |

`PayloadTooLarge` 在 Keystone 上有两种来源：`origin` 不是 `device` 时是发送前被拒绝，调用未绑定
operation 且未强制 transport 时 adapter 会改走 QR，否则原样返回；`origin: 'device'` 且 `params.replyUnreadable: true` 表示设备已处理请求但回复
无法解码。签名类调用在后一种情况下改为 `params.operationMayHaveCompleted: true`，宿主不得自动重发，
应让用户先在设备或链上确认结果。

### BLE IPC 只暴露给主窗口

- `initThirdPartyBleSupport` 用 `ipcMain.handle` 注册的 handler 在进程内全局生效，不校验
  `event.sender`；推送只发给传入的 `webContents`。
- 只在主窗口的 preload 中暴露 bridge，不要暴露给 webview、dApp 页面或其他窗口。需要校验调用方时，
  通过 `ipcMain` 选项注入一个包装对象，在转发前检查 listener 第一个参数（event）的 sender。
- 每个进程只调用一次；更换 `webContents` 前先 `dispose()`。

### 其他

- `REQUEST_SAVE_DEVICE_BINDING`：宿主必须先持久化 `connection`，再以 `saved: true` 应答。
- `cancelCapability` 为 `'stops-waiting'` 时，文案应为“已停止等待，请在设备上处理”，不要显示“已取消”。
- `TREZOR_THP_CREDENTIALS_CHANGED.payload.removed` 中的凭据要从宿主存储中删除。

## 已移除且无替代的接口

- `IHardwareWallet.getSupportedChains()`。
- `@onekeyfe/hwk-trezor-connector-electron-ble` 的 `./main` 中的 `WebContentsLike`、`NobleLike`、
  `NoblePeripheralLike`、`NobleCharacteristicLike` 类型：仍定义在 `hwk-desktop-noble-ble` 源码中，
  但未从任何 package 入口导出。
- 本分支预发布版中曾出现的 `@onekeyfe/hwk-keystone-connector-usb/nodeusb` 子路径已删除
  （`d83d29aac`），当前只有 `.` 和 `./webusb`。基线 `onekey` 上没有该包，因此只影响试用过本分支预发布版的宿主。
