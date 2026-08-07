import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';
import { TrezorAdapter } from '@onekeyfe/hwk-trezor-adapter';
import { createTrezorRnBleConnector } from '@onekeyfe/hwk-trezor-connector-rn-ble';

import type { HwkAdapter, HwkAdapterBundle, HwkAdapterDeps, HwkBrand } from './types';

/**
 * Native (iOS/Android) factory.
 *   Trezor → RN BLE (react-native-ble-plx, custom transport)
 *   Ledger → temporarily disabled on this MVP (DMK <-> metro friction).
 *
 * The adapter emits `UI_REQUEST.REQUEST_DEVICE_PERMISSION` whenever it
 * needs OS-level access. We register the handler here so the screen
 * stays platform-blind — exactly the shape app-monorepo uses in
 * `kit-bg/.../thirdPartyHardwareAdapterRegistry.ts`.
 */
export const createHwkAdapter = (brand: HwkBrand, deps: HwkAdapterDeps): HwkAdapterBundle => {
  if (brand !== 'trezor') {
    throw Object.assign(
      new Error(`HWK native adapter for "${brand as string}" is not wired up in this MVP build.`),
      { code: 'HWK_BRAND_NOT_WIRED' }
    );
  }

  const bleManager = new BleManager();
  const adapter: HwkAdapter = new TrezorAdapter(
    createTrezorRnBleConnector({
      transportOptions: { manager: bleManager as never, logger: deps.debugLogger },
      thp: {
        hostName: 'OneKey',
        appName: 'HWK Demo',
        logger: deps.debugLogger,
        knownCredentials: deps.thpKnownCredentials,
      },
    })
  );

  adapter.on(UI_REQUEST.REQUEST_DEVICE_PERMISSION, async () => {
    deps.debugLogger({
      level: 'debug',
      scope: 'hwk-demo.permission',
      event: 'request.received',
      data: { os: Platform.OS },
    });
    const { granted, reason } = await checkNativePermissions(bleManager);
    if (!granted && reason) {
      Alert.alert(reason.title, reason.body, reason.actions);
    }
    adapter.uiResponse({
      type: UI_RESPONSE.RECEIVE_DEVICE_PERMISSION,
      payload: { granted },
    });
  });

  return { adapter };
};

interface PermissionReason {
  title: string;
  body: string;
  actions?: { text: string; onPress?: () => void }[];
}

async function checkNativePermissions(
  bleManager: BleManager
): Promise<{ granted: boolean; reason?: PermissionReason }> {
  if (Platform.OS === 'android') {
    const perms: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [];
    if (Number(Platform.Version) >= 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);

    const res = await PermissionsAndroid.requestMultiple(perms);
    const ok = Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    if (!ok) {
      return {
        granted: false,
        reason: {
          title: 'Permission required',
          body: 'Please grant Bluetooth and Location permissions.',
        },
      };
    }
  }
  const state = await bleManager.state();
  if (state !== 'PoweredOn') {
    return {
      granted: false,
      reason: {
        title: 'Bluetooth Off',
        body: 'Please turn on Bluetooth and try again.',
        actions: [
          { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => undefined) },
          { text: 'OK' },
        ],
      },
    };
  }
  return { granted: true };
}

export type { HwkBrand, HwkAdapter, HwkAdapterBundle, HwkAdapterDeps } from './types';
export { BleManager };
