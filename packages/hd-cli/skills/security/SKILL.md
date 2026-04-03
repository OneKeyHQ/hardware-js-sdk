---
name: hardware-security
description: OneKey hardware wallet security and device management — PIN changes,
  passphrase settings, device backup, recovery, reset, and wipe. Use whenever
  the user wants to change their PIN, enable/disable passphrase protection,
  back up their device, recover from a seed phrase, reset to factory, or
  manage device security settings.
keywords: [pin, passphrase, backup, reset, wipe, recovery, security, seed,
  factory-reset, label, settings, lock, unlock]
---

## Pre-flight Checks

Every time before running any `onekey-hw` command, follow these steps in order.

1. **Check CLI installed**: Run `onekey-hw --version`.
   - Not found → install: `npm install -g @onekeyfe/hardware-cli`

2. **Check device connected**: Run `onekey-hw status`.
   - No device → run `onekey-hw search` and connect first (see `hardware-device` skill).

## Security Rules — ABSOLUTE

### CRITICAL — Destructive Operations

- `device-wipe` erases ALL data including seeds. This is IRREVERSIBLE.
  - MUST confirm with user AT LEAST TWICE before executing.
  - MUST verify user has their recovery phrase backed up.
  - "WARNING: This will permanently erase all data on your device including
    your wallet. This CANNOT be undone. Do you have your recovery phrase
    backed up? Type 'WIPE' to confirm."

- `device-reset` generates a new wallet seed. The old seed is DESTROYED.
  - Same double-confirmation as wipe.
  - "This will create a new wallet and DESTROY the current one."

### FORBIDDEN — Seeds & Recovery Phrases

- NEVER ask for, display, or log recovery phrases / seed words.
- During `device-recovery`, the seed is entered DIRECTLY on the hardware device.
- NEVER suggest the user type their seed into the terminal, chat, or any software.
- The ONLY safe place to enter a recovery phrase is on the device screen itself.

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

| Parameter | Required | Description |
|---|---|---|
| `--remove` | No | Remove PIN protection instead of changing |

**Returns:**
```json
{
  "success": true,
  "message": "PIN changed successfully"
}
```

**Agent notes:**
- PIN entry happens entirely on the device screen — the CLI does not see the PIN.
- If no PIN was set, this creates a new PIN.
- If PIN was already set, device will ask for current PIN first, then new PIN twice.
- Use `--remove` to disable PIN protection (NOT recommended).
- Instruct user: "Follow the prompts on your device screen to set your new PIN."

### `onekey-hw passphrase-state`

Get current passphrase state for hidden wallet session management.

```bash
onekey-hw passphrase-state [--use-empty-passphrase] [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "payload": "passphrase_state_hash"
}
```

**Agent notes:**
- Returns a hash identifying the current passphrase wallet session.
- Use `--use-empty-passphrase` to get state for the standard (non-hidden) wallet.
- Pass the returned state as `--passphrase-state` to subsequent commands to avoid
  re-prompting the passphrase on every operation.

### `onekey-hw toggle-passphrase`

Enable or disable BIP39 passphrase (hidden wallet) protection.

```bash
onekey-hw toggle-passphrase \
  --enable <bool> \
  [--connect-id <id>]
```

| Parameter | Required | Description |
|---|---|---|
| `--enable` | Yes | `true` to enable, `false` to disable |
| `--connect-id` | No | Device connection ID |

**Returns:**
```json
{
  "success": true,
  "passphraseEnabled": true,
  "message": "Passphrase protection enabled. You will be asked for a passphrase on each connection."
}
```

**Agent notes:**
- Passphrase creates a "hidden wallet" — different passphrase = different wallet.
- WARN user: "If you forget your passphrase, there is NO way to recover the
  hidden wallet's funds. The passphrase is NOT stored on the device."
- When enabled, every signing/address operation will ask for the passphrase on device.

### `onekey-hw device-backup`

Trigger the device to display the recovery phrase for backup verification.

```bash
onekey-hw device-backup [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "message": "Backup process completed on device"
}
```

**Agent notes:**
- The recovery phrase is shown ONLY on the device screen — never transmitted to the CLI.
- Instruct user: "Your recovery phrase will be displayed on the device screen.
  Write it down on paper and store it securely. NEVER take a photo or store digitally."
- The device will quiz the user to verify they wrote it down correctly.

### `onekey-hw device-recovery`

Recover a wallet from an existing recovery phrase. The seed is entered on the device.

```bash
onekey-hw device-recovery \
  [--word-count <12|18|24>] \
  [--passphrase-protection <bool>] \
  [--pin-protection <bool>] \
  [--label <name>] \
  [--connect-id <id>]
```

| Parameter | Required | Description |
|---|---|---|
| `--word-count` | No | Recovery phrase length: 12, 18, or 24 (default: 24) |
| `--passphrase-protection` | No | Enable passphrase after recovery (default: false) |
| `--pin-protection` | No | Set PIN after recovery (default: true) |
| `--label` | No | Device label / name |
| `--connect-id` | No | Device connection ID |

**Returns:**
```json
{
  "success": true,
  "message": "Device recovered successfully"
}
```

**Agent notes:**
- Recovery phrase is entered DIRECTLY on the device screen — NEVER in the CLI or chat.
- Instruct user: "You will enter your recovery words one by one on the device screen."
- This replaces any existing wallet on the device.

