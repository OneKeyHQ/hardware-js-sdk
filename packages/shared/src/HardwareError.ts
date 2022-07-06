export interface IHardwareError {
  errorCode: ValueOf<typeof HardwareErrorCode>;
  message?: string;
}

type ValueOf<P extends object> = P[keyof P];

type HardwareErrorCodeMessageMapping = { [P in ValueOf<typeof HardwareErrorCode>]: string };

type ErrorCodeUnion = ValueOf<typeof HardwareErrorCode>;

function fillStringWithArguments(value: string, object: object) {
  return value.replace(/\{([^}]+)\}/g, (_, arg: string) => (object as unknown as any)[arg] || '?');
}

export class HardwareError extends Error {
  errorCode: ErrorCodeUnion = HardwareErrorCode.UnknownError;

  message = '';

  constructor(hardwareError: IHardwareError | string) {
    super();
    const errorMessageMapping = HardwareErrorCodeMessage;
    this.message = errorMessageMapping[HardwareErrorCode.UnknownError];

    if (typeof hardwareError === 'string') {
      this.errorCode = HardwareErrorCode.UnknownError;
      this.message = hardwareError;
    } else {
      const message = (hardwareError.message || errorMessageMapping[hardwareError.errorCode]) ?? '';
      if (message) {
        this.message = fillStringWithArguments(message, hardwareError);
      }
      this.errorCode = hardwareError.errorCode;
    }

    this.name = 'HardwareError';
  }
}

export const HardwareErrorCode = {
  /**
   * This error can be thrown when unexpected error occurred and in most cases it is related to implementation bug.
   * Original message is available in message property.
   */
  UnknownError: 0,

  /**
   * Firmware version mismatch
   */
  DeviceFwException: 101,

  /**
   * Device unexpected mode
   */
  DeviceUnexpectedMode: 102,

  /**
   * Device list is not initialized
   */
  DeviceListNotInitialized: 103,

  /**
   * Please select the connected device
   */
  SelectDevice: 104,

  /**
   * Device not found
   */
  DeviceNotFound: 105,

  /**
   * Device is not initialized
   */
  DeviceInitializeFailed: 106,

  /**
   * Device interrupted from another operation
   */
  DeviceInterruptedFromOutside: 107,

  /**
   * Not initialized
   */
  NotInitialized: 200,

  /**
   * Iframe not initialized
   */
  IFrameNotInitialized: 300,

  /**
   * iframe repeat initialization
   */
  IFrameAleradyInitialized: 301,

  /**
   * iframe load failure
   */
  IFrameLoadFail: 302,

  /**
   * init iframe time out
   */
  IframeTimeout: 303,

  /**
   * iframe blocked
   */
  IframeBlocked: 304,

  /**
   * Runtime errors during method execution
   */
  CallMethodError: 400,

  /**
   * Method does not responding
   */
  CallMethodNotResponse: 404,

  /**
   * Call method invalid parameter
   */
  CallMethodInvalidParameter: 405,

  /**
   * firmware update download failed
   */
  FirmwareUpdateDownloadFailed: 406,

  /**
   * Netword request error
   */
  NetworkError: 500,

  /**
   * Transport not configured
   */
  TransportNotConfigured: 600,

  /**
   * Transport call in progress
   */
  TransportCallInProgress: 601,

  /**
   * Transport not found
   */
  TransportNotFound: 602,

  /**
   * Transport invalid protobuf
   */
  TransportInvalidProtobuf: 603,

  /**
   * Bluetooth error code
   */
  BleScanError: 700,
  BlePermissionError: 701,
  BleLocationError: 702,
  BleRequiredUUID: 703,
  BleConnectedError: 704,
  BleDeviceNotBonded: 705,
  BleServiceNotFound: 706,
  BleCharacteristicNotFound: 707,
  BleMonitorError: 708,
  BleCharacteristicNotifyError: 709,

  /**
   * Hardware runtiome errors
   */
  RuntimeError: 800,

  /**
   * invalid pin
   */
  PinInvalid: 801,

  /**
   * pin cancelled by user
   */
  PinCancelled: 802,

  /**
   * Action cancelled by user
   */
  ActionCancelled: 803,

  /**
   * Firmware installation failed
   */
  FirmwareError: 804,
} as const;

