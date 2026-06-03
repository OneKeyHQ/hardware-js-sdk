import type { QrResponseData } from '../types/qr';

export const UI_EVENT = 'UI_EVENT';

export const UI_REQUEST = {
  REQUEST_PIN: 'ui-request-pin',
  REQUEST_PASSPHRASE: 'ui-request-passphrase',
  REQUEST_PASSPHRASE_ON_DEVICE: 'ui-request-passphrase-on-device',
  REQUEST_BUTTON: 'ui-request-button',
  REQUEST_QR_DISPLAY: 'ui-request-qr-display',
  REQUEST_QR_SCAN: 'ui-request-qr-scan',
  REQUEST_DEVICE_PERMISSION: 'ui-request-device-permission',
  REQUEST_SELECT_DEVICE: 'ui-request-select-device',
  REQUEST_DEVICE_CONNECT: 'ui-request-device-connect',
  // Ledger BTC App: account index >= 100 requires display=true. Adapter asks
  // the user once per session before promoting the call.
  REQUEST_BTC_HIGH_INDEX_CONFIRM: 'ui-request-btc-high-index-confirm',
  // Required app is not installed; with autoInstallApp on, ask the user
  // whether to install it before retrying the operation.
  REQUEST_INSTALL_APP: 'ui-request-install-app',
  CLOSE_UI_WINDOW: 'ui-close',
  DEVICE_PROGRESS: 'ui-device_progress',
  FIRMWARE_PROGRESS: 'ui-firmware-progress',
  FIRMWARE_TIP: 'ui-firmware-tip',
} as const;

export const UI_RESPONSE = {
  RECEIVE_PIN: 'receive-pin',
  RECEIVE_PASSPHRASE: 'receive-passphrase',
  RECEIVE_PASSPHRASE_ON_DEVICE: 'receive-passphrase-on-device',
  RECEIVE_QR_RESPONSE: 'receive-qr-response',
  RECEIVE_SELECT_DEVICE: 'receive-select-device',
  RECEIVE_DEVICE_CONNECT: 'receive-device-connect',
  RECEIVE_DEVICE_PERMISSION: 'receive-device-permission',
  RECEIVE_BTC_HIGH_INDEX_CONFIRM: 'receive-btc-high-index-confirm',
  RECEIVE_INSTALL_APP: 'receive-install-app',
  CANCEL: 'cancel',
} as const;

export type DevicePermissionDeniedReason =
  | 'bluetoothTurnedOff'
  | 'permissionDenied'
  | (string & Record<never, never>);

export type DevicePermissionResponse = {
  granted: boolean;
  reason?: DevicePermissionDeniedReason;
  message?: string;
};

export type UiResponseEvent =
  | {
      type: typeof UI_RESPONSE.RECEIVE_PIN;
      payload: string;
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_PASSPHRASE;
      payload: {
        value: string;
        passphraseOnDevice?: boolean;
        save?: boolean;
      };
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_PASSPHRASE_ON_DEVICE;
      payload?: undefined;
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_QR_RESPONSE;
      payload: QrResponseData;
    }
  | {
      // sdkConnectId echoes one of the DeviceInfo.connectId values emitted in
      // the REQUEST_SELECT_DEVICE event's `devices` list. Scope is the current
      // search session; may be ephemeral (e.g. Ledger USB DMK UUID).
      type: typeof UI_RESPONSE.RECEIVE_SELECT_DEVICE;
      payload: { sdkConnectId: string };
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_DEVICE_CONNECT;
      payload: { confirmed: boolean };
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_DEVICE_PERMISSION;
      payload: DevicePermissionResponse;
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_BTC_HIGH_INDEX_CONFIRM;
      payload: { confirmed: boolean };
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_INSTALL_APP;
      payload: { confirmed: boolean };
    }
  | {
      type: typeof UI_RESPONSE.CANCEL;
      payload?: undefined;
    };
