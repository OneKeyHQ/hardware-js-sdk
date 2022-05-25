import type { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';

declare global {
  interface Window {
    frameBridge: JsBridgeIframe;
    hostBridge: JsBridgeIframe;
  }
}
