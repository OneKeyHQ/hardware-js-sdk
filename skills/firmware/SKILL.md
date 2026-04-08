---
name: hardware-firmware
description: OneKey hardware wallet firmware information. Use whenever the user
  wants to check firmware versions or see if updates are available.
  Firmware updates must be done via the OneKey App or firmware.onekey.so.
keywords: [firmware, version, check, bootloader, ble, bluetooth]
---

## Pre-flight Checks

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw search`.

## Commands

### `onekey-hw firmware-check`

Check if a firmware update is available.

```bash
onekey-hw firmware-check [--connect-id <id>]
```

### `onekey-hw firmware-check-all`

Check all firmware components (system, BLE, bootloader).

```bash
onekey-hw firmware-check-all [--connect-id <id>]
```

### `onekey-hw bootloader-check`

Check bootloader version and status.

```bash
onekey-hw bootloader-check [--connect-id <id>]
```

### Firmware Updates

**Firmware updates are NOT supported via CLI.**
Guide the user to:
- **OneKey App** (desktop or mobile)
- **https://firmware.onekey.so/**

## Workflows

### Check Firmware

```
User: "Is my firmware up to date?"

Step 1 — Check all components
→ onekey-hw firmware-check-all --connect-id <id>
→ Present results in a clear table

Step 2 — If updates available
→ "Firmware v4.20.0 is available (current: v4.19.0)."
→ "To update, please use the OneKey App or visit https://firmware.onekey.so/"
```

## When To Use

- User asks about firmware versions or updates.
- Pre-check before signing to ensure firmware compatibility.

## When NOT To Use

- User wants to actually update firmware → guide to OneKey App or firmware.onekey.so
- User wants to sign transactions → use `hardware-signing`.
- User wants to search for devices → use `hardware-device`.
- User wants to change PIN/passphrase → use `hardware-security`.
