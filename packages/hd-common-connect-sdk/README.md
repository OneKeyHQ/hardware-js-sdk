# `@onekeyfe/hd-common-connect-sdk`

`@onekeyfe/hd-common-connect-sdk` selects the transport for Node, browser WebUSB,
Electron BLE, low-level, and emulator environments. It does not use an iframe.

## Installation

Install library as npm module:

```javascript
npm install @onekeyfe/hd-common-connect-sdk
```

or

```javascript
yarn add @onekeyfe/hd-common-connect-sdk
```

## Initialization

```javascript
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';

function init() {
  HardwareSDK.init({
    debug: false,
    env: 'webusb',
  });
}
```

Test and factory-only methods are intentionally absent from the default SDK. Use
`@onekeyfe/hd-test-api` when those methods are required.

## Docs

Documentation is available [hardware-js-sdk](https://developer.onekey.so/connect-to-hardware/hardware-sdk/start)

## Examples

// TODO: add example url
