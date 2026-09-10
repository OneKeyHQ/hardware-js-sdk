# Ledger Electron BLE connector

Ledger BLE discovery, MTU negotiation and DMK APDU transport for Electron.
React Native applications should continue using `@onekeyfe/hwk-ledger-connector-ble`.

## Renderer / background SDK

```ts
import { createLedgerElectronBleConnector } from '@onekeyfe/hwk-ledger-connector-electron-ble';

const connector = createLedgerElectronBleConnector(window.desktopApi.thirdPartyBle);
```

The host supplies an `ElectronBleApi` preload bridge. The root entry does not load
Electron or noble. Native Bluetooth access stays in the Electron main process.

## Host-owned Bluetooth

Reuse the host's third-party BLE interface. Discovery passes the Ledger service
UUIDs and vendor filter to `bridge.scan`. Connection passes the selected service,
write and notify characteristic UUIDs to `bridge.connect`. Profiles come from
the Ledger DMK device-model data source; USB VID/PID are not used.

This package does not depend on the Trezor connector, Electron or noble, and does
not register IPC handlers or instantiate a native Bluetooth backend. The host
owns the shared native instance, preload IPC, sender validation and pairing
authorization. Ledger MTU negotiation and APDU framing remain in this package.

## Validation

Run `yarn test --runInBand`, `yarn build`, and `yarn verify:types` in this package.
The transport tests use a synthetic bridge; they do not establish physical-device
compatibility. Hardware validation must cover discovery, initialized request /
response, disconnect, and reconnect for each vendor.
