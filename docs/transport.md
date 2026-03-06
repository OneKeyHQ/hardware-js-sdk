# OneKey Hardware Wallet Transport Layer

## Overview

OneKey Hardware SDK 采用分层架构实现跨平台硬件钱包通信。本文只记录当前源码里可直接验证的传输层行为，重点覆盖：

- WebUSB 设备授权、枚举与包级重试
- Electron BLE 扫描、连接恢复与通知订阅保护
- 调试时最常用的超时、重试与回退路径

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

#### Current behavior and constraints

| Topic | Verified behavior | Code path |
| --- | --- | --- |
| Device authorization | `promptDeviceAccess()` 必须在用户手势里调用；`enumerate()` 只返回浏览器里已经授权过的设备，不会弹权限框。 | `packages/hd-transport-web-device/src/webusb.ts` |
| Device identity | WebUSB 设备会按 `vendorId/productId` 过滤，并要求 `serialNumber` 非空；SDK 直接把 `serialNumber` 作为 `path`。 | `getConnectedDevices()` |
| Initial connect retry | `connect()` 最多尝试 5 次，失败后按 `i * 200ms` 递增等待，然后再次 `open()` / `claimInterface()`。 | `connect()` |
| Packet I/O retry | `transferOut()` / `transferIn()` 对可重试错误最多重试 3 次。重试前会尽力 `releaseInterface()`、`close()`、刷新设备列表，再重新连接。 | `transferOutWithRetry()` / `transferInWithRetry()` / `reconnectForPacketIoRetry()` |
| Retryable errors | 当前按错误消息匹配：`transferOut`、`transferIn`、`usbdevice`、`disconnected`、`device not found`、`action was interrupted`、`networkerror`。 | `isRetryablePacketIoError()` |

> 建议：如果页面能拿到设备但 `enumerate()` 结果为空，优先检查是否已经在点击事件里调用过 `promptDeviceAccess()`，以及设备是否暴露了稳定的 `serialNumber`。

### Electron BLE Transport

Electron 桌面端 BLE 传输的关键逻辑位于 `packages/hd-transport-electron/src/noble-ble-handler.ts`。

#### Current behavior and constraints

| Topic | Verified behavior | Code path |
| --- | --- | --- |
| General scan | 枚举阶段会扫描 `ONEKEY_SERVICE_UUID`，默认扫描窗口为 5 秒，每 500ms 汇总一次发现结果。 | `enumerateDevices()` |
| Name filtering | 常规枚举只保留 `isOnekeyDevice(deviceName)` 命中的设备；但定向扫描会直接按 `deviceId` 匹配，不依赖广播名称。 | `handleDeviceDiscovered()` / `performTargetedScan()` |
| Targeted scan fallback | `connectDevice()` 如果拿不到已发现的设备，会先做一次 1.5 秒的 targeted scan。 | `connectDevice()` / `performTargetedScan()` |
| Connection timeout | BLE 连接阶段默认 3 秒超时。 | `connectDevice()` |
| Service discovery timeout | 服务与特征发现阶段默认 10 秒超时，并监听断连事件；任一条件先发生都会终止本轮发现。 | `discoverServicesAndCharacteristics()` |
| Service discovery retry | 服务发现总共最多 5 次（初次 + 4 次重试），使用 `p-retry`，延迟范围 1s 到 3s。 | `discoverServicesAndCharacteristicsWithRetry()` |
| Last-resort recovery | 常规重试仍失败时，会发起 fresh scan，拿一个新的 `Peripheral` 对象重新连接并再次做服务发现。 | `freshScanAndDiscover()` |
| Disconnect cleanup | 蓝牙状态变为 `poweredOff` 时，会清理已连接设备、发现缓存、订阅状态和包重组状态。 | `setupPersistentStateListener()` |
| Subscription guard | 订阅逻辑会显式跟踪 `subscribing` / `unsubscribing` / `idle`。若退订尚未完成，再次订阅会抛出 `DeviceBusy`，避免竞态。 | `subscribeNotifications()` / `unsubscribeNotifications()` |

#### Windows-specific write behavior

Windows 下如果设备尚未进入已配对状态，写入不是单次 fire-and-forget：

