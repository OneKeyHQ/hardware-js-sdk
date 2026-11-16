# `@onekeyfe/hd-transport-react-native-usb`

Android USB host (OTG) transport for OneKey hardware wallets in React Native apps. Talks to Pro, Pro 2, Neo, Classic 1S, and other OneKey USB devices over a USB-C cable using `android.hardware.usb.UsbManager` bulk and interrupt transfers.

iOS is out of scope: there is no general USB host API. On iOS this package reports no devices (`enumerate()` returns `[]`) and `acquire()` fails with a typed `HardwareError` instead of crashing.

Protocol V1 and Protocol V2 are both supported. Protocol is detected from an active device response, never from PID or USB descriptors alone.

Packets cross the React Native bridge as **standard Base64** (no data-URL prefix).

Device `path` is always the Android `UsbDevice.getDeviceName()` (`/dev/bus/usb/...`). The path is stable for one plug session; re-plug yields a new path, like the BLE/WebUSB reconnect flow — core re-matches by device features. `serialNumber` is reported as an informational field only (`null` without permission).

## Host-app integration

1. Install the workspace package and autolink. `react-native.config.js` registers `so.onekey.hardware.usb.OneKeyUsbPackage` on Android and disables iOS.
2. Peer-depend on `react-native`. Do not add this package on iOS-only targets if you want a smaller binary; leaving it linked is still safe.
3. Optional: add an intent-filter so Android can resume the app when a OneKey device is attached:

```xml
<activity>
  <intent-filter>
    <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
  </intent-filter>
  <meta-data
    android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
    android:resource="@xml/onekey_usb_device_filter" />
</activity>
```

Copy `android/src/main/res/xml/onekey_usb_device_filter.xml` into the host app, or depend on the library resource. The filter IDs match `ONEKEY_WEBUSB_FILTER` in `@onekeyfe/hd-shared`.

4. Permission: the first `acquire()` calls `UsbManager.requestPermission`. The user must grant access in the system dialog. Denied permission surfaces as `HardwareErrorCode.WebUsbDeviceAccessError`.
5. Init the SDK with `env: 'react-native-usb'` (for example via `@onekeyfe/hd-ble-sdk` `init({ env: 'react-native-usb' })`). The default BLE env is unchanged.

`android.hardware.usb.host` is declared `required="false"` so the app still installs on phones without USB host.
