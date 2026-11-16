# `@onekeyfe/hd-transport-react-native-usb`

Android USB host (OTG) transport for OneKey hardware wallets in React Native apps. Talks to Pro, Pro 2, Neo, Classic 1S, and other OneKey USB devices over a USB-C cable using `android.hardware.usb.UsbManager` bulk and interrupt transfers.

iOS is out of scope: there is no general USB host API. On iOS this package reports no devices (`enumerate()` returns `[]`) and `acquire()` fails with a typed `HardwareError` instead of crashing.

Protocol V1 and Protocol V2 are both supported. Protocol is detected from an active device response, never from PID or USB descriptors alone.

Packets cross the React Native bridge as **standard Base64** (no data-URL prefix).

## Device identity (`path` / `connectId`)

Public `path` (exposed by `@onekeyfe/hd-core` as `connectId` for USB environments) is computed with `resolveOneKeyUsbDevicePath({ vendorId, productId, productName, serialNumber })` from `@onekeyfe/hd-shared`, using the trimmed USB serial number — matching WebUSB and `node-usb`.

- **Stable across re-plug:** Android's `UsbDevice.getDeviceName()` (`/dev/bus/usb/...`) changes on every re-plug and is kept internal as a native `handle`. JS maintains the `path -> handle` mapping and refreshes it on `enumerate()`, `acquire()`, and attach/detach events, so `connectId` stays the same across re-plugs.
- **Model behavior:**
  - On **Classic / Classic 1S / Pro** (and Touch), the USB serial equals `Features.device_id` and changes after a device wipe.
  - On **Pro 2 / Neo**, the USB serial is the factory serial number and stays stable across wipes.
  - **Bootloader mode** may report a different serial or an all-zero placeholder (such as `"000000000000"` or `"000000000000000000000000"`). All-zero placeholder serials are preserved as-is by `resolveOneKeyUsbDevicePath` so `@onekeyfe/hd-core` (`DevicePool.canPathIdentifyDevice`) treats them as non-identifying, matching WebUSB and `node-usb`.
- **Fallback for empty/unreadable serials:** The `usb-<vid4>-<pid4>-<productName-slug>` fallback only applies when the USB serial number is empty or unreadable even after permission is granted. **Note:** this fallback identifier is not unique if two identical unprovisioned devices with blank serials are attached simultaneously.
- **Shared Trezor PIDs (`0x1209:0x53c0` / `0x1209:0x53c1`):** Trezor shares these `pid.codes` product IDs with OneKey. Devices with a known Trezor manufacturer or a `null`/unknown `manufacturerName` on those two PIDs are excluded (neither prompted nor listed). OneKey-only PIDs (`0x4f4a`, `0x4f4b`, `0x4f4c`) are unaffected.

## Permission flow

Android restricts `UsbDevice.getSerialNumber()` until USB permission is granted (Android 10 / API 29+ throws `SecurityException`). Because an unpermitted device has no readable serial on Android, it could never be listed under a stable serial-based `connectId` without requesting permission first. This intentionally diverges from WebUSB (where the host app calls `navigator.usb.requestDevice()` out-of-band before `enumerate()` lists authorized devices):

1. `enumerate()` reads attached OneKey devices from the native module and calls `UsbManager.requestPermission` **sequentially, one device at a time** (never stacked dialogs) for unpermitted devices, skipping handles in `deniedHandles` (denied handles are not re-prompted during the current plug session until re-attached). Concurrent callers for the same handle share one in-flight promise.
2. Each permission request is bounded by `PERMISSION_REQUEST_TIMEOUT_MS` (30s). If the dialog is never answered or no broadcast arrives, the request times out and is treated as denied for the current plug session (`deniedHandles`). `enumerate()` does not start another permission dialog while the previous native request is still outstanding (the system dialog cannot be dismissed from JS) and returns any already-permitted devices. `acquire()` waits for that outstanding native request to settle before prompting the next candidate.
3. `enumerate()` re-reads the device list and returns only devices with permission, using the stable serial-based `path`. Denied devices are logged at debug and omitted.
4. Android revokes USB permission when a device is unplugged. If `acquire(path)` is called when `path` is not yet mapped to a live handle (for example right after a re-plug when the serial is unknown), it probes candidate unpermitted handles (skipping `deniedHandles` and handles already mapped to a different path) one at a time, re-reading `getDevices()` after each grant and stopping as soon as a device's resolved path matches `path` (or throwing `DeviceNotFound` if none matches). Concurrent `acquire(path)` calls for the same path share one resolution promise. Denied permission surfaces as `HardwareErrorCode.WebUsbDeviceAccessError`.
5. Host apps declaring the `USB_DEVICE_ATTACHED` intent filter below get USB permission pre-granted by Android on attach, so no extra permission dialog appears during `enumerate()` or `acquire()`.

## Host-app integration

1. Install the workspace package and autolink. `react-native.config.js` registers `so.onekey.hardware.usb.OneKeyUsbPackage` on Android and disables iOS.
2. Peer-depend on `react-native`. Do not add this package on iOS-only targets if you want a smaller binary; leaving it linked is still safe.
3. Init the SDK with `env: 'react-native-usb'` (for example via `@onekeyfe/hd-ble-sdk` `init({ env: 'react-native-usb' })`). The default BLE env is unchanged.

`android.hardware.usb.host` is declared `required="false"` so the app still installs on phones without USB host.

## Launch the app when a OneKey is plugged in (optional)

Add the following inside your host app's launcher `<activity>` in `AndroidManifest.xml`:

```xml
<intent-filter>
  <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
</intent-filter>
<meta-data
  android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
  android:resource="@xml/onekey_usb_device_filter" />
```

When a matching OneKey device is plugged in, Android shows `"Open <app> when <device> is connected?"` with an `"Always"` checkbox. When the user accepts, Android launches the app and automatically grants USB permission for that device (so no extra permission dialog is shown during `enumerate()` or `acquire()`).

The filter resource ships in this package at `android/src/main/res/xml/onekey_usb_device_filter.xml` and is automatically merged into the host app's resources by Android's resource merger, or the host app can copy it directly. Because Trezor shares the `0x1209:0x53c0` and `0x1209:0x53c1` `pid.codes` IDs with OneKey, those two entries are restricted by `manufacturer-name="OneKey"` (Classic / Classic 1S / Pro firmware) and `manufacturer-name="OneKey Limited"` (Pro bootloader, Pro 2 / Neo) so plugging in a Trezor will not launch the app; OneKey-only PIDs (`0x4f4a`, `0x4f4b`, `0x4f4c`) omit `manufacturer-name`.

A user-facing on/off toggle for this auto-launch behavior is not possible purely in JS; supporting an in-app toggle would require native `PackageManager.setComponentEnabledSetting` on an `<activity-alias>` (optional).
