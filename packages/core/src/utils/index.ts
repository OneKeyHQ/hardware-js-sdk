export * from './assets';
export * from './versionUtils';
export * from './patch';
// Device utils
export {
  getDeviceTypeByBleName,
  getDeviceType,
  getDeviceBleName,
  getDeviceUUID,
  getDeviceLabel,
  getMethodVersionRange,
} from './deviceInfoUtils';
export {
  getDeviceBoardloaderVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceBLEFirmwareVersion,
} from './deviceVersionUtils';
export { getFirmwareUpdateField, supportInputPinOnSoftware } from './deviceFeaturesUtils';
export {
  checkNeedUpdateBootForTouch,
  checkNeedUpdateBootForClassicAndMini,
} from '../api/firmware/updateBootloader';

// Helpers utils
export { getLogger, enableLog, LoggerNames, getLog, setLoggerPostMessage } from './logger';

export { getHDPath, getScriptType, getOutputScriptType } from '../api/helpers/pathUtils';

export const isBleConnect = (env: string) => env === 'react-native' || env === 'lowlevel';

export { getHomeScreenHex, getHomeScreenDefaultList, getHomeScreenSize } from './homescreen';

export const wait = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });
