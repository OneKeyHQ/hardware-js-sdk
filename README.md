# Hardware-js-sdk

Hardware-js-sdk is designed to allow third-party developers to quickly access the OneKey hardware wallet. The repository structure uses the monorepo to make each module more manageable.

## Packages

| package                                                                     | description                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [@onekeyfe/core](./packages/core)                                           | The core process of hardware wallet connection.                       |
| [@onekeyfe/hd-web-sdk](./packages/hd-web-sdk)                               | Using the sdk in the web platform.                                    |
| [@onekeyfe/hd-ble-sdk](./packages/hd-ble-sdk)                               | Using the SDK in BLE communication environment. e.g: iOS / Android    |
| [@onekeyfe/hd-common-sdk](./packages/hd-common-connect-sdk)                 | Using the SDK in a node or web-usb environment                        |
| [@onekeyfe/hd-transport](./packages/hd-transport)                           | Data serialization and deserialization of hardware communication data |
| [@onekeyfe/hd-transport-http](./packages/hd-transport-http)                 | communication lib for http                                            |
| [@onekeyfe/hd-transport-react-native](./packages/hd-transport-react-native) | communication lib for React Native                                    |
| [@onekeyfe/hd-transport-webusb](./packages/hd-transport-webusb)             | communication lib for WebUSB                                          |
| [@onekeyfe/hd-shared](./packages/shared)                                    | Tools, error definitions, constants                                   |

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
