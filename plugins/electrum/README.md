# OneKey Electrum adapter

This is a desktop Electrum Qt ≥4.8.4 adapter for initialized Pro2/Neo devices, Protocol V2 over Node USB. It supports single-signature Bitcoin/Testnet BIP44 legacy, BIP49 nested SegWit and BIP84 native SegWit accounts. Multisig, Taproot, other networks, message signing and device setup/firmware operations are outside this plugin.

Python owns the Qt/keystore integration, account and transaction conversion, local derivation and verification. A private stdio child imports **real** `@onekeyfe/hd-common-connect-sdk` and `@onekeyfe/hd-transport-usb`; SDK Core/transport owns discovery, active protocol detection, USB I/O, framing, wallet sessions, unlock and cleanup. There is no Python USB/protobuf implementation, HTTP server or arbitrary SDK-method dispatch.

## Build and install (source-tree development runtime)

**The Python ZIP is an adapter only. It does not contain Node, SDK packages or a native USB runtime.** No compatible npm publication or redistributable runtime is assumed. The supported development path builds the SDK from this repository and keeps that source tree and its dependencies in place.

Fixed inputs:

- SDK source commit: `b62d1005e1f97319d9fa8b550a60466099727f45` (the SDK/build inputs must match this commit; plugin changes can be uncommitted).
- Common SDK and Node USB package compatibility version: `1.2.10`. This version string alone is insufficient; the source commit and its `yarn.lock` are the pin.
- Node **22.21.1**, Yarn **1.22.22**, Git, Python ≥3.11 for the build tools.
- `usb@^2.14.0` resolves to **2.16.0** in the pinned lockfile. Keep its native addon and transitive dependencies; copying only JavaScript files is insufficient.

From the repository root, with these tools already installed for your OS/CPU:

```sh
python3 plugins/electrum/build_runtime.py
python3 plugins/electrum/build.py
```

`build_runtime.py` checks all tracked repository inputs outside this adapter against the source pin, including root TypeScript/bundler configs, and rejects untracked or ignored additions outside known generated/cache directories. It also records this adapter's JS/JSON inputs because root type-check globs can include them. It installs with the frozen lockfile using a project-local Yarn cache, then builds the common entry and its transitive SDK packages in dependency order and rejects changed inputs during that build.

The builder copies `entry.cjs`, `runtime.cjs` and `pin.cjs` into `plugins/electrum/.runtime/`. Its receipt, `runtime.json` plus `runtime.sha256`, binds the canonical source-tree path, source inputs, lock bytes, helper files, Node executable hash/version/platform/CPU, resolved SDK entry points, workspace `dist` files, and complete external runtime dependency packages (including native/WASM/data files). Dependencies and optional/peer dependencies are resolved from each package's actual location; an outside-tree link is rejected. SDK packages must resolve to their corresponding source-tree workspaces, never an npm package with a matching version label. Before importing SDK code or initializing it, the child rechecks the receipt digest, pinned Git state, exact source/artifact inventories, package versions and actual running Node binary/version. Added, removed, rebuilt or re-resolved dependencies fail closed. A CommonJS load guard also rejects unrecorded module files, so an undeclared dependency cannot bypass the inventory. Git must remain available to this source-tree development runtime. After writing the receipt, the builder runs the **real entry/import/native USB smoke without initializing hardware**; a failure removes both receipt files. This is local build integrity, not a signed distribution or protection against someone who can replace the plugin, helper and receipt together. It never downloads a replacement SDK from npm by version number, installs drivers, updates udev, or changes system settings.

The build uses the repository's workspace dependency installation, including native install scripts. On systems without a matching `usb` prebuild, a compatible C/C++ compiler, Python and node-gyp prerequisites must already be available. A native build failure stops installation; there is no fallback to Python USB or a different SDK. Repository SDK builds use the checked-in protobuf JSON; do not regenerate protobuf or move submodules for this plugin.

Install the generated `plugins/electrum/dist/onekey-0.1.0.zip` through Electrum's **Add plugin** UI. Start Electrum with an absolute runtime manifest path in its process environment, for example from this checkout:

```sh
ONEKEY_ELECTRUM_RUNTIME="$PWD/plugins/electrum/.runtime/runtime.json" electrum --gui qt
```

For packaged macOS/Windows Electrum, launch its actual executable with the same environment variable (Finder/Start Menu launches do not inherit a terminal's environment). Keep this checkout, its workspace `node_modules`, built SDK packages, `.runtime` directory and the pinned Node executable available. The Python adapter verifies the receipt digest/helper hashes and passes that digest to the child. The child completes the full source/artifact/Node verification before SDK import and the versioned startup handshake; missing, drifted or incompatible runtime fails closed. Rebuild the receipt after an intended source/helper/dependency change; receipts from the earlier label-only format are rejected.

Build separately on every target: macOS arm64/x64, Windows x64/arm64, Linux x64/arm64. Use the matching Node executable and native addon; do not copy one platform's `node_modules` to another platform/CPU. The development manifest contains absolute paths and is **not a portable runtime installer**. Support for a platform is conditional on a successful native build/import and the validation below; this migration does not claim that matrix has been verified. A future redistributable must assemble per-target Node/native dependencies, licenses and helper assets and pass those checks; the ZIP alone is never advertised as ready to run.

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
