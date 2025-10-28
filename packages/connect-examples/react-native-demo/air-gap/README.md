# Air-Gap SDK Integration Guide

The demo under `react-native-demo/air-gap` repackages the capabilities of `@onekeyhq/qr-wallet-sdk` to showcase the full offline QR workflow with a hardware wallet:

1. **Connect the hardware** – Display a `crypto-multi-accounts` or `crypto-hdkey` QR code on the device, scan it with `airGapUrUtils.qrcodeToUr`, and parse it through `getAirGapSdk().parseMultiAccounts()` to cache the device name, XFP, account paths, and Xpub information.
2. **Generate application requests** – Combine the imported device context with helpers such as `OneKeyRequestDeviceQR`, `sdk.eth.generateSignRequest()`, and `sdk.btc.generatePSBT()` to build QR codes that the hardware wallet can scan (account sync, address verification, offline signing, and more).
3. **Parse the hardware response** – Scan the animated QR code shown by the device, then use `parseAirGapUr` to recognize payloads like `eth-sign-request`, `eth-signature`, and `crypto-psbt`, and present the decoded result to the user.

## Dependencies and polyfills

- `@onekeyhq/qr-wallet-sdk`: cross-chain UR encoding/decoding and request construction.
- `@ngraveio/bc-ur`: animated UR encoder/decoder utilities.
- `expo-camera`: QR scanning support on Expo SDK 54 (used by `AirGapScanner`).
- Browser-friendly shims such as `crypto-browserify`, `stream-browserify`, `http-browserify`, `https-browserify`, `url`, `events`, `util`, `path-browserify`, and `process` to satisfy Node core module imports used by certain blockchain SDKs.
- `uuid`: generates `requestId` values that comply with the Keystone specification.

## Operational notes

- Configure camera permissions (`ios.infoPlist.NSCameraUsageDescription`, `android.permissions`) before shipping the app.
- Always reuse real account metadata exported from the hardware wallet. The derivation path, XFP, and request parameters must match or the device will reject the request.
- When verifying addresses, ensure the hardware export includes the extended public key (xpub) if you expect the app to suggest an address automatically; otherwise paste the address you want the device to confirm.

## Demo data generation

The React Native demo no longer embeds hard-coded QR payloads. Instead it recreates the same derivations as the production app once you have scanned a real hardware export:

- **Verify Address** – After scanning `crypto-multi-accounts`, the workbench attempts to derive an address from the exported xpub for convenience. The final confirmation step still mirrors the production flow: the hardware wallet shows the address and the operator verifies it manually. The request itself is constructed with `OneKeyRequestDeviceQR` exactly as in `app-monorepo`.
- **BTC PSBT** – When a BTC account is available (the export must include an extended public key), the demo builds a synthetic P2WPKH PSBT. The builder performs BIP32 public derivation in-browser using the device master fingerprint and account xpub, creates a deterministic unsigned transaction, and encodes the proper witness UTXO and BIP32 derivation records. This mirrors the responsibilities handled by `buildPsbt` + `sdk.btc.generatePSBT` in `app-monorepo`, allowing you to present a realistic QR without pasting manual payloads. Replace the generated PSBT with one sourced from your backend or wallet core before broadcasting on mainnet.

## Troubleshooting notes

The demo captures the main issues we hit while aligning with the production workflow and documents the fixes:

- **Plain-text QR responses** – Some hardware operations (notably Verify Address) emit the address as plain text instead of a UR payload. `AirGapScanner` now wraps non `ur:` scans in a `plain-text` UR, and `AirGapDemoScreen` renders both the text and a regenerated QR so downstream tooling can re-scan it. This mirrors `startTwoWayAirGapScanUr({ allowPlainTextResponse: true })` in `app-monorepo`.
- **Missing derivation data** – Earlier exports without xpub information caused warnings such as `deriveDefaultAddress fallback`. The workbench now derives addresses from either the xpub or the public key and falls back to presets only when both are absent. For reliable automation, export the account bundle that contains the extended public key.
- **PSBT wallet mismatch prompts** – When the PSBT was built with placeholder fingerprints, hardware showed “wallet mismatch”. The current helper injects the real XFP, account path, and xpub captured in Step 1 so the request matches the device wallet. The app still surfaces a warning card reminding developers that the bundled PSBT is sample data.
- **Node core polyfills** – Packages like `@ethereumjs/util` and `micro-ftch` require `events`, `http`, `https`, `url`, and `util`. The Metro config ships browserified shims; ensure they remain listed in `package.json`/`metro.config.js` before upgrading dependencies.

## Exposed helpers

- `airGapUrUtils`
  - `qrcodeToUr(qrcode)`: Convert single- or multi-frame QR payloads back to UR objects.
  - `urToQrcode(ur)`: Encode UR data as single or animated QR frames.
  - `createAnimatedURDecoder()` / `createAnimatedUREncoder()`: Handle QR chunk decoding/encoding for animated flows.
- `getAirGapSdk()`: Returns the singleton `AirGapSdk` instance with per-chain helpers (`eth`, `btc`, etc.).
- `OneKeyRequestDeviceQR`: Wrapper around app-side requests such as `getMultiAccounts` or `verifyAddress`.

For additional payloads and reference data, consult the internal repository at `hardware-js-sdk/packages/connect-examples`.
