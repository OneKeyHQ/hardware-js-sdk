---
name: hardware-signing
description: Multi-chain address generation and transaction signing using OneKey
  hardware wallet. Use whenever the user wants to get a receive address, sign
  a transaction, sign a message, or verify an address on any supported blockchain.
  All signing operations require physical confirmation on the hardware device.
keywords: [sign, address, transaction, message, bitcoin, ethereum, solana, verify,
  btc, eth, sol, evm, cosmos, cardano, polkadot, tron, aptos, sui, near, xrp,
  stellar, ton, nostr]
---

## Pre-flight Checks

Every time before running any `onekey-hw` command, follow these steps in order.

1. **Check CLI installed**: Run `onekey-hw version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw status`.
   - No device → run `onekey-hw search` and connect first (see `hardware-device` skill).
   - Device in bootloader mode → cannot sign, guide to `hardware-firmware` skill.
   - Device not initialized → guide user to set up device first.

## Security Rules — ABSOLUTE

### Physical Confirmation Required

- ALL signing operations display transaction details on the hardware device screen.
- The user MUST physically press the confirm button on the device.
- NEVER tell the user to "just press confirm" without showing them what they should
  verify on the device screen.
- If a signing request times out, it means the user rejected or did not confirm.

### Address Verification

- When generating addresses for receiving funds, ALWAYS use `--show-on-device true`
  so the user can verify the address matches on the hardware screen.
- NEVER trust an address that wasn't verified on-device.

### Transaction Verification

- Before signing, clearly display to the user:
  - Recipient address
  - Amount and token
  - Network/chain
  - Fee estimate (if available)
- The device screen will show the same details — instruct user to verify they match.

## Supported Chains

| Chain | `--chain` Value | Address | Sign TX | Sign Message |
|---|---|---|---|---|
| Ethereum / EVM | `evm` | Yes | Yes | Yes (+ EIP-712) |
| Bitcoin | `btc` | Yes | Yes (+ PSBT) | Yes |
| Solana | `sol` | Yes | Yes | Yes |
| Tron | `tron` | Yes | Yes | Yes |
| Cosmos | `cosmos` | Yes | Yes | No |
| Cardano | `cardano` | Yes | Yes | Yes |
| Polkadot | `polkadot` | Yes | Yes | No |
| Aptos | `aptos` | Yes | Yes | Yes |
| Sui | `sui` | Yes | Yes | Yes |
| Near | `near` | Yes | Yes | No |
| XRP | `xrp` | Yes | Yes | No |
| Stellar | `stellar` | Yes | Yes | No |
| TON | `ton` | Yes | No | Yes |
| Nostr | `nostr` | Public Key | No | Yes (+ Schnorr) |
| Filecoin | `filecoin` | Yes | Yes | No |
| Kaspa | `kaspa` | Yes | Yes | No |
| Algorand | `algo` | Yes | Yes | No |
| Conflux | `conflux` | Yes | Yes | Yes |
| Nervos | `nervos` | Yes | Yes | No |
| Alephium | `alephium` | Yes | Yes | Yes |
| Neo | `neo` | Yes | Yes | No |
| Starcoin | `starcoin` | Yes | Yes | Yes |
| NEM | `nem` | Yes | Yes | No |
| Dynex | `dnx` | Yes | Yes | No |
| SCDO | `scdo` | Yes | Yes | Yes |
| Benfen | `benfen` | Yes | Yes | Yes |
| Nexa | `nexa` | Yes | Yes | No |

## Parameter Rules

### BIP44 Derivation Paths

Default paths per chain (user can override with `--path`):

| Chain | Default Path | Description |
|---|---|---|
| EVM | `m/44'/60'/0'/0/0` | Standard Ethereum |
| BTC (segwit) | `m/84'/0'/0'/0/0` | Native SegWit (bech32) |
| BTC (legacy) | `m/44'/0'/0'/0/0` | Legacy P2PKH |
| BTC (taproot) | `m/86'/0'/0'/0/0` | Taproot P2TR |
| SOL | `m/44'/501'/0'/0'` | Solana |
| COSMOS | `m/44'/118'/0'/0/0` | Cosmos Hub |
| CARDANO | `m/1852'/1815'/0'/0/0` | Cardano Shelley |

