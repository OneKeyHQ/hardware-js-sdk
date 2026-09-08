# OneKey Hardware Device Capability Matrix

> - Document status: volatile test baseline
> - Last device verification: 2026-02-28
> - Scope: compatibility test plugins and corresponding device firmware as of that date
> - Source of truth: `packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/`
> - Maintenance: update this document after device firmware or expected overrides change; `expected = false` means the current tests accept the device returning a failure.

## Device Models

| Device              | Code          | Description                          |
| ------------------- | ------------- | ------------------------------------ |
| OneKey Classic      | `classic`     | First-generation hardware wallet     |
| OneKey Classic 1S   | `classic1s`   | Classic upgraded edition             |
| OneKey Classic Pure | `classicPure` | Same firmware as Classic 1S          |
| OneKey Touch        | `touch`       | Touchscreen edition                  |
| OneKey Pro          | `pro`         | Professional edition                 |
| OneKey Pro 2        | `pro2`        | Protocol V2 professional edition     |
| OneKey Neo          | `neo`         | Protocol V2 device                   |
| OneKey Mini         | `mini`        | Mini edition                         |

---

## Classic

### Methods expected to fail under current tests (expected=false)

| Method                      | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `alephiumGetAddress`        | Compatibility plugin accepts a failed call.      |
| `alephiumSignTransaction`   | Compatibility plugin accepts a failed call.      |
| `alephiumSignMessage`       | Compatibility plugin accepts a failed call.      |
| `scdoGetAddress`            | Compatibility plugin accepts a failed call.      |
| `scdoSignTransaction`       | Compatibility plugin accepts a failed call.      |
| `scdoSignMessage`           | Compatibility plugin accepts a failed call.      |
| `tonGetAddress`             | Compatibility plugin accepts a failed call.      |
| `tonSignMessage`            | Compatibility plugin accepts a failed call.      |
| `tonSignProof`              | Compatibility plugin accepts a failed call.      |
| `neoGetAddress`             | Compatibility plugin accepts a failed call.      |
| `neoSignTransaction`        | Compatibility plugin accepts a failed call.      |
| `benfenGetAddress`          | Compatibility plugin accepts a failed call.      |
| `btcSignPsbt`               | Compatibility plugin accepts a failed call.      |
| `aptosSignInMessage`        | Compatibility plugin accepts a failed call.      |
| `deviceRebootToBoardloader` | Compatibility plugin accepts a failed call.      |

### Known Issues

| Method               | Error code | Description                                 |
| -------------------- | ---------- | ------------------------------------------- |
| `evmSignTransaction` | -          | EIP-7702 (authorizationList) is not supported |

### Behavioral Differences from Classic 1S

| Method                                    | Classic                    | Classic 1S                                                      |
| ----------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| `stellarSignTransaction` (wrong coin type) | Can sign after a warning  | Can sign when security checks are disabled; rejected in strict mode |
| `nemSignTransaction` (wrong coin type)    | Can sign after a warning   | Can sign when security checks are disabled; rejected in strict mode |

---

## Classic 1S / Classic Pure

### Methods expected to fail under current tests (expected=false)

| Method               | Description (actual error text may change with firmware) |
| -------------------- | -------------------------------------------------------- |
| `dnxGetAddress`      | Performance limitation                                   |
| `dnxSignTransaction` | Firmware currently returns a failure (e.g. Unknown message) |

Other methods follow the default expectations.

---

## Pro

### Methods expected to fail under current tests (expected=false)

| Method               | Description (actual error text may change with firmware) |
| -------------------- | -------------------------------------------------------- |
| `dnxGetAddress`      | Firmware currently returns a failure                     |
| `dnxSignTransaction` | Firmware currently returns a failure (e.g. Unexpected message) |

Other methods follow the default expectations.

---

## Touch

### Methods expected to fail under current tests (expected=false)

| Method                    | Description (actual error text may change with firmware)          |
| ------------------------- | ----------------------------------------------------------------- |
| `alephiumSignTransaction` | Firmware currently returns a failure (e.g. Unexpected message)    |
| `alephiumSignMessage`     | Firmware currently returns a failure (e.g. Unexpected message)    |
| `dnxSignTransaction`      | Firmware currently returns a failure (e.g. Unexpected message)    |
| `neoSignTransaction`      | Firmware currently returns a failure (e.g. Device not support this method) |
| `scdoSignTransaction`     | Firmware currently returns a failure (e.g. Unexpected message)    |
| `scdoSignMessage`         | Firmware currently returns a failure (e.g. Unexpected message)    |

