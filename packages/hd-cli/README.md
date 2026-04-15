# @onekeyfe/hardware-cli — DEPRECATED

> **⚠️ DEPRECATED**: This package is superseded by `@onekeyfe/cli`.
> Use `onekey --hardware` for wallet operations and `onekey device` for device management.
> This package will be removed in a future release.

## Migration

```bash
# Old
npm install -g @onekeyfe/hardware-cli
onekey-hw search
onekey-hw get-address --chain evm --use-empty-passphrase

# New
npm install -g @onekeyfe/cli
onekey device search
onekey balance --chain eth --hardware
```

See the [OneKey CLI documentation](https://github.com/OneKeyHQ/app-monorepo/tree/main/apps/cli) for full usage.

## License

Apache-2.0
