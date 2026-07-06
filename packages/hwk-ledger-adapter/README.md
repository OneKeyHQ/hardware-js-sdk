# `@onekeyfe/hwk-ledger-adapter`

`@onekeyfe/hwk-ledger-adapter` exposes a vendor-neutral hardware wallet interface for Ledger devices. It sits on top of a transport-specific connector and handles device discovery, request/response UI events, chain-method dispatch, retry logic, and device fingerprint checks.

## Related packages

- `@onekeyfe/hwk-adapter-core` - shared types, event constants, and error codes
- `@onekeyfe/hwk-ledger-connector-webhid` - browser connector for WebHID
- `@onekeyfe/hwk-ledger-connector-ble` - React Native connector for BLE

## Installation

```bash
npm install @onekeyfe/hwk-adapter-core @onekeyfe/hwk-ledger-adapter @onekeyfe/hwk-ledger-connector-webhid
```

Use `@onekeyfe/hwk-ledger-connector-ble` instead of the WebHID connector when you integrate in React Native over BLE.

## Quick start

```ts
import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';
import { LedgerAdapter } from '@onekeyfe/hwk-ledger-adapter';
import { createLedgerWebHidConnector } from '@onekeyfe/hwk-ledger-connector-webhid';

const connector = createLedgerWebHidConnector();
const hw = new LedgerAdapter(connector, {
  autoInstallApp: true,
});

hw.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
  // Reply only after your browser or native permission flow succeeds.
  hw.uiResponse({
    type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
    payload: { granted: true },
  });
});

hw.on(UI_REQUEST.REQUEST_INSTALL_APP, () => {
  // Replace this with a real user confirmation in your app UI.
  hw.uiResponse({
    type: UI_RESPONSE.RECEIVE_INSTALL_APP,
    payload: { confirmed: true },
  });
});

const devices = await hw.searchDevices();
if (!devices.length) {
  throw new Error('No Ledger device found');
}

const [{ connectId, deviceId = '' }] = devices;

await hw.connectDevice(connectId);

const result = await hw.evmGetAddress(connectId, deviceId, {
  path: "m/44'/60'/0'/0/0",
  showOnDevice: false,
});

if (!result.success) {
  throw new Error(result.payload.error);
}

console.log(result.payload.address);

await hw.dispose();
```

## What the adapter provides

- Transport-agnostic `IHardwareWallet` methods for `evm`, `btc`, `sol`, and `tron`
- Automatic permission and reconnect request events
- Optional app installation flow through `autoInstallApp`
- Batched `allNetworkGetAddress(...)` calls with fingerprint verification
- `cancel(connectId?)` for aborting the active operation

## Integration notes

### UI request / response flow is required

The adapter emits request events such as:

- `ui-request-device-permission`
- `ui-request-device-connect`
- `ui-request-install-app`

Your host app must answer them through `hw.uiResponse(...)`. If `ui-request-device-permission` is never answered, the request times out instead of waiting forever.

### Pick the connector for the host platform

- Use `createLedgerWebHidConnector()` in browser environments.
- Use `createLedgerBleConnector()` in React Native BLE environments.
- BLE flows require an explicit `connectId` returned by discovery. The adapter does not auto-pick a BLE device.

### Do not persist `connectId`

`connectId` is a transport-session identifier. It can change after USB replug or WebHID rediscovery. If you need a stable identity for later verification, derive and persist a chain fingerprint with `getChainFingerprint(...)` after the first successful device call.

## Troubleshooting

### No device found

Listen for `ui-request-device-connect` and prompt the user to connect and unlock the Ledger device before retrying.

### Multiple USB devices connected

The adapter refuses to auto-pick between multiple Ledger USB devices and returns `DeviceOneDeviceOnly`. Ask the user to leave a single device connected or add an explicit device selection step in your host app.

### Wrong app open or app missing

Chain calls can fail with `WrongApp` or `AppNotInstalled`. If you enable `autoInstallApp`, also handle `ui-request-install-app` and the forwarded `ui-event` progress updates.

### Permission request keeps failing

The permission response must reflect the real browser or native permission result. Reply with `granted: false` when the platform denies access so your app can surface the correct failure reason.
