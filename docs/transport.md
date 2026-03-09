# OneKey Hardware Wallet Transport Layer

## Overview

OneKey Hardware SDK采用分层架构设计，实现跨平台硬件钱包通信。

## Architecture

```
Application Layer (DApps)
    ↓
SDK Interface (@onekeyfe/hd-core)
    ↓
Transport Abstraction (@onekeyfe/hd-transport)
    ↓
Platform Adapters (WebUSB/BLE/HTTP)
    ↓
Hardware Devices
```

## Core Components

### Transport Interface

```typescript
// packages/hd-transport/src/types/transport.ts
export type Transport = {
  enumerate(): Promise<Array<OneKeyDeviceInfo>>;
  acquire(input: AcquireInput): Promise<string>;
  release(session: string, onclose: boolean): Promise<void>;
  configure(signedData: JSON | string): Promise<void>;
  call(session: string, name: string, data: Record<string, any>): Promise<MessageFromOneKey>;
  // ... other methods
};
```

### Protocol Constants

```typescript
// packages/hd-transport/src/constants.ts
export const MESSAGE_TOP_CHAR = 0x003f;        // '?' chunk marker
export const MESSAGE_HEADER_BYTE = 0x23;       // '#' protocol header
export const HEADER_SIZE = 8;                  // Protocol header size
export const BUFFER_SIZE = 63;                 // Data per chunk
```

## Message Protocol

### Protocol Frame Structure

```
[Header: 2B][Type: 2B][Length: 4B][Protobuf Payload: Variable]
[0x23 0x23] [uint16]  [uint32]    [Binary Data]
```

### USB HID Chunking

**Standard Packet Format (64 bytes):**
```
┌─┬─────────────────────────────────────────────────────────────┐
│?│                    Payload Data                             │
│ │                    (63 bytes)                               │
└─┴─────────────────────────────────────────────────────────────┘
 1 byte                    63 bytes
```

**Key Implementation:**

```typescript
// packages/hd-transport/src/serialization/send.ts
export const buildBuffers = (messages: Root, name: string, data: Record<string, unknown>) => {
  const encodeBuffers = buildEncodeBuffers(messages, name, data);
  const outBuffers: ByteBuffer[] = [];

  for (const buf of encodeBuffers) {
    const chunkBuffer = new ByteBuffer(64);
    chunkBuffer.writeByte(MESSAGE_TOP_CHAR); // '?' marker
    chunkBuffer.append(buf); // 63 bytes data
    chunkBuffer.reset();
    outBuffers.push(chunkBuffer);
  }

  return outBuffers;
};
```

## Transport Implementations

### HTTP Bridge Transport

```typescript
// packages/hd-transport-http/src/index.ts
export default class HttpTransport {
  async call(session: string, name: string, data: Record<string, unknown>) {
    const messages = this._messages;
    const o = buildOne(messages, name, data);
    const outData = o.toString('hex');

    const resData = await this._post({
      url: `/call/${session}`,
      body: outData,
      timeout: name === 'Initialize' ? 10000 : undefined,
    });

    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }
}
```

### WebUSB Transport

```typescript
// packages/hd-transport-web-device/src/webusb.ts
export default class WebUsbTransport {
  async call(session: string, name: string, data: Record<string, unknown>) {
    // Send standard packets (64 bytes)
    const encodeBuffers = buildEncodeBuffers(messages, name, data);

    for (const buffer of encodeBuffers) {
      const newArray = new Uint8Array(64);
      newArray[0] = 63; // '?' marker
      newArray.set(new Uint8Array(buffer), 1);
      await device.transferOut(this.endpointId, newArray);
    }

    // Receive response
    const resData = await this.receiveData(path);
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }
}
```

## Session Management

### Session Lifecycle

```
1. enumerate() → 发现设备
2. acquire() → 获取会话
3. configure() → 配置协议
4. call() → 执行方法
5. release() → 释放会话
```

### Key Features

- **独占访问**: 防止多应用冲突
- **状态缓存**: 避免重复查询设备特性
- **会话保持**: 批量操作复用连接
- **自动超时**: 防止会话泄露
## Communication Flow

### Message Processing Pipeline

```
1. Protobuf Serialization → Binary Data
2. Protocol Framing → [##][Type][Length][Payload]
3. Chunking → 63-byte chunks with '?' markers
4. USB Transfer → Hardware device (64-byte packets)
5. Response Reception → 64-byte packets
6. Reassembly → Complete message
7. Protobuf Deserialization → Business object
```

