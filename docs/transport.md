# OneKey Hardware Wallet Transport Layer

## 两句话总结

- **Protocol V1**（Pro1 / Mini / Touch / Classic）：USB 每包 64 字节，分包传输，连接后必须先发 `Initialize` 握手。
- **Protocol V2**（Pro2）：USB 单帧最大 2048 字节，无需握手，直接调用系统级 API（文件系统、固件更新）。

---

## 核心差异速查

| | Protocol V1 | Protocol V2 (Pro2) |
|---|---|---|
| SOF 字节 | `0x3F` (`?`) | `0x5A` |
| 单次传输上限 | **64 bytes**（固定分包） | **2048 bytes**（单帧） |
| MessageID 字节序 | Big-endian | **Little-endian** |
| 消息 ID 范围 | 1–999（Trezor 标准） | **60000–61199**（Pro2 专属） |
| Protobuf schema | `messages.json` | `messages-pro2.json` |
| 连接握手 | **必须** Initialize → Features | **无**，直接操作 |
| 会话 ID | 有 `session_id` | 无 |
| 帧校验 | 无 CRC | **CRC8**（init=0x30，覆盖 header + frame） |
| 设备能力 | 钱包：签名、地址派生 | 系统：文件系统、固件更新 |

---

## 帧格式对比

### Protocol V1 — 固定 64 字节分包

```
每个 USB 包（64 bytes）:
┌──────┬──────────────────────────────────────────┐
│ 0x3F │           Payload (63 bytes)              │
└──────┴──────────────────────────────────────────┘
  SOF

第一包的 Payload 头部（消息起始帧）:
┌──────────┬────────────┬────────────┬────────────────────┐
│ 0x23 0x23│  Type 2B   │  Length 4B │  Protobuf bytes... │
└──────────┴────────────┴────────────┴────────────────────┘
   "##"     Big-endian   Big-endian
```

消息过长时拆成多个 64 字节包串行发送，每包首字节都是 `0x3F`。

**Big-endian 示例**：`GetFeatures (msgType=55)` → `[0x00][0x37]`

---

### Protocol V2 — 单帧最大 2048 字节

```
Protocol V2 Frame（最大 2048 bytes）:
┌──────┬──────┬──────┬───────────┬────────┬──────┬─────┬──────────┬──────────┬──────────┬─────┐
│ 0x5A │ LenL │ LenH │ HeaderCRC │ Router │ Attr │ Seq │ MsgTypeL │ MsgTypeH │ PB Data  │ CRC │
└──────┴──────┴──────┴───────────┴────────┴──────┴─────┴──────────┴──────────┴──────────┴─────┘
   1B     1B    1B        1B        1B      1B    1B       1B          1B        N bytes    1B

HeaderCRC = CRC8(bytes[0..3])   ← 校验 SOF+Len+Len
FrameCRC  = CRC8(整个 frame)    ← 追加在末尾
MsgType   = Little-endian uint16
```

**Little-endian 示例**：`FileRead (msgType=60804=0xEDC4)` → `[0xC4][0xED]`

---

## 连接与初始化流程

### Protocol V1：必须握手

```
enumerate() → acquire() → Initialize → Features
                                ↓
                  TransportManager.reconfigure(features)
                  （根据固件版本选择 messages schema）
                                ↓
                         设备就绪，执行钱包操作
```

`Initialize` 返回的 `Features` 包含 `session_id`、`device_id`、`firmware_version` 等，
SDK 依赖这些信息选择正确的 protobuf schema。

---

### Protocol V2（Pro2）：跳过握手

```
enumerate() → acquire()
                  ↓
           detectProtocol(path)
           按 USB Product ID 识别：
             PID 0x53C1 (PID_PRO2) → V2
             其他 PID                → V1
                  ↓
           originalDescriptor.protocolType = 'V2'  ← 写回设备描述符
                  ↓
           initialize() 检测到 V2，跳过 Initialize
                  ↓
           _initializePro2()
           合成 Features { vendor, onekey_device_type: Pro2 }
           TransportManager.reconfigure(undefined, 'V2')
           加载 messages-pro2.json
                  ↓
           设备就绪，直接调用 pro2* 系方法
```

Pro2 **不支持** `Initialize` 消息。发送它会收到 `Failure_UnexpectedMessage`。

> **关键实现细节**：`detectProtocol()` 在 `acquire()` 内部按 PID 立即判定，结果写入
> `WebUsbTransport.deviceProtocol: Map<path, ProtocolType>`。
> `acquire()` 完成后立即将结果同步到 `device.originalDescriptor.protocolType`，
> 这样 `initialize()` 才能正确判断分支。
>
> BLE 路径不需要探测：Pro2 BLE 走独立的 `ElectronPro2BleTransport` 类，
> `getProtocolType()` 直接返回 `'V2'`。

---

## 协议自动检测

```typescript
// packages/hd-transport-web-device/src/webusb.ts
private detectProtocol(path: string): ProtocolType {
  const deviceInfo = this.deviceList.find(d => d.path === path);
  const protocol: ProtocolType =
    deviceInfo?.device.productId === PID_PRO2 ? 'V2' : 'V1';
  this.deviceProtocol.set(path, protocol);
  return protocol;
}

getProtocolType(path: string): ProtocolType {
  return this.deviceProtocol.get(path) ?? 'V1';
}
```

