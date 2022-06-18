import { initLog, enableLog } from './logger';

export * from './assets';
export * from './versionUtils';
export * from './deferred';
export {
  getDeviceType,
  getDeviceTypeByBleName,
  getDeviceTypeByDeviceId,
  getDeviceUUID,
  getDeviceLabel,
} from './deviceFeaturesUtils';
export { getHDPath, getScriptType } from '../api/helpers/pathUtils';

export { initLog, enableLog };