### `onekey-hw device-reset`

Initialize the device with a newly generated seed.

```bash
onekey-hw device-reset \
  [--word-count <12|18|24>] \
  [--passphrase-protection <bool>] \
  [--pin-protection <bool>] \
  [--label <name>] \
  [--connect-id <id>]
```

| Parameter | Required | Description |
|---|---|---|
| `--word-count` | No | Seed phrase length: 12, 18, or 24 (default: 24) |
| `--passphrase-protection` | No | Enable passphrase (default: false) |
| `--pin-protection` | No | Set PIN (default: true) |
| `--label` | No | Device label / name |
| `--connect-id` | No | Device connection ID |

**Returns:**
```json
{
  "success": true,
  "message": "Device initialized with new wallet. Please back up your recovery phrase."
}
```

**Agent notes:**
- This DESTROYS the current wallet and creates a new one.
- Double-confirm with user before executing.
- After reset, IMMEDIATELY guide user to `device-backup` to write down the new seed.

### `onekey-hw device-wipe`

Factory reset — erase all data from the device.

```bash
onekey-hw device-wipe [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "message": "Device wiped to factory settings"
}
```

**Agent notes:**
- This is the most destructive operation. ALL data is permanently erased.
- Require EXPLICIT double confirmation:
  1. "This will erase everything on your device. Do you have your recovery phrase?"
  2. "Type 'WIPE' to confirm factory reset."
- The device will also ask for confirmation on its screen.

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

| Parameter | Required | Description |
|---|---|---|
| `--label` | No | Device display name |
| `--auto-lock-delay` | No | Auto-lock timeout in seconds (0 = disabled) |
| `--language` | No | Device UI language |
| `--passphrase-always-on-device` | No | Always enter passphrase on device screen |
| `--haptic-feedback` | No | Enable/disable haptic feedback (true/false) |
| `--auto-shutdown-delay` | No | Auto power-off timeout in seconds |

**Returns:**
```json
{
  "success": true,
  "payload": {
    "message": "Settings applied"
  }
}
```

### `onekey-hw device-verify`

Verify the device is genuine OneKey hardware (anti-tampering check).

```bash
onekey-hw device-verify [--connect-id <id>]
```

**Returns:**
```json
{
  "success": true,
  "genuine": true,
  "message": "Device verified as genuine OneKey hardware"
}
```

**Agent notes:**
- Run this when user has concerns about device authenticity.
- If verification fails, advise user to contact OneKey support immediately
  and NOT use the device for any transactions.

### `onekey-hw lock`

Lock the device (require PIN to unlock).

```bash
onekey-hw lock [--connect-id <id>]
```

### `onekey-hw unlock`

Prompt device unlock (PIN entry on device).

```bash
onekey-hw unlock [--connect-id <id>]
```

## Workflows

### First-Time Device Setup

```
User: "Set up my new OneKey device"

Step 1 — Connect device
→ onekey-hw search → onekey-hw connect

Step 2 — Verify genuine
→ onekey-hw device-verify
→ "Device verified as genuine OneKey hardware."

Step 3 — Initialize with new wallet
→ "This will create a new wallet. You'll set a PIN and back up your recovery phrase."
→ onekey-hw device-reset --word-count 24 --pin-protection true --label "My OneKey"

Step 4 — Backup recovery phrase
→ onekey-hw device-backup
→ "Write down the 24 words shown on your device. Store securely offline."

Step 5 — Verify setup
→ onekey-hw status
→ Display device info, confirm PIN and backup status.
```

### Change PIN

```
User: "Change my device PIN"

Step 1 — Verify device connected
→ onekey-hw status

Step 2 — Change PIN
→ onekey-hw change-pin
→ "Follow the prompts on your device screen:
   1. Enter your current PIN
   2. Enter your new PIN
   3. Confirm your new PIN"
```

### Enable Hidden Wallet (Passphrase)

```
User: "Enable passphrase on my device"

Step 1 — Explain implications
→ "Passphrase creates a hidden wallet. Each different passphrase produces
   a completely different set of addresses and funds. If you forget the
   passphrase, those funds are PERMANENTLY inaccessible."

Step 2 — Confirm user understands
→ Wait for explicit "I understand" / "yes"

Step 3 — Enable
→ onekey-hw toggle-passphrase --enable true
→ "Passphrase protection enabled."
```

### Factory Reset

```
User: "Reset my device to factory settings"

Step 1 — Double confirmation
→ "WARNING: Factory reset will PERMANENTLY erase all data on your device,
   including your wallet seed. This CANNOT be undone."
→ "Do you have your recovery phrase backed up?"
→ Wait for confirmation

Step 2 — Second confirmation
→ "Type 'WIPE' to confirm factory reset."

Step 3 — Execute
→ onekey-hw device-wipe
→ "Device has been wiped. You can set it up as new or recover from a seed."
```

## When To Use

- User wants to change PIN or passphrase settings.
- User wants to back up or verify their recovery phrase.
- User wants to recover a wallet from seed.
- User wants to factory reset their device.
- User wants to check device authenticity.
- User wants to change device label or settings.

## When NOT To Use

- User wants to sign transactions → use `hardware-signing`.
- User wants to update firmware → use `hardware-firmware`.
- User wants to connect or search devices → use `hardware-device`.
