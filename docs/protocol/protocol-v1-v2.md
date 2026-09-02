# Protocol V1/V2 Transport Protocol

This document is the single maintained entry point for the SDK transport protocol. It covers protocol detection, schemas, frame format, Link lifecycle, and USB/BLE platform boundaries. How business fields map to the public API is out of scope; see [SDK Core Runtime](../sdk/core-runtime.md).

## Layers and Responsibilities

```text
Core / DeviceCommands
  -> Protocol Session: message encode/decode, frames, sequence numbers, timeouts, call serialization
  -> Transport adapter: connection, native read/write, subscription, platform error mapping
  -> USB / BLE
  -> Hardware
```

The transport layer's responsibility ends at: identifying the device protocol, establishing a usable Link, sending one encoded request, and returning the corresponding response. Features mapping, wallet Session, settings, file upload, and firmware-upgrade orchestration are Core's responsibility.

## Core Differences Between V1 and V2

| Dimension | Protocol V1 | Protocol V2 |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Current devices | Classic, Mini, Touch, Pro, and others | Currently Pro2; may later extend to Pro and other models |
| Initialization | `Initialize -> Features` | Probe with `Ping`, then read `DeviceInfo` and `ProtocolInfo`; only the application reads `DeviceStatus` according to capability |
| Message numbering | protobuf message type | `MessageType`, grouped by system module |
| Frame | V1 packetization format | `0x5A` header, length, sequence number, CRC8 |
| Schema | Can switch by firmware version | Independent `messages-protocol-v2.json` |
| Call model | Existing Transport call chain | Per-device Link, serial queue, continuously incrementing sequence |
| Failure recovery | Follows V1 Transport semantics | link-fatal invalidates the Link; does not automatically replay business commands |

Distinguishing V1 from V2 must be based on the device response after connection; it cannot rely only on PID, device name, or USB descriptor.

Protocol V2's `ProtocolInfoRequest` serves both runtime-phase queries and eventless wallet session policy negotiation.
Core always sends `eventless_wallet_session=true`, and the same active Link negotiates only on first use; concurrent first reads are merged
into a single request, and negotiation happens again after disconnect/reboot/wipe. Firmware treats repeated `true` requests as idempotent, so querying capabilities does
not accidentally clear the wallet Session.

## Automatic Protocol Detection

Transport performs protocol detection after `acquire()` completes the physical connection:

1. Search and first connection do not pass `connectProtocol`; the protocol is confirmed by the live response. Explicit
   `forceProtocolDetection=true` likewise bypasses an already-bound protocol.
2. On first detection with no internal hint, V1 `Initialize` is verified first by default; an unconfirmed hint can only change the probe order for this attempt.
3. After a WebUSB V1 probe fails, the connection must be closed and reopened before the V2 probe, so an uncancelled
   `transferIn` does not consume the V2 response.
4. If both fail, clean up this connection's resources. WebUSB public calls return `DeviceNotFound`; the specific probe
   failure reasons are kept only in Transport debug logs.

Protocol-selection inputs have two semantics; neither can replace live-response verification:

- `connectProtocol` on a public request maps to a strict `expectedProtocol`. It is for cases where the caller truly requires a specific protocol;
  silent fallback is not allowed.
- Unconfirmed Transport-internal cache can only serve as a non-strict `protocolHint`. It only changes the first probe order; after failure the other protocol
  must be tried. Device name, PID, or USB descriptor cannot produce a protocol conclusion.
- After the live response confirms the protocol, Core records it on the device descriptor. Subsequent acquire uses this confirmed value as a strict
  `expectedProtocol` and no longer switches protocol silently.
- The App can restore a persisted result via `setDeviceConnectProtocol(connectId, protocol)`. Binding is isolated per endpoint;
  all subsequent public SDK calls inject it automatically. The App binds USB/BLE connectIds of the same physical device separately.

Strict-expectation verification rules:

