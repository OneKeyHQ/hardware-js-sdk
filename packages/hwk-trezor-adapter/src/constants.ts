export const TREZOR_SAFE_7_MODEL = 'T3W1';

export const TREZOR_BLE_SUPPORTED_MODELS = [TREZOR_SAFE_7_MODEL] as const;

export const TREZOR_BLE_PACKET_SIZE = 244;

export const TREZOR_BLE_UUIDS = {
  service: '8c000001-a59b-4d58-a9ad-073df69fa1b1',
  write: '8c000002-a59b-4d58-a9ad-073df69fa1b1',
  notify: '8c000003-a59b-4d58-a9ad-073df69fa1b1',
  push: '8c000004-a59b-4d58-a9ad-073df69fa1b1',
  batteryService: '0000180f-0000-1000-8000-00805f9b34fb',
} as const;
