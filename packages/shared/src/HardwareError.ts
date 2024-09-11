export interface IHardwareError {
  errorCode: ValueOf<typeof HardwareErrorCode>;
  message?: string;
  params?: any;
}

type ValueOf<P extends object> = P[keyof P];

type HardwareErrorCodeMessageMapping = { [P in ValueOf<typeof HardwareErrorCode>]: string };

type ErrorCodeUnion = ValueOf<typeof HardwareErrorCode>;

function fillStringWithArguments(value: string, object: object) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([^}]+)\}/g, (_, arg: string) => (object as unknown as any)[arg] || '?');
}

export class HardwareError extends Error {
  errorCode: ErrorCodeUnion = HardwareErrorCode.UnknownError;

  message = '';

  params: any = {};

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
      this.params = hardwareError.params;
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
   * Device should be in bootloader mode
   */
  RequiredButInBootloaderMode: 108,

  /**
   * Device interrupted from user
   */
  DeviceInterruptedFromUser: 109,

  /**
   * Check device id is same
   */
  DeviceCheckDeviceIdError: 110,

  /**
   * Do not support passphrase
   * @params: { require: string }
   */
  DeviceNotSupportPassphrase: 111,

  /*
   * Device passphrase state error
   */
  DeviceCheckPassphraseStateError: 112,

  /**
   * use passphrase, but passphrase is not opened
   */
  DeviceNotOpenedPassphrase: 113,

  /**
   * not use passphrase, but passphrase is opened
   */
  DeviceOpenedPassphrase: 114,

  /**
   *  Detect hardware that is in bootloader mode and return an error.
   */
  DeviceDetectInBootloaderMode: 115,

  /**
   * Device not allow in bootloader mode
   */
  NotAllowInBootloaderMode: 116,

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
   * iframe host not trust
   */
  IframeDistrust: 305,

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
   * Call method not supported, need update firmware
   * @params: { current: string, require: string }
   */
  CallMethodNeedUpgradeFirmware: 407,

  /**
   * Call method not supported, is deprecated
   * @params: { current: string, deprecated: string }
   */
  CallMethodDeprecated: 408,

  /**
   * Only one device can be connected during firmware upgrade
   */
  FirmwareUpdateLimitOneDevice: 409,

  /**
   * You need to manually enter boot
   */
  FirmwareUpdateManuallyEnterBoot: 410,

  /**
   * Manual entry fails. You must manually enter the boot
   */
  FirmwareUpdateAutoEnterBootFailure: 411,

  /**
   * The new firmware has not been released yet
   */
  NewFirmwareUnRelease: 412,

  /**
   * use OneKey desktop client to update the firmware
   * because need copy resource file to Touch
   */
  UseDesktopToUpdateFirmware: 413,

  /**
   * Mandatory firmware update
   * @params:{ connectId: string? , deviceId: string? }
   */
  NewFirmwareForceUpdate: 414,

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
  BleWriteCharacteristicError: 710,
  BleAlreadyConnected: 711,
  BleLocationServicesDisabled: 712,
  BleTimeoutError: 713,
  BleForceCleanRunPromise: 714,
  BleDeviceBondError: 715,
  BleCharacteristicNotifyChangeFailure: 716,

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

  /**
   * transport response unexpect error
   */
  ResponseUnexpectTypeError: 805,

  /**
   * bridge network error
   */
  BridgeNetworkError: 806,

  /**
   * Bridge network timeout
   */
  BridgeTimeoutError: 807,

  /**
   * Bridge not installed
   */
  BridgeNotInstalled: 808,

  /**
   * ensure connect timeout
   */
  PollingTimeout: 809,

  /**
   * ensure connect stop polling
   */
  PollingStop: 810,

  /**
   * Device does not open blid sign
   */
  BlindSignDisabled: 811,

  UnexpectPassphrase: 812,

  /**
   * NFT file already exists
   */
  FileAlreadyExists: 813,

  /**
   * check file length error
   */
  CheckDownloadFileError: 814,

  /**
   * not in signing mode
   */
  NotInSigningMode: 815,

  /**
   * not in signing mode
   */
  DataOverload: 816,

  /**
   * device disconnected during action
   */
  BridgeDeviceDisconnected: 817,

  /**
   * Lowlevel transport connect error
   */
  LowlevelTrasnportConnectError: 900,
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
  [HardwareErrorCode.DeviceInterruptedFromUser]: 'Device interrupted',
  [HardwareErrorCode.RequiredButInBootloaderMode]: 'Device should be in bootloader mode',
  [HardwareErrorCode.DeviceCheckDeviceIdError]: 'Device Id in the features is not same.',
  [HardwareErrorCode.DeviceNotSupportPassphrase]: 'Device not support passphrase',
  [HardwareErrorCode.DeviceCheckPassphraseStateError]: 'Device passphrase state error',
  [HardwareErrorCode.DeviceNotOpenedPassphrase]: 'Device not opened passphrase',
  [HardwareErrorCode.DeviceOpenedPassphrase]: 'Device opened passphrase',
  [HardwareErrorCode.DeviceDetectInBootloaderMode]: 'Device in bootloader mode',
  [HardwareErrorCode.NotAllowInBootloaderMode]: 'Device not allow in bootloader mode',
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
  [HardwareErrorCode.IframeDistrust]: 'IFrame host not trust',