Other methods follow the default expectations.

---

## Mini

### Methods expected to fail under current tests (expected=false)

| Method                    | Description (actual error text may change with firmware)          |
| ------------------------- | ----------------------------------------------------------------- |
| `alephiumSignTransaction` | Firmware currently returns a failure (e.g. Unknown message)       |
| `alephiumSignMessage`     | Firmware currently returns a failure (e.g. Unknown message)       |
| `dnxSignTransaction`      | Firmware currently returns a failure (e.g. Unknown message)       |
| `neoSignTransaction`      | Firmware currently returns a failure (e.g. Device not support this method) |
| `scdoSignTransaction`     | Firmware currently returns a failure (e.g. Unknown message)       |
| `scdoSignMessage`         | Firmware currently returns a failure (e.g. Unknown message)       |
| `tonSignMessage`          | Firmware currently returns a failure (e.g. Device not support this method) |
| `tonSignProof`            | Firmware currently returns a failure (e.g. Device not support this method) |
| `tronSignMessage`         | Firmware currently returns a failure (e.g. Device not support this method) |

### Special overrides expected to succeed under current tests (expected=true)

| Method                   | Condition    | Description                         |
| ------------------------ | ------------ | ----------------------------------- |
| `nemSignTransaction`     | coin type 60 | Currently succeeds on this device   |
| `stellarSignTransaction` | coin type 60 | Currently succeeds on this device   |

Other methods follow the default expectations.

## Pro2 / Neo

The compatibility test plugins already register Pro2 and Neo separately. Basic method availability for both is not maintained as a second hardcoded list; it is read at runtime from Core's `BaseMethod.getSupportedProtocols()` contract. Methods that Protocol V2 does not support are marked as skipped before the tests run. Public-chain capabilities for both share the `model_pro2` version range; when hardware-specific differences are needed, still use the `pro2` or `neo` plugin for precise overrides. Do not copy OneKey Pro results directly onto this product family.

Core methods use `BaseMethod.getSupportedProtocols()` as the source of truth for protocol capability: default methods support Protocol V1 only, shared methods that support Pro2 / Neo must explicitly declare `['V1', 'V2']`, and Protocol V2-only methods declare `['V2']`. `DeviceFirmwareRange` `min/max` is read only after the protocol check passes; a missing version range or `0.0.0` is no longer used to mean "unsupported".

`model_pro2` only represents shared chain/firmware method capability, not hardware peripheral capability. Neo does not have a camera, NFC, fingerprint, or Find My; the application layer must not expose QR-code wallet or those hardware entry points on that basis.

---

## Config File Locations (overrides rules)

```
packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/
├── classic.ts
├── classic1s.ts
├── classicpure.ts
├── neo.ts
├── pro.ts
├── pro2.ts
├── touch.ts
└── mini.ts
```

## Chain and Firmware Version Boundaries

The method test matrix answers "whether the current tests accept this method failing". Chain capability also depends on firmware version thresholds. When maintaining this document, use the following sources:

- Latest firmware version: the release config corresponding to `data.onekey.so/config.json`.
- Method minimum version: the Core method firmware range and feature checks.
- Model-specific overrides: the `expected` config in the compatibility test plugins above.
- Pro2 / Neo: Protocol V2 Schema, Core method guards, and real-device tests; do not infer from OneKey Pro.

Capabilities that commonly need separate verification include EIP-7702, BTC PSBT, Solana message signing and Versioned Transaction, Tron message signing, Cardano Conway, TON, Neo, Alephium, and some special networks. Do not copy remote "latest version" numbers into this document for the long term; they go stale quickly after a release.

When judging whether a device supports a chain, check in this order:

1. Whether the SDK has the corresponding public method and protobuf message.
2. Whether the method declares a model or minimum firmware version restriction.
3. Whether a compatibility plugin has an `expected=false` special override.
4. Whether the device's actual firmware meets the version requirement.
5. For Pro2 / Neo, run Protocol V2 real-device tests.
