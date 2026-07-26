# OneKey Hardware SDK - 架构概览

## 📁 核心架构

这个仓库目前同时维护两条硬件接入路径：

```text
OneKey 原生设备
应用层
    ↓
@onekeyfe/hd-core
    ↓
@onekeyfe/hd-transport
    ↓
WebUSB / Node USB / HTTP / Lowlevel(BLE)
    ↓
OneKey 设备

第三方硬件（当前重点是 Ledger）
应用层
    ↓
@onekeyfe/hwk-adapter-core
    ↓
@onekeyfe/hwk-ledger-adapter
    ↓
@onekeyfe/hwk-ledger-connector-webhid / @onekeyfe/hwk-ledger-connector-ble
    ↓
Ledger Device Management Kit / Transport Kit
    ↓
Ledger 设备
```

前者是 OneKey 自有协议栈；后者是多厂商硬件适配层，重点解决连接、会话、UI 事件和链方法的一致接口问题。

## 🏗️ 核心包结构

### OneKey 原生协议栈

- **`@onekeyfe/hd-core`** - 核心 API、`BaseMethod` 生命周期、设备状态管理
- **`@onekeyfe/hd-transport`** - 统一消息分包、序列化、传输抽象
- **`@onekeyfe/hd-transport-web-device`** - 浏览器 WebUSB 传输
- **`@onekeyfe/hd-transport-usb`** - Node.js USB 传输（libusb）
- **`@onekeyfe/hd-transport-http`** - HTTP Bridge
- **`@onekeyfe/hd-transport-lowlevel`** - 低层插件模式传输
- **`@onekeyfe/hd-transport-react-native`** - React Native BLE 传输实现

### 第三方硬件适配层

- **`@onekeyfe/hwk-adapter-core`** - `IConnector`、`IHardwareWallet`、UI 事件和通用错误约定
- **`@onekeyfe/hwk-ledger-adapter`** - Ledger 链方法、设备指纹校验、作业队列、自动装 App 工作流
- **`@onekeyfe/hwk-ledger-connector-webhid`** - WebHID connector
- **`@onekeyfe/hwk-ledger-connector-ble`** - React Native BLE connector

### 示例应用

- **`@onekeyfe/connect-examples`**
  - `expo-example` - 常规集成示例和参数面板
  - `expo-playground` - 开发 / 调试 playground

## 🔄 API 调用流程

### OneKey 原生调用链

```typescript
HardwareSDK.evmSignTransaction(connectId, deviceId, params)
    ↓
BaseMethod.init()
    ↓
Core.callAPI()
    ↓
Device.run()
    ↓
Device.initialize() // 满足条件时可被 preInitialize 命中并跳过
    ↓
Transport.call()
    ↓
设备响应
```

### Ledger 调用链

```typescript
ledgerAdapter.evmSignTransaction(connectId, deviceId, params, commonParams)
    ↓
LedgerAdapter.callChain()
    ↓
LedgerAdapter.connectorCall()
    ↓
IConnector.call(sessionId, method, params)
    ↓
LedgerConnectorBase
    ↓
Ledger DMK / transport kit
    ↓
设备响应或 connector ui-event / ui-request
```

## 🔥 BLE 预热流程：`preInitialize()` / `usePreInitialize`

`preInitialize()` 是一个 **BLE 签名前预热信号**，目标是把代价较高的 `Initialize` 提前做掉，而不是给后续请求强行关闭初始化。

### 行为约束

| 条件 | 源码行为 | 影响 |
| --- | --- | --- |
| `HardwareSDK.preInitialize(connectId, params)` | 走 `PreInitialize` 方法，标记为 `isPreWarmSignal` | 进入专用的预热分支 |
| 同一个预热 key 并发触发 | Core 侧会合并 in-flight 调用 | 避免重复抢占 BLE 链路 |
| 60 秒内重复预热 | 命中 TTL，直接返回 `true` | 不会重复做 `Initialize` |
| 后续业务调用设置 `usePreInitialize: true` | 只有方法自身 `allowUsePreInitialize = true` 时才允许跳过初始化 | 不是所有方法都支持 |
| `passphraseState` 不匹配、`connectId` 缺失、设备还没有 `features`、TTL 过期 | 记为 `[PRE-INIT][MISS]`，仍然执行正常 `Initialize` | 失败闭合，不会错误复用旧状态 |
| Cardano 签名 | `cardanoSignTransaction` / `cardanoSignMessage` 显式 `allowUsePreInitialize = false` | 近期修复后不再复用预热跳过初始化 |

### `deriveCardano` 的边界

`Initialize` 是否带上 `deriveCardano` 不是只看显式参数。当前会在以下情况自动打开：

- 方法名以 `cardano` 开头
- 调用参数里显式设置了 `deriveCardano: true`
- `allNetworkGetAddress()` 的 bundle 中包含 `network: 'ada'`

