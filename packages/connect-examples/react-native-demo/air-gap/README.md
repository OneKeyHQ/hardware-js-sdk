# Air-Gap SDK Integration Guide

The module under `packages/connect-examples/react-native-demo/air-gap` demonstrates how to run a closed-loop, QR-based signing flow with the Keystone SDK stack inside an Expo (React Native) application. This document walks through the code that ships with the demo so you can reuse the approach in your own project.

## Feature overview

1. **Import device context** – `AirGapScanner` captures the wallet’s `crypto-multi-accounts` export, converts the captured frames into a UR object with `airGapUrUtils.qrcodeToUr()`, and parses the payload through `getAirGapSdk().parseMultiAccounts()` to persist the device fingerprint, derivation paths, and xpubs.
2. **Build outbound requests** – `OneKeyRequestDeviceQR` and the chain SDK wrappers (`getAirGapSdk().eth`, `.btc`, `.sol`) assemble UR payloads for address verification, sign requests, and PSBT construction based on the stored device metadata.
3. **Process hardware responses** – When the hardware wallet plays back QR frames, `AirGapScanner` feeds them into `airGapUrUtils.createAnimatedURDecoder()`. Completed UR objects are decoded via `parseAirGapUr(...)`, and `DecodedResultCard` renders the structured result (for example `eth-sign-request`, `eth-signature`, or `crypto-psbt`).

## QR scanning pipeline

- Scanning relies on Expo SDK 54’s `CameraView` (`expo-camera`). Only QR barcodes are enabled for stability.
- Every captured string is forwarded to an `AirGapURDecoder` (from `@ngraveio/bc-ur`) via `airGapUrUtils.createAnimatedURDecoder()`. The helper manages frame sequencing and resolves once all parts arrive.
- Sequence hints such as `UR:.../2OF10` are parsed to produce progress messages so the operator knows how many frames remain.
- Non-UR payloads (plain text responses) are wrapped into `new AirGapUR(Buffer.from(value, 'utf8'), 'plain-text')`, keeping the downstream handling consistent and allowing the UI to regenerate a QR image.
- `airGapUrUtils.urToQrcode()` re-encodes UR data for previews. Frames are uppercased and limited to 100 characters to balance density and readability.

## Key dependencies

- `@keystonehq/keystone-sdk`: generates UR payloads for supported chains.
- `@keystonehq/bc-ur-registry` and its chain registries: provides UR schema helpers, address derivation, and path normalization.
- `@ngraveio/bc-ur`: supplies the `UR`, `URDecoder`, and `UREncoder` primitives used in `airGapUrUtils`.
- `expo-camera`: handles runtime QR capture on both iOS and Android.
- Node core polyfills (`buffer`, `crypto-browserify`, `stream-browserify`, `http-browserify`, `https-browserify`, `url`, `events`, `util`, `path-browserify`, `process`) keep SDK dependencies working in Metro.
- `uuid`: creates the `requestId` values that tag each UR interaction.

## Implementation tips

- Configure camera permissions through `app.json` (`ios.infoPlist.NSCameraUsageDescription`, `android.permissions`) before shipping.
- Seed the demo with a genuine hardware export so the stored fingerprint, xpub, and derivation paths match the device that will answer the requests.
- The PSBT builder relies on the captured master fingerprint and xpub to avoid “wallet mismatch” prompts. Replace the sample inputs with production transactions when integrating.
- Keep the polyfill list in sync with your dependency upgrades; new transitive imports may reintroduce Node modules that require shims.

## Helper map

- `airGapUrUtils`: conversions between raw QR frames, UR objects, and JSON representations (`qrcodeToUr`, `urToQrcode`, animated encoder/decoder factories).
- `getAirGapSdk()`: lazily instantiates the Keystone SDK with chain-specific extensions (`AirGapEthSDK`, `AirGapBtcSDK`, `AirGapSolSDK`).
- `OneKeyRequestDeviceQR`: wraps outbound requests so they conform to the `onekey-app-call-device` message structure understood by the hardware.

## Third-party wallet integration notes

When integrating OneKey Air-Gap with an existing wallet app, watch out for these issues discovered during real-world integrations:

### UR type routing (critical)

Most wallets use a whitelist to route UR data to the correct decoder. The BC-UR v2 decoder (`@ngraveio/bc-ur` `URDecoder`) uses fountain codes, while legacy v1 uses a completely different `bc-bech32` encoding.

**Problem**: If a UR type is not in the whitelist, it falls through to the legacy v1 decoder and gets stuck (e.g., "please continue scanning 1/1").

**Solution**: Ensure all standard UR types are in the v2 whitelist. The types your scanner must accept:
- `crypto-psbt` — BTC PSBT (request and response)
- `crypto-hdkey` — HD key export from device
- `crypto-multi-accounts` — Multi-account export from device
- `eth-signature` — Ethereum signature response
- `sol-signature` — Solana signature response
- `btc-signature` — Bitcoin signature response

### `onekey-app-call-device` is private

The `onekey-app-call-device` UR type is an internal protocol for OneKey device management (batch account export, address verification). **Third-party wallets should NOT implement this** — it may change at any time. Use standard Keystone SDK methods (`parseMultiAccounts`, `parseHDKey`) to handle device responses instead.

### Fragment size differences

- OneKey demo uses `maxFragmentLength: 100` (balanced density)
- OneKey firmware uses `max_fragment_len: 200`
- Other wallets may use different values (e.g., 150–200)

The BC-UR decoder handles any fragment size, so these differences don't cause failures. However, larger fragments produce denser QR codes that may be harder for some cameras to scan. Consider the target device's camera quality when choosing fragment sizes.

### Decoder lifecycle

Always create a fresh `URDecoder` for each scanning session. A stale decoder from a previous incomplete scan will reject parts from a new UR payload (different type or sequence). The demo uses a ref-based per-session decoder that is created when the scanner opens and destroyed when it closes.

Consult the source files in `air-gap/sdk` and `air-gap/src` for concrete usage patterns that can be copied into your own application.
