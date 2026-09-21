# Hardware SDK Error Contract

This document contains two independent error contracts: `hd-core` / `hd-*` and `hwk-*`. They share
review principles, but they do not share a code table, compatibility policy, or translation layer.
Select one system for a change and keep the implementation inside that system.

## Goals

- Give applications a stable machine-readable code and a safe fallback message.
- Preserve the context required for deterministic recovery across package and process boundaries.
- Keep platform, protocol, device, and business failures owned by the correct layer.
- Prevent message parsing, accidental retries, and raw vendor exceptions from becoming public API.

## Public Results

At the public adapter boundary, both systems expose a discriminated result with this shape:

```ts
{
  success: false;
  payload: {
    error: string;
    code: number | string;
    params?: Record<string, unknown>;
  };
}
```

`payload.code` is the stable classifier. `payload.error` is an English fallback and diagnostic
message, not a localization key or a stable parser input. `payload.params` contains optional,
JSON-safe machine context.

Do not reject a normal public hardware operation with a raw exception. Internal layers may throw
while unwinding, but the entry boundary must convert the canonical error into the public result.

## Independent Error Systems

| Contract | Legacy `hd-*` | `hwk-*` |
| --- | --- | --- |
| Source | `packages/shared/src/HardwareError.ts` | `packages/hwk-adapter-core/src/types/errors.ts` |
| Canonical throwable field | `error.errorCode` | `error.code` |
| Factory | `ERRORS.TypedError(code, message?, params?)` | `createHwkError({ code, message, params? })` |
| Public field | `payload.code` | `payload.code` |
| Namespace | Existing values below `10000` | Five-digit values from `10000` |
| Vendor/APDU status | Preserve in `params` | `ConnectorSerializedError.errorCode` or `params.statusCode` |

The systems deliberately do not share numeric values or compatibility rules. Identical names such
as `DeviceNotFound`, `DeviceLocked`, or `PinInvalid` are still different public contracts. Select
the system from the owning stack; never infer it from the name alone.

Do not merge the tables, translate codes between them, or require a new `hd-core` error to remain
compatible with an `hwk` error (and vice versa). The App may handle both public contracts, but that
does not make them one SDK error system.

In the HWK connector contract, `code` is the canonical Hardware SDK code while `errorCode` is a raw
vendor/APDU status. This distinction must survive serialization and review.

## Layer Ownership

| Failure source | Owning layer | Required outcome |
| --- | --- | --- |
| OS permission, native USB/BLE, CoreBluetooth, GATT, libusb | Platform transport or connector | Map the structured native signal to a canonical transport code |
| Framing, CRC, sequence, generation, response timeout | Protocol Session | Raise a typed link failure and invalidate the affected link |
| Protobuf `Failure` or device state | Core method or DeviceCommands | Map firmware semantics without automatically invalidating the link |
| Ledger/Trezor APDU or vendor SDK failure | Vendor adapter | Preserve vendor status and expose a vendor-neutral canonical code |
| Invalid public parameters or unsupported method | Core/API boundary | Fail before device I/O |
| Network or bridge service failure | Network/bridge owner | Keep it distinct from local transport failure |
| Unexpected programming invariant | Closest internal owner | Use an internal diagnostic error; expose `UnknownError` only at the public boundary |

Platform transports own native error mapping, but they do not own UI text, wallet workflow, or
business retries. Core owns public device and wallet semantics, but it must not duplicate native
message parsing already handled by a transport.

## Selecting Or Adding A Code

1. Describe the cause independently of the observed message and desired UI.
2. Define the recovery action, retry rule, link effect, and cancellation semantics.
3. Search the current stack for a code with the same cause and recovery behavior.
4. Search the selected system's application mapping and all retry, release, disconnect, and batch
   classifiers.
5. Reuse a code only when all semantics match. Sharing one dialog is not sufficient evidence.
6. If a new code is required, add it to the correct category without changing any existing value.
7. Add a fallback message, numeric contract test, mapping test, and consumer update as one change.

Within the selected system, exported names and numeric values are compatibility surfaces after
publication. Keep legacy misspellings and obsolete names if consumers may import them; deprecate
and add a clearer code instead of renaming or reusing the old value. Compatibility does not cross
between `hd-core` and `hwk`. Never allocate a code from another system's range.

