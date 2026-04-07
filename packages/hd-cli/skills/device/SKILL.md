---
name: hardware-device
description: OneKey hardware wallet device management. Use whenever the user
  wants to search for or check their OneKey hardware wallet device.
  Also triggered as a pre-check before any signing or firmware operation.
keywords: [device, search, hardware, onekey, features, verify, lock, wipe]
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

## Device Interaction Model

**CRITICAL: Most `onekey-hw` commands block while waiting for physical interaction
on the hardware device (PIN entry, button confirmation, address verification).
You MUST inform the user BEFORE running the command.**

### How It Works

1. **Before running the command** → Tell the user what device interaction to expect.
2. **Run the command** → It blocks (up to 60s) while waiting for the user to act on the device.
   The user sees real-time `[onekey-hw]` status messages in their terminal (via stderr).
3. **Command completes** → You see the full output and present the result.

### Device Interaction Types

| Stderr Message | What User Must Do | When It Happens |
|---|---|---|
| `[onekey-hw] Please enter PIN on your device screen...` | Enter PIN on device touchscreen | First operation after device lock/connect |
| `[onekey-hw] Please confirm the action on your device...` | Press confirm button on device | Address display, signing, settings changes |
| `[onekey-hw] Passphrase required for hidden wallet.` | Enter passphrase on device | When accessing a hidden wallet |

### Timeout Guidance

- Set Bash tool `timeout` to at least `120000` (120s) for any command that requires
  device interaction (signing, address with `--show-on-device`, PIN changes, etc.)
- `search` does NOT require device interaction — default timeout is fine.
- If a command times out, the user likely did not respond on the device — do NOT retry
  automatically. Ask the user if they want to try again.

### Example Interaction Pattern

```
Agent → User: "I'm going to request your ETH address from the device.
              You may need to enter your PIN and confirm on the device screen."
Agent → Bash: onekey-hw get-address --chain evm --connect-id <id>  (timeout: 120000)
[user sees in terminal: "[onekey-hw] Please enter PIN on your device screen..."]
[user enters PIN on device]
[user sees in terminal: "[onekey-hw] Please confirm the action on your device..."]
[user confirms on device]
Agent ← result: { success: true, payload: { address: "0x..." } }
Agent → User: "Your ETH address is 0x..."
```

## Security Rules — ABSOLUTE

- NEVER expose device seeds, mnemonics, or private keys in any output.
- All signing operations REQUIRE physical confirmation on the hardware device.
- NEVER bypass device confirmation prompts — if the device is waiting for user
  confirmation, inform the user and wait.
- NEVER attempt to brute-force PINs or passphrases.
- Treat all device state information (features, serial numbers) as sensitive —
  do not share externally without user consent.

## Parameter Rules

### Device Identification

- `--connect-id`: Connection identifier from `search` results.
- `--device-id`: Persistent device identifier from `getFeatures`.
- When multiple devices connected, ALWAYS ask user to select.

## Commands

### `onekey-hw search`

Search for connected OneKey hardware wallet devices.
**Does NOT require device interaction — no PIN or confirmation needed.**

```bash
onekey-hw search
```

**Returns:**
```json
{
  "success": true,
  "payload": [
    {
      "connectId": "PRC49J0370A",
      "name": "OneKey Pro",
      "deviceType": "pro"
    }
  ]
}
```

**Agent notes:**
- Always run `search` before any device operation if no `connectId` is known.
- If no devices found, suggest: check USB cable, unlock device, try a different USB port.
- Multiple devices → present list, ask user to select.

### `onekey-hw lock`

Lock the device (require PIN to unlock).

```bash
onekey-hw lock [--connect-id <id>]
```

## Workflows

### First Connection

```
User: "Connect my OneKey hardware wallet"

Step 1 — Search for devices (auto-fetches device info, no PIN needed)
→ onekey-hw search
→ If no devices found, guide troubleshooting (USB cable, unlock, different port)

Step 2 — Report device info from search results
→ Report: name, model, firmware version, PIN status, backup status
```

### Troubleshooting Connection

```
User: "My device won't connect"

Step 1 — Search for devices
→ onekey-hw search

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
