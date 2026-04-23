import type { QrResponseData } from '../types/qr';
import type { PreemptionDecision } from '../utils/DeviceJobQueue';

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
  REQUEST_PREEMPTION: 'ui-request-preemption',
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
  RECEIVE_PREEMPTION: 'receive-preemption',
  CANCEL: 'cancel',
} as const;

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
      payload: { granted: boolean };
    }
  | {
      type: typeof UI_RESPONSE.RECEIVE_PREEMPTION;
      payload: { decision: PreemptionDecision };
    }
  | {
      type: typeof UI_RESPONSE.CANCEL;
      payload?: undefined;
    };
