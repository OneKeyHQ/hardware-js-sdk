import { Alert } from 'react-native';
import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';
import { TrezorAdapter } from '@onekeyfe/hwk-trezor-adapter';
import { TrezorWebUsbConnector } from '@onekeyfe/hwk-trezor-connector-webusb';

import type { HwkAdapter, HwkAdapterBundle, HwkAdapterDeps, HwkBrand } from './types';

/**
 * Web factory.
 *   Trezor → WebUSB (navigator.usb, requires user-gesture picker)
 *   Ledger → disabled on web. The Ledger WebHID connector pulls in
 *            `@ledgerhq/device-transport-kit-web-hid`, which Metro cannot resolve
 *            from a workspace package (the "DMK ↔ metro" friction). Test the
 *            Ledger attestation path on real hardware via app-monorepo instead.
 *
 * Mirror of `connectorFactory.native.ts` — registers the same
 * `REQUEST_DEVICE_PERMISSION` event handler, but on the web side
 * "permission" just means "the browser exposes the right capability"
 * (the actual device picker is a separate user-gesture step the screen
 * triggers via `bundle.requestDevice`).
 */
export const createHwkAdapter = (brand: HwkBrand, deps: HwkAdapterDeps): HwkAdapterBundle => {
  if (brand !== 'trezor') {
    throw Object.assign(
      new Error(`HWK web adapter for "${brand as string}" is not wired up in this MVP build.`),
      { code: 'HWK_BRAND_NOT_WIRED' }
    );
  }

  const connector = new TrezorWebUsbConnector({
    thp: {
      hostName: 'OneKey',
      appName: 'HWK Demo',
      logger: deps.debugLogger,
      knownCredentials: deps.thpKnownCredentials,
    },
  });
  const adapter: HwkAdapter = new TrezorAdapter(connector);

  adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, () => {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    const granted = !!nav && 'usb' in nav;
    if (!granted) {
      Alert.alert(
        'WebUSB unavailable',
        'This browser does not expose navigator.usb. Use Chrome or Edge over HTTPS / localhost.'
      );
    }
    adapter.uiResponse({
      type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
      payload: { granted },
    });
  });

  return {
    adapter,
    requestDevice: async () => {
      await connector.requestDevice();
    },
  };
};

export type { HwkBrand, HwkAdapter, HwkAdapterBundle, HwkAdapterDeps } from './types';
