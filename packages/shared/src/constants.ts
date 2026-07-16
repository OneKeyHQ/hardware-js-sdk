import { HardwareErrorCode } from './HardwareError';

export const HARDWARE_CONNECT_PROTOCOL = {
  V1: 'V1',
  V2: 'V2',
} as const;

export type HardwareConnectProtocol =
  (typeof HARDWARE_CONNECT_PROTOCOL)[keyof typeof HARDWARE_CONNECT_PROTOCOL];

export const ONEKEY_WEBUSB_FILTER = [
  { vendorId: 0x1209, productId: 0x53c0 }, // Classic Boot、Classic1s Boot、Mini Boot
  { vendorId: 0x1209, productId: 0x53c1 }, // Classic Firmware、Classic1s Firmware、Mini Firmware、Pro Firmware、Touch Firmware、Pro2（旧固件，勿删：存量设备仍以此 PID 枚举）
  { vendorId: 0x1209, productId: 0x4f4a }, // Pro Boot、Touch Boot、Pro2
  { vendorId: 0x1209, productId: 0x4f4b }, // Pro Firmware、Touch Firmware（Not implemented Trezor）、Pro2
  { vendorId: 0x1209, productId: 0x4f4c }, // Pro Board、Pro2（新固件 PID）
  // { vendorId: 0x1209, productId: 0x4f50 }, // Touch Board
];

type WebUsbIdentityDescriptor = {
  vendorId?: number;
  productId?: number;
  manufacturerName?: string | null;
};

const TREZOR_WEBUSB_MANUFACTURER_NAMES = new Set(['trezor', 'trezor company', 'satoshilabs']);

export const isKnownTrezorWebUsbDevice = (descriptor: WebUsbIdentityDescriptor): boolean => {
  const isSharedWebUsbId = ONEKEY_WEBUSB_FILTER.some(
    filter => descriptor.vendorId === filter.vendorId && descriptor.productId === filter.productId
  );
  if (!isSharedWebUsbId) return false;

  const manufacturerName = descriptor.manufacturerName?.trim().toLowerCase();
  return manufacturerName != null && TREZOR_WEBUSB_MANUFACTURER_NAMES.has(manufacturerName);
};

/**
 * Error codes that require device release after occurrence
 * These errors indicate the device is in an invalid state and needs to be released
 */
export const ERROR_CODES_REQUIRE_RELEASE = [
  HardwareErrorCode.DeviceInitializeFailed,
  HardwareErrorCode.DeviceInterruptedFromOutside,
  HardwareErrorCode.DeviceInterruptedFromUser,
  HardwareErrorCode.DeviceCheckPassphraseStateError,
  HardwareErrorCode.ResponseUnexpectTypeError,
  HardwareErrorCode.PinInvalid,
  HardwareErrorCode.PinCancelled,
  HardwareErrorCode.UnexpectPassphrase,
] as const;

/**
 * Error codes that require device disconnect before release
 * These errors indicate a communication failure that requires full reconnection
 */
export const ERROR_CODES_REQUIRE_DISCONNECT = [
  HardwareErrorCode.DeviceInitializeFailed,
  HardwareErrorCode.ResponseUnexpectTypeError,
] as const;

// BLE IPC communication message types
export enum EOneKeyBleMessageKeys {
  // BLE device selection related
  BLE_SELECT = '$onekey-ble-select',
  BLE_SELECT_RESULT = '$onekey-ble-select-result',
  BLE_STOP_SCAN = '$onekey-ble-stop-scan',
  BLE_CANCEL_REQUEST = '$onekey-ble-cancel-request',
  BLE_PRE_SELECT = '$onekey-ble-pre-select',
  BLE_CLEAR_PRE_SELECT = '$onekey-ble-clear-pre-select',

  // BLE pairing related
  BLE_PAIRING_REQUEST = '$onekey-ble-pairing-request',
  BLE_PAIRING_RESPONSE = '$onekey-ble-pairing-response',

