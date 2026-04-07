# @onekeyfe/hardware-cli

OneKey hardware wallet CLI for AI agent integration. Enables Claude Code, Cursor, and other AI agents to interact with OneKey hardware wallets — search devices, get addresses, sign transactions, manage firmware and security.

## Install

### 1. Install CLI

```bash
npm install -g @onekeyfe/hardware-cli
```

Verify:

```bash
onekey-hw --version
```

### 2. Install Claude Code Plugin

Add the OneKey marketplace (one time):

```
/plugin marketplace add OneKeyHQ/hardware-js-sdk
```

Install the plugin:

```
/plugin install onekey-hardware@onekey-hardware-plugins
```

This installs 4 skills:
- **hardware-device** — Search, connect, check device status
- **hardware-signing** — Get addresses, sign transactions/messages (27 chains)
- **hardware-firmware** — Check and update firmware
- **hardware-security** — PIN, passphrase, backup, recovery, factory reset

### Alternative: Install from npm directly

```
/plugin marketplace add OneKeyHQ/hardware-js-sdk
```

Or install skills manually:

```bash
# Get the npm global root
NPM_ROOT=$(npm root -g)

# Symlink skills
ln -s $NPM_ROOT/@onekeyfe/hardware-cli/skills/device ~/.claude/skills/hardware-device
ln -s $NPM_ROOT/@onekeyfe/hardware-cli/skills/signing ~/.claude/skills/hardware-signing
ln -s $NPM_ROOT/@onekeyfe/hardware-cli/skills/firmware ~/.claude/skills/hardware-firmware
ln -s $NPM_ROOT/@onekeyfe/hardware-cli/skills/security ~/.claude/skills/hardware-security
```

## Usage

### CLI (Terminal)

```bash
# Search for connected devices
onekey-hw search --json

# Get ETH address
onekey-hw get-address --chain evm --use-empty-passphrase --json

# Get BTC address
onekey-hw get-address --chain btc --use-empty-passphrase --json

# Sign a message
onekey-hw sign-message --chain evm --message "hello" --use-empty-passphrase --json

# Batch get addresses
onekey-hw batch-get-address --bundle '[{"chain":"evm","showOnDevice":false},{"chain":"btc","showOnDevice":false}]' --use-empty-passphrase --json
```

### Claude Code (Natural Language)

After installing the plugin, just ask:

```
"Search for my OneKey device"
"Get my Ethereum address"
"Sign this message: hello world"
"Check if my firmware is up to date"
```

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

## Device Interaction

All commands that communicate with the device (except `search`) may require:
- **PIN entry** on the device screen
- **Button confirmation** on the device

Commands will block until the user acts on the device. Set a timeout of 120+ seconds.

## Transport

Uses `libusb` for direct USB communication. No external daemon needed.
Works on macOS, Linux, and Windows.

## License

Apache-2.0
