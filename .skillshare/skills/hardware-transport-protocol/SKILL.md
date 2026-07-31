---
name: hardware-transport-protocol
description: Diagnose or implement WebUSB, Electron BLE, React Native BLE, Node USB, low-level, emulator, Protocol V1/V2 probing, framing, timeout, reconnect, sequence, or link-lifecycle changes.
---

# Hardware Transport And Protocol

1. Read [Protocol V1/V2 transport](../../../docs/protocol/protocol-v1-v2.md) and
   [architecture decisions](../../../docs/architecture/decisions.md).
2. Record runtime, physical transport, device family, V1/V2 scope, lifecycle phase, and repro.
3. Place behavior in the correct layer:
   - Shared protocol code: codec, assembler, session, sequence, queue, timeout, link invalidation.
   - Adapter code: connect, read/write, notification, endpoint/characteristic, platform errors.
4. Detect protocol using an active response; do not rely only on descriptors or names.
5. Preserve per-device serialization, generation isolation, and sequence continuity.
6. Treat transport failures as link-fatal, but do not classify protobuf business failures as
   link-fatal by default.
7. Never replay a side-effecting request from Transport.
8. Add focused tests for split/coalesced frames, stale callbacks, timeout cleanup, reconnect, and
   both V1/V2 probe paths as applicable.

The pass condition must prove a real request/response and cleanup path, not only discovery.
