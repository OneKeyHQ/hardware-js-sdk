---
name: hardware-device
description: OneKey hardware wallet device management. Use whenever the user
  wants to search for, connect to, or check the status of their OneKey
  hardware wallet device. Also triggered as a pre-check before any signing
  or firmware operation to ensure a device is connected and ready.
keywords: [device, connect, search, hardware, onekey, status, features, disconnect]
---

## Pre-flight Checks

Every time before running any `onekey-hw` command, follow these steps in order.
Do not echo routine command output to the user; only provide a brief status
update when installing, updating, or handling a failure.

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`
   - Install failed → STOP, point to manual install docs.

2. **Check version is latest** (once per session):
   - Fetch latest: `npm view @onekeyfe/hardware-cli version`
   - Compare with local `onekey-hw --version`
   - Local version behind → **BLOCK operation**, run `npm update -g @onekeyfe/hardware-cli`
   - Update failed → STOP, suggest manual update.
   - Update succeeded → continue with original command.

## Security Rules — ABSOLUTE

- NEVER expose device seeds, mnemonics, or private keys in any output.
- All signing operations REQUIRE physical confirmation on the hardware device.
- NEVER bypass device confirmation prompts — if the device is waiting for user
  confirmation, inform the user and wait.
- NEVER attempt to brute-force PINs or passphrases.
- Treat all device state information (features, serial numbers) as sensitive —
  do not share externally without user consent.

## Parameter Rules

### `--transport` Resolution

`--transport` selects how to communicate with the device.
Default is `usb` — direct USB HID via node-hid, no extra setup required.

| Transport | Value | Use Case |
|---|---|---|
| USB Direct | `usb` (default) | Direct USB HID, zero configuration |
| HTTP | `http` | Legacy HTTP transport |

If not specified, defaults to `usb` (direct USB HID).

### Device Identification

- `--connect-id`: Connection identifier from `search` results.
- `--device-id`: Persistent device identifier from `getFeatures`.
- When multiple devices connected, ALWAYS ask user to select.

## Commands

### `onekey-hw search`

Search for connected OneKey hardware wallet devices.

```bash
onekey-hw search [--transport <transport>] [--timeout <ms>]
```

| Parameter | Required | Description |
|---|---|---|
| `--transport` | No | Transport type: `usb`, `http` (default: `usb`) |
| `--timeout` | No | Search timeout in milliseconds (default: 10000) |

**Returns:**
```json
{
  "success": true,
  "payload": [
    {
      "connectId": "ABC123",
      "deviceId": "DEV456",
      "name": "OneKey Pro",
      "label": "My Wallet"
    }
  ]
}
```

**Agent notes:**
- Always run `search` before any device operation if no `connectId` is known.
- If no devices found, suggest: check USB cable, unlock device, try a different USB port.
- Multiple devices → present list, ask user to select.

### `onekey-hw status`

Get detailed device features and current status.

```bash
onekey-hw status [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "payload": {
    "connectId": "ABC123",
    "deviceId": "DEV456",
    "model": "pro",
    "label": "My Wallet",
    "firmwareVersion": "4.8.0",
    "bootloaderMode": false,
    "pinProtection": true,
    "passphraseProtection": false,
    "initialized": true,
    "needsBackup": false
  }
}
```

**Agent notes:**
- Use this to verify device state before any operation.
- If `initialized` is false, guide user through device setup.
- If `needsBackup` is true, strongly recommend backup before any signing.
- If `bootloaderMode` is true, only firmware operations are available.

### `onekey-hw lock`

Lock the device (require PIN to unlock).

```bash
onekey-hw lock [--connect-id <id>]
```

## Workflows

### First Connection

```
User: "Connect my OneKey hardware wallet"

Step 1 — Search for devices
→ onekey-hw search --json
→ If no devices found, guide troubleshooting (USB cable, unlock, different port)

Step 2 — Check device status
→ onekey-hw status --connect-id <id-from-search>
→ Report: model, firmware version, PIN status, backup status
```

### Troubleshooting Connection

```
User: "My device won't connect"

Step 1 — Search with extended timeout
→ onekey-hw search --timeout 30000

Step 2 — Guide the user:
  - Is the device powered on and unlocked?
  - Try a different USB cable or port
  - On Linux, check udev rules for HID device permissions
```

## When To Use

- User asks to connect, find, or search for their hardware wallet.
- User asks about device status, firmware version, or device info.
- Pre-check before any signing or firmware operation.
- User reports connection issues.

## When NOT To Use

- User wants to sign a transaction → use `hardware-signing`.
- User wants to update firmware → use `hardware-firmware`.
- User wants to change PIN or passphrase → use `hardware-security`.