If the user doesn't specify a path, use the chain's default. If they specify
an account index (e.g., "second account"), adjust the account segment
(e.g., `m/44'/60'/1'/0/0`).

### Amount Units

For chains that require amounts in transaction data:
- ALWAYS use the human-readable unit in output display.
- Transaction data is passed as the chain requires (hex for EVM, etc.).

## Commands

### `onekey-hw get-address`

Get a cryptocurrency address from the connected hardware wallet.

```bash
onekey-hw get-address \
  --chain <chain> \
  [--path <bip44-path>] \
  [--show-on-device <bool>] \
  [--connect-id <id>]
```

| Parameter | Required | Description |
|---|---|---|
| `--chain` | Yes | Target blockchain (see supported chains table) |
| `--path` | No | BIP44 derivation path (uses chain default if omitted) |
| `--show-on-device` | No | Display address on device for verification (default: true) |
| `--connect-id` | No | Device connection ID (auto-detected if single device) |

**Returns:**
```json
{
  "success": true,
  "address": "0x1234...abcd",
  "path": "m/44'/60'/0'/0/0",
  "chain": "evm",
  "verifiedOnDevice": true
}
```

**Agent notes:**
- Default `--show-on-device` is true. When true, instruct user:
  "Please verify the address shown on your OneKey device screen matches."
- For receiving funds, ALWAYS verify on device.
- For batch operations (multiple addresses), may set `--show-on-device false` for speed.

### `onekey-hw get-public-key`

Get public key (for chains that support it: EVM, BTC, Aptos, Cosmos, Sui, etc.).

```bash
onekey-hw get-public-key \
  --chain <chain> \
  [--path <bip44-path>] \
  [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "publicKey": "04abcdef...",
  "path": "m/44'/60'/0'/0/0",
  "chain": "evm"
}
```

### `onekey-hw sign-transaction`

Sign a blockchain transaction using the hardware wallet. Requires physical
confirmation on the device.

```bash
onekey-hw sign-transaction \
  --chain <chain> \
  --tx <transaction-json-or-hex> \
  [--path <bip44-path>] \
  [--connect-id <id>]
```

| Parameter | Required | Description |
|---|---|---|
| `--chain` | Yes | Target blockchain |
| `--tx` | Yes | Transaction data (JSON object or hex string, chain-dependent) |
| `--path` | No | BIP44 derivation path |
| `--connect-id` | No | Device connection ID |

**EVM Transaction Example:**
```bash
onekey-hw sign-transaction \
  --chain evm \
  --tx '{"to":"0xAbC...","value":"0x2386F26FC10000","gasLimit":"0x5208","gasPrice":"0x3B9ACA00","nonce":"0x0","chainId":1}'
```

**BTC Transaction Example (PSBT):**
```bash
onekey-hw sign-transaction \
  --chain btc \
  --tx '{"psbt":"<base64-psbt-data>"}'
```

**Returns:**
```json
{
  "success": true,
  "signature": "0xabc...",
  "serializedTx": "0xf86c...",
  "chain": "evm"
}
```

**Agent notes:**
- This is the most critical operation — requires physical device confirmation.
- Before calling, clearly display to the user what will be signed:
  "You are about to sign: Send 0.01 ETH to 0xAbC... on Ethereum Mainnet"
- Inform user: "Please review and confirm the transaction on your OneKey device."
- If the call times out or returns `{ success: false }`, the user likely rejected
  on device — do NOT retry automatically.
- Transaction format varies per chain — refer to the SDK documentation for each chain.

### `onekey-hw sign-message`

Sign an arbitrary message (for chains that support message signing).

```bash
onekey-hw sign-message \
  --chain <chain> \
  --message <message> \
  [--path <bip44-path>] \
  [--connect-id <id>]
```

| Parameter | Required | Description |
|---|---|---|
| `--chain` | Yes | Target blockchain |
| `--message` | Yes | Message to sign (string or hex) |
| `--path` | No | BIP44 derivation path |
| `--connect-id` | No | Device connection ID |

**Returns:**
```json
{
  "success": true,
  "signature": "0xabc...",
  "address": "0x1234...",
  "chain": "evm"
}
```

**Agent notes:**
- Device will show the message for user verification.
- For EIP-712 typed data on EVM, use `--message-type eip712` and pass structured JSON.
- For Nostr events, use `--chain nostr` with event JSON as message.

