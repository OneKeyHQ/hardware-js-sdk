# `@onekeyfe/hardware-cli`

`@onekeyfe/hardware-cli` exposes the `onekey-hw` binary for direct OneKey hardware wallet operations from Node.js. It is built for local shells and AI agents that need machine-readable output, USB transport, and repeatable passphrase-session handling without building a custom app first.

The CLI initializes the SDK with `env: 'node-usb'`, prints structured JSON to `stdout`, writes prompts and status messages to `stderr`, and keeps all signing and security-sensitive confirmations on the physical device.

## Install

```bash
npm install -g @onekeyfe/hardware-cli
```

Or run it without a global install:

```bash
npx @onekeyfe/hardware-cli search
```

## Runtime model

- Transport: direct Node.js USB (`node-usb`), not WebUSB or bridge mode.
- Output: command results are JSON on `stdout`.
- Prompts: PIN, passphrase, connection, and confirmation hints are written to `stderr`.
- Exit codes: the process exits with code `1` when the final JSON result contains `"success": false`.
- Device approval: address display, signing, PIN unlock, and other protected actions still require device interaction.

## Global options

These options are available to all commands:

| Option | Purpose |
| --- | --- |
| `--connect-id <id>` | Select a specific device connection ID. |
| `--device-id <id>` | Pass the persistent device ID returned by `getFeatures`. This value changes when the wallet seed changes. |
| `--passphrase-state <state>` | Reuse an existing hidden-wallet passphrase state. |
| `--use-empty-passphrase` | Force the standard wallet flow and skip hidden-wallet passphrase prompts. |

## Common workflows

### Discover a device

```bash
onekey-hw search
onekey-hw get-features
```

`search` returns attached devices and tries to enrich each result with `getFeatures()` data when available.

### Read an address from the standard wallet

```bash
onekey-hw get-address --chain evm --use-empty-passphrase
```

If you omit `--path`, the CLI injects a chain-specific default derivation path.

### Reuse a hidden-wallet session across commands

```bash
onekey-hw session connect
onekey-hw get-address --chain evm
onekey-hw sign-message --chain evm --message "hello from onekey-hw"
onekey-hw session disconnect
```

`session connect` performs the hidden-wallet selection flow, reads the active `passphraseState` and `sessionId`, and stores them in secure OS storage for later invocations. Subsequent commands preload the cached session when the same device is available and already unlocked.

### Batch address reads in one SDK session

```bash
onekey-hw batch-get-address --bundle '[{"chain":"evm"},{"chain":"btc"},{"chain":"sol"}]'
```

This is useful when you want multiple addresses without repeating the command bootstrap and session-preparation flow.

## Command groups

| Group | Commands | Notes |
| --- | --- | --- |
| Discovery | `search`, `get-features` | Device discovery and feature inspection. |
| Generic wallet operations | `get-address`, `get-public-key`, `sign-transaction`, `sign-message`, `sign-typed-data`, `sign-psbt`, `verify-message`, `batch-get-address` | These map to SDK methods through the chain resolver in `src/chains.ts`. |
| Chain-specific operations | `evm-sign-eip712`, `sol-sign-offchain`, `nostr-encrypt`, `nostr-decrypt`, `nostr-sign-schnorr`, `lnurl-auth`, `conflux-sign-cip23`, `aptos-sign-in`, `ton-sign-proof` | Use these when the generic command surface is not enough. |
| Firmware inspection | `firmware-check`, `firmware-check-all`, `bootloader-check` | Read-only checks. |
| Device management | `change-pin`, `passphrase-state`, `toggle-passphrase`, `device-wipe`, `device-settings`, `device-verify`, `lock` | `device-wipe` requires `--yes`. |
| Session cache | `session connect`, `session disconnect` | Hidden-wallet session bootstrap and cleanup. |

## Chain names and default paths

The CLI normalizes several chain aliases before dispatching SDK calls. Examples:

- `eth`, `ethereum` -> `evm`
- `bitcoin` -> `btc`
- `solana` -> `sol`
- `dot` -> `polkadot`
- `ada` -> `cardano`
- `atom` -> `cosmos`
- `cfx` -> `conflux`

When `--path` is omitted, the resolver applies built-in defaults. Common examples:

| Chain | Default path |
| --- | --- |
| `evm` | `m/44'/60'/0'/0/0` |
| `btc` | `m/84'/0'/0'/0/0` |
| `sol` | `m/44'/501'/0'/0'` |
| `ton` | `m/44'/607'/0'` |
| `nostr` | `m/44'/1237'/0'/0/0` |

The current resolver also ships defaults for `tron`, `cosmos`, `cardano`, `polkadot`, `aptos`, `sui`, `near`, `xrp`, `stellar`, `filecoin`, `kaspa`, `algo`, `nervos`, `alephium`, `neo`, `starcoin`, `nem`, `dnx`, `scdo`, `benfen`, and `nexa`.

## Output contract

All commands return structured JSON. A typical failure looks like this:

```json
{
  "success": false,
  "payload": {
    "error": "No device found",
    "code": "NO_DEVICE"
  }
}
```

Commands that add resolver metadata may also include fields such as `chain`, `path`, or an `addresses` array. `session connect` returns a payload that can include `passphraseState`, `deviceId`, `sessionId`, and a sample EVM address for verification.

## Important behavior and pitfalls

### Hidden-wallet selection

When a command needs a passphrase session and you do not provide `--use-empty-passphrase` or `--passphrase-state`, the CLI will:

1. Search for the device.
2. Unlock it if needed.
3. Prompt for wallet mode:
   - standard wallet
   - hidden wallet via system `pinentry`
   - hidden wallet on the device screen
4. Cache the resulting `passphraseState` and `sessionId` when secure storage is available.

### Secure storage backends

Session persistence is implemented with:

- macOS Keychain (`security`)
- Linux Secret Service (`secret-tool`)

If secure storage is unavailable, unsupported, or fails, the CLI continues to work, but later invocations may prompt for the hidden-wallet flow again because the session cache could not be reused.

### `pinentry` fallback

For hidden wallets, the CLI tries these programs in order:

- `pinentry-mac`
- `pinentry`
- `pinentry-gnome3`
- `pinentry-qt`

If none are available, or if the dialog is cancelled, the CLI falls back to on-device passphrase entry instead of aborting the command.

### Boolean flags are not uniform

Some command options are true boolean flags, such as:

- `--use-empty-passphrase`
- `--remove`
- `--yes`
- `--no-metamask-v4-compat`

Other options are parsed as string booleans and expect an explicit value:

- `--show-on-device true|false`
- `--enable true|false`
- `--passphrase-always-on-device true|false`
- `--haptic-feedback true|false`

### Message input formats

- For most `sign-message` chains, the CLI accepts either plain text or hex and normalizes it to the SDK's `messageHex` shape.
- For `ton` and `nostr`, `sign-message --message` is parsed as JSON because those SDK methods expect structured payloads.
- `verify-message` currently supports only `evm`, `btc`, and `starcoin`.

### Firmware updates are intentionally blocked

`firmware-update` and `firmware-update-ble` always return `FIRMWARE_UPDATE_NOT_SUPPORTED`. Use the OneKey App or <https://firmware.onekey.so/> for actual firmware updates.

## Where to find chain payload details

This CLI is a thin wrapper around the Hardware SDK APIs. For chain-specific request payloads such as EVM transactions, Bitcoin PSBT fields, or typed-data schemas, use the Hardware SDK documentation:

- <https://developer.onekey.so/connect-to-hardware/hardware-sdk>

The command routing and default path logic for this package live in `src/chains.ts`.
