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

## Routing: Hardware vs Other Skills

| User says | Route to | Why |
|---|---|---|
| "check my balance" / "查余额" | **wallet** (`onekey balance`) | Balance query doesn't need hardware |
| "check my hardware wallet balance" | **hardware** → then **wallet** | Need hardware address first, then query balance |
| "send ETH" / "转账" | **wallet** (`onekey transfer`) | Default to software wallet |
| "what's the price of ETH" | **market** (`onekey token price`) | Market data, no hardware needed |
| "swap ETH to USDC" | **swap** (`onekey swap`) | Token swap, no hardware needed |
| "is this token safe?" | **security** (`onekey security`) | Token audit, no hardware needed |
| "get my address" / "获取地址" | **ask which wallet** | Ambiguous — could be hardware or software |
| "get my hardware wallet address" | **hardware** (`onekey-hw get-address`) | Explicit hardware mention |
| "sign on my OneKey device" | **hardware** (`onekey-hw sign-*`) | Explicit hardware mention |
| "what's my device firmware?" | **hardware** (`onekey-hw firmware-check`) | Device-specific |
| "change my PIN" | **hardware** (`onekey-hw change-pin`) | Device-specific |
| "what tokens are trending?" | **market** (`onekey token trending`) | Market data, no hardware needed |

**Key rules:**
- If user mentions "hardware wallet", "OneKey device", "my device" → route to `onekey-hw`
- If user asks about balance, price, swap, transfer WITHOUT mentioning hardware → route to `onekey` (wallet/market/swap)
- If ambiguous (e.g., "get my address") → ask which wallet before proceeding

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