  // BLE enumeration related
  BLE_ENUMERATE = '$onekey-ble-enumerate',
  BLE_ENUMERATE_RESULT = '$onekey-ble-enumerate-result',

  // BLE connection status related
  BLE_DEVICE_DISCONNECTED = '$onekey-ble-device-disconnected',
  BLE_AVAILABILITY_CHECK = '$onekey-ble-availability-check',

  // Noble BLE related (for direct BLE communication)
  NOBLE_BLE_ENUMERATE = '$onekey-noble-ble-enumerate',
  NOBLE_BLE_STOP_SCAN = '$onekey-noble-ble-stop-scan',
  NOBLE_BLE_GET_DEVICE = '$onekey-noble-ble-get-device',
  NOBLE_BLE_CONNECT = '$onekey-noble-ble-connect',
  NOBLE_BLE_DISCONNECT = '$onekey-noble-ble-disconnect',
  NOBLE_BLE_WRITE = '$onekey-noble-ble-write',
  NOBLE_BLE_SUBSCRIBE = '$onekey-noble-ble-subscribe',
  NOBLE_BLE_UNSUBSCRIBE = '$onekey-noble-ble-unsubscribe',
  NOBLE_BLE_NOTIFICATION = '$onekey-noble-ble-notification',
  NOBLE_BLE_CANCEL_PAIRING = '$onekey-noble-ble-cancel-pairing',
}

export const ONEKEY_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';
export const ONEKEY_WRITE_CHARACTERISTIC_UUID = '00000002-0000-1000-8000-00805f9b34fb';
export const ONEKEY_NOTIFY_CHARACTERISTIC_UUID = '00000003-0000-1000-8000-00805f9b34fb';

const MESSAGE_TOP_CHAR = 63;
const MESSAGE_HEADER_BYTE = 35;
export const isHeaderChunk = (chunk: Buffer | Uint8Array): boolean => {
  if (chunk.length < 9) return false;
  const [MagicQuestionMark, sharp1, sharp2] = chunk;

  if (
    String.fromCharCode(MagicQuestionMark) === String.fromCharCode(MESSAGE_TOP_CHAR) &&
    String.fromCharCode(sharp1) === String.fromCharCode(MESSAGE_HEADER_BYTE) &&
    String.fromCharCode(sharp2) === String.fromCharCode(MESSAGE_HEADER_BYTE)
  ) {
    return true;
  }

  return false;
};

const isKnownNonOneKeyDeviceName = (normalizedName: string): boolean =>
  normalizedName.startsWith('trezor') ||
  normalizedName.startsWith('ledger') ||
  normalizedName.startsWith('nano ') ||
  normalizedName.startsWith('stax') ||
  normalizedName.startsWith('flex');

const ONEKEY_EXACT_SHORT_NAMES = new Set(['s8']);

const isOneKeyShortName = (normalizedName: string): boolean => {
  if (ONEKEY_EXACT_SHORT_NAMES.has(normalizedName)) return true;
  if (normalizedName.length !== 5) return false;
  const firstChar = normalizedName[0];
  return (firstChar === 'k' || firstChar === 't') && /^\d{4}$/.test(normalizedName.slice(1));
};

export const isOnekeyDevice = (name: string | null, id?: string): boolean => {
  const normalizedName = name?.trim().toLowerCase() ?? '';
  if (isKnownNonOneKeyDeviceName(normalizedName)) {
    return false;
  }

  if (id?.startsWith?.('MI')) {
    return true;
  }

  if (!name) {
    return false;
  }
  if (normalizedName.startsWith('onekey') || normalizedName.startsWith('bixinkey')) return true;
  if (
    normalizedName.startsWith('touch ') ||
    normalizedName.startsWith('pro ') ||
    normalizedName.startsWith('pro2 ')
  ) {
    return true;
  }
  return isOneKeyShortName(normalizedName);
};
