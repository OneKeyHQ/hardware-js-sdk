---
name: hardware-security
description: OneKey hardware wallet security and device management — PIN changes,
  passphrase settings, device wipe, device verification, and settings management.
keywords: [pin, passphrase, reset, wipe, security, label, settings, lock, verify]
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---

## Pre-flight Checks

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw search`.

## Device Interaction — IMPORTANT

**All security commands require physical interaction on the device (PIN entry,
button confirmation).** Use `AskUserQuestion` before running any command:

```
AskUserQuestion:
  Question: "This operation requires interaction on your device.
    Please make sure the device is connected and powered on."
  Header: "Device"
  Options:
    A) Device is ready (Recommended)
    B) Cancel
```

For **destructive operations** (device-wipe), use double confirmation:

```
AskUserQuestion:
  Question: "WARNING: Factory reset permanently erases ALL data on your device.
    Do you have your recovery phrase backed up?"
  Header: "Factory Reset"
  Options:
    A) Yes, I have my backup — proceed
    B) Cancel
```

Then a second confirmation:

```
AskUserQuestion:
  Question: "Are you absolutely sure? This CANNOT be undone."
  Header: "Final Confirmation"
  Options:
    A) Yes, wipe the device
    B) Cancel
```

Use `timeout: 120000` (120 seconds) for all device commands.

## Security Rules — ABSOLUTE

### CRITICAL — Destructive Operations

- `device-wipe` erases ALL data including seeds. This is IRREVERSIBLE.
  - MUST confirm with user AT LEAST TWICE before executing.
  - MUST verify user has their recovery phrase backed up.

### FORBIDDEN — Seeds & Recovery Phrases

- NEVER ask for, display, or log recovery phrases / seed words.
- NEVER suggest the user type their seed into the terminal, chat, or any software.

### PIN Security

- NEVER ask for or attempt to see the user's PIN.
- PIN is always entered on the device screen.
- After 16 wrong PIN attempts, the device wipes itself — inform user of this.

## Commands

### `onekey-hw change-pin`

Change, set, or remove the device PIN code.

```bash
onekey-hw change-pin [--remove] [--connect-id <id>]
```

**Agent notes:**
- PIN entry happens entirely on the device screen — the CLI does not see the PIN.
- Instruct user: "Follow the prompts on your device screen to set your new PIN."

### `onekey-hw passphrase-state`

Get current passphrase state for hidden wallet session management.

```bash
onekey-hw passphrase-state [--connect-id <id>]
```

**Note:** Do NOT use `--use-empty-passphrase` with this command — it will return an error.
This command's purpose is to trigger passphrase input on the device.

### `onekey-hw toggle-passphrase`

Enable or disable BIP39 passphrase (hidden wallet) protection.

```bash
onekey-hw toggle-passphrase --enable <bool> [--connect-id <id>]
```

**Agent notes:**
- WARN user: "If you forget your passphrase, there is NO way to recover the
  hidden wallet's funds."

### `onekey-hw device-wipe`

Factory reset — erase all data from the device.

```bash
onekey-hw device-wipe --confirm-wipe [--connect-id <id>]
```

**Agent notes:**
- This is the most destructive operation. ALL data is permanently erased.
- The `--confirm-wipe` flag is REQUIRED — the command will not execute without it.
- Require EXPLICIT double confirmation from the user before executing.
- Verify user has recovery phrase backed up before proceeding.

### `onekey-hw device-settings`

Update device label and other settings.

```bash
onekey-hw device-settings \
  [--label <name>] \
  [--auto-lock-delay <seconds>] \
  [--language <lang>] \
  [--passphrase-always-on-device <bool>] \
  [--haptic-feedback <bool>] \
  [--auto-shutdown-delay <seconds>] \
  [--connect-id <id>]
```

### `onekey-hw lock`

Lock the device (require PIN to unlock).

```bash
onekey-hw lock [--connect-id <id>]
```

## Workflows

### Change PIN

```
User: "Change my device PIN"

Step 1 — Verify device connected
→ onekey-hw search

Step 2 — Change PIN
→ onekey-hw change-pin --connect-id <id>
→ "Follow the prompts on your device screen."
```

### Factory Reset

```
User: "Reset my device to factory settings"

Step 1 — Double confirmation
→ "WARNING: Factory reset will PERMANENTLY erase all data on your device.
   Do you have your recovery phrase backed up?"
→ Wait for confirmation
→ "Are you absolutely sure? This cannot be undone."
→ Wait for second confirmation

Step 2 — Execute
→ onekey-hw device-wipe --confirm-wipe --connect-id <id>
→ "Device has been wiped. Use the OneKey App to set it up again."
```

## When To Use

- User wants to change PIN or passphrase settings.
- User wants to factory reset their device.
- User wants to check device authenticity.
- User wants to change device label or settings.

## When NOT To Use

- User wants to sign transactions → use `hardware-signing`.
- User wants to check firmware → use `hardware-firmware`.
- User wants to search for devices → use `hardware-device`.
- User wants to backup/recover wallet → guide them to the OneKey App.
- User wants to update firmware → guide them to the OneKey App or https://firmware.onekey.so/
