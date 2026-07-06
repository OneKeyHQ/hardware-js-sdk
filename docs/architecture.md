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
- **`@onekeyfe/hd-transport-web-device`** - WebUSB / WebHID 传输（浏览器）
- **`@onekeyfe/hd-transport-usb`** - Node.js USB传输（CLI/服务端，基于 libusb）
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge传输
- **`@onekeyfe/hd-transport-lowlevel`** - 低层传输（BLE 插件模式）

### 平台SDK
- **`@onekeyfe/hd-web-sdk`** - Web平台SDK
- **`@onekeyfe/hd-ble-sdk`** - 移动端BLE SDK

### Ledger 适配层（`hwk-*`）
- **`@onekeyfe/hwk-adapter-core`** - 多厂商硬件适配层的共享类型、事件、错误码与 connector contract
- **`@onekeyfe/hwk-ledger-adapter`** - Ledger 的统一钱包接口实现，封装设备发现、链方法调用、重试与指纹校验
- **`@onekeyfe/hwk-ledger-connector-webhid`** - 浏览器 WebHID 连接器
- **`@onekeyfe/hwk-ledger-connector-ble`** - React Native BLE 连接器

这套 `hwk-*` 栈与 `@onekeyfe/hd-core` 主 SDK 并行存在，主要用于接入 Ledger 等多厂商设备；它不是 `hd-core` 的 transport 插件。宿主应用通常先选择 connector（WebHID 或 BLE），再创建 `LedgerAdapter`，并处理 `ui-request-device-permission`、`ui-request-device-connect`、`ui-request-install-app` 等交互事件。

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
  case 'web-device': return new WebUsbTransport();      // 浏览器 WebUSB / WebHID
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
        ├── @onekeyfe/hd-transport-web-device  (浏览器)
        ├── @onekeyfe/hd-transport-usb          (Node.js CLI)
        ├── @onekeyfe/hd-transport-lowlevel     (BLE 插件)
        └── @onekeyfe/hd-transport-http         (Bridge)
```

Ledger 适配层（并行架构）：

```text
宿主应用
├── @onekeyfe/hwk-ledger-adapter
│   └── @onekeyfe/hwk-adapter-core
│
└── 连接器实现
    ├── @onekeyfe/hwk-ledger-connector-webhid   (Browser WebHID)
    └── @onekeyfe/hwk-ledger-connector-ble      (React Native BLE)
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

# 启动示例
yarn workspace @onekeyfe/connect-examples start
```