# Deep Link Playground

## Overview
An Expo screen used by the OneKey React Native demo to exercise WalletConnect deep links. It mirrors the standalone `onekey-deeplink-demo` behaviour and plugs into the feature switcher.

## Features
- Three trigger buttons for deep link, universal link, and raw WalletConnect URI.
- Simple status block showing the most recent URL received by the app.
- Automatic parsing of the `uri` query parameter with an alert when present.

## Usage
1. Install dependencies: `yarn install`.
2. Start the demo app: `yarn start` (load through Expo Go or a simulator).
3. Navigate to **Deep Link Playground** inside the feature catalog.
4. Tap one of the three buttons to trigger the target link type.
5. Check the **Last Received URL** card to confirm the payload.

## Sample URIs
```
Deep link:        onekey-wallet://wc?uri=<WalletConnectURI>
Universal link:   https://app.onekey.so/wc/connect/wc?uri=<WalletConnectURI>
WalletConnect:    wc:6b18a69c27df54b4c228e0ff60218ba460a4994aa5775963f6f0ee354b629afe@2?relay-protocol=irn&symKey=99f6e5fa2bda94c704be8d7adbc2643b861ef49dbe09e0af26d3713e219b4355
```

## Notes
- The demo relies on `expo-linking` for URL parsing; run `yarn install` to sync dependencies.
- Reset the screen (via reload) if you need to clear the last URL state; `exp://` development links are ignored automatically.
- In Expo dev mode the initial URL is `exp://...`; the screen ignores it so only business callbacks are shown.
- Cached metadata is stored via AsyncStorage; open the **Manage** tab to inspect or clear demo data.

## Deep vs Universal Links
- **Deep link (`onekey-wallet://...`)** calls the OneKey app directly via the custom scheme. It requires the mobile app to be installed and launches it immediately.
- **Universal link (`https://app.onekey.so/...`)** uses HTTPS with Apple Associated Domains / Android Digital Asset Links. When the native app is installed it will open the app; otherwise the link stays in the browser and can guide the user to download or fallback web flows.
- **Raw WalletConnect URI (`wc:...`)** lets the OS detect WalletConnect V2 handlers; OneKey registers the scheme alongside other wallets.

## Parameters
- Embed the WalletConnect payload inside the query string: `?uri=${encodeURIComponent(wcUri)}`.
- Optional fields like `symKey` must also be URL-encoded. The production app reads them in `packages/kit/src/routes/config/deeplink/index.ts` inside `app-monorepo`.
- Keep payloads concise; large URIs can exceed OS length limits (iOS ~2000 characters for custom schemes, Android varies by component).

## Use Cases
- Launch OneKey during a WalletConnect handshake from a mobile DApp browser or another native app.
- Provide Telegram Mini App or web dapps with a dependable fallback when the native scheme fails (universal link -> download).
- Simplify QA by manually pasting or tapping sample URIs without switching projects.
