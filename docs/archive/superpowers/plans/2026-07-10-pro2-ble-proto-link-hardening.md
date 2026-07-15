# Pro 2 BLE Proto Link Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align SDK/CLI BLE behavior with the latest firmware-pro2 `dev` Proto Link limits by reducing BLE file-read chunks, skipping link ACK frames, enforcing a 2048-byte BLE frame ceiling, and correcting firmware documentation.

**Architecture:** Keep the global Protocol V2 frame limit for USB, add BLE-specific constants, and pass the BLE limit into the shared `ProtocolV2Session` used by React Native and low-level/CLI transports. ACK recognition belongs in the shared Protocol V2 codec/session so all BLE transports consume link ACKs consistently before protobuf decoding.

**Tech Stack:** TypeScript, Jest, protobufjs, React Native BLE transport, low-level CLI transport, C protocol documentation.

---

### Task 1: BLE file-read chunk limit

**Files:**
- Modify: `packages/hd-transport/src/constants.ts`
- Modify: `packages/core/src/api/FileRead.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] Add a failing BLE-environment FileRead test that requests 901 bytes and expects two calls with `chunk_len` 900 and 1.
- [ ] Run `yarn jest packages/core/__tests__/protocol-v2.test.ts --runInBand` and confirm the test fails because the first request is still 901/1800-limited.
- [ ] Add `PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE = 900` while retaining the existing 1800-byte write constant, then make FileRead use the read-specific constant.
- [ ] Re-run the core Protocol V2 test and confirm it passes.

### Task 2: Proto Link ACK handling

**Files:**
- Modify: `packages/hd-transport/src/protocols/v2/constants.ts`
- Modify: `packages/hd-transport/src/protocols/v2/decode.ts`
- Modify: `packages/hd-transport/src/protocols/index.ts`
- Modify: `packages/hd-transport/src/protocols/v2/session.ts`
- Test: `packages/hd-transport/__tests__/protocol-v2.test.js`

- [ ] Add a failing session test whose `readFrame` returns a valid 8-byte ACK followed by `Success`, expecting the ACK to be skipped.
- [ ] Run `yarn jest packages/hd-transport/__tests__/protocol-v2.test.js --runInBand` and confirm failure with `payload too short`.
- [ ] Add `PROTO_DATA_TYPE_ACK`, a CRC-validating `isAckFrame` helper, expose it through `ProtocolV2`, and continue the session read loop when an ACK is received.
- [ ] Re-run the transport Protocol V2 test and confirm it passes.

### Task 3: BLE frame ceiling

**Files:**
- Modify: `packages/hd-transport/src/constants.ts`
- Modify: `packages/hd-transport/src/protocols/v2/session.ts`
- Modify: `packages/hd-transport-lowlevel/src/index.ts`
- Modify: `packages/hd-transport-react-native/src/index.ts`
- Test: `packages/hd-transport/__tests__/protocol-v2.test.js`

- [ ] Add a failing session test using a large Ping payload with `maxFrameBytes: 2048`, expecting rejection before `writeFrame` is called.
- [ ] Run the transport Protocol V2 test and confirm the oversized frame is currently written.
- [ ] Add `PROTOCOL_V2_BLE_FRAME_MAX_BYTES = 2048`, support optional `maxFrameBytes` in `ProtocolV2Session`, and pass it from both low-level/CLI and React Native BLE session construction.
- [ ] Re-run the transport and low-level Protocol V2 tests and confirm they pass.

### Task 4: Firmware documentation

**Files:**
- Modify: `submodules/firmware-pro2/sys/frame_codec/proto_link/proto_link.md`

- [ ] Update documented maximum frame length to 4200, UART FIFO to 2048, and clarify that UART parsing requires the complete frame to fit in the FIFO, making 2048 the effective UART/BLE receive ceiling.
- [ ] Update the reliability wording to state that request caching is disabled when `PROTO_LINK_REQ_CACHE_NUM` is zero.

### Task 5: Verification

**Files:**
- Review all files above.

- [ ] Run the focused Jest suites for core, shared transport, low-level transport, and RN BLE strategy.
- [ ] Run ESLint for the modified TypeScript packages.
- [ ] Run package builds for `hd-transport`, `hd-transport-lowlevel`, `hd-transport-react-native`, and `core`.
- [ ] Review `git diff --check`, `git status --short`, and the final diff to ensure unrelated user changes remain untouched.

### Task 6: Formal CLI firmware-update-v4 command

**Files:**
- Modify: `packages/hd-cli/src/cli.ts`
- Test: `packages/hd-cli/src/__tests__/firmware-update-v4-command.test.ts`

- [ ] Add a failing built-CLI help test for the formal `firmware-update-v4` command.
- [ ] Rename the command, descriptions, errors, helper functions, and metrics payload to remove debug-only naming.
- [ ] Verify `firmware-update-v4-debug` is not exposed because the command has not shipped.
- [ ] Build the CLI and run its focused Jest tests.

### Task 7: Compare Johnwanzi BLE implementation

**Files:**
- Read-only clone: `/tmp/ble_tools-johnwanzi`

- [ ] Clone `https://github.com/Johnwanzi/ble_tools` outside the workspace.
- [ ] Inspect its Proto Link framing, GATT write mode, MTU fragmentation, notification handling, ACK assumptions, and file chunk size.
- [ ] Compare findings against the SDK/CLI implementation and include them in the final report.