## Constructing Errors

### Legacy `hd-*`

Use a numeric legacy `HardwareErrorCode`:

```ts
throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, undefined, {
  phase: 'acquire',
});
```

Do not use the legacy string overload for new errors. `TypedError('Runtime', detail)` treats the
first argument as the complete message and does not create a typed `RuntimeError`.

### `hwk-*`

Use the canonical factory:

```ts
throw createHwkError({
  code: HardwareErrorCode.DeviceNotFound,
  message: 'Device not found',
  params: { phase: 'connect' },
});
```

Do not mutate a caught vendor error into a canonical error. Construct a new error and copy only the
approved, non-sensitive, JSON-safe context.

### Messages And Parameters

- Write fallback messages in concise English and describe what failed.
- Let the application localize and choose Toast/Dialog presentation from `code` and safe `params`.
- Use stable parameter names already established by the owning module.
- Prefer numbers, booleans, short enums, and bounded strings.
- Do not place `Error` instances, circular values, stacks, raw descriptors, requests, responses,
  byte buffers, PINs, passphrases, wallet sessions, or signing material in public parameters.
- Keep native/vendor text only when it is needed for diagnostics and has been reviewed for secrets.

## Mapping Raw Failures

Prefer structured signals in this order:

1. Native domain and numeric code.
2. Vendor tag, APDU status, firmware failure code, or protocol error type.
3. A narrowly scoped native message predicate when no structured value reaches JavaScript.

Message predicates must live at the native adapter boundary, use a named helper, normalize once,
and include positive and negative fixtures. Higher layers must branch on the canonical code rather
than repeating the message predicate.

Map once inside the selected system. Do not translate between `hd-core` and `hwk` inside the SDK,
and do not reclassify an already canonical error from its fallback message.

### Android Key Missing

Android 16+ keeps its side of a bond the device no longer has keys for (device wiped, bond
removed) and reports it only through the `ACTION_KEY_MISSING` broadcast. GATT shows an ordinary
peer disconnect, and the same status is reported when a device reboots, so the disconnect status
must never be used as the classifier.

`hd-transport-react-native` re-reads a link loss as `BleBondInvalid` only when the broadcast
belongs to the same link attempt (`bleKeyMissing.ts`): matching device, received after that link
started, and the failure within `ANDROID_KEY_MISSING_LINK_WINDOW_MS` of it. Without the signal,
or on an OS or native build that cannot report it, the original error is kept unchanged.

Android 17 first re-pairs by itself and broadcasts key missing only if that fails. A failed
re-pair restores the old bond (`BONDING -> BONDED`) and a successful one replaces it
(`BONDING -> NONE -> BONDING -> BONDED`), so a bond-state wait that joins a system-initiated
bonding relies on key missing, not on the final state, to detect failure.

Android also encrypts a bonded link on its own right after connecting. A request that needs
encryption sent before that attempt finishes (the notification CCCD write) is rejected, and the
framework retries it by encrypting again with the same stale key; Pro 2 firmware allows one key
failure per link and drops it on the second, before the system re-pair can finish. So when the
device was bonded before the acquire, the transport waits for `ACTION_ENCRYPTION_CHANGE` before
subscribing to notifications (`bleEncryption.ts`): success proceeds, key missing (HCI `0x06`)
keeps GATT idle until the system re-pairs on the same link (or reports key missing, mapped to
`BleBondInvalid`), and no result within `ANDROID_ENCRYPTION_RESULT_TIMEOUT_MS` proceeds as
before. A link that is still up and was encrypted earlier does not wait. Firmware-install
reconnects and bonds created by the same acquire skip the wait. Core's `ensureConnected` bounds
each attempt by its call timeout, which a user-confirmed re-pair can exceed; the re-pair still
completes and the next attempt reuses the link.

### iOS Link Ended By The Device

iOS names a bond the device no longer holds with `CBErrorPeerRemovedPairingInformation` (14),
mapped to `BlePeerRemovedPairingInformation`. The iPhone 17 family does not: the device ends the
link about a second after connecting (Pro 2 firmware drops a link on its second key failure), and
the only trace is `CBErrorPeripheralDisconnected` (7) on whatever operation was in flight. The
disconnect event has no reason on iOS, and a third-party scanner app gets the same code from the
same device, so nothing the transport sends causes or avoids it.

