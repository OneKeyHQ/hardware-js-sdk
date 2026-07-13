# OneKey Hardware SDK - 架构概览

## 📁 核心架构

OneKey Hardware SDK 采用三层架构设计：

```
应用层 (DApps / CLI / Demo apps)
    ↓
SDK接口层 (@onekeyfe/hd-core / HWK adapters)
    ↓
传输抽象层 (@onekeyfe/hd-transport / vendor connectors)
    ↓
平台适配层 (WebUSB / BLE / HTTP / Bridge)
    ↓
硬件设备层 (OneKey / third-party hardware)
```

## 🏗️ 核心包结构

### API层
- **`@onekeyfe/hd-core`** - 核心API和业务逻辑
- **`@onekeyfe/hd-transport`** - 传输层抽象

### 传输层
- **`@onekeyfe/hd-transport-web-device`** - Web 与 Electron 设备传输（WebUSB / Electron BLE）
- **`@onekeyfe/hd-transport-usb`** - Node.js USB传输（CLI/服务端，基于 libusb）
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge传输
- **`@onekeyfe/hd-transport-lowlevel`** - 低层传输（BLE 插件模式）
- **`@onekeyfe/hd-transport-react-native`** - React Native 侧的设备传输注册
- **`@onekeyfe/hd-transport-electron`** - Electron 平台传输适配

### 平台SDK
- **`@onekeyfe/hd-web-sdk`** - Web平台SDK
- **`@onekeyfe/hd-ble-sdk`** - 移动端BLE SDK

### 示例应用
- **`packages/connect-examples/expo-example`** - Web 集成示例
- **`packages/connect-examples/expo-playground`** - 开发测试平台
- **`packages/connect-examples/hwk-demo`** - HWK 多厂商硬件接入示例

### HWK 多厂商适配层
- **`@onekeyfe/hwk-adapter-core`** - 定义跨厂商的 `IConnector` / `IHardwareWallet` 接口、事件常量，以及 `createBridgedConnector()`、`createCombinedConnector()` 这类组合能力。
- **`@onekeyfe/hwk-trezor-adapter`** - 将应用层方法映射到 Trezor 连接器；当前公开覆盖 EVM、BTC、SOL、TRON 以及 `getFeatures`、`deviceSettings`、`setBrightness`、`changePin`、`wipeDevice` 等设备方法。
- **`@onekeyfe/hwk-trezor-connector-webusb`** - 浏览器侧 Trezor WebUSB 连接器；`requestDevice()` 必须在用户手势里调用，选中的设备才会出现在后续 `searchDevices()` 结果中。
- **`@onekeyfe/hwk-trezor-connector-rn-ble`** / **`@onekeyfe/hwk-trezor-connector-electron-ble`** - React Native 与 Electron 的 BLE 连接器实现。
- **`@onekeyfe/hwk-trezor-connector`** / **`@onekeyfe/hwk-trezor-core`** - Trezor 方法分发与会话层；前者把 `btcGetAddress`、`evmSignTransaction` 这类方法映射为设备调用，后者负责消息分帧、分块读写，以及 THP / legacy v1 会话初始化。

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

```typescript
// HWK / Trezor WebUSB 最小接入
import { TrezorAdapter } from '@onekeyfe/hwk-trezor-adapter';
import { TrezorWebUsbConnector } from '@onekeyfe/hwk-trezor-connector-webusb';

const connector = new TrezorWebUsbConnector({
  thp: { hostName: 'OneKey', appName: 'My App' },
});
const hw = new TrezorAdapter(connector);

await connector.requestDevice(); // Must run in a click/tap handler.
const [device] = await hw.searchDevices();
const features = await hw.getFeatures(device.connectId);
```

#### HWK 接入约束
- **WebUSB 前置条件：** 浏览器必须暴露 `navigator.usb`，并且 `requestDevice()` 只能在点击/触摸等用户手势中触发。
- **React Native BLE 前置条件：** 需要先拿到系统蓝牙/定位权限，并确保蓝牙处于 `PoweredOn` 状态，适配层才会对 `REQUEST_DEVICE_PERMISSION` 给出 `granted: true`。
- **当前示例范围：** `packages/connect-examples/hwk-demo` 目前只接通了 Trezor；传入 `ledger` 会直接抛出 `HWK_BRAND_NOT_WIRED`，因此它更适合做 Trezor 接入样例，而不是完整的多厂商演示。

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
├── @onekeyfe/hwk-trezor-adapter
│   ├── @onekeyfe/hwk-adapter-core
│   ├── @onekeyfe/hwk-trezor-connector-webusb / rn-ble / electron-ble
│   └── @onekeyfe/hwk-trezor-connector → @onekeyfe/hwk-trezor-core
│
└── @onekeyfe/hd-core ←── 核心层
    └── @onekeyfe/hd-transport
        ├── @onekeyfe/hd-transport-web-device  (WebUSB / Electron BLE)
        ├── @onekeyfe/hd-transport-usb         (Node.js CLI)
        ├── @onekeyfe/hd-transport-lowlevel    (BLE 插件)
        └── @onekeyfe/hd-transport-http        (Bridge)
```

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

# 启动 Web 示例
yarn example

# 启动 HWK Demo
cd ./packages/connect-examples/hwk-demo && yarn start
```