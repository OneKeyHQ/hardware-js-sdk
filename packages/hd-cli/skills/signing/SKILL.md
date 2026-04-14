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

**RULE 0 — CHECK `passphrase_protection` FIRST.** Before running ANY address or
signing command, run `onekey-hw search` and inspect
`payload[].features.passphrase_protection`.

- If `passphrase_protection === false`, do NOT ask wallet-mode questions. Use
  `--use-empty-passphrase`.
- If `passphrase_protection === true`, ask which wallet the user wants to access
  on this passphrase-enabled device: standard wallet (`--use-empty-passphrase`)
  or hidden wallet (`--passphrase` or device entry).
- If `passphrase_protection` is `null` or missing, do NOT assume hidden wallet.
  Start with `--use-empty-passphrase`, and only ask the wallet question if the
  command later fails with Error 114 or a refreshed feature check returns `true`.

1. **Standard wallet**: use `--use-empty-passphrase` on every command.

2. **Hidden wallet (passphrase-protected)**:
   - If the user chooses host/chat passphrase entry, use `--passphrase "<value>"`
     on every hidden-wallet address/signing command in that flow.
   - Each CLI invocation is a new process — passphrase must always be supplied.
   - **Default (1-2 commands)**: just use `--passphrase "<value>"` — no extra steps needed.
   - **`batch-get-address`**: passphrase is entered only **once** for the entire
     batch (auto-fetched internally). You will see exactly **1** `passphrase_request` event
     on stderr regardless of how many items are in the bundle.
   - **Multi-step session (3+ commands)**: optionally pre-fetch `passphraseState` for
     session validation — see "Multi-Step Passphrase Session" workflow below.
     `--passphrase` is still required on every subsequent hidden-wallet command;
     `--passphrase-state` only adds on-device session validation.
   - **If a command fails**, fix the original command first. Do NOT call `passphrase-state`
     without `--passphrase "<value>"` — omitting it causes the device to prompt on-screen.

3. **NEVER combine** `--use-empty-passphrase` with `--passphrase`.

4. **NEVER add `--json`** — not a valid option. Output is always JSON by default.

---

## Pre-flight Checks

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw search`.
   - No device → guide troubleshooting.
   - Record `connectId` and `features.passphrase_protection` from the chosen device.

3. **Determine wallet flow from `features.passphrase_protection`:**

   - **`false`** → standard wallet. Do NOT ask wallet-mode questions. Use
     `--use-empty-passphrase` on all commands.
   - **`true`** → this device has passphrase enabled. Ask ONE question with
     all options (do NOT split into two separate questions):

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

   - **`null` or missing** → feature state is not reliable yet (common when the
     device is still locked or features were not refreshed). Do NOT ask
     wallet-mode questions yet. Start with `--use-empty-passphrase`.
     - If the command succeeds, continue with standard-wallet flow.
     - If the command fails with Error 114, or a later `search` / refreshed
       feature check shows `passphrase_protection === true`, ask the wallet-mode
       question above.

**Error handling:**
- Error 114: passphrase required but not set → re-check
  `features.passphrase_protection`; if `true` (or now refreshed to `true`), go
  back to step 3 and ask the wallet-mode question.
- NEVER add `--json` to any command.

---

## Device Interaction

**All commands block waiting for physical interaction. Use `AskUserQuestion` before signing/address commands:**

```
AskUserQuestion:
  Question: "Please make sure your device is plugged in and powered on.
    You may need to enter your PIN and confirm on the device."
  Header: "Device"
  Options:
    A) Device is ready (Recommended)
    B) Cancel
```

**For signing specifically, add transaction details:**
```
AskUserQuestion:
  Question: "I'm about to sign:\n• Action: Send 0.1 ETH\n• To: 0xABC...\n• Chain: Ethereum"
  Header: "Sign"
  Options:
    A) Proceed — I'll confirm on device
    B) Cancel
```

Set **`timeout: 120000`** on all device commands.

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

---

## Commands

### Address & Public Key

```bash
# Get address (standard wallet)
onekey-hw get-address --chain evm [--path <bip44>] [--show-on-device true] --use-empty-passphrase --connect-id <id>

# Get public key
onekey-hw get-public-key --chain evm [--path <bip44>] --use-empty-passphrase --connect-id <id>

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

## When NOT To Use

- Device search/connection → `hardware-device`
- Firmware updates → `hardware-firmware`
- PIN/passphrase settings → `hardware-security`
