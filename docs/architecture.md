# OneKey Hardware SDK - 架构概览

## 📁 核心架构

OneKey Hardware SDK 采用三层架构设计：

```
应用层 (DApps)
    ↓
SDK接口层 (@onekeyfe/hd-core)
    ↓
传输抽象层 (@onekeyfe/hd-transport)
    ↓
平台适配层 (WebUSB/BLE/HTTP)
    ↓
硬件设备层 (OneKey设备)
```

## 🏗️ 核心包结构

### API层
- **`@onekeyfe/hd-core`** - 核心API和业务逻辑
- **`@onekeyfe/hd-transport`** - 传输层抽象

### 传输层
- **`@onekeyfe/hd-transport-web-device`** - 浏览器设备传输（WebUSB / WebHID）
- **`@onekeyfe/hd-transport-usb`** - Node.js USB传输（CLI/服务端，基于 libusb）
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge传输
- **`@onekeyfe/hd-transport-lowlevel`** - 低层传输（BLE 插件模式）

### HWK 适配层
- **`@onekeyfe/hwk-adapter-core`** - 多厂商硬件钱包通用接口、事件和错误模型
- **`@onekeyfe/hwk-ledger-adapter`** - Ledger 业务适配层（连接恢复、设备指纹、应用安装）
- **`@onekeyfe/hwk-ledger-connector-webhid`** - Ledger WebHID connector（浏览器）
- **`@onekeyfe/hwk-ledger-connector-ble`** - Ledger BLE connector（React Native）

### 平台SDK
- **`@onekeyfe/hd-web-sdk`** - Web平台SDK
- **`@onekeyfe/hd-ble-sdk`** - 移动端BLE SDK

### 示例应用
- **`@onekeyfe/connect-examples`** - 集成示例
  - `expo-example` - Web集成示例
  - `expo-playground` - 开发测试平台

## 🔄 API调用流程

```typescript
// 典型调用链
HardwareSDK.btcGetAddress()
    ↓
BaseMethod.run()
    ↓
Device.call()
    ↓
Transport.send()
    ↓
硬件设备响应
```

## 🎯 设计原则

### 分层解耦
- 业务逻辑与传输协议分离
- 核心API与平台实现解耦
- 支持独立测试和开发

### 平台无关
- 一套API支持Web/Mobile/Desktop
- 平台差异在适配层处理
- 核心逻辑完全复用

### 协议可扩展
- 支持多种传输协议
- 向后兼容旧版本
- 便于添加新协议

## 🧩 关键设计模式

### 模板方法 (BaseMethod)
```typescript
abstract class BaseMethod<Request, Response> {
  async execute(): Promise<Response> {
    this.validateParams();
    await this.checkDevice();
    return await this.run();
  }
  
  abstract run(): Promise<Response>;
}
```

### 策略模式 (Transport)
```typescript
// 根据环境选择传输方式
switch(env) {
  case 'webusb': return new WebUsbTransport();       // 浏览器 WebUSB
  case 'node-usb': return new NodeUsbTransport();      // Node.js libusb (CLI)
  case 'lowlevel': return new LowlevelTransport();    // BLE 插件模式
  case 'http': return new HttpTransport();             // HTTP Bridge
}
```

## 📦 依赖关系

```
应用层
├── @onekeyfe/hd-web-sdk
├── @onekeyfe/hd-ble-sdk
    │
    ├── @onekeyfe/hd-core ←── 核心层
    │   └── @onekeyfe/hd-transport
    │
    └── 传输层实现
        ├── @onekeyfe/hd-transport-web-device   (浏览器)
        ├── @onekeyfe/hd-transport-usb          (Node.js CLI)
        ├── @onekeyfe/hd-transport-lowlevel     (BLE 插件)
        └── @onekeyfe/hd-transport-http         (Bridge)
```

## 🧱 HWK Ledger 适配层

除了传统的 `@onekeyfe/hd-core` 调用链，仓库还提供一套独立的 HWK（Hardware Wallet Kit）接口层，用统一的 `IHardwareWallet` / `IConnector` 抽象来接入不同厂商设备。当前源码里最完整的实现是 Ledger。

### 包职责

| 包 | 角色 | 关键导出 |
| --- | --- | --- |
| `@onekeyfe/hwk-adapter-core` | 通用类型层 | `IHardwareWallet`、`IConnector`、`UI_REQUEST`、`UI_RESPONSE`、`EConnectorInteraction`、`createBridgedConnector()` |
| `@onekeyfe/hwk-ledger-adapter` | Ledger 业务适配层 | `LedgerAdapter`、Ledger 错误映射与恢复逻辑 |
| `@onekeyfe/hwk-ledger-connector-webhid` | 浏览器侧 Ledger connector | `LedgerWebHidConnector`、`createLedgerWebHidConnector()` |
| `@onekeyfe/hwk-ledger-connector-ble` | React Native BLE connector | `LedgerBleConnector`、`createLedgerBleConnector()` |

