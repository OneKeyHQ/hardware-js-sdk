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
- **`@onekeyfe/hd-transport-web-device`** - WebUSB传输（浏览器）
- **`@onekeyfe/hd-transport-usb`** - Node.js USB传输（CLI/服务端，基于 libusb）
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge传输
- **`@onekeyfe/hd-transport-lowlevel`** - 低层传输（BLE 插件模式）

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
        ├── @onekeyfe/hd-transport-web-device  (浏览器)
        ├── @onekeyfe/hd-transport-usb          (Node.js CLI)
        ├── @onekeyfe/hd-transport-lowlevel     (BLE 插件)
        └── @onekeyfe/hd-transport-http         (Bridge)
```

## ⚡ 预初始化（preInitialize）快路径

`@onekeyfe/hd-core` 暴露了一个单独的预热入口，用来提前完成一次 `acquire + Initialize`，让后续符合条件的签名调用跳过重复初始化。

### 公开接口

```typescript
await HardwareSDK.preInitialize(connectId, {
  passphraseState,
  initSession: false,
});
```

- `preInitialize(connectId, params?)` 的公开类型定义位于 `packages/core/src/types/api/preInitialize.ts`
- 公开返回类型是 `Response<boolean>`；成功响应里的 `payload` 为 `true` 表示预热成功，`payload` 为 `false` 表示预热内部失败后已清理预热标记
- 预热结束后 SDK 会主动 `release()` 当前设备连接；它缓存的是后续跳过 `Initialize` 所需的设备状态，而不是长期占用会话
- 重复的 `preInitialize` 会按 `connectId + passphraseState + method name` 去重；同一 key 在 60 秒窗口内不会重复做预热

### 什么时候会命中快路径

后续业务调用只有在以下条件同时满足时，才会真正跳过 `Initialize`：

- 方法本身显式允许：`BaseMethod.allowUsePreInitialize === true`
- 本次调用显式传入 `usePreInitialize: true`
- 调用里带有稳定的 `connectId`
- 当前 `passphraseState` 与预热时记录的元数据一致
- 设备已有 `features`
- 预热记录仍在 60 秒 TTL 内

命中时，核心层会输出：

```text
[PRE-INIT][HIT] method=<methodName> skip Initialize (...)
```

未命中时，核心层会输出：

```text
[PRE-INIT][MISS] method=<methodName> method.disallow,...
```

常见 miss 原因和源码字段一一对应：

| 日志原因 | 含义 |
| --- | --- |
| `method.disallow` | 当前方法没有开启 `allowUsePreInitialize` |
| `payload.usePreInitialize=false` | 调用参数里没有打开 `usePreInitialize` |
| `connectId.missing` | 没有固定目标设备，SDK 不会跳过初始化 |
| `meta.mismatch` | `passphraseState` 与预热时记录的不一致 |
| `features.missing` | 设备还没有可复用的 `features` |
| `ttl.expired` | 预热窗口已超过 60 秒 |

### 当前 Cardano 边界

最近的 Cardano 调整明确关闭了签名类方法的预初始化快路径：

- `cardanoSignTransaction`
- `cardanoSignMessage`

这两个方法在源码里都将 `allowUsePreInitialize` 设为 `false`，因此即使宿主继续传入 `usePreInitialize: true`，日志也会以 `method.disallow` 记为 miss，并执行完整的 `Initialize` 流程。集成方不应把 `preInitialize` 当作 Cardano 签名延迟优化手段。

### 使用示例

```typescript
await HardwareSDK.preInitialize(connectId, {
  passphraseState,
});

await HardwareSDK.solSignTransaction(connectId, deviceId, {
  ...params,
  passphraseState,
  usePreInitialize: true,
});
```

如果第二次调用复用了相同的 `connectId` 和 `passphraseState`，并且落在 60 秒窗口内，`solSignTransaction` 这类已开启 `allowUsePreInitialize` 的签名方法才会真正复用这次预热。

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