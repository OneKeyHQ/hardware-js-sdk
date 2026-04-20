# OneKey Hardware SDK - 架构概览

## 📁 核心架构

OneKey Hardware SDK 采用三层架构设计：

```
应用层 (DApps / CLI / Agent Tools)
    ↓
SDK接口层 (@onekeyfe/hd-core / @onekeyfe/hd-common-connect-sdk)
    ↓
传输抽象层 (@onekeyfe/hd-transport)
    ↓
平台适配层 (USB / Web Device / BLE / HTTP)
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
- **`@onekeyfe/hd-common-connect-sdk`** - Node/直连设备场景的通用 SDK 封装

### CLI / Agent 集成层
- **`@onekeyfe/hardware-cli`** - 面向 Claude Code、Cursor、Codex、Gemini 等工具的命令行入口
- **`@onekeyfe/hd-transport-usb`** - CLI 当前使用的直连 USB 传输插件

### 示例应用
- **`@onekeyfe/connect-examples`** - 集成示例
  - `expo-example` - Web集成示例
  - `expo-playground` - 开发测试平台

## 🤖 AI Agent 集成入口

仓库内已经提供了 AI agent 的一等入口，不需要额外包装服务：

- CLI 文档：[`packages/hd-cli/README.md`](../packages/hd-cli/README.md)
- Portal 工作流文档：[`agent-integration.mdx`](../packages/connect-examples/developer-portal/content/en/hardware-sdk/agent-integration.mdx)

当前实现对应的源码入口：

- 命令定义：`packages/hd-cli/src/cli.ts`
- SDK 初始化与交互事件处理：`packages/hd-cli/src/sdk.ts`
- 链路由与默认派生路径：`packages/hd-cli/src/chains.ts`

这个入口的职责边界很明确：

- stdout 始终输出结构化 JSON，方便 agent 直接解析结果。
- PIN、Passphrase、按钮确认等交互通过 stderr/设备侧提示完成。
- CLI 目前只支持固件检查，不支持固件升级；升级仍需 OneKey App 或 firmware.onekey.so。

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

### CLI 调用链

```typescript
onekey-hw get-address --chain evm
    ↓
packages/hd-cli/src/cli.ts
    ↓
resolveGetAddress()
    ↓
@onekeyfe/hd-common-connect-sdk
    ↓
@onekeyfe/hd-core
    ↓
@onekeyfe/hd-transport-usb
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

CLI 的当前实现固定走直连 USB：`packages/hd-cli/src/sdk.ts` 中通过 `UsbPlugin` 初始化，并把 `env` 设置为 `lowlevel`。

## 📦 依赖关系

```
应用层
├── @onekeyfe/hd-web-sdk
├── @onekeyfe/hd-ble-sdk
├── @onekeyfe/hardware-cli
│   └── @onekeyfe/hd-common-connect-sdk
│       ├── @onekeyfe/hd-core ←── 核心层
│       │   └── @onekeyfe/hd-transport
│       └── 传输插件
│           ├── @onekeyfe/hd-transport-usb
│           ├── @onekeyfe/hd-transport-http
│           ├── @onekeyfe/hd-transport-lowlevel
│           └── @onekeyfe/hd-transport-web-device
└── 平台传输实现
    ├── @onekeyfe/hd-transport-http
    └── 其他平台适配层
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