这意味着：

- `deriveCardano` 决定初始化阶段是否派生 Cardano 相关状态
- `usePreInitialize` 决定后续业务调用能否跳过这次初始化
- 两者相关，但不是同一个开关

### 推荐调用方式

```typescript
await HardwareSDK.preInitialize(connectId, {
  passphraseState,
});

const result = await HardwareSDK.evmSignTransaction(connectId, deviceId, {
  path: "m/44'/60'/0'/0/0",
  transaction,
  passphraseState,
  usePreInitialize: true,
});
```

### 常见误区

- `preInitialize()` 成功返回 `true`，**不代表** 下一次业务调用一定会跳过 `Initialize`
- `usePreInitialize` 只对显式 opt-in 的签名类方法生效；地址、公钥类方法不会因为预热而跳过初始化
- `passphraseState` 发生变化时必须重新预热，否则会被安全地降级回正常初始化流程

## 🔌 Ledger 适配层：公共接口、工作流与坑位

### 1) 入口对象和 transport 绑定

`LedgerAdapter` 在构造时绑定一个 connector；运行中不会动态切换 connector。Web 场景通常用 WebHID，React Native 场景通常用 BLE：

```typescript
import { LedgerAdapter } from '@onekeyfe/hwk-ledger-adapter';
import { createLedgerWebHidConnector } from '@onekeyfe/hwk-ledger-connector-webhid';

const hw = new LedgerAdapter(createLedgerWebHidConnector());
```

### 2) 最小接入流程

```typescript
const devices = await hw.searchDevices({ resetSession: true });
const connectId = devices[0]?.connectId;
if (!connectId) throw new Error('No Ledger found');

await hw.connectDevice(connectId);

const response = await hw.allNetworkGetAddress(connectId, '', {
  autoInstallApp: true,
  bundle: [
    {
      network: 'evm',
      methodName: 'evmGetAddress',
      path: "m/44'/60'/0'/0/0",
    },
    {
      network: 'doge',
      methodName: 'btcGetPublicKey',
      path: "m/44'/3'/0'",
    },
  ],
});
```

### 3) `allNetworkGetAddress()` 的真实语义

- 只接受以下方法名：`evmGetAddress`、`btcGetAddress`、`btcGetPublicKey`、`solGetAddress`、`tronGetAddress`
- 每个条目会按链维度缓存 `chainFingerprint`
- 调用方没有传 `deviceId` 时，adapter 会为该链补做一次指纹引导；后续同链条目复用
- BTC fork 网络会在 adapter 内部补齐 Ledger 需要的 `coin` 参数，目前包括 `tbtc`、`bch`、`doge`、`ltc`、`neurai`
- 顶层失败是 fail-fast 的：`DeviceMismatch`、`UserAborted`、`UserRejected` 会直接终止整个 bundle

如果你的上层已经拿到并验证过同链指纹，应优先把它作为公共方法里的 `deviceId` 参数传入，避免把“首次建立信任”和“批量取地址”混在同一次调用里。

### 4) `autoInstallApp` 默认关闭，而且只重试一次

`ICommonCallParams.autoInstallApp` 默认是 `false`。打开后，缺少目标 App 时的流程是：

1. 触发 `UI_REQUEST.REQUEST_INSTALL_APP`
2. 用户确认后调用 `installApp`
3. 安装期间持续发出 `ui-event: app-install-progress`
4. 原始链方法只会重试一次

这样设计有两个边界：

- **未开启 `autoInstallApp`**：保持原始 “App not installed” 失败
- **安装后 App 仍然缺失**：adapter 会触发 loop guard，直接报错，不会二次弹窗进入死循环

### 5) `AppInstallProgress` 事件如何转发

底层 connector 发出的 payload 键是 `sessionId`；`LedgerAdapter` 对外会把它重写成 `connectId`，并按 `connectId + appName` 维度节流：

- 进度差值小于 `5%` 的中间帧会被丢弃
- `progress >= 1` 的最终帧总会保留
- 如果找不到活跃 session 映射，事件会被直接丢弃，而不是把过期 session 暴露给上层

适合把它直接当作 UI 展示事件使用，不适合当作强一致的审计日志。

### 6) 运行时排障建议

- **WebHID 设备刷新后 connectId 变了**：先用 `searchDevices({ resetSession: true })` 清理旧 session，再重新选设备
- **用户拒绝装 App 或设备上拒绝确认**：`allNetworkGetAddress()` 会终止整个 bundle，这是刻意的 fail-fast 行为
- **需要中断当前请求**：调用 `cancel()` 只会中断当前作业队列；如果设备上还有待确认提示，仍然要由用户在设备侧拒绝或等待超时

## 🔧 开发工具

- **Lerna** - Monorepo 管理
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