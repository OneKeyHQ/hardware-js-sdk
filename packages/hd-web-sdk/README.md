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
    // omit connectSrc — SDK fills https://jssdk.onekey.so/<installed-version>/
  });
}
```

## Docs

Documentation is available [Hardware SDK Getting Started](https://developer.onekey.so/en/hardware-sdk/getting-started)