export const HardwareErrorCodeMessage: HardwareErrorCodeMessageMapping = {
  [HardwareErrorCode.UnknownError]: 'Unknown error occurred. Check message property.',

  /**
   * Device Errors
   */
  [HardwareErrorCode.DeviceFwException]: 'Firmware version mismatch',
  [HardwareErrorCode.DeviceUnexpectedMode]: 'Device unexpected mode',
  [HardwareErrorCode.DeviceListNotInitialized]: 'Device list is not initialized',
  [HardwareErrorCode.SelectDevice]: 'Please select the connected device',
  [HardwareErrorCode.DeviceNotFound]: 'Device not found',
  [HardwareErrorCode.DeviceInitializeFailed]: 'Device initialization failed',
  [HardwareErrorCode.DeviceInterruptedFromOutside]: 'Device interrupted',

  /**
   * Node Errors
   */
  [HardwareErrorCode.NotInitialized]: 'Not initialized',
  /**
   * Iframe Errors
   */
  [HardwareErrorCode.IFrameNotInitialized]: 'IFrame not initialized',
  [HardwareErrorCode.IFrameAleradyInitialized]: 'IFrame alerady initialized',
  [HardwareErrorCode.IFrameLoadFail]: 'IFrame load fail',
  [HardwareErrorCode.IframeTimeout]: 'init iframe time out',
  [HardwareErrorCode.IframeBlocked]: 'IFrame blocked',

  /**
   * Method Errors
   */
  [HardwareErrorCode.CallMethodError]: 'Runtime errors during method execution',
  [HardwareErrorCode.CallMethodNotResponse]: 'Method does not responding',
  [HardwareErrorCode.CallMethodInvalidParameter]: 'Call method invalid parameter',
  [HardwareErrorCode.FirmwareUpdateDownloadFailed]: 'Firmware update download failed',

  /**
   * Network Errors
   */
  [HardwareErrorCode.NetworkError]: 'Network request error',

  /**
   * Transport Errors
   */
  [HardwareErrorCode.TransportNotConfigured]: 'Transport not configured',
  [HardwareErrorCode.TransportCallInProgress]: 'Transport call in progress',
  [HardwareErrorCode.TransportNotFound]: 'Transport not found',
  [HardwareErrorCode.TransportInvalidProtobuf]: 'Transport invalid protobuf',

  /**
   * Bluetooth Error
   */
  [HardwareErrorCode.BleScanError]: 'BLE scan error',
  [HardwareErrorCode.BlePermissionError]: 'Bluetooth required to be turned on',
  [HardwareErrorCode.BleLocationError]: 'Device is not authorized to use BluetoothLE',
  [HardwareErrorCode.BleRequiredUUID]: 'uuid is required',
  [HardwareErrorCode.BleConnectedError]: 'connected error is always runtime error',
  [HardwareErrorCode.BleDeviceNotBonded]: 'device is not bonded',
  [HardwareErrorCode.BleServiceNotFound]: 'BLEServiceNotFound: service not found',
  [HardwareErrorCode.BleCharacteristicNotFound]: 'BLEServiceNotFound: service not found',
  [HardwareErrorCode.BleMonitorError]: 'Monitor Error: characteristic not found',
  [HardwareErrorCode.BleCharacteristicNotifyError]: 'Characteristic Notify Error',

  /**
   * Runtime Error
   */
  [HardwareErrorCode.RuntimeError]: 'Runtime error',
  [HardwareErrorCode.PinInvalid]: 'Pin invalid',
  [HardwareErrorCode.PinCancelled]: 'Pin cancelled',
  [HardwareErrorCode.ActionCancelled]: 'Action cancelled by user',
  [HardwareErrorCode.FirmwareError]: 'Firmware installation failed',
} as const;

export const TypedError = (hardwareError: ErrorCodeUnion | string, message?: string) => {
  if (typeof hardwareError === 'string') {
    return new HardwareError(hardwareError);
  }
  return new HardwareError({ errorCode: hardwareError, message: message ?? '' });
};

export const serializeError = (payload: any) => {
  if (payload && payload.error instanceof HardwareError) {
    return { error: payload.error.message, code: payload.error.errorCode };
  }
  if (payload && payload.error instanceof Error) {
    return { error: payload.error.message, code: payload.error.code };
  }
  return payload;
};
