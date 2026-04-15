---
name: hardware-signing
description: Multi-chain address generation and transaction signing using OneKey
  hardware wallet. Use whenever the user wants to get a receive address, sign
  a transaction, sign a message, or verify an address on any supported blockchain.
  All signing operations require physical confirmation on the hardware device.
keywords: [sign, address, transaction, message, bitcoin, ethereum, solana, verify,
  btc, eth, sol, evm, cosmos, cardano, polkadot, tron, aptos, sui, near, xrp,
  stellar, ton, nostr]
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---

## MANDATORY RULES — Read Before Every Command

**RULE 0 — SEARCH, THEN DECIDE WALLET MODE.** The pre-flight flow below handles
everything: search → decide wallet mode based on `passphrase_protection`. Device
unlocking (PIN entry) is handled automatically by the CLI when needed — no manual
unlock step required. Do NOT skip steps.

1. **Standard wallet**: use `--use-empty-passphrase` on every command.

2. **Hidden wallet (passphrase-protected)**:
   - If the user chooses host/chat passphrase entry, use `--passphrase "<value>"`
     on every command in this session.
   - Each CLI invocation is a new process — passphrase must always be supplied.
   - **Default (1-2 commands)**: just use `--passphrase "<value>"` — no extra steps needed.
   - **`batch-get-address`**: passphrase is entered only **once** for the entire
     batch (auto-fetched internally). You will see exactly **1** `passphrase_request` event
     on stderr regardless of how many items are in the bundle.
   - **Multi-step session (3+ commands)**: optionally pre-fetch `passphraseState` for
     session validation — see "Multi-Step Passphrase Session" workflow below.
     `--passphrase` is still required on every subsequent command;
     `--passphrase-state` only adds on-device session validation.
   - **If a command fails**, fix the original command first. Do NOT call `passphrase-state`
     without `--passphrase "<value>"` — omitting it causes the device to prompt on-screen.

3. **NEVER combine** `--use-empty-passphrase` with `--passphrase`.

4. Output is JSON by default when piped. Use `--json` to force JSON in a terminal.

---

## Pre-flight Checks

**Run these steps in order. Do NOT skip any step.**

### Step 1 — Check CLI installed
```bash
onekey-hw --version
```
Not found → `npm install -g @onekeyfe/hardware-cli`

### Step 2 — Search device
```bash
onekey-hw search
```
- No device → guide troubleshooting.
- Record `connectId` from `payload[0].connectId`.
- Check `payload[0].features.passphrase_protection`.

**Note:** The CLI automatically handles device unlocking (PIN entry) when needed.
If the device is locked, the first command that requires it will trigger PIN input
on the device screen — no manual unlock step is needed. This mirrors the OneKey
App behavior where unlocking is transparent to the caller.

### Step 3 — Determine wallet mode

Check `payload[0].features.passphrase_protection` from the search result:

- **`false`** → standard wallet. Use `--use-empty-passphrase`. No questions needed.
- **`null`** → device is locked, passphrase state unknown. Proceed with
  `--use-empty-passphrase` (the CLI will auto-unlock via PIN). If the command
  returns **error 114** (`DeviceNotOpenedPassphrase`), the device actually has
  passphrase enabled — re-run `onekey-hw search` to get the real
  `passphrase_protection` value, then follow the `true` branch below.
- **`true`** → passphrase is enabled. Ask ONE question:

```
AskUserQuestion:
  Question: "Your device has passphrase protection enabled.\n\nWhich wallet do you want to access?"
  Header: "Wallet Mode"
  Options:
    A) Standard wallet — no passphrase (Recommended)
    B) Hidden wallet — type passphrase in this chat
    C) Hidden wallet — enter passphrase on device screen (Pro/Touch)
    D) Cancel
```

- **Option A** → use `--use-empty-passphrase` on all commands.
- **Option B** → ask user for the passphrase value, then use
  `--passphrase "<value>"` on every command in this session.
- **Option C** → do NOT pass `--passphrase`; user enters on device
  screen for each command. Set timeout to 120000.
- **Option D** → stop.

---

## Device Interaction

**All commands block waiting for physical interaction (PIN, button press).**
Set **`timeout: 120000`** on all device commands.

