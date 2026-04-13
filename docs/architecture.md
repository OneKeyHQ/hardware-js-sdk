# OneKey Hardware SDK - 架构概览

## 📁 核心架构

OneKey Hardware SDK 采用三层架构设计：

```
应用层 (DApps)
    ↓
SDK接口层 (@onekeyfe/core) 
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
- **`@onekeyfe/hd-transport-webusb`** - WebUSB传输
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge传输

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
  case 'webusb': return new WebUsbTransport();
  case 'ble': return new BleTransport();
  case 'http': return new HttpTransport();
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
        ├── @onekeyfe/hd-transport-webusb
        └── @onekeyfe/hd-transport-http
```

## 🤖 AI Agent 集成架构

`@onekeyfe/hardware-cli` 是面向 AI coding assistants 的公开接口，命令入口为 `onekey-hw`。
它把 Agent Skills、Claude Code 插件和通用 CLI 调用统一映射到同一套硬件 SDK 能力。

```
AI Agent / Skill / Plugin
    ↓
onekey-hw CLI (@onekeyfe/hardware-cli)
    ↓
@onekeyfe/hd-common-connect-sdk + @onekeyfe/hd-core
    ↓
@onekeyfe/hd-transport-usb
    ↓
OneKey 硬件设备
```

### 设计意图

- 为 AI agents 提供稳定的命令行边界，避免直接拼装底层 SDK 调用
- 通过 `skills/*/SKILL.md` 固化工作流、参数约束和安全规则
- 将设备搜索、地址获取、交易签名、固件检查、安全设置统一为结构化 JSON 输出

### 典型工作流

1. 安装 CLI 或 Claude Code 插件
2. 运行 `onekey-hw search` 搜索设备并获取 `connectId`
3. 使用 `get-address`、`sign-transaction`、`sign-message` 等命令执行操作
4. 用户在设备上输入 PIN、确认地址或签名
5. CLI 返回 JSON 结果，供 Agent 或上层应用继续处理

```bash
# 搜索设备
onekey-hw search

# 获取 EVM 地址
onekey-hw get-address --chain evm --use-empty-passphrase

# 签名消息
onekey-hw sign-message --chain evm --message "hello" --use-empty-passphrase
```

### 约束与边界

- CLI 使用 `libusb` 直接访问 USB 设备，不依赖外部 bridge daemon
- 涉及设备交互的命令会阻塞，直到用户在设备上完成 PIN 或确认操作
- 所有签名类命令都需要设备上的物理确认，Agent 只能发起请求，不能绕过确认
- 固件升级不在 CLI 中执行，只支持检查；实际升级需要使用 OneKey App 或 `firmware.onekey.so`
- 技能文件按能力拆分为 `device`、`signing`、`firmware`、`security` 四类

### 相关文档

- CLI 使用说明：`packages/hd-cli/README.md`
- Agent Skills 定义：`packages/hd-cli/skills/*/SKILL.md`
- Developer Portal：`packages/connect-examples/developer-portal/content/en/hardware-sdk/agent-integration.mdx`

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