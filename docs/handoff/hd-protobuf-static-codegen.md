# Handoff: remove the extension iframe by giving HD static protobuf codecs

## Why this exists

OneKey's own SDK stack (`hd-*`) decodes and encodes device protobuf with
`protobufjs@6`, which builds its codecs at runtime with `new Function`. MV3
forbids that, so the browser extension runs the whole HD SDK inside an iframe /
offscreen document to get a context where it is allowed.

The third-party stack (`hwk-*`) in this same repo does not need that. Trezor
moved to `@bufbuild/protobuf`, where `protoc` emits the codec as ordinary source
at build time and nothing is generated at runtime.

The goal is to give HD the same property, so the extension can drop the iframe.

**The goal is not to share code between the two stacks.** `hd-*` and `hwk-*` are
deliberately parallel and must stay that way. What transfers here is the
technique and, where useful, the shape of a solution — not imports across the
boundary.

## Read this before estimating

This work looks like a dependency swap and is not one. Protobuf bytes go
straight into signing: a field that serializes differently produces a different
signature. A mistake here does not throw — it yields a byte stream the device
rejects, or worse, signs something other than what the user saw.

There is direct evidence in this repo that the two libraries do **not** agree
out of the box. `packages/hwk-trezor-protobuf/src/manager.ts` carries a
`transformSchemaFields` layer with two comments marked `[compatibility]`:

- absent optional **message** fields: protobufjs decoded them as `{}`, the new
  library gives `undefined`
- absent optional **enum** fields: protobufjs sometimes returned the 0/first
  value where `null` is wanted

Those were found and patched during the HWK migration. Treat them as proof that
more differences exist, not as the complete list.

## What is where

### HD (the side being changed)

| Path                                                           | What it is                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/hd-transport/src/index.ts`                           | Builds the protobufjs `Root`                                                   |
| `packages/hd-transport/src/serialization/protobuf/encode.ts`   | 84 lines, has its own handling — see the `signatures: [b'', b'', b'']` comment |
| `packages/hd-transport/src/serialization/protobuf/decode.ts`   | 107 lines                                                                      |
| `packages/hd-transport/src/serialization/protobuf/messages.ts` | 46 lines                                                                       |
| `packages/hd-transport/src/protocols/index.ts`                 | Uses `Reader`, `Type` directly                                                 |
| `packages/hd-transport/src/protocols/v1/{packets,receive}.ts`  | Take `Root`                                                                    |
| `packages/hd-transport/src/protocols/v2/session.ts`            | Takes `Root`                                                                   |
| `packages/hd-transport/messages-protocol-v2.json`              | ~310 KB. **OneKey's own schema**, not Trezor's                                 |
| `packages/hd-transport/scripts/protobuf-build.sh`              | Current generator; reads `submodules/firmware/common/protob`                   |

Ten import sites in total. The count is small; the risk is not in the count.

### HWK (the reference)

| Path                                            | What it is                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/hwk-trezor-protobuf/src/definitions/` | `protoc`-generated `*_pb.js` / `*_pb.d.ts`, checked in, marked `@generated … DO NOT EDIT` |
| `packages/hwk-trezor-protobuf/src/manager.ts`   | 314 lines. `fromBinary` / `toBinary` plus the compatibility layer                         |
| `packages/hwk-trezor-schema-utils`              | Schema helpers the generated code leans on                                                |

## The first task is not migration

**Do not start by changing `hd-transport`.** Start by establishing whether the
two libraries agree, and where they do not. That answer is what decides whether
the migration is a week or a quarter.

### Step 1 — differential harness (no production code changes)

Build a test that, for **every** message type in `messages-protocol-v2.json`:

1. encodes the same input with protobufjs and with `@bufbuild/protobuf`,
   compares the two byte strings exactly
2. decodes each library's bytes with the other library, compares the results
3. records which messages match, which differ, and how

Feed it more than happy-path values. The differences that matter live in:

- default / zero values — written to the wire or omitted
- `optional` and `oneof` boundaries
- absent optional message fields (known difference, see above)
- absent optional enum fields (known difference, see above)
- unknown fields — preserved or dropped on round-trip
- 64-bit integers — `Long` vs `bigint`, and their string forms
- `bytes` fields, especially empty ones and arrays of empty ones (the
  `signatures: [b'', b'', b'']` case `encode.ts` already special-cases)
- repeated fields that are empty versus absent

**Deliverable: a per-message table of identical / differs-how.** No migration
decision should be made before it exists.

### Step 2 — only after Step 1 reads clean enough

Then, and only then, plan the migration: generation pipeline for OneKey's own
schema, the compatibility layer HD needs (HWK's `transformSchemaFields` is the
shape to study, not to import), the order of the ten call sites, and finally
removing the iframe.

## Where the iframe lives

App repo, `packages/shared/src/hardware/sdk-loader/index.ext-bg-v3.ts`. The
extension background imports `@onekeyfe/hd-web-sdk` and routes low-level calls
through `offscreenApiProxy`. Removing this is the **last** step, not the first —
it only becomes safe once HD itself no longer needs a permissive CSP context.

## Ground rules

- Never import `hwk-*` from `hd-*` or the reverse. Study the HWK approach, write
  HD's own.
- Generated files stay generated. If `protoc` output is checked in, it carries a
  `@generated … DO NOT EDIT` header and is never hand-edited.
- No behavioural change ships without the differential evidence for the messages
  it touches.

## Verification commands

Run these, not per-package shortcuts — a single-package build resolves against
whatever is already in `node_modules` and will pass while CI fails:

```sh
# SDK repo
npx lerna run build            # what CI runs; catches undeclared deps
npx jest --config packages/<pkg>/jest.config.js
node scripts/check-versions.js # all packages must share one version

# App repo
yarn tsc:staged
yarn lint:project
```

## Open question for the owner

`messages-protocol-v2.json` is OneKey's own protocol, and whether every message
in it survives a `protoc` round-trip unchanged has not been checked. If Step 1
finds differences confined to OneKey-specific messages, that is a firmware-team
conversation, not a library one.