### Core Serialization

```typescript
// packages/hd-transport/src/serialization/send.ts
export function buildOne(messages: Root, name: string, data: Record<string, unknown>) {
  const { Message, messageType } = createMessageFromName(messages, name);
  const buffer = encodeProtobuf(Message, data);
  return encodeProtocol(buffer, {
    addTrezorHeaders: false,
    chunked: false,
    messageType,
  });
}

// packages/hd-transport/src/serialization/receive.ts
export function receiveOne(messages: Root, data: string) {
  const bytebuffer = ByteBuffer.wrap(data, 'hex');
  const { typeId, buffer } = decodeProtocol.decode(bytebuffer);
  const { Message, messageName } = createMessageFromType(messages, typeId);
  const message = decodeProtobuf.decode(Message, buffer);
  return { message, type: messageName };
}
```

## Error Handling

### Error Types

- **Connection Errors**: USB断开、BLE信号弱
- **Protocol Errors**: 消息格式错误、校验失败
- **Device Errors**: 设备拒绝、用户取消
- **Timeout Errors**: 响应超时

### Verified Recovery Behavior

下表仅记录当前源码中可以直接验证的恢复逻辑，避免把不同传输层的行为混成一个“统一重试策略”。

| Scenario | Code Path | Verified Behavior | App-side Impact |
|--------|-----------|-------------------|-----------------|
| WebUSB 首次连接/重连 | `packages/hd-transport-web-device/src/webusb.ts` | `connect()` 最多尝试 5 次；每次失败后等待 `i * 200ms` 再重试。 | 短暂枚举抖动通常可被 SDK 自行吸收，无需立即弹错。 |
| WebUSB 包级 I/O 恢复 | `packages/hd-transport-web-device/src/webusb.ts` | `transferOutWithRetry()` / `transferInWithRetry()` 每个数据包最多尝试 3 次；仅在 `transferOut` / `transferIn` / `usbdevice` / `disconnected` / `device not found` / `action was interrupted` / `networkerror` 等错误文本出现时重试。重试前会释放接口、关闭设备、刷新设备列表并重新连接，等待 `attempt * 300ms`。 | 对短时断连、设备重新枚举、浏览器 WebUSB 状态抖动更稳健；未知错误仍会快速失败。 |
| 设备发现轮询 | `packages/core/src/core/index.ts` | `ensureConnected()` 默认使用 `retryCount=5`、`pollIntervalTime=1000ms`、`timeout=10000ms`；下一轮轮询会把间隔扩大为上一轮的 `1.5x`。 | 公共 API 可通过这 3 个参数调优发现窗口，适合 BLE 或慢设备恢复场景。 |
| Browser WebUSB 权限提示 | `packages/core/src/core/index.ts` | 浏览器 WebUSB 轮询超过上限后，如果 `skipWebDevicePrompt !== true`，SDK 会发送 `WEB_DEVICE_PROMPT_ACCESS_PERMISSION`，并返回 `WebDeviceNotFoundOrNeedsPermission`。 | 应用层要在这里提示用户重新授权，而不是只提示“设备不存在”。 |
| BLE 连接超时恢复 | `packages/core/src/core/index.ts` | `connectDeviceForBle()` 在遇到 `BleTimeoutError` 时，会等待 3 秒后继续重试，最多额外重试 6 次。 | BLE 首连或链路抖动时，建议 UI 先展示“连接中”，不要过早让用户重复点击。 |
| React Native BLE 写入恢复 | `packages/hd-transport-react-native/src/BleTransport.ts` | `writeWithRetry()` 默认最多额外重试 5 次，每次间隔 2 秒；遇到 `DeviceDisconnected` 或 `CharacteristicNotFound` 时，会先 `connect()` 再 `discoverAllServicesAndCharacteristics()`。 | 该路径主要用于固件相关写入；若最终仍失败，再提示用户检查蓝牙与距离。 |
| Electron BLE 服务发现恢复 | `packages/hd-transport-electron/src/noble-ble-handler.ts` | `discoverServicesAndCharacteristicsWithRetry()` 使用 `p-retry` 做 5 次总尝试，退避从 1000ms 开始，按 `1.5x` 增长，最大 3000ms；全部失败后会回退到 fresh scan。 | 桌面端 BLE 首连失败不一定意味着设备丢失，可能只是 GATT 服务尚未稳定。 |
| Electron BLE Windows 写入恢复 | `packages/hd-transport-electron/src/noble-ble-handler.ts` + `packages/hd-transport-electron/src/ble-ops.ts` | Windows 未配对路径下，`attemptWindowsWriteUntilPaired()` 最多写入 15 次，每次观察窗口 2000ms；若未收到通知，会尝试 `softRefreshSubscription()`。命中可中止错误模式时，会立即取消订阅、断开连接并清理状态。 | Windows BLE 需要比 WebUSB 更长的恢复窗口；UI 应允许更长的“等待设备响应”时间。 |
| 固件升级后的恢复轮询 | `packages/core/src/api/FirmwareUpdateV3.ts` | 升级后轮询 `GetFeatures`，单次超时 3000ms；连续 3 次 `GetFeatures timeout` 仍未恢复时，才进入设备重连，避免过早触发 WebUSB 再授权。常规重连窗口 1 分钟；BLE 固件相关重连窗口 3 分钟；整体安装上限 5 分钟。 | 固件升级后的“短暂无响应”是预期内行为，应用层应展示等待/进度，而不是立刻判定失败。 |

