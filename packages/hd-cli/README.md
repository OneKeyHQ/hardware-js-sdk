# @onekeyfe/hardware-cli

OneKey hardware wallet CLI for AI agent integration. Enables Claude Code and other AI agents to interact with OneKey hardware wallets — search devices, get addresses, sign transactions, manage firmware and security.

## Install

### Claude Code

```bash
claude plugin marketplace add OneKeyHQ/hardware-js-sdk --sparse .claude-plugin packages/hd-cli
claude plugin install onekey-hardware@onekey-hardware-plugins
```

The CLI is installed automatically on first use via the skill's pre-flight check.

### Other AI Tools (Codex, Gemini, Cursor)

```bash
npm install -g @onekeyfe/hardware-cli
```

### Development / Testing

```bash
claude --plugin-dir /path/to/hardware-js-sdk/packages/hd-cli
```

## Commands

### Device

| Command | Description | Needs PIN? |
|---------|-------------|:----------:|
| `onekey-hw search` | Search devices + auto-fetch features | No |
| `onekey-hw lock` | Lock the device | No |
| `onekey-hw device-verify` | Verify device is genuine | Yes |
| `onekey-hw device-settings` | Update label, language, etc. | Yes |
| `onekey-hw device-wipe` | Factory reset (IRREVERSIBLE) | Yes |

### Address & Signing

| Command | Description | Needs PIN? |
|---------|-------------|:----------:|
| `onekey-hw get-address --chain <chain>` | Get address (27 chains) | Yes |
| `onekey-hw get-public-key --chain <chain>` | Get public key | Yes |
| `onekey-hw batch-get-address --bundle <json>` | Multi-chain batch | Yes |
| `onekey-hw sign-transaction --chain <chain> --tx <json>` | Sign transaction | Yes |
| `onekey-hw sign-message --chain <chain> --message <msg>` | Sign message | Yes |
| `onekey-hw sign-typed-data --data <json>` | Sign EIP-712 (EVM) | Yes |
| `onekey-hw sign-psbt --psbt <hex>` | Sign Bitcoin PSBT | Yes |
| `onekey-hw verify-message --chain <chain> ...` | Verify signed message | Yes |

### Chain-Specific

| Command | Description |
|---------|-------------|
| `onekey-hw evm-sign-eip712` | EIP-712 by hash |
| `onekey-hw sol-sign-offchain` | Solana off-chain message |
| `onekey-hw nostr-encrypt` | Nostr NIP-04 encrypt |
| `onekey-hw nostr-decrypt` | Nostr NIP-04 decrypt |
| `onekey-hw nostr-sign-schnorr` | Nostr Schnorr signature |
| `onekey-hw lnurl-auth` | Lightning LNURL auth |
| `onekey-hw conflux-sign-cip23` | Conflux CIP-23 message |
| `onekey-hw aptos-sign-in` | Aptos sign-in |
| `onekey-hw ton-sign-proof` | TON Connect proof |

### Firmware (Read-Only)

| Command | Description |
|---------|-------------|
| `onekey-hw firmware-check` | Check firmware updates |
| `onekey-hw firmware-check-all` | Check all components |
| `onekey-hw bootloader-check` | Check bootloader |

Firmware updates must be done via the [OneKey App](https://onekey.so/download) or [firmware.onekey.so](https://firmware.onekey.so/).

### Security

| Command | Description |
|---------|-------------|
| `onekey-hw change-pin` | Change/set PIN |
| `onekey-hw passphrase-state` | Get passphrase state |
| `onekey-hw toggle-passphrase --enable <bool>` | Enable/disable passphrase |

## Supported Chains

| Chain | `--chain` | Address | Sign TX | Sign Message |
|-------|-----------|:-------:|:-------:|:------------:|
| Ethereum / EVM | `evm` | ✅ | ✅ | ✅ |
| Bitcoin | `btc` | ✅ | ✅ | ✅ |
| Solana | `sol` | ✅ | ✅ | ✅ |
| Cosmos | `cosmos` | ✅ | ✅ | — |
| Cardano | `cardano` | ✅ | ✅ | ✅ |
| Polkadot | `polkadot` | ✅ | ✅ | — |
| Tron | `tron` | ✅ | ✅ | ✅ |
| Aptos | `aptos` | ✅ | ✅ | ✅ |
| Sui | `sui` | ✅ | ✅ | ✅ |
| Near | `near` | ✅ | ✅ | — |
| XRP | `xrp` | ✅ | ✅ | — |
| Stellar | `stellar` | ✅ | ✅ | — |
| TON | `ton` | ✅ | — | ✅ |
| Nostr | `nostr` | ✅ | — | ✅ |
| +13 more | | ✅ | ✅ | varies |

## Transport

Uses `libusb` for direct USB communication. No external daemon needed.
Works on macOS, Linux, and Windows.

## License

Apache-2.0
