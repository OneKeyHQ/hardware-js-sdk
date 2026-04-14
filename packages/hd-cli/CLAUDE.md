# OneKey Hardware Wallet — CLI Agent Skills

When working with the `onekey-hw` CLI, read the skill files before running commands.
Do NOT guess parameters or explore via `--help` — the skills document exact
command signatures, workflows, and security rules.

## Skills

| Skill | Path | Use When |
|---|---|---|
| **Device** | `skills/device/SKILL.md` | Search devices (with features), lock, verify |
| **Signing** | `skills/signing/SKILL.md` | Get addresses, sign transactions/messages (27 chains) |
| **Firmware** | `skills/firmware/SKILL.md` | Check firmware versions (updates via OneKey App only) |
| **Security** | `skills/security/SKILL.md` | PIN, passphrase, device settings, factory reset |

## Quick Start

```bash
# Install globally
npm install -g @onekeyfe/hardware-cli

# Search for connected devices (auto-fetches device info)
onekey-hw search

# Get an Ethereum address
onekey-hw get-address --chain evm --use-empty-passphrase

# Sign a message
onekey-hw sign-message --chain evm --message "hello" --use-empty-passphrase
```

## Schema Discovery (for AI Agents)

```bash
# List all commands with their options
onekey-hw schema list

# Get schema for a specific command
onekey-hw schema get-address
onekey-hw schema sign-transaction
```

## Important

- All signing operations require **physical confirmation** on the hardware device
- Commands block while waiting for device interaction (PIN, button press)
- All output is structured JSON
- Uses direct USB (libusb) — no external daemon needed

Each skill file includes pre-flight checks, security rules, and parameter
conventions. Read the relevant skill for your task.
