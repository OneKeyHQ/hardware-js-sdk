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
- **`@onekeyfe/hd-transport-web-device`** - Web 设备传输入口（WebUSB / Electron BLE）
- **`@onekeyfe/hd-transport-usb`** - Node.js USB传输（CLI/服务端，基于 libusb）
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge传输
- **`@onekeyfe/hd-transport-lowlevel`** - 低层传输（BLE 插件模式）

### 平台SDK
- **`@onekeyfe/hd-web-sdk`** - Web平台SDK
- **`@onekeyfe/hd-ble-sdk`** - 移动端BLE SDK

### Ledger 集成（HWK）
- **`@onekeyfe/hwk-adapter-core`** - Connector 抽象、桥接接口与通用类型
- **`@onekeyfe/hwk-ledger-adapter`** - Ledger 链适配与 signer 封装
- **`@onekeyfe/hwk-ledger-connector-webhid`** - 基于 WebHID 的 Ledger `IConnector` 实现
- **`@onekeyfe/hwk-ledger-connector-ble`** - 基于 React Native BLE 的 Ledger `IConnector` 实现

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
        ├── @onekeyfe/hd-transport-web-device  (WebUSB / Electron BLE)
        ├── @onekeyfe/hd-transport-usb          (Node.js CLI)
        ├── @onekeyfe/hd-transport-lowlevel     (BLE 插件)
        └── @onekeyfe/hd-transport-http         (Bridge)
```

## 🔌 Ledger Connector 接口

HWK 包统一实现 `IConnector` 接口，公共调用面如下：

```typescript
interface IConnector {
  searchDevices(): Promise<ConnectorDevice[]>;
  connect(deviceId?: string): Promise<ConnectorSession>;
  disconnect(sessionId: string): Promise<void>;
  call(sessionId: string, method: string, params: unknown): Promise<unknown>;
  cancel(sessionId: string): Promise<void>;
  uiResponse(response: UiResponseEvent): void;
  on(event, handler): void;
  off(event, handler): void;
  reset(): void;
}
```

典型接入方式：

```typescript
import { createLedgerWebHidConnector } from '@onekeyfe/hwk-ledger-connector-webhid';

const connector = createLedgerWebHidConnector();
const [device] = await connector.searchDevices();

if (!device) {
  throw new Error('No Ledger device found');
}

const session = await connector.connect(device.deviceId);
```

已实现的交互事件（`ui-event`）包括：
- `searching`
- `confirm-open-app`
- `unlock-device`
- `confirm-on-device`
- `interaction-complete`

使用约束：
- WebHID Connector 面向浏览器 / 桌面 WebHID 场景。
- BLE Connector 面向 React Native，包本身声明了 `react-native` peer dependency。

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