  /**
   * Method Errors
   */
  [HardwareErrorCode.CallMethodError]: 'Runtime errors during method execution',
  [HardwareErrorCode.CallMethodNotResponse]: 'Method does not responding',
  [HardwareErrorCode.CallMethodInvalidParameter]: 'Call method invalid parameter',
  [HardwareErrorCode.FirmwareUpdateDownloadFailed]: 'Firmware update download failed',
  [HardwareErrorCode.CallMethodNeedUpgradeFirmware]: 'Call method need upgrade firmware',
  [HardwareErrorCode.CallMethodDeprecated]: 'Call method is deprecated',
  [HardwareErrorCode.FirmwareUpdateLimitOneDevice]:
    'Only one device can be connected during firmware upgrade',
  [HardwareErrorCode.FirmwareUpdateManuallyEnterBoot]: 'You need to manually enter boot',
  [HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure]:
    'Description Failed to automatically enter boot',
  [HardwareErrorCode.NewFirmwareUnRelease]: 'new firmware has not been released yet',
  [HardwareErrorCode.NewFirmwareForceUpdate]: 'new firmware has been released, please update',
  [HardwareErrorCode.UseDesktopToUpdateFirmware]:
    'Please use OneKey desktop client to update the firmware',

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
  [HardwareErrorCode.BleLocationError]:
    'Location permissions for the application are not available',
  [HardwareErrorCode.BleRequiredUUID]: 'uuid is required',
  [HardwareErrorCode.BleConnectedError]: 'connected error is always runtime error',
  [HardwareErrorCode.BleDeviceNotBonded]: 'device is not bonded',
  [HardwareErrorCode.BleServiceNotFound]: 'BLEServiceNotFound: service not found',
  [HardwareErrorCode.BleCharacteristicNotFound]: 'BLEServiceNotFound: service not found',
  [HardwareErrorCode.BleMonitorError]: 'Monitor Error: characteristic not found',
  [HardwareErrorCode.BleCharacteristicNotifyError]: 'Characteristic Notify Error',
  [HardwareErrorCode.BleWriteCharacteristicError]: 'Write Characteristic Error',
  [HardwareErrorCode.BleAlreadyConnected]: 'Already connected to device',
  [HardwareErrorCode.BleLocationServicesDisabled]: 'Location Services disabled',
  [HardwareErrorCode.BleTimeoutError]: 'The connection has timed out unexpectedly.',
  [HardwareErrorCode.BleForceCleanRunPromise]: 'Force clean Bluetooth run promise',
  [HardwareErrorCode.BleDeviceBondError]: 'Bluetooth pairing failed',
  [HardwareErrorCode.BleCharacteristicNotifyChangeFailure]: 'Characteristic Notify Change Failure',

  /**
   * Runtime Error
   */
  [HardwareErrorCode.RuntimeError]: 'Runtime error',
  [HardwareErrorCode.PinInvalid]: 'Pin invalid',
  [HardwareErrorCode.PinCancelled]: 'Pin cancelled',
  [HardwareErrorCode.ActionCancelled]: 'Action cancelled by user',
  [HardwareErrorCode.FirmwareError]: 'Firmware installation failed',
  [HardwareErrorCode.ResponseUnexpectTypeError]: 'Response type is not expected',
  [HardwareErrorCode.BridgeNetworkError]: 'Bridge network error',
  [HardwareErrorCode.BridgeTimeoutError]: 'Bridge network timeout',
  [HardwareErrorCode.BridgeNotInstalled]: 'Bridge not installed',
  [HardwareErrorCode.BridgeDeviceDisconnected]: 'Bridge device disconnected during action',
  [HardwareErrorCode.PollingTimeout]: 'Polling timeout',
  [HardwareErrorCode.PollingStop]: 'Polling stop',
  [HardwareErrorCode.BlindSignDisabled]: 'Please confirm the BlindSign enabled',
  [HardwareErrorCode.UnexpectPassphrase]: 'Unexpect passphrase',
  [HardwareErrorCode.FileAlreadyExists]: 'File already exists',
  [HardwareErrorCode.CheckDownloadFileError]: 'Check download file error',
  [HardwareErrorCode.NotInSigningMode]: 'not in signing mode',
  [HardwareErrorCode.DataOverload]: 'Params data overload',

  /**
   * Lowlevel transport
   */
  [HardwareErrorCode.LowlevelTrasnportConnectError]: 'Lowlevel transport connect error',
} as const;

export const TypedError = (
  hardwareError: ErrorCodeUnion | string,
  message?: string,
  params?: any
) => {
  if (typeof hardwareError === 'string') {
    return new HardwareError(hardwareError);
  }
  return new HardwareError({ errorCode: hardwareError, message: message ?? '', params });
};

export const serializeError = (payload: any) => {
  if (payload && payload.error instanceof HardwareError) {
    return {
      error: payload.error.message,
      code: payload.error.errorCode,
      params: payload.error.params,
    };
  }
  if (payload && payload.error && payload.error.name === 'AxiosError') {
    return { error: payload.error.message, code: HardwareErrorCode.BridgeNetworkError };
  }
  if (payload && payload.error instanceof Error) {
    return { error: payload.error.message, code: payload.error.code };
  }
  return payload;
};

export const CreateErrorByMessage = (message: string): HardwareError => {
  for (const code of Object.values(HardwareErrorCode)) {
    if (HardwareErrorCodeMessage[code] === message) {
      return TypedError(code);
    }
  }
  return new HardwareError(message);
};
