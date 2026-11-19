# OneKey Electrum adapter

This is a desktop Electrum Qt ≥4.8.4 adapter for initialized Pro2/Neo devices, Protocol V2 over Node USB. It supports single-signature Bitcoin/Testnet BIP44 legacy, BIP49 nested SegWit and BIP84 native SegWit accounts. Multisig, Taproot, other networks, message signing and device setup/firmware operations are outside this plugin.

Python owns the Qt/keystore integration, account and transaction conversion, local derivation and verification. A private stdio child imports **real** `@onekeyfe/hd-common-connect-sdk` and `@onekeyfe/hd-transport-usb`; SDK Core/transport owns discovery, active protocol detection, USB I/O, framing, wallet sessions, unlock and cleanup. There is no Python USB/protobuf implementation, HTTP server or arbitrary SDK-method dispatch.

## Build and install

Electrum loads an external plugin by reading the **entire zip into memory** and rejects a file over 10 MB. A Node binary alone is larger than that, and Electrum never extracts the zip to disk, so the runtime cannot be stored inside the plugin zip.

The redistributable is one outer archive with two parts:

- `onekey-<version>.zip` — the Python adapter Electrum authorizes. It stays under 10 MB.
- `onekey-runtime/` — official Node **22.21.1** for macOS arm64/x64, Windows x64/arm64, and Linux glibc x64/arm64, plus the pinned SDK and the `usb` prebuilds. The computer uses only its own Node binary. Alpine/musl is not supported.

Build from this repository (Node 22.21.1, Yarn 1.22.22, Git, Python ≥3.11). Plugin changes may be uncommitted. The SDK outside `plugins/electrum` must still match the source pin below.

Fixed inputs:

- SDK source commit: `38f0b8c5d8fb645c1652880eb099866de57280aa`, which is already on `onekey`. A squash merge does not keep a later commit of this PR reachable, so the build refuses to run unless the SDK outside `plugins/electrum` matches this commit. Plugin changes may be uncommitted.
- Common SDK and Node USB package compatibility version: `1.2.10`. This version string alone is insufficient; the source commit and its `yarn.lock` are the pin.
- Node **22.21.1**, Yarn **1.22.22**, Git, Python ≥3.11 for the build tools.
- `usb@^2.14.0` resolves to **2.16.0** in the pinned lockfile. Keep its native addon and transitive dependencies; copying only JavaScript files is insufficient.

From the repository root, with these tools already installed for your OS/CPU:

```sh
python3 plugins/electrum/build_runtime.py
python3 plugins/electrum/build.py
```

That writes `plugins/electrum/dist/onekey-electrum-<version>.zip`. Unzip it and run:

```sh
python3 install.py
```

`install.py` copies `onekey-runtime` and the plugin zip into Electrum's plugins directory (`~/.electrum/plugins` on macOS and Linux, `%APPDATA%\Electrum\plugins` on Windows). Restart Electrum, enable OneKey, and authorize the plugin zip when asked. The adapter loads `onekey-runtime/runtime.json` from that same directory. `ONEKEY_ELECTRUM_RUNTIME` can point at another manifest. `ELECTRUMDIR` selects a different Electrum profile, such as a testnet datadir.

`build_runtime.py` checks tracked repository inputs outside this adapter against the source pin, including root TypeScript/bundler configs, and rejects untracked or ignored additions outside known generated/cache directories. It installs with the frozen lockfile, builds the common entry and its SDK dependencies, then downloads the official Node binaries and copies the closed SDK/USB file set into `dist/onekey-runtime`. The bundled Node rechecks that file set before importing the SDK. A failure removes the bundle receipt.

The source-tree check still runs on the build machine: it binds the canonical checkout, lock bytes, helper files, and the SDK `dist` plus external packages, including every `usb` prebuild shipped by that package (`darwin-x64+arm64`, Linux glibc/musl, Windows). SDK packages must resolve to their source-tree workspaces. The installed runtime does not need Git or this checkout. It hashes the bundled files and the six Node binaries, and a load guard rejects any module that is not in the receipt. The build downloads Node from `nodejs.org` and checks `SHASUMS256.txt`. It does not download an SDK by version number, install drivers, or change system settings.

