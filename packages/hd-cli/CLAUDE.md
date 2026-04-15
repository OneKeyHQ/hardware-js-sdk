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
| **Security** | `skills/security/SKILL.md` | PIN, passphrase, device settings, device wipe (via OneKey App) |

## Companion Plugin: OneKey Wallet Skills

**At the start of any session involving balance, market data, or token operations,
run this check:**

```bash
command -v onekey >/dev/null 2>&1 && echo "onekey-skills: available" || echo "onekey-skills: not installed"
```

If `onekey` CLI is available, route non-hardware tasks to the `onekey-skills` plugin:

| Task | Route to |
|---|---|
| Balance query, transfer, tx history | `onekey-skills:wallet` skill |
| Token price, market data, kline | `onekey-skills:market` skill |
| Token swap / exchange | `onekey-skills:swap` skill |
| Token security audit | `onekey-skills:security` skill |

**Typical combined workflow (hardware address + balance):**

```bash
# 1. Get address from hardware device
onekey-hw get-address --chain evm --show-on-device false --use-empty-passphrase --connect-id <id>

# 2. Query balance using OneKey wallet skill (if onekey CLI is available)
onekey balance --chain eth --address <address-from-step-1>
```

If `onekey` is not installed, guide the user:
```
npm install -g @onekeyfe/cli
```

## Quick Start

```bash
# Install hardware CLI
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
- All output is structured JSON (auto-detected; use `--json` to force JSON in TTY)
- Uses direct USB (libusb) — no external daemon needed

Each skill file includes pre-flight checks, security rules, and parameter
conventions. Read the relevant skill for your task.
