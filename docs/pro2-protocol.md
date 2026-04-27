# OneKey Pro2 Communication Protocol

This document describes the communication protocol used by OneKey Pro2 hardware wallets over WebUSB and BLE transports.

## Overview

Pro2 uses the **Protocol V2** framing protocol, which is different from the **Protocol V1** Trezor-style `##` header protocol used by older OneKey devices (Classic, Mini, Touch, Pro1).

| Feature | Protocol V1 (Pro1/Touch/Mini/Classic) | Protocol V2 (Pro2) |
|---------|-------------------------------|-------------------|
| Framing | `##` header + type + length | SOF `0x5A` + CRC8 |
| Chunking | 64-byte USB HID reports | Up to 2200 bytes per frame |
| Integrity | None (relies on USB) | CRC8 on header and body |
| Multiplexing | Single channel | Multi-channel (USB, UART, Socket) |
| Sequence | None | 1-255 with duplicate detection |

## Protocol V2 Frame Format

```
+----------- Pre-Header (4 bytes) -----------+
|                                             |
|  [SOF] [LEN_L] [LEN_H] [CRC8_HEAD]        |
|                                             |
+----------- Body (variable) ----------------+
|                                             |
|  [CHANNEL] [ATTR] [SEQ] [DATA] [CRC8_BODY] |
|                                             |
+---------------------------------------------+
```

Minimum frame: 8 bytes (no data payload). Maximum frame: 2200 bytes.

### Field Description

| Offset | Field | Size | Description |
|--------|-------|------|-------------|
| 0 | SOF | 1 | Start of frame, always `0x5A` |
| 1-2 | LEN | 2 | Little-endian total length from CHANNEL to CRC8_BODY (inclusive). Minimum 4 (CHANNEL + ATTR + SEQ + CRC8_BODY) |
| 3 | CRC8_HEAD | 1 | CRC8 over bytes [0..2]. Validates pre-header before reading full frame |
| 4 | CHANNEL | 1 | Transport channel ID (see below) |
| 5 | ATTR | 1 | Bitfield: bits [1:0] = packet_type, bits [5:2] = packet_src |
| 6 | SEQ | 1 | Sequence number 1-255. 0 is reserved. Wraps from 255 to 1 |
| 7..N-1 | DATA | 0-2192 | Payload bytes. Length = LEN - 4 |
| N | CRC8_BODY | 1 | CRC8 over bytes [0..N-1] (entire frame except this byte) |

### Channel IDs

| Value | Name | Used By |
|-------|------|---------|
| 0 | USB | WebUSB transport |
| 1 | UART | BLE transport (BLE chip communicates with main MCU via UART) |
| 2 | Socket | Socket transport |

### ATTR Bitfield

| Bits | Field | Values |
|------|-------|--------|
| 1:0 | packet_type | `0` = PACKET (data), `1` = ACK |
| 5:2 | packet_src | `0` = Passthrough, `1` = Command (protobuf), `2` = FIDO, `3` = FindMy, `4` = USB ProtoLink |

### CRC8 Algorithm

- Polynomial: implicit in lookup table
- Initial value: `0x30`
- No final XOR

```typescript
const CRC8_INIT = 0x30;

const CRC8_TABLE = new Uint8Array([
  0x00, 0x5e, 0xbc, 0xe2, 0x61, 0x3f, 0xdd, 0x83,
  0xc2, 0x9c, 0x7e, 0x20, 0xa3, 0xfd, 0x1f, 0x41,
  0x9d, 0xc3, 0x21, 0x7f, 0xfc, 0xa2, 0x40, 0x1e,
  0x5f, 0x01, 0xe3, 0xbd, 0x3e, 0x60, 0x82, 0xdc,
  // ... (full 256-byte table in crc8.ts)
]);

function crc8(data: Uint8Array, length: number): number {
  let crc = CRC8_INIT;
  for (let i = 0; i < length; i++) {
    crc = CRC8_TABLE[crc ^ data[i]];
  }
  return crc;
}
```

## Protobuf Message Encoding

Protocol V2 frames carry protobuf messages. The DATA field contains:

```
[MSG_TYPE_L] [MSG_TYPE_H] [PROTOBUF_PAYLOAD...]
```

- `MSG_TYPE`: 2-byte little-endian message type ID
- `PROTOBUF_PAYLOAD`: protobuf-encoded message bytes

### Message Type IDs

Standard SDK messages (shared with legacy devices):

| Type ID | Message | Direction |
|---------|---------|-----------|
| 0 | Initialize | Host -> Device |
| 2 | GetFeatures | Host -> Device |
| 17 | Features | Device -> Host |
| ... | (same as legacy) | ... |

Pro2 system messages (60000+):

| Type ID | Message | Direction |
|---------|---------|-----------|
| 60206 | Ping | Host -> Device |
| 60207 | Success | Device -> Host |
| 60208 | Failure | Device -> Host |
| 60803 | File | Both |
| 60805 | FileWrite | Host -> Device |

### Schema Selection

Pro2 uses two protobuf schemas:
- **Protocol V1 schema** (`messages.json`): Standard SDK messages (Initialize, GetFeatures, etc.)
- **Protocol V2 schema** (`messages-pro2.json`): System messages with type ID >= 60000

When encoding: look up the message name in the V2 schema first. If not found, fall back to the V1 schema.
When decoding: if `msgType >= 60000` (`PROTOCOL_V2_SYS_MESSAGE_THRESHOLD`), use V2 schema; otherwise use V1 schema.

## WebUSB Transport

### USB Identifiers

