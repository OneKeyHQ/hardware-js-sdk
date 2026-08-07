---
name: hardware-chain-integration
description: Implement or review hardware-wallet chain support, address derivation, signing methods, derivation paths, transaction serialization, message signing, or device capability checks.
---

# Hardware Chain Integration

1. Read [the chain overview](../../../docs/business/chains-overview.md), the relevant chain
   document, and [the device capability matrix](../../../docs/device/capabilities.md).
2. Find the closest existing chain method and its fixtures/tests.
3. Separate host-side validation and serialization from device-owned key use and confirmation.
4. Preserve exact derivation-path, numeric, byte-order, canonical-encoding, and signature semantics.
5. Never log or persist seed material, private keys, passphrases, raw sensitive payloads, or wallet
   sessions.
6. Do not bypass device confirmation or silently downgrade an unsupported device/firmware path.
7. Test deterministic public vectors, malformed input, unsupported firmware/device capability,
   cancellation/failure, and public API compatibility.

When shared method infrastructure changes, verify at least one existing chain in addition to the
new or modified chain.
