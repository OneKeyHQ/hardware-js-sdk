# OneKey Hardware JS SDK

OneKey Hardware JS SDK is a TypeScript monorepo for integrating OneKey and supported third-party
hardware wallets across browser, desktop, React Native, Node.js, bridge, low-level, and emulator
environments.

## Package families

### OneKey `hd-*` stack

| Package                               | Path                                                                         | Responsibility                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@onekeyfe/hd-core`                   | [`packages/core`](./packages/core)                                           | Public methods, Device lifecycle, state, events, wallet sessions, and orchestration |
| `@onekeyfe/hd-web-sdk`                | [`packages/hd-web-sdk`](./packages/hd-web-sdk)                               | Browser-facing SDK                                                                  |
| `@onekeyfe/hd-ble-sdk`                | [`packages/hd-ble-sdk`](./packages/hd-ble-sdk)                               | React Native BLE-facing SDK                                                         |
| `@onekeyfe/hd-common-connect-sdk`     | [`packages/hd-common-connect-sdk`](./packages/hd-common-connect-sdk)         | Runtime transport selection and shared connect entry                                |
| `@onekeyfe/hd-transport`              | [`packages/hd-transport`](./packages/hd-transport)                           | Protocol V1/V2 schema, framing, sessions, and shared transport contracts            |
| `@onekeyfe/hd-transport-web-device`   | [`packages/hd-transport-web-device`](./packages/hd-transport-web-device)     | WebUSB and Electron BLE transport                                                   |
| `@onekeyfe/hd-transport-react-native` | [`packages/hd-transport-react-native`](./packages/hd-transport-react-native) | React Native BLE transport                                                          |
| `@onekeyfe/hd-transport-usb`          | [`packages/hd-transport-usb`](./packages/hd-transport-usb)                   | Node USB transport                                                                  |
| `@onekeyfe/hd-transport-http`         | [`packages/hd-transport-http`](./packages/hd-transport-http)                 | HTTP bridge transport                                                               |
| `@onekeyfe/hd-transport-lowlevel`     | [`packages/hd-transport-lowlevel`](./packages/hd-transport-lowlevel)         | Low-level plugin transport                                                          |
| `@onekeyfe/hd-transport-emulator`     | [`packages/hd-transport-emulator`](./packages/hd-transport-emulator)         | Emulator transport                                                                  |
| `@onekeyfe/hd-shared`                 | [`packages/shared`](./packages/shared)                                       | Shared constants, errors, types, and utilities                                      |
| `@onekeyfe/hardware-cli`              | [`packages/hd-cli`](./packages/hd-cli)                                       | Hardware-only CLI for developers and AI agents                                      |

### Hardware-kit `hwk-*` adapter stack

The adapter stack separates public hardware-wallet contracts from vendor-specific implementations:

- [`packages/hwk-adapter-core`](./packages/hwk-adapter-core): common adapter and connector contracts.
- [`packages/hwk-ledger-adapter`](./packages/hwk-ledger-adapter): Ledger behavior, with BLE and
  WebHID connectors.
- [`packages/hwk-trezor-adapter`](./packages/hwk-trezor-adapter): Trezor-compatible adapter.
- [`packages/hwk-trezor-connector`](./packages/hwk-trezor-connector): shared connector behavior,
  with WebUSB, Electron BLE, and React Native BLE connectors.
- [`packages/hwk-trezor-core`](./packages/hwk-trezor-core): Trezor-compatible Core runtime,
  protocol, transport, protobuf, and type-support packages.

Do not introduce dependencies between the `hd-*` and `hwk-*` stacks without reviewing the
architecture boundary.

## Documentation

- [Developer documentation](https://developer.onekey.so/connect-to-hardware/hardware-sdk):
  integration and public API guidance.
- [Internal documentation index](./docs/README.md): architecture, protocol, device, SDK, business,
  design, testing, and maintenance facts.
- [Agent instructions](./AGENTS.md): repository-wide engineering and safety rules.
- [Agent workflow maintenance](./docs/maintenance/agent-workflow.md): how instructions, skills,
  commands, and validation fit together.

Package-specific integration details remain in each package README. Historical plans under
`docs/superpowers/` are not current technical facts.

## Setup

Prerequisites:

- Node.js through NVM or another version manager
- Yarn 1
- Git with Git LFS

```bash
git clone git@github.com:OneKeyHQ/hardware-js-sdk.git
cd hardware-js-sdk
git submodule update --init --recursive
yarn
yarn bootstrap
```

Build all packages:

```bash
yarn build
```

Common development entries:

```bash
yarn dev:web
yarn dev:ble
yarn dev:core
yarn dev:transport
yarn dev:transport-web-device
yarn dev:transport-rn
yarn example:desktop
```

## Validation

Use the repository gates before lower-level commands:

```bash
# Changed files and affected packages
yarn agent:check --profile commit

# Full PR-readiness checks
yarn agent:check --profile pr
```

Use focused package tests and builds while iterating. Protocol and protobuf changes should follow
the dependency order documented in [the agent workflow](./docs/maintenance/agent-workflow.md).

## Developing with app-monorepo

Build the SDK and configure `APP_MONOREPO_LOCAL_PATH` in the local environment:

```bash
yarn bootstrap
yarn build
yarn debug:watcher
```

Then start the target app-monorepo application. Keep local paths and environment-specific values
out of commits.