| Field | Value |
|-------|-------|
| Vendor ID | OneKey (same as legacy) |
| Product ID | `0x53C1` (Pro2-specific) |
| Interface | 0 |
| Endpoints | Discovered from USB descriptors |

### Data Flow

1. **Send:** Build Protocol V2 frame -> single `transferOut` (no chunking needed, frames fit in one USB transfer)
2. **Receive:** single `transferIn` (up to 4096 bytes) -> parse Protocol V2 frame

Unlike legacy devices (which chunk into 64-byte HID reports), Pro2 sends/receives complete frames in a single USB transfer.

### Device Detection

Pro2 is identified by USB Product ID `0x53C1`. When this PID is detected during `acquire()`, the transport switches from Protocol V1 (`##` header) to Protocol V2 (`0x5A` framing).

## BLE Transport

### GATT Service

Pro2 BLE uses the same GATT service/characteristic UUIDs as Protocol V1 OneKey devices:

| Component | UUID |
|-----------|------|
| Service | `00000001-0000-1000-8000-00805f9b34fb` |
| Write Characteristic | `00000002-0000-1000-8000-00805f9b34fb` |
| Notify Characteristic | `00000003-0000-1000-8000-00805f9b34fb` |

### Data Flow

1. **Send:** Build Protocol V2 frame (with CHANNEL=1 for UART) -> GATT write to write characteristic
2. **Receive:** Subscribe to notify characteristic -> reassemble Protocol V2 frame from notifications -> parse

### BLE-Specific Considerations

- **Channel ID:** BLE uses CHANNEL=1 (UART), because the BLE coprocessor communicates with the main MCU via UART
- **Packet Source:** Command/response data uses `packet_src=1` (FRAME_COMMON_PKT_COMMAND_DATA)
- **MTU:** BLE MTU is negotiated during connection. Default is 23 bytes (BLE 4.0). ATT overhead is 3 bytes, so default payload is 20 bytes. Pro2 typically negotiates higher MTU (e.g., 512 bytes)
- **Frame Reassembly:** A single Protocol V2 frame may arrive across multiple BLE notifications if the frame exceeds the negotiated MTU. The receiver must accumulate notification data until a complete frame (determined by the LEN field) is received

### Device Detection

Pro2 BLE devices can be identified by:
1. Device name (contains "Pro2" or specific prefix)
2. Advertised service UUID matching `00000001-0000-1000-8000-00805f9b34fb`

## File Transfer Protocol

Pro2 supports file operations via protobuf messages over Protocol V2:

### FileWrite

Used to upload files to the device (firmware, resources, etc.).

```protobuf
message File {
  optional string path = 1;      // Device filesystem path (e.g., "vol0:test.bin")
  optional uint32 offset = 2;    // Byte offset in file
  optional uint32 total_size = 3; // Total file size
  optional bytes data = 4;       // Chunk data
  optional uint32 processed_byte = 6; // Bytes processed (in response)
}

message FileWrite {
  optional File file = 1;
  optional bool overwrite = 2;   // true for first chunk
  optional bool append = 3;      // true for subsequent chunks
}
```

### Transfer Flow

1. Split file into chunks (size depends on MTU / transport capacity)
2. First chunk: `overwrite=true, append=false`
3. Subsequent chunks: `overwrite=false, append=false`, incrementing `offset`
4. Each chunk gets an ACK response (Success or File with `processed_byte`)
5. If response is `Failure`, abort transfer

### Chunk Size Calculation

For BLE:
```
max_chunk = min(negotiated_mtu - 3, 244)  // ATT overhead = 3 bytes
```

For USB:
```
max_chunk = 2048  // Protocol V2 frames can be up to 2200 bytes
```

## Ping Protocol

Simple heartbeat/connectivity test:

```protobuf
message Ping {
  optional string message = 1;
}
```

1. Host sends Ping (msgType=60206) with optional message
2. Device responds with Success (msgType=60207) echoing the message, or Failure (msgType=60208)

## Reliability

Protocol V2 provides several reliability mechanisms:

- **CRC8 validation:** Header CRC and body CRC detect corruption
- **Sequence numbers:** 1-255, wraps from 255 to 1 (0 is reserved)
- **Duplicate detection:** Receiver maintains a ring buffer of recent SEQ values (20 entries, 600ms expiry)
- **ACK-based:** When configured, receiver sends ACK frame for each PACKET
- **Retransmission:** When configured, sender caches outgoing frames and retransmits if no ACK within 300ms

## SDK Implementation

### Transport Classes

| Transport | Class | Protocol | Target |
|-----------|-------|----------|--------|
| WebUSB (Pro1 / Touch / Mini / Classic) | `WebUsbTransport` | V1 (`##` header) | Browser |
| WebUSB (Pro2) | `WebUsbTransport` | V2 (`0x5A` framing) | Browser |
| BLE (Pro1 / Touch) | `ElectronBleTransport` | V1 (`##` header) | Electron |
| BLE (Pro2) | `ElectronPro2BleTransport` | V2 (`0x5A` framing) | Electron |

### Code References

- Protocol V2 encode/decode: `packages/hd-transport/src/serialization/protocol-v2/`
- Pro2 protobuf definitions: `packages/hd-transport/messages-pro2.json`
- WebUSB transport: `packages/hd-transport-web-device/src/webusb.ts`
- BLE Pro2 transport: `packages/hd-transport-web-device/src/electron-pro2-ble-transport.ts`
- BLE legacy transport: `packages/hd-transport-web-device/src/electron-ble-transport.ts`
- Noble BLE handler: `packages/hd-transport-electron/src/noble-ble-handler.ts`
- Protocol V2 spec: `firmware-pro2/sys/frame_codec/proto_link/proto_link.md`