### `onekey-hw sign-typed-data`

Sign EIP-712 typed data (EVM only).

```bash
onekey-hw sign-typed-data \
  --chain evm \
  --data <eip712-json> \
  [--path <bip44-path>] \
  [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "signature": "0xabc...",
  "address": "0x1234..."
}
```

### `onekey-hw verify-message`

Verify a signed message on-device (BTC, EVM, Starcoin).

```bash
onekey-hw verify-message \
  --chain <chain> \
  --message <message> \
  --signature <signature> \
  --address <address> \
  [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "verified": true,
  "message": "Verified on device"
}
```

### `onekey-hw batch-get-address`

Get addresses for multiple chains/paths in a single session.

```bash
onekey-hw batch-get-address \
  --bundle <json-array> \
  [--connect-id <id>]
```

**Example bundle:**
```json
[
  { "chain": "evm", "path": "m/44'/60'/0'/0/0", "showOnDevice": false },
  { "chain": "btc", "path": "m/84'/0'/0'/0/0", "showOnDevice": false },
  { "chain": "sol", "path": "m/44'/501'/0'/0'", "showOnDevice": false }
]
```

**Returns:**
```json
{
  "success": true,
  "addresses": [
    { "chain": "evm", "path": "m/44'/60'/0'/0/0", "address": "0x..." },
    { "chain": "btc", "path": "m/84'/0'/0'/0/0", "address": "bc1q..." },
    { "chain": "sol", "path": "m/44'/501'/0'/0'", "address": "7xKX..." }
  ]
}
```

**Agent notes:**
- Batch mode disables on-device verification for speed.
- Useful for portfolio dashboards or multi-chain wallet setup.
- Uses `allNetworkGetAddress` API internally for optimal performance.

## Workflows

### Get Receive Address

```
User: "Give me my Ethereum address"

Step 1 — Ensure device connected
→ onekey-hw status

Step 2 — Get address with on-device verification
→ onekey-hw get-address --chain evm --show-on-device true
→ "Please verify the address on your OneKey device screen."
→ Display address to user
```

### Sign an EVM Transaction

```
User: "Sign this transaction: send 0.1 ETH to 0xAbc..."

Step 1 — Ensure device connected
→ onekey-hw status

Step 2 — Display transaction details to user
→ "You are about to sign: Send 0.1 ETH to 0xAbc... on Ethereum"
→ "Estimated gas: ~21000 (0.00063 ETH at 30 gwei)"

Step 3 — Wait for user confirmation in chat
→ User says "yes" / "confirm"

Step 4 — Sign
→ onekey-hw sign-transaction --chain evm --tx '{"to":"0xAbc...","value":"0x16345785D8A0000",...}'
→ "Please review and confirm on your OneKey device."

Step 5 — Return signature
→ Display signed transaction hash
```

### Multi-Chain Address Setup

```
User: "Set up my wallet with addresses for ETH, BTC, and SOL"

Step 1 — Ensure device connected
→ onekey-hw status

Step 2 — Batch get addresses
→ onekey-hw batch-get-address --bundle '[
    {"chain":"evm","path":"m/44'/60'/0'/0/0","showOnDevice":false},
    {"chain":"btc","path":"m/84'/0'/0'/0/0","showOnDevice":false},
    {"chain":"sol","path":"m/44'/501'/0'/0'","showOnDevice":false}
  ]'

Step 3 — Present results
→ Display all addresses in a clean table
```

## When To Use

- User wants to get a cryptocurrency address for receiving funds.
- User wants to sign any blockchain transaction.
- User wants to sign or verify a message.
- User needs public keys for multi-sig or advanced setups.
- User wants addresses across multiple chains.

## When NOT To Use

- User wants to connect or search for devices → use `hardware-device`.
- User wants to update firmware → use `hardware-firmware`.
- User wants to change PIN/passphrase → use `hardware-security`.
- User wants to swap tokens → use `onekey` plugin's `swap` skill.
- User wants to broadcast a signed transaction → this skill only SIGNS,
  broadcasting is handled by the application layer.

## Cross-References

- Device connection required → `hardware-device` skill handles connection.
- Firmware check recommended → `hardware-firmware` skill can verify compatibility.
- Transaction building → use `onekey` plugin (app-monorepo) to build transactions,
  then use this skill to sign them with hardware security.
