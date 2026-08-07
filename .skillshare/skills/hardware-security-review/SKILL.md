---
name: hardware-security-review
description: Perform an explicit security review of hardware-wallet signing, derivation, wallet sessions, PIN/passphrase, unlock, secure channels, firmware updates, logging, dependencies, or sensitive-data boundaries.
---

# Hardware Security Review

Perform a read-only review unless the user separately requests fixes.

1. Define reviewed refs/files, device families, protocols, transports, and threat boundary.
2. Read [wallet session and security](../../../docs/device/wallet-session-and-security.md) plus the
   relevant architecture/protocol/chain documents from [the docs index](../../../docs/README.md).
3. Trace untrusted input through validation, serialization, device confirmation, response parsing,
   error handling, retry, logging, and persistence.
4. Check for secret exposure, confirmation bypass, wallet/session confusion, unsafe retry,
   protocol downgrade, stale connection data, non-deterministic signing data, and dependency risk.
5. Distinguish proven findings from hypotheses. Include file/symbol, exploit precondition, impact,
   evidence, and focused remediation.
6. Require regression tests for any confirmed security fix.

Never reproduce or print real secrets. Use synthetic fixtures and public test vectors.
