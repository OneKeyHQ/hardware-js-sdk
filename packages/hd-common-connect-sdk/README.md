# `@onekeyfe/hd-common-connect-sdk`

`@onekeyfe/hd-common-connect-sdk` is a unified in-process Hardware SDK entry point that runs Core and the selected transport directly in Node.js, Electron, browser/extension, and native bridge (`lowlevel`) runtimes.

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
  });
}
```

## Local LowLevel host

The named `HardwareSDKLowLevel` export runs Core and the selected transport in the
same JavaScript runtime. A trusted local host, including an extension offscreen
document, can use it without a hardware SDK iframe:

```typescript
import { HardwareSDKLowLevel } from '@onekeyfe/hd-common-connect-sdk';

await HardwareSDKLowLevel.init({ env: 'webusb' });
// Forward SDK calls and correlated UI responses through the host's existing bridge.
await HardwareSDKLowLevel.dispose();
```

The package's `browser` mapping excludes the native USB dependency from browser
bundles. The browser host still needs a `Buffer` polyfill for Core and its
dependencies. Use `env: 'node-usb'` from a Node.js build.

The host still obtains WebUSB permission through a user gesture and handles device
confirmation, PIN and passphrase events. An extension service worker should proxy
to its offscreen host. Use one active SDK host per runtime and dispose it before
replacing it. The package's default SDK export keeps its existing behavior.

## Desktop USB identity discovery

`probeUsbDeviceIdentities({ commType: 'webusb' | 'bridge' })` is a named export for
choosing a Desktop connection before switching the active SDK. It does not require
SDK initialization, dispose Core, change BLE settings, or open a wallet session.
Concurrent probes for the same mode share one pending request.

```typescript
import { probeUsbDeviceIdentities } from '@onekeyfe/hd-common-connect-sdk';

const devices = await probeUsbDeviceIdentities({ commType: 'webusb' });
```

Each result contains `path`, `serialNo`, `deviceId`, `deviceType`, `connectProtocol`,
and `commType`. `path` locates the USB endpoint; compare `serialNo` with the target's
physical identity, or `deviceId` for legacy devices without a physical serial.
Missing identities remain `null`; a descriptor path is never substituted for them.
The protocol comes from an active device response. V1 uses read-only Features;
V2 uses hardware DeviceInfo and does not query a wallet session.

Busy, ambiguous, disconnected, or unverified endpoints are omitted. An active
WebUSB request's identity can be reused only for the exact USB handle it owns.
Discovery releases only handles it acquired and does not replace the active SDK's
disconnect observer. An empty result is not proof that the device is absent.
Keep the selected transport fixed during a hardware operation; reevaluate it
between operations. Firmware updates must separately validate their live target.

## Docs

Documentation is available [Hardware SDK Getting Started](https://developer.onekey.so/en/hardware-sdk/getting-started)

## Examples
// TODO: add example url
