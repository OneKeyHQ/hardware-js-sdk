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
- **`@onekeyfe/hd-transport-web-device`** - WebUSB 设备访问（浏览器）
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

## ⚡ 设备预热与 Initialize 跳过

近期核心层新增了 `preInitialize()` 预热能力，用来把 BLE 场景下的连接和 `Initialize` 提前到签名前。它是一个 **best-effort 性能优化**，不会放宽真实签名时的固件、模式或 passphrase 安全检查。

### 公开接口

```typescript
// 预热调用，返回 boolean
HardwareSDK.preInitialize(connectId, params?);

// 真实签名调用需要再次显式开启
HardwareSDK.evmSignTransaction(connectId, deviceId, {
  ...params,
  usePreInitialize: true,
});
```

- `preInitialize()` 已通过 `@onekeyfe/hd-core` 暴露，返回 `boolean`
- `CommonParams.usePreInitialize` 当前在类型注释中标记为 **BLE only**
- 只有内部显式开启 `allowUsePreInitialize` 的签名类方法才会尝试跳过 `Initialize`
- `getAddress` / `getPublicKey` 这类读取方法不会使用这条优化路径

### 推荐时序

```text
签名页打开
  -> preInitialize(connectId, commonParams)
用户点击确认
  -> signMethod(connectId, deviceId, { ..., usePreInitialize: true })
  -> SDK 判断命中或回退到正常 Initialize
```

这个设计把“预热”与“真正签名”拆成两步：

1. **预热阶段**：提前建立连接并执行一次 `Initialize`
2. **真实调用阶段**：签名方法再次显式传入 `usePreInitialize: true`
3. **命中失败时**：SDK 自动回退到正常 `Initialize`，而不是继续沿用过期状态

### 命中条件与约束

真实调用只有在以下条件全部满足时，才会跳过 `Initialize`：

- 方法本身允许使用预热（`allowUsePreInitialize = true`）
- 调用方在真实签名请求里显式传入 `usePreInitialize: true`
- 设备已经拿到 `features`
- 预热记录仍在 **60 秒 TTL** 内
- 预热上下文与真实调用一致

当前核心实现会重点校验以下上下文：

- `passphraseState`
- `deviceId`（如果请求 payload 带上了它）

如果上下文不一致、TTL 过期，或者真实调用根本没有显式传 `usePreInitialize`，SDK 会记录 `[PRE-INIT][MISS]` 日志并继续走正常的 `Initialize` 流程。

### 并发与去重行为

- 同一个 `connectId` 上的预热请求会被合并，避免重复执行
- 同一个 `connectId` 上，如果真实调用正好撞上预热，SDK 会先等待预热结束，避免两个请求竞争同一次 `Initialize`
- 设备断开连接后，预热标记会被清空，后续请求必须重新预热

### 安全边界

`preInitialize()` 本身不会替代真实业务调用前的关键检查。实际方法执行前，核心层仍然会继续做：

- 固件版本与 release 检查
- 设备模式检查
- `deviceId` 检查
- passphrase 状态安全检查

`preInitialize()` 失败时会返回 `false` 并清理预热状态；这不会让后续签名进入“半初始化”状态，后续请求仍然会回退到完整的初始化流程。

### 排障日志

集成或排查 BLE 签名延迟时，优先看以下日志：

- **`[PRE-INIT][HIT]`**：命中预热，当前调用跳过了 `Initialize`
- **`[PRE-INIT][MISS]`**：未命中预热，常见原因包括 `payload.usePreInitialize=false`、`meta.mismatch`、`features.missing`、`ttl.expired`
- **`[PRE-INIT][FAILED]`**：预热本身失败，SDK 已清掉预热标记

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