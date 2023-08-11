# `@onekeyfe/hd-transport`

`@onekeyfe/hd-transport` is a library for low-level communication with OneKey Hardware.

## What is the purpose

- translate JSON payloads to binary messages using protobuf definitions comprehensible to OneKey devices
- chunking and reading chunked messages according to the [OneKey protocol](./protocol.md)
- exposing single API for various transport methods:
  - Http Transport
  - React Native Transport
  - WebUSB
- Create and expose typescript definitions based on protobuf definitions.

### The short version

In order to be able to use new features of onekey-firmware you need to update protobuf definitions.

1. `git submodule update --init --recursive` to initialize git submodules.
1. `yarn update-submodules` to update firmware submodule
1. `yarn update:protobuf` to generate new `./messages.json` and `./src/types/messages.ts`

git submodule update --init --recursive to initialize firmware submodule
yarn update-submodules to update firmware submodule
yarn update:protobuf to generate new ./messages.json and ./src/types/messages.ts

## Docs

Documentation is available [hardware-js-sdk](https://developer.onekey.so/connect-to-hardware/hardware-sdk/start)
