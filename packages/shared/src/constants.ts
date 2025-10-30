export const ONEKEY_WEBUSB_FILTER = [
  { vendorId: 0x1209, productId: 0x53c0 }, // Classic Boot、Classic1s Boot、Mini Boot
  { vendorId: 0x1209, productId: 0x53c1 }, // Classic Firmware、Classic1s Firmware、Mini Firmware、Pro Firmware、Touch Firmware
  { vendorId: 0x1209, productId: 0x4f4a }, // Pro Boot、Touch Boot
  { vendorId: 0x1209, productId: 0x4f4b }, // Pro Firmware、Touch Firmware（Not implemented Trezor）
  // { vendorId: 0x1209, productId: 0x4f4c }, // Pro Board
  // { vendorId: 0x1209, productId: 0x4f50 }, // Touch Board
];

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

export const isOnekeyDevice = (name: string | null, id?: string): boolean => {
  if (id?.startsWith?.('MI')) {
    return true;
  }

  // 过滤 BixinKeyxxx 和 Kxxxx 和 Txxxx
  // i 忽略大小写模式
  const re = /(BixinKey\d{10})|(K\d{4})|(T\d{4})|(Touch\s\w{4})|(Pro\s\w{4})/i;
  if (name && re.exec(name)) {
    return true;
  }
  return false;
};
