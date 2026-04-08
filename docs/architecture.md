# OneKey Hardware SDK - 架构概览

## 📁 核心架构

OneKey Hardware SDK 采用分层架构设计，入口 SDK、核心逻辑和传输实现彼此解耦：

```
应用层 (DApps / examples)
    ↓
SDK入口层 (@onekeyfe/hd-web-sdk / @onekeyfe/hd-ble-sdk / @onekeyfe/hd-common-connect-sdk)
    ↓
核心层 (@onekeyfe/hd-core)
    ↓
传输抽象层 (@onekeyfe/hd-transport)
    ↓
传输实现层 (WebUSB / Electron BLE / HTTP / Lowlevel / Emulator / React Native)
    ↓
硬件设备层 (OneKey设备 / Emulator)
```

## 🏗️ 核心包结构

### SDK入口层
- **`@onekeyfe/hd-web-sdk`** - 浏览器场景的 SDK 入口
- **`@onekeyfe/hd-ble-sdk`** - React Native / BLE 场景的 SDK 入口
- **`@onekeyfe/hd-common-connect-sdk`** - 通用入口，按 `env` 选择具体传输实现

### 核心层
- **`@onekeyfe/hd-core`** - 核心 API、方法调度和设备状态管理
- **`@onekeyfe/hd-transport`** - 消息序列化、协议封包和传输抽象

### 传输层
- **`@onekeyfe/hd-transport-web-device`** - WebUSB 和桌面端 BLE 传输入口
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge 传输
- **`@onekeyfe/hd-transport-react-native`** - React Native 传输
- **`@onekeyfe/hd-transport-lowlevel`** - Lowlevel 传输
- **`@onekeyfe/hd-transport-emulator`** - Emulator 传输

### 示例应用
- **`@onekeyfe/connect-examples`** - 集成示例
  - `expo-example` - Web / Mobile 集成示例
  - `electron-example` - Desktop 集成示例
  - `expo-playground` - 开发测试平台

## 🔄 API调用流程

```typescript
// 典型调用链
HardwareSDK.init({ env })
    ↓
hd-common-connect-sdk.getTransport(env)
    ↓
initCore(settings, Transport)
    ↓
BaseMethod.run()
    ↓
Device.call()
    ↓
Transport.call()
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
const getTransport = (env: ConnectSettings['env']) => {
  if (env === 'desktop-web-ble') return ElectronBleTransport;
  if (env === 'webusb' || env === 'desktop-webusb') return WebUsbTransport;
  if (env === 'lowlevel') return LowlevelTransport;
  if (env === 'emulator') return EmulatorTransport;
  return HttpTransport;
};
```

## 📦 依赖关系

```
应用层
├── @onekeyfe/hd-web-sdk
│   └── @onekeyfe/hd-core
│       └── @onekeyfe/hd-transport
│           ├── @onekeyfe/hd-transport-web-device
│           └── @onekeyfe/hd-transport-http
├── @onekeyfe/hd-ble-sdk
│   └── @onekeyfe/hd-core
│       └── @onekeyfe/hd-transport
│           └── @onekeyfe/hd-transport-react-native
└── @onekeyfe/hd-common-connect-sdk
    └── @onekeyfe/hd-core
        └── @onekeyfe/hd-transport
            ├── @onekeyfe/hd-transport-web-device
            ├── @onekeyfe/hd-transport-http
            ├── @onekeyfe/hd-transport-lowlevel
            └── @onekeyfe/hd-transport-emulator
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

# 启动 Expo 示例
yarn example

# 启动桌面示例
yarn example:desktop

# 启动 Playground
yarn example:playground
```