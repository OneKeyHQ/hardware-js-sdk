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
  // Avoid regex with potential catastrophic backtracking by parsing manually in linear time
  if (value.indexOf('{') === -1) return value;
  let result = '';
  let i = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dict = object as any;
  while (i < value.length) {
    const open = value.indexOf('{', i);
    if (open === -1) {
      result += value.slice(i);
      break;
    }
    const close = value.indexOf('}', open + 1);
    if (close === -1) {
      // No matching closing brace; append the rest as-is
      result += value.slice(i);
      break;
    }
    // Append text before the placeholder
    result += value.slice(i, open);
    const key = value.slice(open + 1, close);
    if (key.length === 0) {
      // Keep '{}' unchanged to match original regex behavior
      result += '{}';
    } else {
      const replacement = dict[key];
      // Preserve original semantics: falsy values fallback to '?'
      result += replacement ? String(replacement) : '?';
    }
    i = close + 1;
  }
  return result;
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
   * Device is busy
   */
  DeviceBusy: 117,

  /**
   * Device check unlock type not match error
   */
  DeviceCheckUnlockTypeError: 118,

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
   * Device not support this method
   */
  DeviceNotSupportMethod: 415,

  /**
   * Forbidden key path
   */
  ForbiddenKeyPath: 416,

  /**
   * Repeat unlocking
   * all network get address by loop need repeat unlocking
   */
  RepeatUnlocking: 417,

  /**
   * Defective firmware detected
   */
  DefectiveFirmware: 418,

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
  BleTransportCallCanceled: 717,
  BleDeviceBondedCanceled: 718,
  BlePeerRemovedPairingInformation: 719,
  BleDeviceDisconnected: 720,
  BlePoweredOff: 721,
  BleUnsupported: 722,

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
   * BTC PSBT too many utxos
   * @params:{ count: number }
   */
  BTCPsbtTooManyUtxos: 818,

  /**
   * EMMC file write firmware error
   */
  EmmcFileWriteFirmwareError: 819,

  /**
   * Firmware verification failed (e.g., bootloader file verify failed)
   */
  FirmwareVerificationFailed: 820,

  /**
   * Web bridge coonect needs permission
   */
  BridgeNeedsPermission: 821,

  /**
   * Lowlevel transport connect error
   */
  LowlevelTrasnportConnectError: 900,

  /**
   * Web USB or Web Bluetooth device not found or needs permission
   */
  WebDeviceNotFoundOrNeedsPermission: 901,

  /**
   * Web USB or Web Bluetooth device prompt access error
   */
  WebDevicePromptAccessError: 902,
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
  [HardwareErrorCode.DeviceBusy]: 'Device is busy',
  [HardwareErrorCode.DeviceCheckUnlockTypeError]: 'Device check unlock type not match error',
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
  [HardwareErrorCode.DeviceNotSupportMethod]: 'Device not support this method',
  [HardwareErrorCode.ForbiddenKeyPath]: 'Forbidden key path',
  [HardwareErrorCode.RepeatUnlocking]: 'Repeat unlocking',
  [HardwareErrorCode.DefectiveFirmware]: 'Device firmware is defective, please update immediately',

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
  [HardwareErrorCode.BleDeviceBondedCanceled]: 'device is canceled bonding',
  [HardwareErrorCode.BlePeerRemovedPairingInformation]: 'need to delete pairing information',
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
  [HardwareErrorCode.BleTransportCallCanceled]: 'Ble Transport call canceled',
  [HardwareErrorCode.BleDeviceDisconnected]: 'Device disconnected',
  [HardwareErrorCode.BlePoweredOff]: 'Bluetooth is turned off',
  [HardwareErrorCode.BleUnsupported]: 'Bluetooth is not supported on this device',

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
  [HardwareErrorCode.BTCPsbtTooManyUtxos]: 'PSBT too many utxos',
  [HardwareErrorCode.EmmcFileWriteFirmwareError]: 'EMMC file write firmware error',
  [HardwareErrorCode.FirmwareVerificationFailed]: 'Firmware verification failed',
  [HardwareErrorCode.BridgeNeedsPermission]: 'Bridge needs permission',

  /**
   * Lowlevel transport
   */
  [HardwareErrorCode.LowlevelTrasnportConnectError]: 'Lowlevel transport connect error',
  [HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission]:
    'Web-USB or Web-Bluetooth device not found or needs permission',
  [HardwareErrorCode.WebDevicePromptAccessError]:
    'Web-USB or Web-Bluetooth device prompt access error',
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