**For signing specifically, show transaction details before running:**
```
AskUserQuestion:
  Question: "I'm about to sign:\n• Action: Send 0.1 ETH\n• To: 0xABC...\n• Chain: Ethereum"
  Header: "Sign"
  Options:
    A) Proceed — I'll confirm on device
    B) Cancel
```

---

## Security Rules

- ALL signing operations require physical confirmation on device.
- For receiving funds: ALWAYS use `--show-on-device true`.
- NEVER trust an address that wasn't verified on-device.

---

## Supported Chains

| Chain | `--chain` Value |
|---|---|
| Ethereum / EVM | `evm` |
| Bitcoin | `btc` |
| Solana | `sol` |
| Tron | `tron` |
| Cosmos | `cosmos` |
| Cardano | `cardano` |
| Polkadot | `polkadot` |
| Aptos | `aptos` |
| Sui | `sui` |
| Near | `near` |
| XRP | `xrp` |
| Stellar | `stellar` |
| TON | `ton` |
| Nostr | `nostr` |
| Filecoin | `filecoin` |
| Kaspa | `kaspa` |
| Algorand | `algo` |
| Conflux | `conflux` |
| Nervos | `nervos` |
| Alephium | `alephium` |
| Neo | `neo` |
| Starcoin | `starcoin` |
| NEM | `nem` |
| Dynex | `dnx` |
| SCDO | `scdo` |
| Benfen | `benfen` |
| Nexa | `nexa` |

> **Note:** Nostr uses `get-public-key` only (not `get-address`). For Nostr public keys, use:
> `onekey-hw get-public-key --chain nostr --use-empty-passphrase --connect-id <id>`

---

## Commands

### Address & Public Key

```bash
# Get address (standard wallet) — all chains EXCEPT nostr
onekey-hw get-address --chain evm [--path <bip44>] [--show-on-device true] --use-empty-passphrase --connect-id <id>

# Get public key — required for nostr, optional for other chains
onekey-hw get-public-key --chain nostr [--path <bip44>] --use-empty-passphrase --connect-id <id>

# Batch addresses (standard wallet)
onekey-hw batch-get-address --bundle '[{"chain":"evm"},{"chain":"btc"}]' --use-empty-passphrase --connect-id <id>
```

`--show-on-device` defaults to `true`. Use `false` for balance queries; always `true` for receive addresses.

### Transaction & Message Signing

```bash
# Sign transaction
onekey-hw sign-transaction --chain evm --tx '<json>' [--path <bip44>] --use-empty-passphrase --connect-id <id>

# Sign message
onekey-hw sign-message --chain evm --message '<msg>' [--path <bip44>] --use-empty-passphrase --connect-id <id>

# Sign EIP-712 typed data (EVM only)
onekey-hw sign-typed-data --data '<eip712-json>' [--path <bip44>] [--metamask-v4-compat] --use-empty-passphrase --connect-id <id>

# Sign Bitcoin PSBT (Pro/Classic1s only)
onekey-hw sign-psbt --psbt <hex> [--coin btc] --use-empty-passphrase --connect-id <id>

# Verify signed message on-device (btc, evm, starcoin only)
onekey-hw verify-message --chain evm --address <addr> --message <msg> --signature <sig> --use-empty-passphrase --connect-id <id>
```

### Chain-Specific Commands

```bash
# EVM — sign EIP-712 by hash (when full typed data is unavailable)
onekey-hw evm-sign-eip712 --domain-hash <hex> --message-hash <hex> [--path m/44'/60'/0'/0/0] --use-empty-passphrase --connect-id <id>

# Solana — off-chain message signing
onekey-hw sol-sign-offchain --message-hex <hex> [--path m/44'/501'/0'/0'] --use-empty-passphrase --connect-id <id>

# Nostr
onekey-hw nostr-encrypt --pubkey <hex> --plaintext <text> [--path m/44'/1237'/0'/0/0] --use-empty-passphrase --connect-id <id>
onekey-hw nostr-decrypt --pubkey <hex> --ciphertext <text> [--path m/44'/1237'/0'/0/0] --use-empty-passphrase --connect-id <id>
onekey-hw nostr-sign-schnorr --hash <hex> [--path m/44'/1237'/0'/0/0] --use-empty-passphrase --connect-id <id>

# Lightning Network (LNURL auth)
onekey-hw lnurl-auth --domain <domain> --k1 <hex> --use-empty-passphrase --connect-id <id>

# Conflux CIP-23
onekey-hw conflux-sign-cip23 --domain-hash <hex> --message-hash <hex> [--path m/44'/503'/0'/0/0] --use-empty-passphrase --connect-id <id>

# Aptos sign-in
onekey-hw aptos-sign-in --payload <text> [--path m/44'/637'/0'/0'/0'] --use-empty-passphrase --connect-id <id>

# TON proof
onekey-hw ton-sign-proof --appdomain <domain> --expire-at <timestamp> [--comment <text>] [--path m/44'/607'/0'] --use-empty-passphrase --connect-id <id>
```