### Public Tuning Knobs

当前公开给业务层的连接调优参数主要在 `ensureConnected()` 路径生效：

| Param | Default | Effect |
|--------|---------|--------|
| `retryCount` | `5` | 控制发现轮询的重试窗口。 |
| `pollIntervalTime` | `1000ms` | 控制第一轮与后续轮询的基准间隔。 |
| `timeout` | `10000ms` | 控制单次轮询等待上限。 |
| `skipWebDevicePrompt` | `false` | 在 Browser WebUSB 下，超过轮询上限后是否跳过授权提示。 |

> 注意：仓库里的“重试次数”并不都是同一种语义。  
> 例如，WebUSB `connect()` 的 `5` 表示总尝试次数，而 BLE 某些路径的 `5` / `6` 表示“首次失败后的额外重试次数”。如果你要对外暴露这些参数，应该按具体传输层验证，不要假设所有环境都共享同一套计数规则。

### App-side Troubleshooting Runbook

可以把恢复责任拆成两类：

1. **SDK 可静默处理**
   - WebUSB 短时 `transferIn` / `transferOut` 失败
   - BLE 连接超时后的短时重试
   - Electron BLE 服务发现失败后的重试与 fresh scan
   - 固件升级后短时 `GetFeatures timeout`

2. **需要应用层明确提示用户**
   - Browser WebUSB 触发 `WEB_DEVICE_PROMPT_ACCESS_PERMISSION`
   - BLE 相关权限、定位、蓝牙开关、设备距离问题
   - 同一设备被其他应用占用或系统层连接状态异常
   - 固件升级后进入较长重连窗口（尤其是 BLE 固件一并升级时）

建议的提示顺序：

- **WebUSB**: 先提示“请重新授权设备”，再提示关闭其他占用该设备的页面或桌面应用。
- **BLE**: 先检查蓝牙/定位权限与系统开关，再提示用户靠近设备并保持设备处于可连接状态。
- **Firmware Update**: 在 1~3 分钟重连窗口内持续展示“设备正在重启/重连”，不要过早要求用户重复开始升级。

## Operational Notes

### USB HID Characteristics

| Metric | Current Implementation |
|--------|----------------------|
| Packet Size | 64 bytes |
| Effective Payload | 63 bytes |
| Protocol Overhead | 1.6% (1 byte per 64) |

### Session and State Handling

- **全局会话缓存**: 防止多实例冲突
- **设备状态缓存**: 避免重复查询 features
- **协议消息缓存**: 避免重复配置开销
- **未知错误快速失败**: 只有被显式识别的错误才会走自动恢复流程

## Security

### Session Security
- 加密安全的会话ID生成
- 会话超时自动清理
- 独占访问控制

### Data Protection
- 敏感数据日志过滤
- 内存数据自动清理
- 协议完整性验证

---

## Summary

OneKey 传输层的稳定性来自“分层恢复”，而不是单一的全局重试器：

**核心特性:**
- **协议设计**: 统一的消息格式和分包机制
- **会话管理**: 安全隔离的设备会话和自动清理
- **错误恢复**: 按传输类型分别处理连接、包级 I/O、服务发现和固件升级后的重连
- **安全保护**: 会话隔离、接口释放和状态清理

对集成方来说，最重要的不是记住所有内部细节，而是区分：

- 哪些异常会由 SDK 自动恢复
- 哪些异常需要应用层提示用户重新授权、重新连接或等待设备完成重启
- 哪些参数只影响设备发现轮询，而不会覆盖每个传输实现自己的恢复逻辑
