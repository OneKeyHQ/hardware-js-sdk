---
name: hardware-security
description: OneKey hardware wallet security and device management — PIN changes,
  passphrase settings, device verification, and settings management.
keywords: [pin, passphrase, security, label, settings, lock, verify]
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

Use `timeout: 120000` (120 seconds) for all device commands.

## Security Rules — ABSOLUTE

### FORBIDDEN — Device Wipe

- Device wipe (factory reset) is **NOT available via CLI**.
- If the user asks to wipe/reset their device, guide them to the **OneKey App**.
- NEVER attempt to call any wipe-related API.

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

Get the hidden wallet `passphraseState` identifier for wallet validation.

```bash
onekey-hw passphrase-state [--passphrase <value>] [--connect-id <id>]
```

**Returns:**
```json
{ "success": true, "payload": "abc123def456..." }
```

**Concepts:**
- **passphrase** — the BIP39 passphrase string the user knows (e.g. "mypassphrase").
  Provided via `--passphrase <value>` on single commands. For `batch-get-address`,
  it is enough to pass `--passphrase` once — the CLI fetches the session token internally.
- **passphraseState** — a device-side session token derived from the passphrase.
  Optional: if provided, the SDK verifies each command accesses the same hidden wallet
  without re-prompting for the passphrase. Useful for multi-step workflows.

**How it works:**
1. SDK fires REQUEST_PASSPHRASE → CLI responds with `--passphrase` value (or device keyboard).
2. Device derives the wallet and returns the `passphraseState` session token.
3. Subsequent calls with `--passphrase-state <value>` validate the session on-device
   without re-entering the passphrase (device skips PassphraseRequest).

**IMPORTANT:**
- For **single commands** (`get-address`, `sign-transaction`, etc.): you still need
  `--passphrase <value>` on every hidden-wallet command when using host/chat
  passphrase entry — `passphraseState` alone is not enough.
- For **`batch-get-address`**: only `--passphrase` is needed. The CLI auto-fetches
  `passphraseState` before the loop — passphrase is entered only once.
- Do NOT add `--use-empty-passphrase` — mutually exclusive with this command.

**When to use `passphrase-state`:**
- **1-2 commands**: skip — just use `--passphrase` on each command (simpler).
- **`batch-get-address`**: skip — the CLI handles session internally.
- **3+ separate commands**: optionally pre-fetch for session validation.

**Multi-step workflow:**
```bash
# Step 1: Get passphraseState once (MUST include --passphrase)
onekey-hw passphrase-state --passphrase "mypassphrase" --connect-id <id>
# → {"success": true, "payload": "abc123..."}

# Step 2+: Use BOTH --passphrase AND --passphrase-state on every subsequent
# hidden-wallet command in this flow
onekey-hw get-address --chain evm \
  --passphrase "mypassphrase" --passphrase-state abc123... --connect-id <id>
```

**Simpler (no session validation needed):**
```bash
# Just use --passphrase on each hidden-wallet command — no passphrase-state step needed
onekey-hw get-address --chain evm --passphrase "mypassphrase" --connect-id <id>

# For batch: --passphrase is entered only ONCE regardless of bundle size
onekey-hw batch-get-address --bundle '[{"chain":"evm"},{"chain":"btc"}]' \
  --passphrase "mypassphrase" --connect-id <id>
```

### `onekey-hw toggle-passphrase`

Enable or disable BIP39 passphrase (hidden wallet) protection.

```bash
onekey-hw toggle-passphrase --enable true [--connect-id <id>]
onekey-hw toggle-passphrase --enable false [--connect-id <id>]
```

**Note:** `--enable` takes the string `"true"` or `"false"`, not a bare boolean.

**Agent notes:**
- WARN user: "If you forget your passphrase, there is NO way to recover the
  hidden wallet's funds."

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

## When To Use

- User wants to change PIN or passphrase settings.
- User wants to check device authenticity.
- User wants to change device label or settings.

## When NOT To Use

- User wants to sign transactions → use `hardware-signing`.
- User wants to check firmware → use `hardware-firmware`.
- User wants to search for devices → use `hardware-device`.
- User wants to backup/recover wallet → guide them to the OneKey App.
- User wants to update firmware → guide them to the OneKey App or https://firmware.onekey.so/