For hidden-wallet address/signing commands in host-entry mode, replace
`--use-empty-passphrase` with `--passphrase "<value>"`.

### BIP44 Default Paths

| Chain | Default Path |
|---|---|
| EVM | `m/44'/60'/0'/0/0` |
| BTC (segwit) | `m/84'/0'/0'/0/0` |
| BTC (legacy) | `m/44'/0'/0'/0/0` |
| BTC (taproot) | `m/86'/0'/0'/0/0` |
| SOL | `m/44'/501'/0'/0'` |

---

## Workflows

### Hidden Wallet — Type Passphrase in Chat

```
1. Confirm `features.passphrase_protection === true`
2. AskUserQuestion: wallet mode → B (hidden wallet)
3. AskUserQuestion: passphrase input → A (type in chat)
4. Ask user for passphrase value (e.g. "test"), remember it for this session.
5. Run each hidden-wallet command in this flow with `--passphrase "<value>"`:
   onekey-hw get-address --chain evm --passphrase "test" --connect-id <id>
   onekey-hw batch-get-address --bundle '[...]' --passphrase "test" --connect-id <id>
```

**Expected stderr events for `batch-get-address --passphrase`:**
- 1× `pin_request` (only if device was locked — enter PIN on device screen)
- 1× `passphrase_request` (passphrase pre-fetched once before the batch loop)
- NO further passphrase events for subsequent bundle items
- Final result on stdout after all items complete

### Hidden Wallet — Enter on Device (Pro/Touch)

```
1. Confirm `features.passphrase_protection === true`
2. AskUserQuestion: wallet mode → B (hidden wallet)
3. AskUserQuestion: passphrase input → B (enter on device)
4. Run commands WITHOUT --passphrase; tell user to enter on device when prompted:
   onekey-hw get-address --chain evm --connect-id <id>  (timeout: 120000)
```

### Multi-Step Passphrase Session (3+ commands)

When running 3 or more separate hidden-wallet commands in one conversation,
optionally pre-fetch `passphraseState` to add session validation and skip
wallet mismatch errors. **`--passphrase` is still required on every subsequent
hidden-wallet command.**

```
1. Pre-fetch passphraseState:
   onekey-hw passphrase-state --passphrase "mypassphrase" --connect-id <id>
   → {"success": true, "payload": "abc123..."}

2. Use BOTH flags on every subsequent command:
   onekey-hw get-address --chain evm \
     --passphrase "mypassphrase" --passphrase-state abc123... --connect-id <id>
   onekey-hw get-address --chain btc \
     --passphrase "mypassphrase" --passphrase-state abc123... --connect-id <id>
   onekey-hw sign-message --chain evm --message "hello" \
     --passphrase "mypassphrase" --passphrase-state abc123... --connect-id <id>
```

**Key rules:**
- `--passphrase-state` alone is NOT enough — always include `--passphrase` too.
- For 1-2 commands, skip this — just use `--passphrase` directly (simpler).
- For `batch-get-address`, skip this — the CLI handles session internally.

### Standard Wallet — Get Address

```
→ onekey-hw get-address --chain evm --show-on-device true --use-empty-passphrase --connect-id <id>
→ "Please verify the address on your OneKey device screen."
```

---

## When To Use

- Get cryptocurrency addresses, sign transactions, sign/verify messages.
- Multi-chain address setup.
- **Hardware address + balance query** (get address via `onekey-hw`, then balance via `onekey`).

## When NOT To Use

- Device search/connection → `hardware-device`
- Firmware updates → `hardware-firmware`
- PIN/passphrase settings → `hardware-security`

## Scope

`onekey-hw` handles device-level operations only. For balance queries, transfers,
swaps, and market data, use the `onekey` CLI (`@onekeyfe/cli`) with `--hardware` flag.
