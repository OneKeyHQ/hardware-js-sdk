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

1. **Standard wallet**: use `--use-empty-passphrase` on every command.

2. **Hidden wallet (passphrase-protected)**:
   - Use `--passphrase "<value>"` on EVERY single-item command.
   - Each CLI invocation is a new process — passphrase must always be supplied.
   - Do NOT run `passphrase-state` first — it is not needed.
   - **`batch-get-address` is special**: passphrase is entered only **once** for the entire
     batch (auto-fetched internally). You will see exactly **1** `passphrase_request` event
     on stderr regardless of how many items are in the bundle.

3. **NEVER combine** `--use-empty-passphrase` with `--passphrase`.

4. **NEVER add `--json`** — not a valid option. Output is always JSON by default.

---

## Pre-flight Checks

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw search`.
   - No device → guide troubleshooting.

3. **Determine wallet mode** — MANDATORY AskUserQuestion before ANY signing or address command:

   ```
   AskUserQuestion:
     Question: "Does your OneKey device use a hidden wallet (passphrase-protected)?\n\nStandard wallet = no passphrase, most users.\nHidden wallet = BIP39 passphrase enabled on device."
     Header: "Wallet Mode"
     Options:
       A) Standard wallet — no passphrase (Recommended)
       B) Hidden wallet — I use a passphrase
       C) Cancel
   ```

   - **Option A** → use `--use-empty-passphrase` on all commands. Continue.
   - **Option B** →
     ```
     AskUserQuestion:
       Question: "How do you want to enter your passphrase?"
       Header: "Passphrase Input"
       Options:
         A) Type passphrase in this chat
         B) Enter passphrase on device screen (Pro/Touch) — prompted for each command
     ```
     - **B-A**: ask user for passphrase, store it, use `--passphrase "<value>"` on every command.
     - **B-B**: do NOT pass `--passphrase`; user enters on device screen for each command.
   - **Option C** → stop.

**Error handling:**
- Error 114: passphrase required but not set → go back to step 3.
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

```bash
# Standard wallet
onekey-hw get-address --chain evm --show-on-device false --use-empty-passphrase --connect-id <id>
onekey-hw batch-get-address --bundle '[...]' --use-empty-passphrase --connect-id <id>
onekey-hw sign-transaction --chain evm --tx '...' --use-empty-passphrase --connect-id <id>
onekey-hw sign-message --chain evm --message "hello" --use-empty-passphrase --connect-id <id>

# Hidden wallet — --passphrase required on every command
onekey-hw get-address --chain evm --show-on-device false --passphrase "mypassphrase" --connect-id <id>
onekey-hw batch-get-address --bundle '[...]' --passphrase "mypassphrase" --connect-id <id>
onekey-hw sign-transaction --chain evm --tx '...' --passphrase "mypassphrase" --connect-id <id>
onekey-hw sign-message --chain evm --message "hello" --passphrase "mypassphrase" --connect-id <id>
```

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
1. AskUserQuestion: wallet mode → B (hidden wallet)
2. AskUserQuestion: passphrase input → A (type in chat)
3. Ask user for passphrase value (e.g. "test"), remember it for this session.
4. Run all commands with --passphrase "<value>":
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
1. AskUserQuestion: wallet mode → B (hidden wallet)
2. AskUserQuestion: passphrase input → B (enter on device)
3. Run commands WITHOUT --passphrase; tell user to enter on device when prompted:
   onekey-hw get-address --chain evm --connect-id <id>  (timeout: 120000)
```

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
