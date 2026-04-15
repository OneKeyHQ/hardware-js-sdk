# @onekeyfe/hardware-cli — DEPRECATED

> **⚠️ DEPRECATED**: This CLI is superseded by the `onekey` CLI (`@onekeyfe/cli`).
> Use `onekey --hardware` for wallet operations and `onekey device` for device management.
> This package will be removed in a future release.

## Migration

| Old (`onekey-hw`) | New (`onekey`) |
|---|---|
| `onekey-hw search` | `onekey device search` |
| `onekey-hw lock` | `onekey device lock` |
| `onekey-hw device-verify` | `onekey device verify` |
| `onekey-hw firmware-check` | `onekey device firmware` |
| `onekey-hw change-pin` | `onekey device change-pin` |
| `onekey-hw toggle-passphrase --enable true` | `onekey device toggle-passphrase --enable true` |
| `onekey-hw device-settings --label "..."` | `onekey device settings --label "..."` |
| `onekey-hw get-address --chain evm` | `onekey balance --chain eth --hardware` |
| `onekey-hw sign-transaction --chain evm` | `onekey transfer --hardware` |

Install the new CLI: `npm install -g @onekeyfe/cli`
