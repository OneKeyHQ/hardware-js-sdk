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
1. `yarn update-protobuf` to generate new `./messages.json`, `./messages-protocol-v2.json` and `./src/types/messages.ts`

The same task can be run from the repository root with `yarn update-protobuf`. The Protocol V2 schema requires the `firmware-pro2` submodule checked out on branch `main`.

## CSP-safe protobuf runtime (`@bufbuild/protobuf`)

Transport initialization uses `parseTransportConfigure` (and `parseConfigure`) backed
by `@bufbuild/protobuf` descriptor registries, avoiding `protobufjs` runtime code
generation (`new Function` / `eval`) in strict CSP environments such as Chrome MV3
extensions.

Run these commands from the repository root:

```sh
yarn --cwd packages/hd-transport test --runInBand --coverage=false static-protobuf
yarn --cwd packages/hd-transport build
yarn --cwd packages/hd-transport test:static-csp
```

The differential and boundary tests compare `@bufbuild/protobuf` encoding/decoding
byte-for-byte against `protobufjs` using synthetic data without connecting to hardware.

## Docs

Documentation is available [Hardware SDK Getting Started](https://developer.onekey.so/en/hardware-sdk/getting-started)
