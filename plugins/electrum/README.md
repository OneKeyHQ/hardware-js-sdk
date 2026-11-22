# OneKey Electrum adapter

Desktop Electrum Qt ≥4.8.4, initialized Pro2/Neo, Protocol V2 over in-process Python USB. Supported accounts are single-signature Bitcoin/Testnet BIP44 legacy, BIP49 nested SegWit and BIP84 native SegWit. Device setup, firmware operations, multisig, Taproot and message signing are outside this plugin.

The Python adapter owns USB claims, bounded framing/protobuf exchanges and device wallet sessions. Electrum owns Qt, keystore persistence, transaction conversion and local verification. No Node process, SDK runtime, HTTP server or host PIN/passphrase entry is used.

## Build and install

```sh
python3 plugins/electrum/build.py
```

This builds `plugins/electrum/dist/onekey-0.1.0.zip`, the external plugin Electrum reads into memory (under its 10 MB limit). Install/authorize this ZIP using Electrum's external-plugin UI. The ZIP contains Python code and public assets, not native libraries. Electrum must provide `python-libusb1` (PyPI package `libusb1`) and native libusb for its platform/CPU. A missing Python module or native library fails the plugin's library check. Installing packages into another Python does not add them to a frozen Electrum distribution. No driver, system permission or udev installation is performed by the plugin. Linux access rules and Windows USB driver configuration remain administrator/user responsibilities.

`build_runtime.py`, `install_runtime.py`, `helper/` and their Node tests are retained legacy development tools, unused by this Python distribution. Do not build or install their Node bundle for this adapter. Their Node download checksum list is fetched from the archive origin and is **not authenticated release-signature verification**. No authenticated Node release digest provenance or real SDK/native import verification is claimed here. The default ZIP neither requires nor pins a leftover Node runtime.

## Wallet identity and recovery

The wizard explicitly selects standard, hidden or Attach PIN. PIN/passphrase entry takes place on the device. A fresh Attach PIN selection locks an existing Attach PIN unlock before asking for the new slot; ordinary saved-wallet recovery reuses a matching live wallet. A cold hidden-wallet recovery first inspects the current session without an address hint and compares its public identity. If it differs, recovery requires device entry and rejects a different wallet. It never accepts an address-only session hint as proof of ownership.

Keystores persist only public `{serialNo, deviceId, walletType, passphraseState}` plus their account xpub. Physical serial, initialization identity and unlocked status are checked before and after key/address/signing operations. Internal firmware session identifiers stay in memory. Locked status never proves identity using a cached device ID. Each saved wallet restores its own binding and verifies its account xpub, including when several Electrum wallets share one device client. Wallet files lacking binding metadata must be recreated through the hardware wallet wizard, retaining the original until account/history verification is complete.

Electrum derives input/change public keys locally, checks paths and scripts, requires full previous transactions and SIGHASH_ALL, and verifies returned signatures on a copy of the original transaction before applying them. Device addresses must match Electrum's independently derived address. Device serialization is never blindly accepted as a signed transaction.

## Cancellation and USB lifecycle

Operations run on Electrum's hardware thread, serialized by the in-process helper. A flow has its own cancel event, so a canceled storage unlock or late Qt callback cannot cancel a later health check. Host cancellation of a user request sends a bounded one-way wire Cancel and discards the failed claim and cached session. Cancel, timeout, protocol or I/O failure never replays the original operation. A new claim drains pending endpoint replies before a response-validated probe; send sequence counters survive ordinary reclaim. Discovery probes unknown candidates with a bounded deadline and continues past unsupported or protocol/timeout failures on unclaimed candidates; USB communication/access errors, failures on an established claim and global cancellation/deadline remain fatal.

Closing a client releases that device's claim when no other client owns it. Scan cleanup keeps the discovery generation valid and cannot invalidate another discovered/connected device. Interface release, queue deadlines, delayed USB replies and firmware cancellation still require real-device validation; mock tests do not establish firmware timing guarantees.

## Validation

```sh
python3 -m venv .cache/pr998-20261121/venv
.cache/pr998-20261121/venv/bin/python -m pip install -r plugins/electrum/requirements-dev.txt
PYTHONPATH=plugins/electrum .cache/pr998-20261121/venv/bin/python -m unittest discover -s plugins/electrum/tests -v
.cache/pr998-20261121/venv/bin/python -m flake8 plugins/electrum/onekey plugins/electrum/tests plugins/electrum/build.py --select=E9,F63,F7,F82
yarn agent:check --profile commit
```

`test_protocol.py` and `test_repairs.py` exercise the real codec/framing/session/helper through a synthetic USB peer. `test_lifecycle.py` executes the real client/plugin lifecycle against stubbed Electrum host interfaces; it does not verify cryptography or real Electrum compatibility. `test_distribution.py` checks the default ZIP and Python protocol imports. `test_onekey.py` requires real pinned Electrum/PyQt/native dependencies and covers derivation, original-transaction signature verification and Electrum's memory ZIP importer. Missing dependencies leave those security/integration gates blocked, never passed by stubs. Legacy Node tests cover only the retained Node tooling and do not validate this Python adapter.

Before release, independently test Pro2/Neo firmware and each supported Electrum OS/CPU: first ZIP load, saved bindings/restart, all three scripts on Bitcoin/Testnet, standard/hidden/Attach PIN recovery and switching, wrong wallet rejection, address/signature verification, cancel during device prompts, unplug/replug, lock/reconnect and multiple-wallet/device cleanup. No hardware or platform certification is implied by tests without hardware.
