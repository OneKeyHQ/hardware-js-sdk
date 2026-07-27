---
name: hardware-dev-commands
description: Choose Hardware JS SDK setup, development, build, test, protobuf, example, validation, branch, or commit commands. Use when asked how to run, build, test, validate, or develop this repository.
---

# Hardware Development Commands

Read the root `package.json` before recommending a command. Never invent a script or copy a command
from app-monorepo without verifying it exists here.

## Repository commands

| Purpose                        | Command                             |
| ------------------------------ | ----------------------------------- |
| Install and link workspaces    | `yarn` then `yarn bootstrap`        |
| Build publishable packages     | `yarn build`                        |
| Run package tests              | `yarn test`                         |
| Check aligned package versions | `yarn check-versions`               |
| Regenerate transport protobuf  | `yarn update-protobuf`              |
| Validate current changes       | `yarn agent:check --profile commit` |
| Validate PR readiness          | `yarn agent:check --profile pr`     |

Use the matching root `dev:*` script for a specific watch process. Current targets include `web`,
`ble`, `common`, `core`, `transport`, `transport-http`, `transport-rn`, `transport-lowlevel`,
`transport-emulator`, `transport-web-device`, `transport-electron`, `shared`, and `cli`.

## Focused package commands

Prefer a focused command while iterating:

```bash
yarn --cwd packages/<package> test --runInBand
yarn --cwd packages/<package> build
yarn --cwd packages/<package> lint
```

Check that the target package declares the selected script. Follow
[the Agent workflow](../../../docs/maintenance/agent-workflow.md) for protocol/protobuf build order.
Use the compact `agent:check` result first; inspect its log path before running lower-level commands
to diagnose a failure.

Use base branch `onekey` and commit format `type: short description`. Preserve unrelated worktree
changes and never treat a development command request as authorization to clean, publish, push, or
mutate a device.
