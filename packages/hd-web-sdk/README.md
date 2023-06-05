# `@onekeyfe/hd-web-sdk`

`@onekeyfe/hd-web-sdk` is a browser implementation of hardware-sdk that creates an iframe and communicates with transport through the iframe to avoid cross-domain issues.

## Installation

Install library as npm module:

```javascript
npm install @onekeyfe/hd-web-sdk
```

or

```javascript
yarn add @onekeyfe/hd-web-sdk
```

## Initialization

```javascript
import { HardwareSDK } from '@onekeyfe/hd-web-sdk';

function init() {
  HardwareSDK.init({
    debug: false,
    connectSrc: 'https://jssdk.onekeycn.com/'
  });
}
```

## Docs

Documentation is available [hardware-js-sdk](https://developer.onekey.so/connect-to-hardware/hardware-sdk/start)
