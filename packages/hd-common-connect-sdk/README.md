# `@onekeyfe/hd-common-connect-sdk`

`@onekeyfe/hd-common-connect-sdk` is a libarary that runs in the node enviroment. And communicates with transport in the normal way.

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
