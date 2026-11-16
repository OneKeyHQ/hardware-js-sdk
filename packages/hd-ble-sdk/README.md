# `@onekeyfe/hd-ble-sdk`

`@onekeyfe/hd-ble-sdk` is a library provided for mobile clients. It uses `@onekeyfe/hd-transport-react-native` (BLE) by default. Pass `env: 'react-native-usb'` to `init()` to use Android USB host transport (`@onekeyfe/hd-transport-react-native-usb`); any other env keeps BLE.

## Installation

Install library as npm module:

```javascript
npm install @onekeyfe/hd-ble-sdk
```

or

```javascript
yarn add @onekeyfe/hd-ble-sdk
```

## Initialization

```javascript
import HardwareSDK from '@onekeyfe/hd-ble-sdk';

function init() {
  HardwareSDK.init({
    debug: false,
  });
}
```

## Docs

Documentation is available [Hardware SDK Getting Started](https://developer.onekey.so/en/hardware-sdk/getting-started)

## Examples
// TODO: add example url
