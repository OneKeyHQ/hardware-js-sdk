# Desktop BLE for third-party hardware wallets

`@onekeyfe/hwk-desktop-noble-ble` owns Ledger/Trezor BLE discovery, GATT I/O,
Windows OS pairing, cancellation, and connection cleanup in the Electron main
process. The host owns the native Windows pairing executable, IPC sender authorization,
UI, translations, and packaging.
It does not replace the separate OneKey `hd-transport-electron` transport.

## Main-process setup

Use `initThirdPartyBleSupport` once per active renderer. Existing integrations
without `windowsPairing` retain native-only behavior. On macOS/Linux the Windows
option is ignored; this option does not enable Linux BLE support.

```ts
import path from 'path';
import { app, dialog, ipcMain } from 'electron';
import {
  initThirdPartyBleSupport,
  withThirdPartyBleIpcErrors,
} from '@onekeyfe/hwk-desktop-noble-ble';
import type { IpcMainLike } from '@onekeyfe/hwk-desktop-noble-ble';

// Run after creating your BrowserWindow. Do not expose these handlers to DApps.
const authorizedIpcMain: IpcMainLike = {
  handle(channel, listener) {
    ipcMain.handle(channel, (event, ...args) => {
      if (window.isDestroyed() || event.sender !== window.webContents) {
        throw new Error('BLE IPC sender is not authorized');
      }
      return listener(event, ...args);
    });
  },
  removeHandler: channel => ipcMain.removeHandler(channel),
};

const ble = initThirdPartyBleSupport(window.webContents, {
  ipcMain: withThirdPartyBleIpcErrors(authorizedIpcMain),
  windowsPairing: process.platform === 'win32' ? {
    helperPath: app.isPackaged
      ? path.join(process.resourcesPath, 'ble-pair', 'onekey-ble-pair.exe')
      : path.join(
          app.getAppPath(), 'resources', 'ble-pair', `win-${process.arch}`,
          'onekey-ble-pair.exe'
        ),
    async onPairingRequest({ pin, signal }) {
      if (signal.aborted || window.isDestroyed()) return 'cancel';
      const { response } = await dialog.showMessageBox(window, {
        message: pin,
        detail: 'Compare this code with your device before confirming.',
        buttons: ['Confirm', 'Cancel'],
        cancelId: 1,
        defaultId: 0,
        noLink: true,
        signal,
      });
      return !signal.aborted && response === 0 ? 'confirm' : 'cancel';
    },
  } : undefined,
});
```

The same `windowsPairing` option works with `new NobleBleHandler(options)` for
hosts that do not use Electron IPC. Neither integration needs an IPC wrapper,
vendor timeout switches, a global decision callback, or a copy of the pairing
state machine. The helper path must be host-controlled, never renderer input.
Missing/unexecutable helpers fail with a structured `BleConnectFailed` error
instead of silently skipping a configured Windows pairing flow.

`onPairingRequest` is a numeric-comparison UI callback, not a device PIN entry or
Trezor THP authorization callback. Display the supplied code, require an explicit
user decision, and never log/persist it. A throwing or rejected callback declines
the OS request. Observe `signal`: close the UI as soon as it aborts, even if the
underlying Windows process is still cleaning up. A late answer is ignored and
cannot confirm a later ceremony. With a custom UI, implement the same lifetime
contract rather than adding an independent timeout.

## Windows packaging