- 最多尝试 15 次写入
- 每次失败后等待 2 秒
- 收到任意通知后会把设备标记为 `paired`
- 若错误命中 `status: 3`，会立即深度清理连接与订阅状态并报错

对应代码见 `attemptWindowsWriteUntilPaired()`。

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

- **会话获取**: 通过 `enumerate()`、`acquire()`、`release()` 管理设备占用
- **状态缓存**: WebUSB 维护 `deviceList`，Electron BLE 维护 discovered/connected/characteristics 等缓存
- **连接复用**: 已建立的传输通道会被后续 `call()` 复用
- **阶段性超时**: 超时配置分散在具体实现里，例如 BLE connect/discovery 和 HTTP `Initialize`
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

### Verified recovery paths

| Scenario | Recovery behavior | Code path |
| --- | --- | --- |
| WebUSB packet read/write transient failure | 关闭当前句柄、刷新设备列表并重新连接，再继续 packet I/O 重试。 | `reconnectForPacketIoRetry()` |
| Electron BLE service discovery failure | 先走 `p-retry`，再回退到 fresh targeted scan + reconnect。 | `discoverServicesAndCharacteristicsWithRetry()` / `freshScanAndDiscover()` |
| Electron BLE unexpected disconnect | 统一清理连接、特征、订阅与包重组状态，并向 renderer 发送断连事件。 | `handleDeviceDisconnect()` |
| Bluetooth powered off | 清理所有连接态缓存并停止扫描，避免后续复用 stale peripheral。 | `setupPersistentStateListener()` |

## Troubleshooting

### WebUSB: `enumerate()` 找不到设备

先检查两件事：

1. 是否在用户点击事件里调用过 `promptDeviceAccess()`
2. 设备是否已经被浏览器授权，并且 `serialNumber` 可读

如果 `transferOut` / `transferIn` 偶发失败，可优先查看包含 `[WebUsbTransport]` 的重试日志，确认是否进入了 reconnect 流程。

### Electron BLE: 设备能扫到但连接后不可用

优先看以下日志阶段是否完整出现：

1. `Targeted scan started`
2. `Connected to device`
3. `Found service`
4. `Characteristic discovery result`
5. `Device ready for communication`

如果流程卡在服务发现，当前实现会先做最多 5 次重试，再自动走一次 fresh scan。

### Electron BLE: 订阅或配对流程偶发卡住

如果日志里出现 `DeviceBusy`，通常表示上一次 `unsubscribe` 还没完成。当前实现不会并发重建订阅，需要等设备重连或退订结束后再重试。

## Performance Optimization

### USB HID Performance

| Metric | Current Implementation |
|--------|----------------------|
| Packet Size | 64 bytes |
| Effective Payload | 63 bytes |
| Protocol Overhead | 1.6% (1 byte per 64) |

### Caching Strategy

- **全局会话缓存**: 防止多实例冲突
- **设备状态缓存**: 避免重复查询features
- **协议消息缓存**: 避免重复配置开销

## Security and Platform Boundaries

传输层主要负责“怎么连设备”和“怎么收发消息”，它的安全边界更多来自宿主平台，而不是单独的一套传输层安全模块：

- **WebUSB permission gate**: 浏览器必须先授权，`enumerate()` 只返回已授权设备
- **BLE platform state**: Electron BLE 会显式处理 `poweredOff`、`unsupported`、`unauthorized` 等状态
- **Session-style access**: 上层通过 `acquire()` / `release()` 控制设备占用

更高层的消息合法性、设备状态校验和业务安全策略，仍由协议层与 SDK 上层逻辑负责。

---

## Summary

当前传输层文档更适合作为“源码对照表”来使用：

- 想确认 WebUSB 为什么看不到设备：看授权与 `serialNumber` 约束
- 想确认 Electron BLE 为什么在连接后失败：看 targeted scan、服务发现重试和 fresh scan 回退
- 想确认为什么订阅不能立即重入：看 `subscriptionOperations` 的状态保护

如果后续传输层继续演进，优先同步更新这些代码路径旁边的操作事实，而不是追加无法从源码验证的通用性表述。
