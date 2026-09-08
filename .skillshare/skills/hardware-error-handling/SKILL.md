---
name: hardware-error-handling
description: Analyze, add, map, serialize, test, or review Hardware JS SDK errors within either the independent hd-core or hwk error system, including public codes, transport/vendor mapping, cross-runtime failures, retry and cleanup semantics, and user recovery.
---

# Handle Hardware SDK Errors

1. Read the [Hardware SDK error contract](../../../docs/sdk/error-contract.md). For transport,
   protocol, session, or retry changes, also read the linked architecture and protocol documents.
2. Record the runtime, transport, device family, protocol, lifecycle phase, raw error source,
   owning layer, and final public consumer before changing code.
3. Choose exactly one independent error system and stay inside it:
   - `hd-core` / `hd-*`: use `HardwareErrorCode` and `ERRORS.TypedError(code, message?, params?)` from
     `@onekeyfe/hd-shared`.
   - `hwk-*`: use `HardwareErrorCode` and `createHwkError()` from
     `@onekeyfe/hwk-adapter-core`.
   Do not merge their code tables, add a translation layer, or preserve compatibility between the
   two systems. Similar errors may deliberately have independent names and numeric values.
4. Trace the entire path from native/vendor/firmware failure to the public
   `{ success: false, payload: { error, code, params? } }` result. Include every process, bridge,
   connector, catch, serializer, and rehydration boundary.
5. Reuse an existing code only when its cause and recovery semantics match. Before adding a code,
   search the selected system, its App-side mappings, retry/release classifiers, tests, and
   published value guards. Do not use the other system as a compatibility constraint.
6. Map the error once in the owning layer:
   - Platform or native failures belong in the platform transport/connector.
   - Framing, sequence, generation, and response timeout failures belong in Protocol Session.
   - Firmware `Failure` and wallet/device business failures belong in Core or the vendor adapter.
   - Entry SDKs only serialize and expose the canonical result.
7. Prefer native domain/code/tag/status fields. Parse message text only at the owning adapter when
   no structured signal exists; isolate it in a named predicate and cover positive and negative
   native fixtures. Never make App behavior depend on a fallback message.
8. Construct canonical errors with the stack factory. Do not use `TypedError(string)` for new
   errors, and do not allow a bare `Error`, vendor exception, or raw firmware response to cross a
   package, connector, worker, IPC, or public SDK boundary.
9. Keep the fallback message concise and in English. Put stable, JSON-safe, non-sensitive machine
   context in `params`; do not place PINs, passphrases, sessions, signing payloads, raw buffers, or
   complete device objects in errors or logs.
10. Define behavior separately from presentation: user abort versus device rejection, retryability,
    link-fatal cleanup, release/disconnect, and required user action. Transport must not replay a
    side-effecting request.
11. Add focused tests for raw-to-canonical mapping, public response shape, JSON/bridge round-trip,
    recovery and no-retry behavior, numeric compatibility, and both V1/V2 or platform variants
    affected by shared code.
12. Report the selected code, reason existing codes were reused or rejected, public payload,
    cleanup/retry decision, App mapping impact, compatibility impact, and validation evidence.

Analysis or review does not authorize edits. Do not publish packages, push, change App mappings,
renumber public codes, or introduce a cross-stack compatibility layer without explicit approval.