The SDK does not include or build a native pairing executable. The host must
provide a trusted, compatible helper through `windowsPairing.helperPath`, along
with `onPairingRequest`. The OneKey Rust implementation and its x64/ARM64 binaries
are maintained in the
[App monorepo](https://github.com/OneKeyHQ/app-monorepo/tree/3f48ac0c1d22c757c64b27566e8d4cdde69262ba/apps/desktop/native-modules/onekey-ble-pair).
Use the matching [x64/ARM64 binaries from the same revision](https://github.com/OneKeyHQ/app-monorepo/tree/3f48ac0c1d22c757c64b27566e8d4cdde69262ba/apps/desktop/public/static/bin/ble-pair),
not assets from a different branch. That repository owns native builds and binary
updates. This revision emits structured `link` and `pairing-result` events and
continues reading host cancellation after confirmation.

Copy the **target build architecture** outside ASAR. For example, if the host
stores its executables under `resources/ble-pair/win-{x64,arm64}`, add this to its
electron-builder Windows configuration:

```js
win: {
  extraResources: [{
    from: 'resources/ble-pair/win-${arch}',
    to: 'ble-pair',
    filter: ['onekey-ble-pair.exe'],
  }],
}
```

Keep this SDK package external when bundling the main process, and install a
compatible `@stoprocent/noble` Electron native build. Do not put the helper inside
ASAR or choose its architecture from the machine performing a cross build.
Store/MSIX builds must include the same resource. Installing this package does
not download or compile a helper, and does not supply the host's native Noble
patches or Electron build.

The host helper must implement the process protocol used by
`src/windowsPairingHelper.ts`: accept `pair --address`, emit JSON events on stdout,
and read `confirm`/`cancel` decisions from stdin. Keep host binary updates
compatible with that protocol. Without the `windowsPairing` option, the SDK
retains its existing native-only connection behavior.

## Lifecycle and error recovery

The SDK validates the vendor/GATT profile before any pairing work. It uses the
selected vendor's discovered address, pauses scanning while retaining the target,
and serializes Windows ceremonies across handler instances. It never chooses a
different device automatically. Native GATT connect timeout starts after OS
pairing, so user confirmation does not consume the 31-second connect deadline.
Discovery and scan pause have a separate deadline using `connectTimeoutMs`.
Cancellation or that deadline settles the caller independently of native scan
cleanup; a late discovery cannot start a cancelled pairing.

- Ledger numeric comparison expires after 30 seconds. A pending prompt closes on
  device disconnection.
- Trezor permits a one-second recovery window for transient pairing link changes.
  A persistent disconnection closes an unanswered prompt. This observation is a
  pairing failure, not proof that the user explicitly cancelled on the device.
- An unanswered ceremony is bounded at 60 seconds; completion after host
  confirmation is bounded at 30 seconds. Cancelling declines the WinRT deferral
  before a five-second fallback kills a stuck helper.
- Only the first GATT connection after a **fresh bond** may retry once. The SDK
  does not retry a timed-out native connect or replay address/signing commands.
- A bonded Ledger's immediate GATT link drop can report `BleBondInvalid`. The same
  symptom on Trezor is left as a connection error because locking can cause it.

Call `cancelPairing({ vendor, id })` to cancel one target, `{ vendor }` for one
vendor, or omit the argument to cancel all. This also covers queued OS pairing,
native connect, and the delayed fresh-bond retry. Cancellation never answers
another device's prompt. `disconnect(id)` releases an established connection.

On window retirement, await `ble.dispose()` before registering replacement IPC
handlers. This cancels pending OS pairing and closes its prompt. For app shutdown,
use `disposeForAppQuit`; when sharing noble with another transport, dispose both
first and deduplicate their `releaseNoble` callbacks before stopping the native
manager, as documented by `ThirdPartyBleSupportHandle`.

Errors preserve `code`, `message`, and `params` across
`withThirdPartyBleIpcErrors`. The preload must check
`isThirdPartyBleIpcErrorResponse(response)` and throw `response.error` as data.
The renderer-side connector uses `rehydrateElectronBleErrors` to restore these
rejections as structured errors; that function does not unwrap successful IPC
responses. Forward the normal response unchanged.
Keep renderer sender authorization outside the error envelope as in the example.
Do not reduce structured errors to message-only strings.

Host recovery UI should offer these steps:

| Failure | User action |
| --- | --- |
| `BlePairingCancelled` | Return to device selection; let the user retry when ready. |
| Pairing timeout/device disconnect | Unlock/wake the device and reopen pairing, then retry. |
| Trezor no longer reachable | Open **Pair new device** on the Safe 7, rescan, and select the current numbered entry. BLE address/name are discovery locators, not wallet identity. |
| `BleBondInvalid` | Forget the device in Windows Bluetooth settings, reset its host pairing if needed, then pair again. |
| Repeated GATT failure | Offer system Bluetooth pairing repair as troubleshooting; do not claim every unreachable device has an invalid bond. |

Use live SDK device identity for wallet matching, not a remembered BLE address or
Trezor name suffix. Windows OS bonding and Trezor THP authorization are separate
layers; the vendor adapter still owns THP events and permissions.
