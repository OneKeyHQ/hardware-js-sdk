export class BleError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BleError';
  }
}

export const BleErrorCode = {
  DeviceNotFound: 'DeviceNotFound',
  ConnectionFailed: 'ConnectionFailed',
  ServiceNotFound: 'ServiceNotFound',
  CharacteristicNotFound: 'CharacteristicNotFound',
  WriteError: 'WriteError',
  ReadError: 'ReadError',
  Disconnected: 'Disconnected',
} as const;
