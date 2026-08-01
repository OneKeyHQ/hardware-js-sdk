# React Native BLE Demo (Expo Dev Client)

This demo shows how to use `@onekeyfe/hd-ble-sdk` in a React Native (Expo Dev Client) app to connect to a OneKey hardware device via BLE, including scanning, fetching features, getting addresses and signing, with realtime logs.

> Important: You must run a Dev Client built by `expo run:ios|android`. Expo Go does not include required native BLE modules.

## Install

```
yarn
```

Declared dependencies in `package.json`:

- `@onekeyfe/hd-ble-sdk` (SDK)
- `@onekeyfe/hd-core` (events & types)
- `@onekeyfe/react-native-ble-utils`, `react-native-ble-plx` (native BLE infrastructure)
- Polyfills: `buffer`, `process`, `react-native-get-random-values`, `react-native-url-polyfill`

## Metro config

Map Node APIs and enable package exports in `metro.config.js`:

```js
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer/'),
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('stream-browserify'),
  process: require.resolve('process/browser'),
  events: require.resolve('events/'),
  http: require.resolve('http-browserify'),
  https: require.resolve('https-browserify'),
  zlib: require.resolve('browserify-zlib'),
  util: require.resolve('util/'),
  url: require.resolve('url/'),
  path: require.resolve('path-browserify'),
};
config.resolver.unstable_enablePackageExports = true; // enable @noble/hashes/blake2b
```

## Minimal code snippet

Register RN transport side-effects before SDK init, set polyfills, then init the SDK:

```ts
// Polyfills
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
// @ts-ignore
global.Buffer = global.Buffer || require('buffer').Buffer;
// @ts-ignore
global.process = global.process || require('process');

// Register RN transport
import '@onekeyfe/hd-transport-react-native';

import HardwareSDK from '@onekeyfe/hd-ble-sdk';

await HardwareSDK.init({ env: 'react-native', debug: __DEV__, fetchConfig: true });
```

## Permissions (Expo app.json)

Declared in `app.json`:

- iOS: `NSCameraUsageDescription`, `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`
- Android: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`

> Android 12+ requires the system Location toggle to be ON to scan BLE devices.

## Run on real devices (USB)

- iOS
  - Enable Developer Mode, connect via USB and trust the computer
  - Build Dev Client: `yarn ios` (alias of `expo run:ios --device`)
  - Start bundler: `yarn ios:devclient` (alias of `expo start --dev-client -c`)

- Android
  - Enable Developer Options and USB Debugging; verify with `adb devices`
  - Build Dev Client: `yarn android` (alias of `expo run:android --device`)
  - USB bundler (optional): `yarn android:usb` (runs `adb reverse` then launches Dev Client)

## Features in this demo

- `Init SDK`: Initialize BLE SDK (subscribe to UI/DEVICE/LOG events)
- `Start Scan`: Scan devices (with permission & BLE state checks; 15s timeout + `sdk.cancel()`)
- `Get Features`: Read device features (includes `device_id`)
- `Get EVM Address`: Get EVM address
- `Sign Message (EVM)`: Sign an EVM message
- `Logs`: Realtime SDK & Transport logs

> Buttons are disabled during operations (scanning/busy) and automatically re-enabled when done.

## Troubleshooting

- `new NativeEventEmitter() requires a non-null argument`
  - Native BLE module is not compiled into the app. Build a Dev Client with `expo run:ios|android` (do not use Expo Go).

- Stuck in `Scanning…`
  - Android: System “Location” toggle must be ON, and permissions granted; ensure Bluetooth is ON
  - Ensure the device is advertising (not in bootloader-only mode)
  - This demo adds a 15s timeout with `sdk.cancel()`, you can retry
