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

2. **Check device connected**: Run `onekey-hw status`.
   - No device → run `onekey-hw search` and connect first (see `hardware-device` skill).

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

**Returns (update available):**
```json
{
  "success": true,
  "current": {
    "firmwareVersion": "4.7.0",
    "bleFirmwareVersion": "2.0.0",
    "bootloaderVersion": "2.3.0"
  },
  "available": {
    "firmware": {
      "version": "4.8.0",
      "changelog": "Bug fixes, new chain support (TON, Benfen)",
      "required": false
    },
    "ble": {
      "version": "2.1.0",
      "changelog": "Improved BLE stability",
      "required": false
    }
  },
  "upToDate": false
}
```

**Returns (up to date):**
```json
{
  "success": true,
  "current": {
    "firmwareVersion": "4.8.0",
    "bleFirmwareVersion": "2.1.0",
    "bootloaderVersion": "2.3.0"
  },
  "available": null,
  "upToDate": true
}
```

**Agent notes:**
- Always check firmware before any operation to ensure compatibility.
- If `required` is true, the update is mandatory — signing may not work until updated.
- Present changelog to user so they can make an informed decision.

### `onekey-hw firmware-update`

Update the device firmware (system firmware).

```bash
onekey-hw firmware-update \
  [--connect-id <id>] \
  [--version <version>]
```

| Parameter | Required | Description |
|---|---|---|
| `--connect-id` | No | Device connection ID |
| `--version` | No | Target version (defaults to latest available) |

**Returns:**
```json
{
  "success": true,
  "previousVersion": "4.7.0",
  "updatedVersion": "4.8.0",
  "message": "Firmware updated successfully. Please re-enter your PIN."
}
```

**Agent notes:**
- This operation takes 1-3 minutes. Inform the user to be patient.
- The device will reboot during the update — this is normal.
- After update, the device session is invalidated — run `onekey-hw connect` again.
- If the update fails, the device may enter bootloader mode — guide recovery.

### `onekey-hw firmware-update-ble`

Update the BLE (Bluetooth) firmware.

```bash
onekey-hw firmware-update-ble \
  [--connect-id <id>] \
  [--version <version>]
```

**Returns:**
```json
{
  "success": true,
  "previousVersion": "2.0.0",
  "updatedVersion": "2.1.0",
  "message": "BLE firmware updated successfully."
}
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

**Returns:**
```json
{
  "success": true,
  "bootloaderVersion": "2.3.0",
  "bootloaderMode": false,
  "updateAvailable": false
}
```

### `onekey-hw firmware-check-all`

Check all firmware components at once (system, BLE, bootloader).

```bash
onekey-hw firmware-check-all [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "device": "OneKey Pro",
  "components": {
    "firmware": { "current": "4.8.0", "latest": "4.8.0", "upToDate": true },
    "ble": { "current": "2.0.0", "latest": "2.1.0", "upToDate": false },
    "bootloader": { "current": "2.3.0", "latest": "2.3.0", "upToDate": true }
  },
  "allUpToDate": false
}
```

## Workflows

### Check & Update Firmware

```
User: "Is my firmware up to date?"

Step 1 — Check all components
→ onekey-hw firmware-check-all
→ Present results in a clear table

Step 2 — If updates available, ask user
→ "BLE firmware v2.1.0 is available (current: v2.0.0). Changes: Improved BLE stability."
→ "Would you like to update?"

Step 3 — User confirms → update
→ "DO NOT disconnect your device during the update."
→ onekey-hw firmware-update-ble
→ "BLE firmware updated to v2.1.0."
```

### Recover from Bootloader Mode

```
User: "My device shows a bootloader screen"

Step 1 — Verify bootloader mode
→ onekey-hw status
→ If bootloaderMode: true, proceed

Step 2 — Check if update was interrupted
→ onekey-hw firmware-check

Step 3 — Attempt firmware update to recover
→ "Your device is in bootloader mode. This usually means a firmware update
   was interrupted. Let's reinstall the firmware."
→ onekey-hw firmware-update
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