A device that reboots or powers off right after connecting ends one link the same way, so one
drop keeps its original error and Core retries. `hd-transport-react-native` reports
`BleBondInvalid` (`reason: 'peer_disconnected'`) only for the second acquire attempt in a row
that the device ended with code 7, each on a link that attempt opened, within
`IOS_PEER_TERMINATION_LINK_WINDOW_MS` of connecting and before any response
(`bleIosStaleBond.ts`). An attempt that succeeds or fails any other way starts the count over, the
first drop expires after `IOS_PEER_TERMINATION_REPEAT_WINDOW_MS`, and firmware-install reconnects
are never counted. iOS does not re-pair on its own, so the user has to forget the device in
system settings; there is no in-place recovery as on Android.

## Cross-Runtime Transport

The legacy Core response path uses `serializeError()` through `createResponseMessage()`. HWK
connector calls use `serializeConnectorError()` and `rehydrateConnectorError()` because device
failures cross bridge boundaries as data rather than thrown exceptions.

For every changed cross-runtime error, prove that:

- `code`, `message`, and required `params` survive a JSON round-trip.
- Raw vendor status is not confused with the canonical code.
- A bridge whitelist does not discard fields used by recovery classifiers.
- A non-serializable optional field is dropped without losing the entire error.
- Entry SDK catch paths expose the same public meaning as the normal Core response path.

## Recovery And Cleanup

| Semantic class | Default behavior |
| --- | --- |
| Invalid parameters or unsupported method | Fail before I/O; do not retry |
| User abort | Stop the current flow; do not retry or replace it with a connection error |
| Device rejection | Preserve the rejection; do not ask again automatically |
| Permission or unavailable environment | Preserve the link state where possible; require user action |
| Invalid/stale OS bond | End the failed link; require forget/re-pair; do not loop reconnect |
| Timeout, disconnect, I/O, framing, sequence, generation | Treat as link-fatal and clean all affected link state |
| Firmware business `Failure` | Keep the link unless the failure explicitly proves it unusable |
| Side-effecting operation failure | Retry only in Core after idempotency is established |

When adding or changing a code, update every relevant release/disconnect/retry/batch classifier.
Do not encode recovery behavior only in a fallback message or UI mapping.

## Logging And Security

Log a stable subsystem prefix, canonical code, lifecycle phase, and small safe scalars. Do not log
complete device objects, descriptors, requests, responses, frames, wallet identifiers, sessions,
PINs, passphrases, or signing payloads. Keep raw native errors internal unless their content is
known to be safe.

## Required Tests

Add focused tests proportional to the change:

1. Raw native/vendor/firmware input maps to the expected canonical code.
2. Similar input that should not match remains in the generic category.
3. The public failure contains the expected `error`, `code`, and required `params`.
4. JSON, worker, IPC, or connector round-trips preserve recovery fields.
5. Retry, release, disconnect, cancellation, and link invalidation follow the declared semantics.
6. Existing exported code values remain unchanged; a new code has a fixed-value test.
7. Shared changes cover both Protocol V1/V2 and affected runtime transports.

Physical-device and packaged-runtime verification is required when the failure depends on an OS
pairing database, native driver, Electron binary, bridge service, or device firmware behavior that
cannot be reproduced by a unit fixture.

## Current Sources Of Truth

- Legacy codes, messages, factory, and serializer:
  `packages/shared/src/HardwareError.ts`
- Legacy public Core response serialization: `packages/core/src/events/call.ts`
- Legacy entry fallback response: `packages/core/src/events/core.ts`
- Legacy release/disconnect classifiers: `packages/shared/src/constants.ts`
- HWK codes and factory: `packages/hwk-adapter-core/src/types/errors.ts`
- HWK connector error transport: `packages/hwk-adapter-core/src/types/connector.ts`
- Transport cleanup and retry rules: [Protocol V1/V2 transport](../protocol/protocol-v1-v2.md)
- Package and lifecycle boundaries: [architecture decisions](../architecture/decisions.md)

Do not copy the complete code tables into documentation. The exported source and numeric contract
tests remain authoritative.
