---
name: hardware-firmware
description: OneKey hardware wallet firmware management. Use whenever the user
  wants to check for firmware updates, update their device firmware (system
  or BLE), check bootloader status, or verify firmware compatibility.
keywords: [firmware, update, version, upgrade, bootloader, ble, bluetooth]
---

## Pre-flight Checks

Every time before running any `onekey-hw` command, follow these steps in order.

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw search --json`.
   - No device → guide troubleshooting (USB cable, unlock device, different port).

## Device Interaction — IMPORTANT

**Firmware commands block while waiting for device interaction (PIN, confirmation).**
Always warn the user before running: "You may need to enter your PIN and confirm
on the device." Use `timeout: 300000` (5 minutes) for firmware update commands —
updates take 1-3 minutes to complete.

## Security Rules — ABSOLUTE

### Firmware Update Safety

- NEVER interrupt a firmware update in progress — this can BRICK the device.
- ALWAYS ensure the device has sufficient battery before starting (if applicable).
- ALWAYS confirm with the user before starting a firmware update:
  "Firmware updates modify your device's system software. Do NOT disconnect
  the device during the update. Continue?"
- After firmware update, the device may require re-entering the PIN.
- Firmware updates do NOT erase wallet data (seeds are preserved in the secure element).

### Bootloader Safety

- If the device is in bootloader mode, only firmware update operations are available.
- NEVER attempt to exit bootloader mode during an active update.
- If the device is stuck in bootloader mode unexpectedly, guide the user to
  contact OneKey support.

## Commands

### `onekey-hw firmware-check`

Check if a firmware update is available for the connected device.

```bash
onekey-hw firmware-check [--connect-id <id>]
```

**Agent notes:**
- Always check firmware before any operation to ensure compatibility.
- If `required` is true, the update is mandatory — signing may not work until updated.
- Present changelog to user so they can make an informed decision.

### `onekey-hw firmware-check-all`

Check all firmware components at once (system, BLE, bootloader).

```bash
onekey-hw firmware-check-all [--connect-id <id>]
```

### `onekey-hw firmware-update`

Update the device firmware (system firmware).

```bash
onekey-hw firmware-update \
  [--connect-id <id>] \
  [--version <version>] \
  [--platform <platform>]
```

| Parameter | Required | Description |
|---|---|---|
| `--connect-id` | No | Device connection ID |
| `--version` | No | Target version, e.g. "4.8.0" (defaults to latest) |
| `--platform` | No | Platform: native, desktop, ext, web (default: desktop) |

**Agent notes:**
- This operation takes 1-3 minutes. Inform the user to be patient.
- The device will reboot during the update — this is normal.
- After update, run `onekey-hw search` again to re-detect the device.
- If the update fails, the device may enter bootloader mode — guide recovery.

### `onekey-hw firmware-update-ble`

Update the BLE (Bluetooth) firmware.

```bash
onekey-hw firmware-update-ble \
  [--connect-id <id>] \
  [--version <version>] \
  [--platform <platform>]
```

**Agent notes:**
- BLE update is separate from system firmware update.
- Only applicable for devices with Bluetooth capability (Touch, Pro).
- After BLE update, Bluetooth pairing may need to be re-established.

### `onekey-hw bootloader-check`

Check bootloader version and status.

```bash
onekey-hw bootloader-check [--connect-id <id>]
```

## Workflows

### Check & Update Firmware

```
User: "Is my firmware up to date?"

Step 1 — Check all components
→ onekey-hw firmware-check-all --connect-id <id> --json
→ Present results in a clear table

Step 2 — If updates available, ask user
→ "BLE firmware v2.1.0 is available (current: v2.0.0). Changes: Improved BLE stability."
→ "Would you like to update?"

Step 3 — User confirms → update
→ "DO NOT disconnect your device during the update."
→ onekey-hw firmware-update-ble --connect-id <id>
→ "BLE firmware updated to v2.1.0."
```

### Recover from Bootloader Mode

```
User: "My device shows a bootloader screen"

Step 1 — Verify bootloader mode
→ onekey-hw status --connect-id <id>
→ If bootloaderMode: true, proceed

Step 2 — Attempt firmware update to recover
→ "Your device is in bootloader mode. This usually means a firmware update
   was interrupted. Let's reinstall the firmware."
→ onekey-hw firmware-update --connect-id <id>
→ "Firmware installed. Your device should restart normally."
```

## When To Use

- User asks about firmware versions or updates.
- User wants to update device firmware.
- Device is in bootloader mode and needs recovery.
- Pre-check before signing to ensure firmware compatibility.

## When NOT To Use

- User wants to sign transactions → use `hardware-signing`.
- User wants to connect devices → use `hardware-device`.
- User wants to change PIN/passphrase → use `hardware-security`.
