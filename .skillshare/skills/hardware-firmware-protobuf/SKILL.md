---
name: hardware-firmware-protobuf
description: Update or review firmware-pro2 submodules, Protocol V2 protobuf sources, generated schemas/types, firmware messages, or SDK/firmware compatibility. Use explicitly because it can move submodule pointers or regenerate artifacts.
---

# Hardware Firmware And Protobuf

1. Confirm the requested firmware repository, branch or commit, protocol version, and generated
   outputs before changing anything.
2. Read [Protocol V1/V2 transport](../../../docs/protocol/protocol-v1-v2.md) and the relevant SDK
   runtime or device-management document from [the docs index](../../../docs/README.md).
3. Treat `submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/` as the Protocol V2 source
   of truth.
4. Preserve unrelated submodule modifications and never switch branches or move the pointer as a
   side effect.
5. Modify the source or generator, then run `yarn update-protobuf`; never hand-edit generated
   schema or types.
6. Verify transport schema, Core schema/mapping, generated types, message numbers, optional fields,
   tests, and documentation together.
7. Build and test `hd-transport` before downstream transports and Core.

Do not install firmware, reboot into a loader, wipe a device, or mutate a physical device without
explicit authorization and a resolved target.
