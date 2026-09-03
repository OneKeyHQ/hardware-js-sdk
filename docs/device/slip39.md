# OneKey SLIP-39 technical notes

> - Status: current repository implementation
> - Last code review: 2026-07-15
> - Source of truth: `submodules/firmware/core/src/trezor/crypto/slip39.py`, matching test vectors, and Protocol message types
> - Maintenance: re-verify after upgrading the SLIP-39 implementation or introducing a new extendable-backup format

## 1. Core concepts

SLIP-39 uses Shamir Secret Sharing to split a secret into multiple mnemonic shares and recover it from a threshold number of those shares. It removes the single-point-of-loss problem in backup. It does not change the later BIP-32 wallet-derivation model.

The current implementation distinguishes two values:

| Name | Meaning |
| --- | --- |
| Encrypted Master Secret (EMS) | The encrypted master secret that SLIP-39 shards and encodes into mnemonics |
| Master Secret | The result of decrypting EMS with a passphrase; usable as input to BIP-32 and similar derivation |

```text
Master Secret + passphrase
  -> SLIP-39 Feistel encryption
  -> EMS
  -> Shamir shares
  -> multiple SLIP-39 mnemonics

multiple mnemonics
  -> Shamir recover EMS
  -> decrypt with the same passphrase
  -> Master Secret
```

Therefore:

- Recovering mnemonic shares yields EMS, not the final wallet secret after passphrase.
- The same share set with a different passphrase yields a different Master Secret and a different wallet.
- The passphrase is not encoded in the mnemonics and cannot be verified from them.

## 2. Basic and Advanced

SLIP-39 supports two threshold levels:

```text
group threshold
└─ each group also has a member threshold
```

- Basic: usually one group, using only the in-group `M-of-N` threshold.
- Advanced: multiple groups; first satisfy the group threshold, then each selected group's member threshold.

Example:

```text
2-of-3 groups
├─ Group A: 2-of-3
├─ Group B: 1-of-1
└─ Group C: 3-of-5
```

Recovery must satisfy the internal threshold of any two groups. Do not read "2-of-3 groups" as "any two shares from the full set".

## 3. Feistel and PBKDF2

The four-round Feistel encryption is part of the SLIP-39 passphrase handling implemented in this repository. It is not a OneKey-only enhancement that would break standard compatibility.

Current constants:

| Parameter | Current value |
| --- | ---: |
| `_ROUND_COUNT` | `4` |
| `_BASE_ITERATION_COUNT` | `10000` |
| `DEFAULT_ITERATION_EXPONENT` | `1` |
| `_CUSTOMIZATION_STRING` | `b"shamir"` |

PBKDF2 rounds per Feistel round:

```text
(10000 << iteration_exponent) / 4
```

So with default `iteration_exponent = 1`:

- Four rounds total 20000 iterations.
- Each round is 5000 iterations.

Do not describe "5000 per round" as "the whole algorithm runs 5000 times". Do not describe Feistel and PBKDF2 as two mutually exclusive schemes.

## 4. Identifier, salt, and metadata

The current in-repo implementation uses:

- A 15-bit random identifier.
- A 5-bit iteration exponent.
- Salt `b"shamir" + identifier.to_bytes(...)`.
- An RS1024 checksum that also uses the `b"shamir"` customization string.

The current `Share` parse structure includes:

```text
identifier
iteration_exponent
group_index
group_threshold
group_count
member_index
member_threshold
share_value
```

The implementation this document describes does not detect format or compatibility by "the third word is always academic". A single word in the mnemonic is only a bit-encoding result. Identifier, thresholds, indexes, iteration exponent, and checksum must be parsed as a whole.

This check is wrong:

```ts
share.split(' ')[2] === 'academic';
```

It cannot verify the checksum, prove that all shares belong to the same set, or prove that iteration exponent and threshold config match.

## 5. Recovery checks

Before recovery, at least verify:

1. Every mnemonic length and RS1024 checksum is valid.
2. Every share uses the same identifier and iteration exponent.
3. `group_threshold` and `group_count` are consistent across shares.
4. Member threshold is consistent inside each group.
5. The number of provided groups exactly meets the group threshold.
6. The number of members in each selected group exactly meets that group's threshold.
7. EMS is decrypted with the correct passphrase after recovery.

Meeting the share threshold only proves EMS can be recovered. It does not prove the passphrase is correct. A wrong passphrase still produces a well-formed but completely different wallet.

## 6. Boundary with the SDK

Hardware JS SDK sends Reset/Recovery requests to the device and handles on-device word entry, confirmation, and status messages. The App must not:

- Implement a SLIP-39 encrypt/decrypt path that differs from firmware and then assume address compatibility.
- Detect mnemonic origin from one fixed word.
- Log, telemeter, or error-report full shares, EMS, Master Secret, or passphrase.
- Treat a SLIP-39 share as a standalone BIP-39 mnemonic.

If the App needs offline SLIP-39 verification or migration, use an implementation that matches the target format version and is covered by test vectors. At minimum cover:

- Basic and Advanced threshold recovery
- Bad checksums
- Mixed identifiers
- Mixed iteration exponents
- Share sets below or above the threshold
- Empty passphrase, non-empty passphrase, and Unicode normalization

## 7. Current implementation index

- High-level SLIP-39: `submodules/firmware/core/src/trezor/crypto/slip39.py`
- C extension and wordlist: `submodules/firmware/crypto/slip39.c`
- Unit tests: `submodules/firmware/core/tests/test_trezor.crypto.slip39.py`
- Test vectors: `submodules/firmware/core/tests/slip39_vectors.py`
- Device recovery tests: `submodules/firmware/tests/device_tests/test_msg_recoverydevice_slip39_basic.py`
- Advanced recovery tests: `submodules/firmware/tests/device_tests/test_msg_recoverydevice_slip39_advanced.py`
