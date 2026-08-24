import type { PROTO } from '../constants';
import type { Device } from '../types';
import type { DeviceButtonRequest } from './device';
import type { UiResponseCorrelation } from './ui-response';
import type { MessageFactoryFn } from './utils';

export const UI_EVENT = 'UI_EVENT';

export const UI_REQUEST = {
  REQUEST_PIN: 'ui-request_pin',
  INVALID_PIN: 'ui-invalid_pin',
  REQUEST_BUTTON: 'ui-button',
  REQUEST_PASSPHRASE: 'ui-request_passphrase',
  REQUEST_PASSPHRASE_ON_DEVICE: 'ui-request_passphrase_on_device',
  REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE:
    'ui-request_select_device_in_bootloader_for_web_device',
  REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE:
    'ui-request_select_device_for_switch_firmware_web_device',

  CLOSE_UI_WINDOW: 'ui-close_window',
  CLOSE_UI_PIN_WINDOW: 'ui-close_pin_window',
  DEVICE_PROGRESS: 'ui-device_progress',

  BLUETOOTH_PERMISSION: 'ui-bluetooth_permission',
  BLUETOOTH_UNSUPPORTED: 'ui-bluetooth_unsupported',
  BLUETOOTH_POWERED_OFF: 'ui-bluetooth_powered_off',

  BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE:
    'ui-bluetooth_characteristic_notify_change_failure',
  LOCATION_PERMISSION: 'ui-location_permission',
  LOCATION_SERVICE_PERMISSION: 'ui-location_service_permission',

  FIRMWARE_PROCESSING: 'ui-firmware-processing',
  FIRMWARE_PROGRESS: 'ui-firmware-progress',
  FIRMWARE_TIP: 'ui-firmware-tip',

  PREVIOUS_ADDRESS_RESULT: 'ui-previous_address_result',

  WEB_DEVICE_PROMPT_ACCESS_PERMISSION: 'ui-web_device_prompt_access_permission',

  BOOTLOADER: 'ui-device_bootloader_mode',
  NOT_IN_BOOTLOADER: 'ui-device_not_in_bootloader_mode',
  REQUIRE_MODE: 'ui-device_require_mode',
  NOT_INITIALIZE: 'ui-device_not_initialized',
  SEEDLESS: 'ui-device_seedless',
  FIRMWARE_OLD: 'ui-device_firmware_old',
  FIRMWARE_NOT_SUPPORTED: 'ui-device_firmware_unsupported',
  FIRMWARE_NOT_COMPATIBLE: 'ui-device_firmware_not_compatible',
  FIRMWARE_NOT_INSTALLED: 'ui-device_firmware_not_installed',
  NOT_USE_ONEKEY_DEVICE: 'ui-device_please_use_onekey_device',
} as const;

export type ProtocolV2UiEventSource =
  | 'unlock-coordinator'
  | 'wallet-session-coordinator'
  | 'method-lifecycle';

export type ProtocolV2UiCompletion = 'page-accepted' | 'operation-completed';

export type HardwareUiInteractionMeta = {
  interactionId: string;
  phaseId: string;
  sequence: number;
  phase: 'pin' | 'passphrase' | 'passphrase-on-device' | 'button' | 'processing';
  transition: 'start' | 'complete' | 'finish';
  outcome?: 'submitted' | 'succeeded' | 'failed' | 'cancelled' | 'disconnected';
  protocol: 'V2';
  device?: Device;
};

export type ProtocolV2UiEventMetadata = {
  source?: ProtocolV2UiEventSource;
  reason?: string;
  deviceOnly?: boolean;
  completion?: ProtocolV2UiCompletion;
  method?: string;
  page?: string | number;
  operation?: string;
  interaction?: HardwareUiInteractionMeta;
};

export type UiRequestWindowClose =
  | {
      type: typeof UI_REQUEST.CLOSE_UI_WINDOW;
      payload: HardwareUiInteractionMeta;
    }
  | {
      type: typeof UI_REQUEST.CLOSE_UI_PIN_WINDOW;
      payload: HardwareUiInteractionMeta;
    }
  | {
      type: typeof UI_REQUEST.CLOSE_UI_WINDOW;
      payload?: undefined;
    }
  | {
      type: typeof UI_REQUEST.CLOSE_UI_PIN_WINDOW;
      payload?: undefined;
    };

export interface UiRequestWithoutPayload {
  type:
    | typeof UI_REQUEST.BLUETOOTH_PERMISSION
    | typeof UI_REQUEST.BLUETOOTH_UNSUPPORTED
    | typeof UI_REQUEST.BLUETOOTH_POWERED_OFF
    | typeof UI_REQUEST.BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE
    | typeof UI_REQUEST.LOCATION_PERMISSION
    | typeof UI_REQUEST.LOCATION_SERVICE_PERMISSION
    | typeof UI_REQUEST.FIRMWARE_PROCESSING
    | typeof UI_REQUEST.WEB_DEVICE_PROMPT_ACCESS_PERMISSION;
  payload?: typeof undefined;
}

export interface UiRequestFirmwareProgressing {
  type: typeof UI_REQUEST.FIRMWARE_PROCESSING;
  payload: {
    type: 'firmware' | 'ble' | 'bootloader' | 'resource';
  };
}

export type UiRequestDeviceAction = {
  type: typeof UI_REQUEST.REQUEST_PIN;
  payload: ProtocolV2UiEventMetadata & {
    device: Device;
    type?: PROTO.PinMatrixRequestType | 'ButtonRequest_PinEntry' | 'ButtonRequest_AttachPin';
    responseCorrelation?: UiResponseCorrelation;
  };
};

