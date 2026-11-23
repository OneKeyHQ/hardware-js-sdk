# OneKey Electrum adapter

Desktop Electrum Qt ≥4.8.4, initialized Pro2/Neo, Protocol V2 over in-process Python USB. Supported Bitcoin/Testnet accounts are single-signature BIP44 legacy, BIP49 nested SegWit and BIP84 native SegWit, plus BIP48 multisig: native SegWit `p2wsh` at `m/48'/coin'/account'/2'` (`Zpub`/`Vpub`, `bc1q`) and nested SegWit `p2wsh-p2sh` at `m/48'/coin'/account'/1'` (`Ypub`/`Upub`, `3…`/`2…`). The plugin can add one partial BIP48 cosignature. Traditional Bitcoin message signing covers `p2pkh`, `p2wpkh-p2sh` and `p2wpkh` only. Device setup, firmware updates, BIP45, Taproot, BIP322, message decryption and QR/PSBT are outside this plugin.

The Python adapter owns USB claims, bounded framing/protobuf exchanges and device wallet sessions. Electrum owns Qt, keystore persistence, transaction conversion and local verification. No Node process, SDK runtime, HTTP server or host PIN/passphrase entry is used.

## Build and install

```sh
python3 plugins/electrum/build.py
```

This builds `plugins/electrum/dist/onekey-0.1.0.zip`, the external plugin Electrum reads into memory (under its 10 MB limit). Install/authorize this ZIP using Electrum's external-plugin UI. The ZIP contains Python code and public assets, not native libraries. Electrum must provide `python-libusb1` (PyPI package `libusb1`) and native libusb for its platform/CPU. A missing Python module or native library fails the plugin's library check. Installing packages into another Python does not add them to a frozen Electrum distribution. No driver, system permission or udev installation is performed by the plugin. Linux access rules and Windows USB driver configuration remain administrator/user responsibilities.

## Wallet identity and recovery

The wizard uses the standard wallet unless its script page asks for a hidden wallet. Opening a hardware-encrypted file tries the standard wallet first. If that key does not decrypt the file, the wizard offers a hidden wallet, and an Attach PIN wallet only when the device reports that it is enabled. PIN/passphrase entry takes place on the device. A fresh Attach PIN selection locks an existing Attach PIN unlock before asking for the new slot; ordinary saved-wallet recovery reuses a matching live wallet. A cold hidden-wallet recovery first inspects the current session without an address hint and compares its public identity. If it differs, recovery requires device entry and rejects a different wallet. It never accepts an address-only session hint as proof of ownership.

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

Before release, independently test Pro2/Neo firmware and each supported Electrum OS/CPU: first ZIP load, saved bindings/restart, singlesig BIP44/49/84, traditional message signing, and partial BIP48 native and nested multisig on Bitcoin/Testnet, standard/hidden/Attach PIN recovery and switching, wrong wallet rejection, address/signature verification, cancel during device prompts, unplug/replug, lock/reconnect and multiple-wallet/device cleanup. No hardware or platform certification is implied by tests without hardware.
