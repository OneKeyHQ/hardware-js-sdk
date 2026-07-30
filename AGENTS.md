# OneKey Hardware JS SDK Agent Instructions

This repository is a TypeScript monorepo for hardware-wallet communication across WebUSB,
Electron BLE, React Native BLE, Node USB, HTTP bridge, low-level plugins, and emulators. Keep
changes typed, backward compatible, transport-aware, and safe for physical devices.

## Start With Scope

Before analyzing or changing hardware behavior, state:

- Target runtime and transport: browser WebUSB, Electron BLE, React Native BLE, Node USB,
  bridge, low-level plugin, or emulator.
- Device family and protocol: Classic/Mini/Touch/Pro with Protocol V1, Pro2 with Protocol V2,
  or both.
- Connection phase: discovery, acquire, probe, initialize, call, reconnect, release, or dispose.
- Expected behavior, current failure, non-passing condition, and final pass condition.

Use [docs/README.md](./docs/README.md) as the documentation index. Read only the documents
relevant to the task.

## Code Quality

- Keep TypeScript precise. Avoid unnecessary `any`, unsafe casts, floating promises, and
  unjustified `@ts-ignore` or lint suppression.
- Write comments in English and only for non-obvious protocol, security, compatibility, or
  platform behavior.
- Keep platform-specific behavior in its transport or adapter instead of adding global runtime
  assumptions.
- Preserve existing code and public surfaces unless removal is required by the request.
- Do not commit code that fails the relevant lint, test, or build checks.

## Architecture Boundaries

- `packages/hd-transport` owns protobuf loading, protocol encoding/decoding, framing, sessions,
  sequence handling, timeouts, and shared link lifecycle.
- Platform transport packages own physical discovery, connection, reads/writes, notifications,
  endpoint/characteristic handling, and platform error mapping.
- `packages/core` owns Device lifecycle, public methods, wallet sessions, state mapping, events,
  unlock coordination, firmware orchestration, and public compatibility.
- Entry SDKs select and configure transports; they must not duplicate protocol state machines.
- Keep the legacy `hd-*` stack and the `hwk-*` adapter stack within their existing package
  boundaries. Do not introduce a new cross-stack dependency without an architecture review.

See [architecture overview](./docs/architecture/overview.md) and
[architecture decisions](./docs/architecture/decisions.md).

## Protocol And Transport Safety

- Detect protocol from an active device response. Never infer V1/V2 only from PID, product name,
  BLE name, or USB descriptor.
- Preserve Protocol V1 behavior when adding Protocol V2 support, and test both when shared code
  changes.
- Keep Protocol V2 calls serialized per device. Do not reset or reuse sequence numbers across an
  ordinary reconnect.
- Treat timeout, disconnect, I/O, generation, framing, CRC, and sequence failures as link-fatal.
- Do not automatically replay commands with side effects. Retry only where Core has established
  idempotency.
- Invalidate reads and notifications from an old connection generation before accepting new data.

See [Protocol V1/V2 transport](./docs/protocol/protocol-v1-v2.md).

## Device And Wallet Security

- Never commit, print, log, snapshot, or place in fixtures: mnemonics, seeds, private keys, xprv,
  PINs, passphrases, raw signing payloads, or other sensitive device data.
- Never bypass device confirmation, permission prompts, PIN/passphrase flows, unlock policies,
  transaction verification, or firmware authenticity checks.
- Do not expose raw protocol state through public APIs or events.
- Cryptography, derivation paths, signing serialization, secure-channel code, and unlock/session
  changes require focused tests and security review.
- Use deterministic, protocol-defined serialization for hashes and signatures. Do not replace it
  with ad hoc `JSON.stringify()`.

See [wallet session and security](./docs/device/wallet-session-and-security.md).

## Firmware, Protobuf, And Generated Files

- Protocol V2 protobuf source of truth is
  `submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/`.
- Update schemas and types through `yarn update-protobuf`; do not hand-edit generated outputs.
- Keep transport schema, Core schema/mapping, generated types, tests, and relevant docs in the
  same change.
- Do not move firmware submodule pointers, switch firmware branches, or include unrelated firmware
  changes unless the task explicitly requires it.
- Firmware install, device wipe, bootloader operations, and physical-device mutation require
  explicit user authorization and an identified target device.

## Compatibility

- Treat exported APIs, TypeScript types, event names and payloads, error codes, transport
  selection, and package entry points as compatibility surfaces.
- Prefer additive changes. Document and test intentional breaking changes.
- Keep all published package versions aligned and run `yarn check-versions` for release work.
- Do not modify generated build output or `dist/`.

## Debugging And Logging

- Reproduce before editing. If a fix attempt fails, revisit the layer ownership and root cause.
- Use one stable, filterable debug prefix and remove temporary logs before shipping.
- Log small non-sensitive scalars and state transitions, not complete descriptors, requests,
  responses, byte buffers, or wallet/device objects.
- Element discovery or connection alone is not proof. Verify protocol, initialized state, real
  request/response behavior, cleanup, and relevant error/log evidence.

## Git And Validation

- The base branch is `onekey`; never make feature changes directly on it.
- Preserve unrelated user changes and submodule state.
- Commit format is `type: short description`; do not add tool attribution or `Co-Authored-By`.
- Before commit run `yarn agent:check --profile commit`.
- Before PR readiness run `yarn agent:check --profile pr`.
- Use the compact summary first; detailed logs are under `node_modules/.cache/agent-checks`.
- Prefer focused package tests/builds while iterating; do not use a passing full build as a
  substitute for transport- or protocol-specific tests.
- Publishing packages, pushing, creating a PR, enabling auto-merge, installing firmware, or
  wiping a device must be explicitly requested.

## Agent Knowledge

Detailed workflows live under `.skillshare/skills`; do not duplicate their content here.
Operational or destructive skills must be invoked explicitly. Keep durable technical facts in
`docs/`, and keep skills focused on procedure, routing, and validation.