`LedgerAdapter` 实现了通用 `IHardwareWallet` 接口，同时还额外暴露了 Ledger 专属的设备管理方法，如 `installApp()`、`listInstalledApps()`、`listInstalledNames()`、`listAvailableApps()`、`getLedgerFirmwareVersion()` 和 `getLedgerDeviceInfo()`。

### 调用链

```typescript
UI / Service
    ↓
LedgerAdapter (@onekeyfe/hwk-ledger-adapter)
    ↓
IConnector (searchDevices / connect / call / cancel)
    ↓
WebHID 或 BLE connector
    ↓
Ledger DMK / signer kit
    ↓
Ledger 设备
```

### 最小接入示例

下面的 `requestHostPermission()`、`showReconnectDialog()`、`showInstallDialog()`、`renderInstallProgress()` 代表应用侧自己的 UI / 权限封装；SDK 负责的是事件契约和响应格式。

```typescript
import {
  EConnectorInteraction,
  UI_REQUEST,
  UI_RESPONSE,
} from '@onekeyfe/hwk-adapter-core';
import { LedgerAdapter } from '@onekeyfe/hwk-ledger-adapter';
import { createLedgerWebHidConnector } from '@onekeyfe/hwk-ledger-connector-webhid';

const connector = createLedgerWebHidConnector();
const hw = new LedgerAdapter(connector, { autoInstallApp: false });

hw.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, async event => {
  const granted = await requestHostPermission(event.payload.transportType);
  hw.uiResponse({
    type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
    payload: { granted },
  });
});

hw.on(UI_REQUEST.REQUEST_DEVICE_CONNECT, () => {
  showReconnectDialog(confirmed => {
    hw.uiResponse({
      type: UI_RESPONSE.RECEIVE_DEVICE_CONNECT,
      payload: { confirmed },
    });
  });
});

hw.on(UI_REQUEST.REQUEST_INSTALL_APP, event => {
  showInstallDialog(event.payload.appName, confirmed => {
    hw.uiResponse({
      type: UI_RESPONSE.RECEIVE_INSTALL_APP,
      payload: { confirmed },
    });
  });
});

hw.on('ui-event', event => {
  if (event.type === EConnectorInteraction.AppInstallProgress) {
    renderInstallProgress(event.payload.appName, event.payload.progress);
  }
});

const [device] = await hw.searchDevices({ resetSession: true });
const result = await hw.allNetworkGetAddress(device.connectId, device.deviceId, {
  autoInstallApp: true,
  bundle: [
    {
      network: 'eth',
      methodName: 'evmGetAddress',
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
    },
  ],
});
```

### 公开契约与运行时约束

#### 1. 宿主必须处理的 UI request

这些事件不是提示性通知，而是需要宿主显式回包的阻塞点：

| 事件 | 宿主需要调用的响应 | 何时触发 |
| --- | --- | --- |
| `ui-request-device-permission` | `receive-device-permission` | 搜索设备前，或业务调用前需要确认系统权限时 |
| `ui-request-device-connect` | `receive-device-connect` | 扫描多次仍未找到 / 设备需要重新连接时 |
| `ui-request-install-app` | `receive-install-app` | `autoInstallApp` 打开且目标 App 缺失时 |
| `ui-request-btc-high-index-confirm` | `receive-btc-high-index-confirm` | `btcGetPublicKey()` 的 account index `>= 100` 且调用方未设置 `showOnDevice: true` 时 |

补充说明：

- `LedgerAdapter` 不会发出 `REQUEST_SELECT_DEVICE`。如果扫描到多个设备，宿主应先从 `searchDevices()` 的结果中自行选择目标 `connectId`。
- `REQUEST_DEVICE_PERMISSION` 的等待超时是 60 秒；如果宿主没有监听或没有调用 `uiResponse()`，调用会失败而不是无限挂起。

#### 2. `ui-event` 只是通知，不需要回包

`ui-event` 用于同步设备交互状态，当前 Ledger 路径会转发这些交互类型：

- `searching`
- `confirm-open-app`
- `unlock-device`
- `confirm-on-device`
- `interaction-complete`
- `app-install-progress`

其中 `app-install-progress` 会把 connector 内部的 `sessionId` 重写为公开的 `connectId`，因此 UI 层不需要维护额外的 session 映射。

#### 3. 调用是全局串行的

