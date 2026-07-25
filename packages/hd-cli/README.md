# @onekeyfe/hardware-cli

`onekey-hw` is the Node.js CLI entry point for talking to a OneKey hardware wallet from local scripts, terminal workflows, and AI agents.

It is built on top of `@onekeyfe/hd-common-connect-sdk`, initializes the SDK with `env: 'node-usb'`, and prints command results as JSON so callers can parse responses reliably.

## What this package is for

- Discovering attached devices
- Reading device features and verification state
- Getting addresses and public keys
- Signing messages and transactions for supported chains
- Managing hidden-wallet passphrase sessions across CLI invocations
- Updating device settings and checking firmware status

Firmware update flows are intentionally not supported in this CLI.

## Install and run

Install from npm:

```bash
npm install -g @onekeyfe/hardware-cli
onekey-hw --help
```

Run from this monorepo:

```bash
yarn workspace @onekeyfe/hardware-cli build
node packages/hd-cli/dist/cli.js --help
```

## Runtime model

### Transport

- The CLI initializes the SDK with `env: 'node-usb'`.
- It is intended for direct USB access from Node.js.

### Output

- Command results are written to `stdout` as JSON.
- Interactive hints such as PIN or confirmation prompts are written to `stderr`.

### PIN and passphrase handling

- PIN entry stays on the hardware device.
- `--use-empty-passphrase` selects the standard wallet without prompting for a hidden-wallet passphrase.
- In an interactive terminal, hidden-wallet flows prompt for:
  1. standard wallet
  2. hidden wallet via `pinentry`
  3. hidden wallet with passphrase entered on the device
- In a non-TTY environment, the CLI falls back to on-device passphrase entry.
- If no `pinentry` program is available, the CLI also falls back to on-device entry.

### Session caching

Hidden-wallet session reuse is supported for repeated CLI calls:

- macOS: stored in Keychain through the `security` tool
- Linux: stored in Secret Service through `secret-tool`
- other platforms: secure session storage is not available

The cache stores `passphraseState` and `sessionId` per `deviceId`. If secure storage is unavailable, commands still run, but the CLI cannot reuse cached hidden-wallet sessions between invocations.

## Global options

These options apply to most commands:

| Option | Meaning |
| --- | --- |
| `--connect-id <id>` | Explicit transport-level device identifier |
| `--device-id <id>` | Persistent device identifier from `get-features` |
| `--passphrase-state <state>` | Reuse an existing hidden-wallet state explicitly |
| `--use-empty-passphrase` | Force the standard wallet flow |

If `--connect-id` is omitted, commands that need a device will typically use the first discovered device.

## Common workflows

### 1. Discover a device

```bash
onekey-hw search
onekey-hw get-features
```

`search` also tries to enrich each discovered device with `getFeatures()` output when possible.

### 2. Get an address from the standard wallet

```bash
onekey-hw get-address --chain evm --use-empty-passphrase
onekey-hw get-address --chain btc --path "m/84'/0'/0'/0/0" --show-on-device true
```

If `--path` is omitted, the CLI uses chain-specific defaults from `src/chains.ts`.

### 3. Reuse a hidden-wallet session

```bash
onekey-hw session connect
onekey-hw get-address --chain evm
onekey-hw sign-message --chain evm --message "hello from onekey-hw"
```

`session connect` discovers the first device, ensures it is unlocked, initializes a passphrase session, and stores the session metadata for later commands.

### 4. Batch address reads in one session

```bash
onekey-hw batch-get-address --bundle '[{"chain":"evm"},{"chain":"sol","showOnDevice":false}]'
```

### 5. Sign structured payloads

```bash
onekey-hw sign-typed-data --data '{"types":{},"primaryType":"Mail","domain":{},"message":{}}'
onekey-hw sign-transaction --chain evm --tx '{"nonce":"0x1","gasLimit":"0x5208","gasPrice":"0x3b9aca00","to":"0x0000000000000000000000000000000000000000","value":"0x0","data":"0x","chainId":1}'
```

For chain-specific payload shapes, use the developer portal chain docs together with the CLI command help.

## Command groups

Use `onekey-hw <command> --help` for the full argument list. The current command surface includes:

| Group | Commands |
| --- | --- |
| Device discovery | `search`, `get-features`, `device-verify`, `lock` |
| Address and key reads | `get-address`, `batch-get-address`, `get-public-key` |
| Generic signing | `sign-transaction`, `sign-message`, `sign-typed-data`, `sign-psbt`, `verify-message` |
| Chain-specific signing | `evm-sign-eip712`, `sol-sign-offchain`, `nostr-encrypt`, `nostr-decrypt`, `nostr-sign-schnorr`, `lnurl-auth`, `conflux-sign-cip23`, `aptos-sign-in`, `ton-sign-proof` |
| Firmware status | `firmware-check`, `firmware-check-all`, `bootloader-check` |
| Device settings | `change-pin`, `toggle-passphrase`, `device-settings`, `device-wipe`, `passphrase-state` |
| Session management | `session connect`, `session disconnect` |

## Constraints and pitfalls

### Unlocking affects hidden-wallet session reuse

If the device was locked and had to be unlocked again, the CLI does not reuse the previous cached hidden-wallet session. Run `session connect` again after a lock/unlock cycle if you want to refresh the cached session explicitly.

### Firmware updates are stubbed out

The following commands always return a structured failure:

- `firmware-update`
- `firmware-update-ble`

Use the OneKey App or <https://firmware.onekey.so/> for firmware updates.

### Linux session caching depends on `secret-tool`

On Linux, secure session reuse relies on the `secret-tool` command. Without it, the CLI can still talk to the device, but cached hidden-wallet sessions are not persisted.

### `sign-message` input is chain-dependent

- Most chains accept a plain string and the CLI converts it to hex internally.
- TON and Nostr expect JSON payloads and are parsed from the original `--message` value.

## Related docs

- [Repository architecture overview](../../docs/architecture.md)
- [Transport layer details](../../docs/transport.md)
- [Developer portal](https://developer.onekey.so/connect-to-hardware/hardware-sdk)
