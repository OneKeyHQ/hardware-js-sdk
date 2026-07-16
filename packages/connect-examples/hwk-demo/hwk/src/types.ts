import type { TrezorAdapter } from '@onekeyfe/hwk-trezor-adapter';

/** Hardware-wallet brand the screen is currently driving. */
export type HwkBrand = 'trezor' | 'ledger';

/**
 * Adapter abstraction. Today only TrezorAdapter is plugged in for the MVP
 * web build — Ledger DMK packages currently conflict with our metro setup
 * and will be re-introduced in a follow-up.
 */
export type HwkAdapter = TrezorAdapter;

export interface HwkAdapterDeps {
  debugLogger: (entry: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    scope: string;
    event: string;
    data?: Record<string, unknown>;
  }) => void;
  /**
   * Live array of saved THP pairing credentials. The screen owns it: loads
   * from AsyncStorage at mount, pushes into it when DEVICE.TREZOR_THP_CREDENTIALS_CHANGED
   * fires, persists back. Factories hand the SAME reference to the connector
   * so subsequent sessions pick up freshly-minted creds without a restart.
   */
  thpKnownCredentials?: Record<string, unknown>[];
}

/**
 * Bundle returned by `createHwkAdapter`. Bundles the adapter with any
 * platform-specific extras the screen needs to wire up — keeps the screen
 * free of `Platform.OS` checks and of native-only modules (BleManager,
 * PermissionsAndroid) that would break the web bundle.
 *
 * The bundle factory ALSO registers a per-platform handler for the SDK's
 * own `UI_REQUEST.REQUEST_DEVICE_PERMISSION` event (mirrors the OneKey
 * App Monorepo pattern at `kit-bg/.../thirdPartyHardwareAdapterRegistry.ts`).
 * The screen never has to ask for permissions itself — the adapter emits
 * the request whenever it needs them, and the factory's handler decides
 * per platform what "permission" means (Android PermissionsAndroid /
 * BLE radio state / WebUSB availability / …).
 */
export interface HwkAdapterBundle {
  adapter: HwkAdapter;
  /**
   * Web only — surfaces the browser device picker (must be triggered from a
   * user gesture click). Undefined on native (where scanning is automatic)
   * and on Ledger web (DMK triggers navigator.hid internally during scan).
   */
  requestDevice?(): Promise<void>;
}

/** Map of brands to their per-platform availability — drives the UI picker. */
export const HWK_BRAND_LABELS: Record<HwkBrand, string> = {
  trezor: 'Trezor',
  ledger: 'Ledger',
};