The SDK build uses the repository's workspace installation. Repository SDK builds use the checked-in protobuf JSON; do not regenerate protobuf or move submodules for this plugin. The native USB addon comes from the pinned `usb` prebuilds, not a per-machine compile of that package. A failed import smoke leaves no usable bundle receipt. This is a closed file list for the six desktop targets above, not a signature Electrum can verify and not a promise that every target has been run on hardware. Replacing the plugin zip changes its hash, so Electrum asks for authorization again.

On Linux, `onekey/56-onekey.rules` describes access for the current `1209:4f4c` firmware ID. An administrator may install an appropriate rule separately. Windows may need the appropriate USB driver configured separately. Neither the plugin nor the builder installs drivers/rules or requests elevated privileges.

## Wallet identity and recovery

The wizard asks explicitly for **standard**, **hidden** or **cancel**. PIN and passphrase entry happen on the device; the helper only accepts a fixed "enter on device" UI response and cannot receive a host PIN/passphrase. Standard/hidden selection is never inferred from `keepSession`, connection IDs or a previously unlocked device.

New keystores retain the public `{serialNo, deviceId, walletType, passphraseState}` binding alongside their account xpub. `serialNo` is physical identity; `deviceId` identifies the initialization lifetime, not a physical serial. Standard wallets have `passphraseState=null`; hidden wallets have a nonempty SDK-provided public wallet identity. Firmware session IDs never cross the SDK boundary. The wizard's public account binding is handed to the keystore when Electrum constructs it and is included in its normal dump. Wallets from the old Python implementation lack this metadata and must be recreated through the hardware wallet wizard; the plugin refuses to guess their device/wallet identity. Keep the original wallet file until the recreated account and history have been checked.

On reconnect the plugin requires the saved physical/initialization identity, passes the saved wallet intent to SDK recovery, and compares the returned account xpub to Electrum's xpub before address/signing operations. A hidden-wallet recovery never calls `select-hidden` again. The SDK may ask for device entry to restore the expected hidden wallet, but must reject a different `passphraseState`. A changed wallet, wiped device, timeout, cancellation, disconnect or child crash aborts the flow. Explicit rediscovery and a new client are required afterward; address/signing requests are never automatically replayed.

Python derives input/change public keys from the account xpub, checks their paths and scripts against Electrum descriptors, requires matching full previous transactions, and permits SIGHASH_ALL only. Change must be the account's internal branch. Returned signatures must have exactly one indexed signature per input, canonical low-S DER encoding, and verify through Electrum's `update_signatures` against a copy of the **original transaction** before applying them. `serializedTx` is discarded inside the helper. Device-displayed addresses must equal the independently derived Electrum address.

## Private IPC v1

Each UTF-8 JSON line has exactly `{v:1, generation, id, op, params}`. A launch has a random 128-bit hex generation. IDs are positive safe integers and strictly increase, including control frames. Both peers limit a line to **1 MiB including newline**. The helper allows at most **8 outstanding operations**, **200 inputs/outputs/reference transactions**, and **2000 inputs/outputs within a reference transaction**. Amounts are bounded decimal satoshi strings; hashes/scripts are bounded lowercase hex; identities are bounded strings. Unknown fields, methods, versions, stale IDs/generations, invalid paths and malformed data terminate the child.

