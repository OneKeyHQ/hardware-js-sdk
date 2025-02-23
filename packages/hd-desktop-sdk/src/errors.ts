export class TransportError extends Error {
  constructor(
    message: string,
    public transport: 'usb' | 'ble',
    public recoverable: boolean,
    public deviceId: string,
    public code?: string
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

export const TransportErrorCode = {
  DeviceNotFound: 'DeviceNotFound',
  TransportNotFound: 'TransportNotFound',
  TransportSwitchFailed: 'TransportSwitchFailed',
  InvalidTransportType: 'InvalidTransportType',
  ConnectionFailed: 'ConnectionFailed',
  DisconnectFailed: 'DisconnectFailed',
  CommunicationError: 'CommunicationError',
  ConfigurationFailed: 'ConfigurationFailed',
  OperationCancelled: 'OperationCancelled',
  Timeout: 'Timeout',
} as const;

// Recovery class is now in a separate file
export { TransportRecovery } from './recovery';
