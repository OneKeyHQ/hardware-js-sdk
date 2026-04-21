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

OneKey传输层通过分层架构、协议设计和错误恢复机制，成功解决了跨平台硬件钱包通信的复杂性：

**核心特性:**
- **协议设计**: 统一的消息格式和分包机制
- **会话管理**: 安全隔离的设备会话和自动清理
- **错误恢复**: 智能重试和指数退避机制
- **安全保护**: 全面防护常见攻击向量

**性能指标:**
- **延迟**: 典型操作亚秒级响应
- **可靠性**: 高成功率和自动错误恢复
- **兼容性**: 支持所有OneKey设备型号和固件版本
- **稳定性**: 成熟的协议栈和传输机制
