---
name: hardware-architecture
description: Analyze or change Hardware JS SDK package ownership, Core/transport boundaries, public API compatibility, Device lifecycle, or legacy hd-* versus hwk-* architecture.
---

# Hardware Architecture

1. Read [the architecture overview](../../../docs/architecture/overview.md) and
   [current architecture decisions](../../../docs/architecture/decisions.md).
2. State the target runtime, transport, device family, protocol version, and lifecycle phase.
3. Identify the owning layer before editing:
   - Protocol Session owns encoding, framing, sequencing, serialization, and link lifecycle.
   - Platform transports own physical I/O and platform error mapping.
   - Core owns Device lifecycle, state, public methods, events, wallet sessions, and orchestration.
   - Entry SDKs select transports and expose integration APIs.
4. Map affected packages and public compatibility surfaces.
5. Reuse the closest current implementation. Do not duplicate protocol state in a transport.
6. Validate affected packages in dependency order and test both protocols when shared code changes.

Before finishing, confirm that public APIs, events, errors, package entry points, V1 behavior, and
transport cleanup remain intentional.
