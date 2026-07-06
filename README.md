# Hardware-js-sdk

Hardware-js-sdk is designed to allow third-party developers to quickly access the OneKey hardware wallet. The repository structure uses the monorepo to make each module more manageable.

## Packages

| package                                                                     | description                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [@onekeyfe/hd-core](./packages/core)                                        | Core connection flows and chain APIs for OneKey hardware devices.     |
| [@onekeyfe/hd-web-sdk](./packages/hd-web-sdk)                               | Using the sdk in the web platform.                                    |
| [@onekeyfe/hd-ble-sdk](./packages/hd-ble-sdk)                               | Using the SDK in BLE communication environment. e.g: iOS / Android    |
| [@onekeyfe/hd-common-connect-sdk](./packages/hd-common-connect-sdk)         | Shared SDK runtime for Node.js and browser transports.                |
| [@onekeyfe/hd-transport](./packages/hd-transport)                           | Data serialization and deserialization of hardware communication data |
| [@onekeyfe/hd-transport-http](./packages/hd-transport-http)                 | communication lib for http                                            |
| [@onekeyfe/hd-transport-react-native](./packages/hd-transport-react-native) | communication lib for React Native                                    |
| [@onekeyfe/hd-transport-web-device](./packages/hd-transport-web-device)     | communication lib for WebUSB/WebHID browser environments              |
| [@onekeyfe/hd-shared](./packages/shared)                                    | Tools, error definitions, constants                                   |
| [@onekeyfe/hardware-cli](./packages/hd-cli)                                | CLI for AI agent integration (Claude Code, Cursor, etc.)              |
| [@onekeyfe/hwk-adapter-core](./packages/hwk-adapter-core)                   | Shared types, events, and error contracts for hardware adapters       |
| [@onekeyfe/hwk-ledger-adapter](./packages/hwk-ledger-adapter)               | Vendor-neutral Ledger adapter with chain methods and retry handling   |
| [@onekeyfe/hwk-ledger-connector-webhid](./packages/hwk-ledger-connector-webhid) | WebHID connector for Ledger devices in browser environments       |
| [@onekeyfe/hwk-ledger-connector-ble](./packages/hwk-ledger-connector-ble)   | React Native BLE connector for Ledger devices                         |

## Documentation

See the full documentation on [developer.onekey.so](https://developer.onekey.so/connect-to-hardware/hardware-sdk).

## hardware-js-sdk development

Before you start make sure you have downloaded and installed NVM, Yarn and git with git lfs.

- `git clone git@github.com:OneKeyHQ/hardware-js-sdk.git`
- `git submodule update --init --recursive`
- `yarn`
- `yarn bootstrap`

Run a dev build:

- `yarn dev:web` (web sdk)
- `yarn dev:ble` (react-native sdk)
- `yarn dev:core` (core package)
- `yarn dev:transport-http` (transport-http package)
- `yarn dev:shared` (shared package)

### Development with example desktop app (Recommend)
- `yarn bootstrap && yarn build`
- `yarn example:desktop`

### Development with example mobile app
- `yarn bootstrap && yarn build`
- `yarn example` select ios or android in menu.

### Development with example web app
- Build web sdk
- Edit connect src in `packages/connect-examples/expo-example/src/constants/connect.ts`, change `CONNECT_SRC` to `https://localhost:8087/`
- `yarn dev:web`
- Open chrome browser, enter `https://localhost:8087/`, simply type "thisisunsafe" directly on your keyboard (no need to press Enter)
- Run example app
- `yarn bootstrap && yarn build`
- `yarn example` select web in menu.

### Development onekey-app monorepo

- Build all packages
- `yarn bootstrap && yarn build`
- Edit .env file, APP_MONOREPO_LOCAL_PATH=/path/to/v5-app-monorepo
- `yarn debug:watcher`

Open v5-app-monorepo, run `yarn && yarn app:xxxx` to start the app.
