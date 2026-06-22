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

### Node.js USB Transport (CLI)

```typescript
// packages/hd-transport-usb/src/index.ts
export default class NodeUsbTransport {
  async call(path: string, name: string, data: Record<string, unknown>) {
    // Same protocol as WebUsbTransport, using libusb instead of browser WebUSB API
    const encodeBuffers = buildEncodeBuffers(messages, name, data);

    for (const buffer of encodeBuffers) {
      const packet = new Uint8Array(64);
      packet[0] = 0x3f; // '?' marker
      packet.set(new Uint8Array(buffer), 1);
      await transferOut(openDev.epOut, Buffer.from(packet)); // libusb endpoint
    }

    const resData = await this.receiveData(openDev);
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

### React Native BLE Firmware / OTA Writes

`packages/hd-transport-react-native` 对普通消息和大 payload 的写入路径做了区分。最近这部分的改动主要集中在 `FirmwareUpload` 的 BLE 背压恢复。

#### 哪些消息会走特殊写入路径

| 消息名 | 写入方式 | 目的 |
| --- | --- | --- |
| `EmmcFileWrite` | `transport.writeWithRetry()` | 沿用现有分块重试逻辑 |
| `FirmwareUpload` | `writeWithoutResponse()` + 节流 + 有条件重连 | 减少 OTA 期间的 BLE 队列拥塞 |
| 其他消息 | 普通 63-byte HID 分包写入 | 保持统一协议路径 |

#### `FirmwareUpload` 的节流参数

| 参数 | iOS | Android | 说明 |
| --- | --- | --- | --- |
| `requestMTU` | 256 | 256 | 连接时的首选 MTU；若 MTU 变更失败会回退 |
| 写入聚合容量 | `IOS_PACKET_LENGTH` | `192` bytes | Android 固件上传会使用更大的 packet capacity |
| `FIRMWARE_UPLOAD_WRITE_BURST_SIZE` | 4 | 5 | 每写完一组 burst 主动暂停 |
| `FIRMWARE_UPLOAD_WRITE_PAUSE_MS` | 8ms | 10ms | burst 间隔，给 BLE 队列排空时间 |
| `FIRMWARE_UPLOAD_WRITE_FLUSH_DELAY_MS` | 24ms | 30ms | 本轮分块写完后的 flush 延迟 |
| `FIRMWARE_UPLOAD_WRITE_MAX_RETRIES` | 8 | 8 | 单个 chunk 的最大恢复次数 |

#### 重试与重连策略

- 只有以下错误会进入恢复逻辑：
  - `GATT_CONGESTED` / `status 143`
  - `DeviceDisconnected`
  - `CharacteristicNotFound`
- **拥塞类错误**：按指数退避等待，延迟从 `200ms` 开始，上限 `1200ms`
- **可重连错误**：固定等待 `2000ms`，然后重建 transport、重新发现 characteristic，并重新挂上 notify / disconnect 订阅
- 超过 `8` 次恢复后，错误会直接向上抛出，不再静默重试

#### 为什么只对 `FirmwareUpload` 特判

`FirmwareUpload` 的流量特征和普通 APDU 完全不同：

- chunk 连续、持续时间长
- Android 上更容易触发 BLE 写队列背压
- 断连后不能只依赖普通的 `writeWithoutResponse()` 失败重试，需要把 characteristic 和订阅一起恢复

因此这里没有把策略做成全局默认值，而是只挂在 `name === 'FirmwareUpload'` 的路径上。

#### 排障建议

- **上传中反复出现 `GATT_CONGESTED`**：先观察是否能在 8 次内恢复；这类错误按设计会自动退避，不需要在上层再包一层立即重试
- **上传中途断连**：重点检查 reconnect 之后是否重新拿到了 write / notify characteristic，以及 notify 订阅有没有恢复
- **Android 连接后立刻报 MTU 变更失败**：transport 会把 `connectOptions` 回退为空对象再重连；如果你在上层保存了 transport 状态，不要假设每次连接都成功协商到 MTU 256

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

### Recovery Strategy

- **自动重试**: 指数退避算法
- **连接恢复**: 设备重新枚举和连接
- **会话重建**: 协议状态重新初始化
- **优雅降级**: 功能特性回退

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

当前传输层文档重点覆盖了三类已在源码中稳定存在的约定：

- **统一协议格式**：`[##][Type][Length][Payload]` 与 63-byte HID 分包
- **会话模型**：`enumerate → acquire → configure → call → release`
- **平台特化恢复逻辑**：例如 React Native BLE 在 `FirmwareUpload` 场景下的节流、退避和重连

如果你在排查跨平台差异，建议优先对照具体 transport 实现，而不要假设所有消息路径都共享同一套写入和恢复策略。
