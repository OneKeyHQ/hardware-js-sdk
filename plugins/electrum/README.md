# OneKey Electrum adapter

Desktop Electrum Qt ≥4.8.4, initialized Pro2/Neo, Protocol V2 over in-process Python USB. Supported Bitcoin/Testnet wallets are single-signature `p2pkh`, `p2wpkh-p2sh` and `p2wpkh`, and sorted multisig `p2sh` (legacy), `p2wsh-p2sh` and `p2wsh`. The plugin can add one partial multisig cosignature. Traditional Bitcoin message signing covers the single-signature types only. Device setup, firmware updates, Taproot, BIP322, message decryption and QR/PSBT are outside this plugin.

Account paths follow the firmware-pro2 Bitcoin keychain, the paths the device can show addresses for and sign from: BIP44 `m/44'/coin'/account'`, BIP49, BIP84, BIP86, BIP48 `m/48'/coin'/account'/0'|1'|2'`, BIP45 `m/45'/cosigner` (Bitcoin only, Electrum's legacy multisig default `m/45'/0`), and the Casa and Unchained compatibility layouts. A path from another script type's layout (for example `m/44'/…` on a SegWit wallet) is accepted, and the device shows its non-standard path warning before it signs. Any other path is refused when the wallet is created, because the device would export its xpub but refuse to sign.

The Python adapter owns USB claims, bounded framing/protobuf exchanges and device wallet sessions. Electrum owns Qt, keystore persistence, transaction conversion and local verification. No Node process, SDK runtime, HTTP server or host PIN/passphrase entry is used.

## Build and install

```sh
python3 plugins/electrum/build.py
```

This builds `plugins/electrum/dist/onekey-0.1.0.zip`, the external plugin Electrum reads into memory (under its 10 MB limit). Install/authorize this ZIP using Electrum's external-plugin UI. The ZIP contains Python code and public assets, not native libraries. Electrum must provide `python-libusb1` (PyPI package `libusb1`) and native libusb for its platform/CPU. A missing Python module or native library fails the plugin's library check. Installing packages into another Python does not add them to a frozen Electrum distribution. No driver, system permission or udev installation is performed by the plugin. Linux access rules and Windows USB driver configuration remain administrator/user responsibilities.

## Wallet identity and recovery

The wizard follows the wallet unlocked on the device (`PIN_ANY` accepts both Main PIN and Attach PIN natively) unless its script page asks to enter a passphrase on the device. Opening a hardware-encrypted file tries the current unlocked wallet session first; if that key does not decrypt the file, the wizard offers entering a passphrase on the device. Saved-wallet recovery checks that the current device session matches the saved public identity before prompting for an on-device passphrase, and never exposes a separate Attach PIN UI or accepts an address-only session hint as proof of ownership.

Keystores persist only public `{serialNo, deviceId, walletType, passphraseState}` plus their account xpub. Physical serial, initialization identity and unlocked status are checked before and after key/address/signing operations. Internal firmware session identifiers stay in memory. Locked status never proves identity using a cached device ID. Each saved wallet restores its own binding and verifies its account xpub, including when several Electrum wallets share one device client. Wallet files lacking binding metadata must be recreated through the hardware wallet wizard, retaining the original until account/history verification is complete.

Electrum derives input/change public keys locally, checks paths and scripts, requires full previous transactions and SIGHASH_ALL, and verifies returned signatures on a copy of the original transaction before applying them. A partial multisig signature is applied without clearing an already-finalized input. Device addresses must match Electrum's independently derived address. Device serialization is never blindly accepted as a signed transaction.

## Cancellation and USB lifecycle

Operations run on Electrum's hardware thread, serialized by the in-process helper. A flow has its own cancel event, so a canceled storage unlock or late Qt callback cannot cancel a later health check. Host cancellation of a user request sends a bounded one-way wire Cancel and discards the failed claim and cached session. Cancel, timeout, protocol or I/O failure never replays the original operation. A new claim drains pending endpoint replies before a response-validated probe; send sequence counters survive ordinary reclaim. Discovery probes unknown candidates with a bounded deadline and continues past unsupported, busy, or protocol/timeout failures on unclaimed candidates; missing libusb, failures on an established claim and global cancellation/deadline remain fatal.

Closing a client releases that device's claim when no other client owns it. Scan cleanup keeps the discovery generation valid and cannot invalidate another discovered/connected device. Interface release, queue deadlines, delayed USB replies and firmware cancellation still require real-device validation; mock tests do not establish firmware timing guarantees.

## Validation

```sh
python3 -m venv .cache/pr998-20261121/venv
.cache/pr998-20261121/venv/bin/python -m pip install -r plugins/electrum/requirements-dev.txt
PYTHONPATH=plugins/electrum .cache/pr998-20261121/venv/bin/python -m unittest discover -s plugins/electrum/tests -v
.cache/pr998-20261121/venv/bin/python -m flake8 plugins/electrum/onekey plugins/electrum/tests plugins/electrum/build.py --select=E9,F63,F7,F82
yarn agent:check --profile commit
```

`test_protocol.py` and `test_repairs.py` exercise the real codec/framing/session/helper through a synthetic USB peer. `test_lifecycle.py` executes the real client/plugin lifecycle against stubbed Electrum host interfaces; it does not verify cryptography or real Electrum compatibility. `test_distribution.py` checks the default ZIP and Python protocol imports. `test_onekey.py` requires real pinned Electrum/PyQt/native dependencies and covers derivation, original-transaction signature verification and Electrum's memory ZIP importer. Missing dependencies leave those security/integration gates blocked, never passed by stubs.

Before release, independently test Pro2/Neo firmware and each supported Electrum OS/CPU: first ZIP load, saved bindings/restart, singlesig BIP44/49/84 and a non-standard path with its device warning, traditional message signing, and partial legacy p2sh, nested and native multisig on Bitcoin/Testnet, standard/hidden/Attach PIN recovery and switching, wrong wallet rejection, address/signature verification, cancel during device prompts, unplug/replug, lock/reconnect and multiple-wallet/device cleanup. No hardware or platform certification is implied by tests without hardware.