export interface UiRequestButton {
  type: typeof UI_REQUEST.REQUEST_BUTTON;
  payload: DeviceButtonRequest['payload'] & ProtocolV2UiEventMetadata;
}

export interface UiRequestPassphrase {
  type: typeof UI_REQUEST.REQUEST_PASSPHRASE;
  payload: {
    device: Device;
    passphraseState?: string;
    existsAttachPinUser?: boolean;
    deviceOnly?: boolean;
    source?: 'wallet-session-coordinator';
    reason?: 'open-wallet' | 'session-recovery';
    expectedPassphraseState?: string;
    interaction?: HardwareUiInteractionMeta;
    responseCorrelation?: UiResponseCorrelation;
  };
}

export interface UiRequestPassphraseOnDevice {
  type: typeof UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE;
  payload: {
    device: Device;
    passphraseState?: string;
    source?: 'wallet-session-coordinator';
    reason?: 'open-wallet' | 'session-recovery';
    interaction?: HardwareUiInteractionMeta;
  };
}

export interface UiRequestSelectDeviceInBootloaderForWebDevice {
  type: typeof UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE;
  payload: {
    device: Device;
  };
}

export interface UiRequestSelectDeviceForSwitchFirmwareWebDevice {
  type: typeof UI_REQUEST.REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE;
  payload: {
    device: Device;
  };
}

export interface FirmwareProcessing {
  type: typeof UI_REQUEST.FIRMWARE_PROCESSING;
  payload: {
    type: 'firmware' | 'ble' | 'bootloader' | 'resource';
  };
}

export type IFirmwareUpdateProgressType = 'transferData' | 'installingFirmware';
export interface FirmwareProgress {
  type: typeof UI_REQUEST.FIRMWARE_PROGRESS;
  payload: {
    device: Device;
    progress: number;
    progressType: IFirmwareUpdateProgressType;
    transferredBytes?: number;
    totalBytes?: number;
    rateBytesPerSecond?: number;
    elapsedMs?: number;
    installTargetId?: number;
    installPhase?: 'prepare' | 'install' | 'verify';
    installPhaseProgress?: number;
  };
}

export interface FirmwareTip {
  type: typeof UI_REQUEST.FIRMWARE_TIP;
  payload: {
    device: Device;
    data: { message: string };
  };
}

export interface DeviceProgress {
  type: typeof UI_REQUEST.DEVICE_PROGRESS;
  payload: {
    progress?: number;
    transferredBytes?: number;
    totalBytes?: number;
    rateBytesPerSecond?: number;
    elapsedMs?: number;
  };
}

export interface PreviousAddressResult {
  type: typeof UI_REQUEST.PREVIOUS_ADDRESS_RESULT;
  payload: {
    device: Device;
    data: {
      address?: string;
      path?: string;
    };
  };
}

export type UiEvent =
  | UiRequestWithoutPayload
  | UiRequestWindowClose
  | UiRequestDeviceAction
  | UiRequestButton
  | UiRequestPassphraseOnDevice
  | UiRequestPassphrase
  | UiRequestSelectDeviceInBootloaderForWebDevice
  | UiRequestSelectDeviceForSwitchFirmwareWebDevice
  | FirmwareProcessing
  | UiRequestSelectDeviceInBootloaderForWebDevice
  | FirmwareProgress
  | FirmwareTip
  | DeviceProgress
  | PreviousAddressResult;

export enum FirmwareUpdateTipMessage {
  CheckLatestUiResource = 'CheckLatestUiResource',

  StartDownloadFirmware = 'StartDownloadFirmware',
  FinishDownloadFirmware = 'FinishDownloadFirmware',
  DownloadLatestUiResource = 'DownloadLatestUiResource',
  DownloadFirmware = 'DownloadFirmware',
  DownloadBleFirmware = 'DownloadBleFirmware',
  DownloadLatestBootloaderResource = 'DownloadLatestBootloaderResource',

  DownloadLatestUiResourceSuccess = 'DownloadLatestUiResourceSuccess',
  DownloadFirmwareSuccess = 'DownloadFirmwareSuccess',
  DownloadBleFirmwareSuccess = 'DownloadBleFirmwareSuccess',
  DownloadLatestBootloaderResourceSuccess = 'DownloadLatestBootloaderResourceSuccess',

  AutoRebootToBootloader = 'AutoRebootToBootloader',
  GoToBootloaderSuccess = 'GoToBootloaderSuccess',
  SelectDeviceInBootloaderForWebDevice = 'SelectDeviceInBootloaderForWebDevice',
  SwitchFirmwareReconnectDevice = 'SwitchFirmwareReconnectDevice',
  ConfirmOnDevice = 'ConfirmOnDevice',
  FirmwareEraseSuccess = 'FirmwareEraseSuccess',
  StartTransferData = 'StartTransferData',
  InstallingFirmware = 'InstallingFirmware',
  UpdateBootloader = 'UpdateBootloader',
  UpdateBootloaderSuccess = 'UpdateBootloaderSuccess',
  UpdateSysResource = 'UpdateSysResource',
  UpdateSysResourceSuccess = 'UpdateSysResourceSuccess',
  FirmwareUpdating = 'FirmwareUpdating',
  FirmwareUpdateCompleted = 'FirmwareUpdateCompleted',
}

export type IFirmwareUpdateTipMessage = `${FirmwareUpdateTipMessage}`;

export type UiEventMessage = UiEvent & { event: typeof UI_EVENT };

export const createUiMessage: MessageFactoryFn<typeof UI_EVENT, UiEvent> = (type, payload) =>
  ({
    event: UI_EVENT,
    type,
    payload,
  } as any);