// Map low-level bridge/libusb error strings to structured HardwareError
export const CreateHardwareErrorByBridgeError = (raw: string): HardwareError => {
  const msg = String(raw || '');
  // Permission denied when accessing USB device via libusb (e.g., missing udev rules)
  if (msg.includes('LIBUSB_ERROR_ACCESS')) {
    return TypedError(HardwareErrorCode.BridgeNeedsPermission, 'LIBUSB_ERROR_ACCESS');
  }
  // Fallback: treat as bridge/network error with original message
  return TypedError(HardwareErrorCode.BridgeNetworkError, msg);
};

const createNewFirmwareUnReleaseHardwareError = (
  currentVersion: string,
  requireVersion: string,
  methodName?: string
) => {
  const methodInfo = methodName ? ` for method '${methodName}'` : '';
  return TypedError(
    HardwareErrorCode.NewFirmwareUnRelease,
    `Device firmware version is too low${methodInfo}, please update to the latest version`,
    { current: currentVersion, require: requireVersion, method: methodName }
  );
};

const createNeedUpgradeFirmwareHardwareError = (
  currentVersion: string,
  requireVersion: string,
  methodName?: string
) => {
  const methodInfo = methodName ? ` for method '${methodName}'` : '';
  return TypedError(
    HardwareErrorCode.CallMethodNeedUpgradeFirmware,
    `Device firmware version is too low${methodInfo}, please update to ${requireVersion}`,
    { current: currentVersion, require: requireVersion, method: methodName }
  );
};

const createNewFirmwareForceUpdateHardwareError = (
  connectId: string | undefined,
  deviceId: string | undefined,
  versionTypes?: ('firmware' | 'ble')[],
  currentVersions?: {
    firmware?: string;
    ble?: string;
  }
) => {
  const types = versionTypes || [];
  const typeMap = { firmware: 'firmware', ble: 'BLE firmware' };
  const requiredTypes = types.filter(type => type in typeMap);

  const getVersionInfo = () => {
    const versions = [];
    if (currentVersions?.firmware) versions.push(`firmware version: ${currentVersions.firmware}`);
    if (currentVersions?.ble) versions.push(`BLE version: ${currentVersions.ble}`);
    return versions.length > 0 ? ` (${versions.join(', ')})` : '';
  };

  const getTypeDescription = () => requiredTypes.map(type => typeMap[type]).join(' and ');
  const message = `Device ${getTypeDescription()} version is too low. ${getVersionInfo()}`;

  return TypedError(HardwareErrorCode.NewFirmwareForceUpdate, message, {
    connectId,
    deviceId,
    versionTypes,
    currentVersions,
  });
};

const createDeprecatedHardwareError = (
  currentVersion: string,
  deprecatedVersion: string,
  methodName?: string
) => {
  const methodInfo = methodName ? ` Method '${methodName}'` : 'This method';
  return TypedError(
    HardwareErrorCode.CallMethodDeprecated,
    `Device firmware version is too high. ${methodInfo} has been deprecated in ${deprecatedVersion}`,
    { current: currentVersion, deprecated: deprecatedVersion, method: methodName }
  );
};

const createDefectiveFirmwareError = (
  serialNo: string,
  seVersion: string,
  deviceType: string,
  connectId?: string,
  deviceId?: string
) => {
  const message = `Defective firmware detected (Serial: ${serialNo}, SE: ${seVersion}). Please update immediately.`;

  return TypedError(HardwareErrorCode.DefectiveFirmware, message, {
    serialNo,
    seVersion,
    deviceType,
    connectId,
    deviceId,
  });
};

export {
  createNewFirmwareUnReleaseHardwareError,
  createNeedUpgradeFirmwareHardwareError,
  createNewFirmwareForceUpdateHardwareError,
  createDeprecatedHardwareError,
  createDefectiveFirmwareError,
};
