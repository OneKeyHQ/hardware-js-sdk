# `@onekeyfe/hd-core`

@onekeyfe/hd-core is a platform for easy integration of OneKey hardware into 3rd party services. This library provides the core processes and APIs for communicating with OneKey hardware.

This library is not environment specific, if you want to use a specific SDK, please refer to the SDK for each environment.

## Installation

Install library as npm module:

```javascript
npm install @onekeyfe/hd-core
```

or

```javascript
yarn add @onekeyfe/hd-core
```

## Initialization

```javascript
import Core from '@onekeyfe/hd-core';
```

## Docs

Documentation is available [Hardware SDK Getting Started](https://developer.onekey.so/en/hardware-sdk/getting-started)

## Examples

### Babylon context hash

`btcDeriveContextHash(connectId, deviceId, params)` requires Classic 1s firmware
3.21.0 or later and Protocol V1. It uses the existing wallet session and device
confirmation flow. Other device families and Protocol V2 are not supported.

```typescript
const result = await HardwareSDK.btcDeriveContextHash(connectId, deviceId, {
  path: "m/84'/0'/0'/0/0", // The currently selected Bitcoin key, not the IKM path.
  appName: 'babylon-btc-vault',
  context: 'deadbeef',
  network: 'bitcoin-mainnet',
});
// result.payload.secret is a 32-byte value encoded as 64 lowercase hex characters.
```

`appName` must contain 1–64 ASCII lowercase letters, digits or hyphens. `context`
must be lowercase hex without `0x`, containing 1–1024 decoded bytes. `network` is
required: `bitcoin-mainnet`, `bitcoin-testnet` (testnet3/testnet4), `bitcoin-signet`,
or `bitcoin-regtest`. The SDK infers the Bitcoin input script type from `path` and
encodes `appName` as ASCII bytes; the device performs the derivation internally.
Device rejection and unsupported firmware errors propagate through the normal
SDK response. Treat the returned secret as sensitive and do not log or persist it.

See the [Babylon specification](https://github.com/babylonlabs-io/babylon-toolkit/blob/main/docs/specs/derive-context-hash.md).

// TODO: add example url