- `connectProtocol='V1'`: a valid V1 response must be received.
- `connectProtocol='V2'`: a valid V2 `Ping` response must be received; PID, device name, or unconfirmed cache must not be trusted alone.
- The only exception is the same BLE endpoint that has already been confirmed as V2 by a live response, during
  install-polling reconnect after `DeviceFirmwareUpdateRequest` caused an expected disconnect. Some loaders do not respond to a generic
  `Ping` during install; Transport then only restores the already-confirmed V2 route, and Core must immediately send the idempotent
  `DeviceFirmwareUpdateStatusGet`. Only a valid response to that request proves the new link is usable. This exception must not be used for ordinary reconnect, first connection,
  identity judgment, or other business requests.

The V2 probe uses `Ping { message: 'protocol-v2-probe' }`. The probe message is only for confirming the link; it is not equivalent to querying protocol version or device information.

The public device object also uses the `connectProtocol` field as output, but the output semantics are the protocol already confirmed by live detection on the current connection,
not the original request value. Core method capability checks only read this confirmed result. Device model comes independently from V1 `Features` or V2
`DeviceInfo.hw.Device_type`; for example, a future Pro that returns V2 should still be identified as Pro, not rewritten as Pro2 because the protocol is V2.

Ordinary disconnect/reconnect does not clear the confirmed protocol. Only when the caller explicitly requests re-detection, or device identity is cleared,
is it allowed to return to the unbound detection path.

Primary implementations:

- `packages/hd-transport/src/protocols/v2/session.ts`
- Each Transport's `detectProtocol()` / `acquire()`
- `packages/core/src/device/Device.ts`

## Schema and Message Classification

`TransportManager` loads both:

- V1 default schema: `packages/hd-transport/messages.json`
- V2 schema: `packages/hd-transport/messages-protocol-v2.json`

V1 may switch a compatible schema after `Initialize` based on Features and firmware version. V2 does not use the traditional `GetFeatures`; its schema routing stays separate from V1 version-compatibility logic.

V2 message numbers follow firmware-pro2's `MessageType` definitions and are grouped by system capability, for example device info, device status, Session, settings, filesystem, and firmware update. The update order when adding a message is:

1. Modify the firmware-pro2 protobuf source.
2. Run `yarn update-protobuf` to update the schema and generated types.
3. Wire the message into `DeviceCommands` or a Core method.
4. If the message changes a public capability, then update the SDK docs.

Do not duplicate every business field in the transport protocol docs; field ownership is in [Pro2 Field Migration](../sdk/pro2-field-migration.md).

## Protocol V2 Frame Format

V2 frames carry protobuf payloads. When maintaining them, focus on these fields:

| Field | Role |
| -------------- | ---------------------------------------------------- |
| magic | Fixed frame identifier `0x5A` |
| message type | Message number of the request or response |
| payload length | Length of the protobuf payload |
| sequence | Per-send-direction independent global frame sequence that increments across channel/source |
| payload | Protobuf encoding result |
| CRC8 | Frame integrity check |

Encoding, decoding, and length checks must use the same shared implementation. BLE notifications or USB reads may return a partial frame, multiple frames, or data from an old connection, so native read results must not be passed directly to protobuf decoding.

The SDK upper bound for a complete V2 frame matches the firmware Proto Link runtime and is fixed at **4200 bytes**,
including the frame header, protobuf message type, payload, and CRC. Business fragmentation must reserve protobuf
overhead before encoding; file chunk size must not be treated as the frame limit.

Primary implementations:

- `packages/hd-transport/src/protocols/v2/encode.ts`
- `packages/hd-transport/src/protocols/v2/decode.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`

## Link, Sequence, and Call Queue

Each Transport instance holds one `ProtocolV2LinkManager`:

- Links are isolated by device key.
- V2 calls on the same device execute serially.
- Session, frame assembler, and platform adapter are reused within the active Link.
- The lifetime of `ProtocolV2SequenceCursor` is longer than one connection; ordinary disconnect and reconnect do not reset sequence to 1.
- Cursor, queue, and all Links are cleared only on Transport `dispose`.
- An ACK sequence must echo this request's sequence. Device business responses use the firmware global send sequence,
  which other channel/source traffic may occupy. The SDK must allow legitimate gaps, but must reject consecutive identical
  business-response sequence numbers on the current Link. It must not forcibly compare business-response sequence with request sequence.