| Operation | Exact params | Result |
| --- | --- | --- |
| `hello` | `{}` | protocol and pinned SDK version; SDK `init({env:'node-usb',debug:false})` must return true |
| `search` | `{}` | supported initialized V2 devices, projected to connectId/serialNo/deviceId/model |
| `state` | `connectId` | verified serialNo/deviceId/model |
| `open` | `connectId, mode` (`standard`/`select-hidden`) | public wallet binding |
| `xpub` | `connectId, binding, coin, path, scriptType` | xpub and optional public root fingerprint |
| `address` | same as xpub, five-component path | device-confirmed address (always showOnOneKey) |
| `sign` | `connectId, binding, coin, inputs, outputs, refTxs, version, locktime` | dense indexed DER signatures only |
| `ui` | `target, token, choice:'device'` | no response; valid only for the active passphrase selection event |
| `cancel` | `target` | acknowledges SDK cancellation then terminates the generation |
| `dispose` | `{}` | invokes SDK dispose |

Results are exactly `{v,generation,id,ok:true,result}` or `{v,generation,id,ok:false,error:{code}}`; codes are static and never include SDK error messages/params. UI events are exactly `{v,generation,id,event,token}` with only pin/passphrase/button/passphrase-select indicators (Core close notifications are consumed locally), never raw SDK device objects. UI replies have no response frame. Cancel has a null result acknowledgement; Python waits at most 250 ms for it before killing the child, and discards any original response after cancellation. All operations are serialized in a bounded queue, including calls to different devices, so the SDK's uncorrelated public UI response API has only one possible waiting operation. Cancel/UI frames bypass this queue. Both queued and running requests have a 120-second deadline; Python discovery/startup uses 30 seconds. Python's absolute deadline begins before waiting for the serialization lock and also bounds child startup. Cancelled/expired queued calls return without sending an operation or disturbing the active caller; the pipe writer rechecks cancellation/deadline before writing queued bytes. A dead child suppresses late responses and queued work. Reader/writer threads bound pipe waits; request waits run on Electrum's hardware thread, never its Qt GUI thread.

Stdout is reserved before SDK imports and contains IPC only. Child stderr and SDK diagnostics are discarded, SDK debug is false, and Node preload/debug environment hooks are removed at spawn. Requests, SDK response objects, PINs/passphrases and firmware sessions are never written to files or diagnostics. Binding metadata in the Electrum keystore is public identity, not a secret/session credential.

## Focused validation

```sh
python3 -m venv plugins/electrum/.venv
plugins/electrum/.venv/bin/python -m pip install -r plugins/electrum/requirements-dev.txt
PYTHONPATH=plugins/electrum plugins/electrum/.venv/bin/python -m unittest discover -s plugins/electrum/tests -v
node --test plugins/electrum/tests/helper.test.cjs plugins/electrum/tests/pin.test.cjs
plugins/electrum/.venv/bin/python -m flake8 plugins/electrum/onekey plugins/electrum/tests plugins/electrum/build.py plugins/electrum/build_runtime.py --select=E9,F63,F7,F82
python3 plugins/electrum/build_runtime.py
python3 plugins/electrum/build.py
yarn agent:check --profile commit
```

The Node tests mock SDK calls but execute the real helper dispatcher and production entry (with test-only module injection). Receipt tests use synthetic package/native files and Git metadata to exercise actual file hashing, drift detection and rejection before mock SDK import; they do not establish real SDK/native import compatibility. Discovery skips successful, explicitly uninitialized/loader Pro2/Neo states, while incomplete state and SDK communication failures remain fatal. The stdlib Python IPC tests exercise real child processes without Electrum or USB. Electrum tests require the pinned Electrum 4.8.4/PyQt dependencies and native secp256k1 prerequisites; they test the actual adapter, local derivation, original-transaction signature checks, hidden-wallet binding and Electrum's ZIP importer. A missing dependency is a failure, not a skipped security check. The real import smoke performed by the runtime builder is separate from mock tests.

Before release, independently validate each OS/CPU and Electrum build: external ZIP first load, wizard creation and saved binding after restart, both Pro2/Neo, all three script types on Bitcoin/Testnet, standard/hidden/Attach-PIN recovery, correct and wrong passphrases, address comparison, signing, cancellation during confirmation, unplug/replug, lock/reconnect and cleanup. No real-device or platform verification is implied by mock tests. Do not use real secrets in fixtures or diagnostics.