`LedgerAdapter` 内部通过 `DeviceJobQueue` 串行执行业务调用；队列是整个 adapter 级别的一次只跑一个任务，不是“每个设备各一条队列”。如果上一个调用尚未结束，新的业务调用会按 `DeviceBusy` 失败，而不是并行发 APDU。

这意味着：

- 同一个 `LedgerAdapter` 实例适合由一个前台交互流独占使用。
- 想中断当前任务时，应调用 `cancel(connectId?)`，而不是直接重试相同方法。
- 不带 `connectId` 的 `cancel()` 会取消当前活动任务以及未开始的排队任务，适合“全局中止”按钮，不适合细粒度多任务调度。

#### 4. `connectId`、`deviceId` 和传输差异

- BLE 调用必须提供明确的 `connectId`；Ledger BLE 路径不会自动猜设备。
- USB / WebHID 在“恰好扫描到一个设备”时可以自动连接，但多设备场景下不会自动挑选，避免把请求路由到错误设备。
- `searchDevices({ resetSession: true })` 会清空缓存 session，适合“重新搜索 / 添加另一台设备”的显式流程。
- 业务调用应尽量传入扫描结果里的 `deviceId`，这样 adapter 才能在重连后通过链指纹校验“还是不是同一台设备 / 同一个 seed”。

#### 5. `allNetworkGetAddress()` 的行为边界

`allNetworkGetAddress()` 当前只支持下面这些 `methodName`：

- `evmGetAddress`
- `btcGetAddress`
- `btcGetPublicKey`
- `solGetAddress`
- `tronGetAddress`

其他行为边界：

- bundle 按顺序串行执行，不会并发跑多个链。
- 每个链会缓存一次 `chainFingerprint`，后续同链条目会复用；如果某个条目显式传入 `deviceId`，优先使用该值。
- 如果无法建立链指纹，方法会 fail closed，返回 `DeviceMismatch` 风格的失败，而不是返回一个无法验证来源的地址。
- 以下失败会中止整个 bundle：`DeviceMismatch`、`UserAborted`、`UserRejected`。
- 对 BTC 条目，如果没有传 `coin`，adapter 会按 `network` 自动补一部分常见映射：`tbtc -> Testnet`、`bch -> Bcash`、`doge -> Dogecoin`、`ltc -> Litecoin`、`neurai -> Neurai`。

### Ledger 设备管理 Runbook

| 需求 | 建议方法 | 说明 |
| --- | --- | --- |
| 获取已安装 App 的详细元数据 | `listInstalledApps()` | 需要设备解锁；返回版本、图标、大小等 metadata |
| 只检查设备当前装了哪些 App | `listInstalledNames()` | 仍需解锁和 dashboard，但不依赖 manager catalog，适合轻量 presence probe |
| 查询当前设备可安装哪些 App | `listAvailableApps()` | 通过 catalog 查询可安装应用列表 |
| 获取用户可见 firmware 版本 | `getLedgerFirmwareVersion()` | 返回 `seVersion`、`mcuSephVersion`、`mcuBootloaderVersion`、`hwVersion` |
| 获取更完整的设备固件信息 | `getLedgerDeviceInfo()` | 在 firmware version 基础上，额外包含 `isBootloader`、`isOsu`、`targetId`、`seFlagsHex` |
| 缺少目标链 App 时自动安装 | 在调用时传 `{ autoInstallApp: true }`，或在构造 `LedgerAdapter` 时设置默认值 | 安装进度通过 `ui-event` 的 `app-install-progress` 推送 |

### 常见坑

- **设备刚重连但 `connectId` 变了**：USB / WebHID 的 `connectId` 可能是临时值。把 `deviceId` 也传给业务调用，适配层才能在重连后继续做指纹校验。
- **自动安装没有发生**：`autoInstallApp` 默认关闭；不打开时，缺少 App 会直接以 `AppNotInstalled` 失败。
- **BTC 高账户路径直接报错**：Ledger BTC App 对 account index `>= 100` 有额外显示确认要求；如果没有处理 `ui-request-btc-high-index-confirm`，SDK 会把这次调用当作用户拒绝。
- **想一边扫描一边签名**：同一个 adapter 实例的业务任务是全局串行的，扫描 / 连接 / 签名混在同一交互流里更安全；需要真正并行时，应该从产品层重新设计实例生命周期，而不是假设内部队列支持多路复用。

## 🔧 开发工具

- **Lerna** - Monorepo管理
- **TypeScript** - 类型安全
- **Jest** - 单元测试

## 🚀 快速开始

```bash
# 安装依赖
yarn install

# 构建项目
yarn build

# 启动示例
yarn workspace @onekeyfe/connect-examples start
```