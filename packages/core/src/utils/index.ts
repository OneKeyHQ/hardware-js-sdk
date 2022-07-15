import { initLog, enableLog } from '@onekeyfe/hd-shared';

export * from './assets';
export * from './versionUtils';
export * from './patch';
export {
  getDeviceType,
  getDeviceTypeByBleName,
  getDeviceTypeByDeviceId,
  getDeviceUUID,
  getDeviceLabel,
} from './deviceFeaturesUtils';
export { getHDPath, getScriptType } from '../api/helpers/pathUtils';

export { initLog, enableLog };