- A single finite watchdog covers `prepareCall`, complete frame write, and response read. When the call does not specify one,
  the shared 5-minute default is used. The timeout signal must be passed to the platform adapter so work of the current generation can be cancelled.
- ACK and business response share the same call timeout; there is no separate delivery watchdog. Not receiving an ACK within 5 seconds
  must not be treated as link failure, because the device may be waiting for user input normally.
- Session does not automatically resend requests. Retries of side-effecting requests such as file write, settings, and firmware install can only be decided by Core flows
  that understand business idempotency.

Link-fatal errors include response timeout, disconnect, I/O, generation invalidation, and frame errors. After they occur, first invalidate the Link,
then cancel reads, clear the assembler, close the platform connection, and clean protocol cache.

protobuf `Failure` is a device business response and does not invalidate the Link by default. Transport also must not automatically resend business
commands, because file write, settings, and firmware install may already have produced side effects on the device.

## Generation and Isolation of Stale Async Results

Generation must be rotated after USB open, claim, reset, or reconnect. When BLE resubscribes to notifications, old subscription callbacks must also be isolated.

Any async read must confirm it still belongs to the current generation when it completes; otherwise it is discarded or failed immediately. This rule prevents:

- A late response from an old connection being consumed by a new request.
- A read task still writing into the assembler after dispose.
- An old notification continuing to trigger decode after reconnect.

## USB Transport

Node USB and WebUSB share `ProtocolV2UsbTransportBase`; differences exist only in the native device API:

- Discover the interface and IN/OUT endpoints.
- open, select configuration, claim interface.
- Write a complete V2 frame to the OUT endpoint.
- Continuously read from the IN endpoint and hand data to the shared assembler.
- Rotate generation and cancel old reads on reset, reconnect, and dispose.

WebUSB also needs to handle browser authorization, page lifecycle, and the `USBInTransferResult` returned by the browser; Node USB is responsible for native device handles and transfer error mapping. These differences must not change the public Session timeout and retry semantics.
WebUSB must not separately clear the assembler before every call; the assembler and response sequence chain become invalid only with the link generation.
Router, packet source, ACK/response sequence, framing/CRC, and timeout all use typed Link errors and trigger rebuild of
session, assembler, read state, and platform connection.

Primary implementations:

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- WebUSB and Node USB implementations under `packages/hd-transport-web-device/src/`

## BLE Transport

BLE platform implementations include Electron, React Native, and the lowlevel plugin. Shared constraints:

- After connecting, discover services and characteristics, establish the notification subscription first, then start protocol calls.
- The OneKey communication service uses `0001`, the write characteristic uses `0002`, and the notification characteristic uses `0003`. After connection,
  service resolution and subscription must not select the Find My/FIDO `fffd` service.
- Complete Protocol V2 frames are uniformly packetized by `ProtocolV2BleFrameWriter` according to platform MTU or plugin limits;
  the platform adapter only provides single-packet write, capacity, throttling parameters, and platform error mapping. Protocol V1 keeps its original packetization protocol
  and does not enter this writer.
- React Native Protocol V2 large-frame writes rely on the native BLE stack's write-without-response backpressure and do not add a fixed
  burst or flush pause. Bounded backoff retry is used only for explicit `GATT_CONGESTED`; disconnect or generation
  change aborts immediately, and writes must not continue across connections.
- Notification data uniformly enters `ProtocolV2FrameAssembler`; a single notification must not be assumed to be one frame.
- On V1/V2 probe fallback, Electron BLE only rotates the renderer notification token and protocol buffers; it does not disconnect or
  resubscribe GATT. Unpaired devices therefore trigger the system pairing flow only once.
- After reconnect or resubscribe, old callbacks must be invalidated via generation/token.
- The lowlevel plugin only provides connect, read/write, and subscribe capabilities; it does not duplicate the protocol state machine.

### Pro2 Find My Advertisement Name

After Pro2 is bound to Find My, the communication advertisement name appends a Find My marker to the original BLE name. The representative format observed on real devices
is `Pro2 <4-digit identifier> - Find My`. The same communication advertisement may contain `180a`, `180f`, `fffd`,
and `0001` at once. Device identification must therefore follow this order:

1. If the advertisement contains the `0001` communication service, treat it as a OneKey communication endpoint even when the name has Find My and also contains `fffd`.
2. An advertisement that has only `fffd` and no `0001` is not a OneKey communication endpoint and must not enter the connect and subscribe flow.
3. The name is only for friendly display of search results and compatibility fallback, not for inferring protocol version. Protocol is still confirmed by the live response after connection.

Name format must not be strictly matched against a single fixed string. SDK recognition ignores space and hyphen differences and is compatible with the historical firmware spelling
`Finde My`; for example `Find My`, `FindMy`, `Find-My`, and `Finde My` are all treated as the trailing marker. Device-info fields
may be length-limited and truncate the marker to `Fin`, `Find`, or `FindM`; these prefixes are also treated as the trailing marker. When displaying to upper layers,
only remove that marker from the end of the name, keeping the original device-name prefix and BLE peripheral id. Ordinary names such as `Pro2 Griffin`
must not be stripped by mistake. Android paired fallback without a service UUID may treat a full Find My suffix plus `pro2` in the name as
a non-communication endpoint, but must not use this broader rule to strip the display name. Neo does not have Find My, so this name rule
must not be used to infer Neo capabilities.

Neo real-device communication advertisements use `Neo <4-digit identifier>`, for example `Neo 22D8`. The observed service set matches Pro2 communication advertisements
and may contain `180a`, `180f`, `fffd`, and `0001` at once. The SDK keeps the full Neo name and identifies it as Neo. The connection
endpoint is still based on `0001`; it must not be filtered because `fffd` is also present, and protocol version must not be inferred from the `Neo` name alone.
Latest firmware-pro2 may also advertise compact names without spaces (such as `Pro2A1B2`, `Neo22D8`). Search must recognize them
as OneKey, but must not infer a protocol conclusion from the name.

Latest firmware-pro2 shares USB VID/PID `1209:4f4c` across application, bootloader, and romloader; Pro2
and Neo are the same. USB first-probe order only uses this VID/PID as a V2 hint, not product name or BLE name. `4f4a` /
`4f4b` are still shared with Pro/Touch and must not be treated as a V2 hint. Protocol is still confirmed by the live response after connection.

USB serial numbers come from factory manufacturing information. When the slot is written but the serial number is empty, firmware omits the `iSerialNumber` string. WebUSB
must not drop the device for this reason; it should use a synthesized path to complete search and acquire.

BLE packet size is a platform transport parameter; it is not part of protobuf or the business API. Performance conclusions are in [Pro2 BLE Transport Performance Record](../testing/pro2-ble-performance.md).

## Error and Retry Boundaries

| Error type | Handling layer | Default behavior |
| ----------------------------------- | ------------------------- | ---------------------------- |
| BLE USB-priority `link disabled` | Transport probe / Core | Return 723 immediately; no reset, no retry |
| protobuf `Failure` | Core / method | Keep the Link; handle according to business semantics |
| `DeviceLocked` | Methods that explicitly declare an unlock policy | Retry at most once after unlock |
| Timeout, disconnect, I/O | Protocol Link / Transport | Invalidate the Link and clean up platform resources |
| CRC, length, sequence/generation anomalies | Protocol Session | Reject the response and invalidate the Link |
| File write, settings, firmware update failure | Core business flow | Upper-layer retry is allowed only when idempotency is confirmed |

## Maintenance Checklist

When changing the protocol or Transport, at least check:

1. Whether V1 and V2 probe order still covers devices that share a PID.
2. Whether a new Transport only implements the platform adapter, rather than duplicating the Session state machine.
3. Whether sequence keeps incrementing across ordinary reconnect.
4. Whether async results from an old generation are discarded.
5. Whether reads, assembler, connection, and protocol cache are all cleaned up after link-fatal.
6. Whether a possibly side-effecting request is incorrectly replayed at the Transport layer.
7. Whether protobuf source, generated schema, and Core types stay in sync.

## Sources of Truth

- V2 protobuf: `submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/`
- V2 shared implementation: `packages/hd-transport/src/protocols/v2/`
- USB/BLE implementations: each `packages/hd-transport-*` package
- Standing architecture constraints: [SDK Key Architecture Decisions](../architecture/decisions.md)
