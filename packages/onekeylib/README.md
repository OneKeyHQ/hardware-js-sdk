# onekeylib

Lightweight Python library for OneKey hardware wallets, derived from `trezorlib` (0.20.x) under **LGPL-3.0**.

## Supported Devices & Protocols

- **Protocol V1** (`WebUsbTransport` + `protocol_v1`): OneKey Classic, Classic 1S, Mini, Touch, Pro.
- **Protocol V2** (`ProtoLinkTransport` + `protocol_v2`): OneKey Pro 2, OneKey Neo (`1209:4f4c`, `proto_link` USB Bulk framing).
- **Bitcoin workflows** (`onekeylib.btc`): unified `get_public_node`, `get_address`, `sign_tx`, `sign_message` across both V1 and V2 sessions.

## Trimmed Scope

Compared to upstream `trezorlib`, this package removes non-Bitcoin coins, THP, Trezor Bridge, BLE, CLI, and Trezor-specific bootloader/Safe3/5 code to keep the runtime dependency tree minimal (`libusb1` + `typing_extensions`).

## License

GNU Lesser General Public License v3.0 (`COPYING`).
Original work Copyright (C) SatoshiLabs and contributors; modifications Copyright (C) OneKey.