`call()` 根据检测结果自动分支：
- `V2` → `callProtocolV2()`，使用 `messages-pro2.json`
- `V1` → 原有路径，使用 `messages.json`

---

## Schema 选择（callProtocolV2 内部）

V2 帧内同时可能包含 V2 消息和 V1 消息（如未来扩展），选择规则：

```
编码（发送）:
  messagesV2.lookupType(name) 成功     → 用 V2 schema
  失败（name 只在 V1 schema 中）       → 回退 V1 messages schema

解码（接收）:
  rxMsgType >= 60000  → V2 schema (PROTOCOL_V2_SYS_MESSAGE_THRESHOLD)
  rxMsgType <  60000  → V1 schema
```

---

## Pro2 消息 ID 表

| 消息名 | ID | 方向 | 说明 |
|---|---|---|---|
| Ping | 60206 | 请求 | 连接测试 |
| Success | 60207 | 响应 | 操作成功 |
| Failure | 60208 | 响应 | 操作失败，含错误码 |
| Reboot | 60400 | 请求 | 重启设备 |
| FixPermission | 60800 | 请求 | 修复文件系统权限 |
| PathInfo | 60801 | 响应 | 文件/目录元数据 |
| PathInfoQuery | 60802 | 请求 | 查询文件/目录元数据 |
| File | 60803 | 响应 | 文件数据块 |
| FileRead | 60804 | 请求 | 读取文件 |
| FileWrite | 60805 | 请求 | 写入文件 |
| FileDelete | 60806 | 请求 | 删除文件 |
| Dir | 60807 | 响应 | 目录列表 |
| DirList | 60808 | 请求 | 列目录 |
| DirMake | 60809 | 请求 | 创建目录 |
| DirRemove | 60810 | 请求 | 删除目录 |
| FirmwareUpdate | 61000 | 请求 | 触发固件更新 |
| FirmwareInstallProgress | 61001 | 响应 | 固件安装进度 |

---

## Pro2 SDK API

```typescript
import HardwareSDK from '@onekeyfe/hd-web-sdk';

// 文件操作 (Pro2-only)
await HardwareSDK.dirList(connectId, { path: '/' });
await HardwareSDK.pathInfo(connectId, { path: '/res/icon.png' });
await HardwareSDK.fileRead(connectId, { path: '/res/icon.png', offset: 0, totalSize: 0 });
await HardwareSDK.fileWrite(connectId, {
  path: '/tmp/test.txt',
  offset: 0,
  totalSize: 5,
  data: new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]),
});
await HardwareSDK.fileDelete(connectId, { path: '/tmp/test.txt' });
await HardwareSDK.dirMake(connectId, { path: '/tmp/mydir' });
await HardwareSDK.dirRemove(connectId, { path: '/tmp/mydir' });

// 设备管理 (使用通用 API，内部自动分发到 Protocol V2)
await HardwareSDK.deviceRebootToBootloader(connectId);
await HardwareSDK.deviceRebootToBoardloader(connectId);
```

---

## CRC8 算法

```typescript
// poly = 0x07（CRC-8/SMBUS 变体），init = 0x30
function crc8(data: Uint8Array, init = 0x30): number {
  let crc = init;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? (crc << 1) ^ 0x07 : crc << 1;
      crc &= 0xff;
    }
  }
  return crc;
}
```

两处用到：
1. **HeaderCRC**：对 `[SOF, LenL, LenH]` 前 3 字节计算，结果填入第 4 字节
2. **FrameCRC**：对整帧（含 header + payload）计算，追加在末尾

---

## Protobuf Schema 来源

| 文件 | 来源 | 生成方式 |
|---|---|---|
| `packages/hd-transport/messages.json` | `submodules/firmware/common/protob/*.proto` | `yarn update-protobuf` |
| `packages/hd-transport/messages-pro2.json` | `submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy/` | `yarn update-protobuf`（Pro2 分支） |
| `packages/core/src/data/messages/messages.json` | 同上，core 副本 | 同步生成 |
| `packages/core/src/data/messages/messages-pro2.json` | 同上，core 副本 | 同步生成 |

**Pro2 schema 特殊处理**：
- `messages_emmc.proto` 中消息名带 `Emmc` 前缀（如 `EmmcFileRead`），构建脚本用 `sed` 去除前缀
- `Success`/`Failure` 来自 `messages_common.proto`（不在 management proto 中）
- `Reboot` 是 Protocol V2 专属，无对应 proto 源文件，在脚本中手动追加
- `FailureType` 的限定名（`hw.trezor.messages.common.FailureType`）需 `sed` 去除命名空间，否则 pbjs 静默丢弃

---

## 架构层次

```
Application (DApps)
    ↓
SDK Interface (@onekeyfe/hd-core)
    ↓  Device.run() → acquire() → initialize()
Transport Abstraction (@onekeyfe/hd-transport)
    ↓  call() 自动分支
WebUSB Transport (@onekeyfe/hd-transport-web-device)
    ├── Protocol V1 path → buildEncodeBuffers() → 64B 分包 → receiveOne()
    └── Protocol V2 path → buildPbFrame() → 单帧 → parseProtoV2Frame()
    ↓
Hardware Device
    ├── Pro1 / Mini / Touch / Classic  (V1)
    └── Pro2                           (V2)
```
