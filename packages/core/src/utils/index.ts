export { getLogger, enableLog, LoggerNames, getLog, setLoggerPostMessage } from './logger';
export * from './assets';
export * from './versionUtils';
export * from './patch';
export * from './tracing';
// Device utils
export {
  getDeviceTypeByBleName,
  getDeviceType,
  getDeviceBleName,
  getDeviceSerialNo,
  getDeviceUUID,
  getDeviceLabel,
  getMethodVersionRange,
  getFirmwareType,
} from './deviceInfoUtils';
export {
  getDeviceBoardloaderVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceBLEFirmwareVersion,
} from './deviceVersionUtils';
export {
  getFirmwareUpdateField,
  supportInputPinOnSoftware,
  getFirmwareUpdateFieldArray,
} from './deviceFeaturesUtils';
export {
  PRO_MCU_MIN_BOOTLOADER_VERSION,
  checkNeedUpdateBootForTouch,
  checkNeedUpdateBootForClassicAndMini,
} from '../api/firmware/updateBootloader';
export {
  DEVICE_SETTINGS_NEVER_TIMEOUT_MS,
  DEVICE_SETTINGS_SHARED_FIELDS,
  DEVICE_SETTINGS_V1_ONLY_FIELDS,
  DEVICE_SETTINGS_V2_ONLY_FIELDS,
  PROTOCOL_V2_NEVER_TIMEOUT_MS,
  getAutoLockOptions,
  getAutoShutDownOptions,
  getDeviceSettingsCapabilities,
  getLanguageConfig,
  normalizeSafetyCheckLevel,
} from './deviceSettings';
export type {
  DeviceSettingsCapabilities,
  DeviceSettingsDurationOption,
  DeviceSettingsField,
  DeviceSettingsProtocol,
  DeviceSettingsValueOption,
} from './deviceSettings';

// Helpers utils

export { getHDPath, getScriptType, getOutputScriptType } from '../api/helpers/pathUtils';

export const isBleConnect = (env: string) => env === 'react-native' || env === 'lowlevel';

export {
  getHomeScreenHex,
  getHomeScreenDefaultList,
  getHomeScreenSize,
  getNftSize,
} from './homescreen';
export { encodePro2Wallpaper, PRO2_WALLPAPER_HEIGHT, PRO2_WALLPAPER_WIDTH } from './pro2Wallpaper';
export type { Pro2WallpaperColorFormat } from './pro2Wallpaper';

export const wait = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });
