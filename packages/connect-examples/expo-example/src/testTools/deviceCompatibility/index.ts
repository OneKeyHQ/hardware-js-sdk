// 设备兼容性系统导出
// 导入所有插件以确保注册
import './plugins';

export {
  DeviceCompatibilityManager,
  compatibilityManager,
  type DevicePlugin,
  type DeviceCompatibilityOverride,
  type DeviceCompatibilityCheckOptions,
  type DeviceCompatibilityRuleContext,
  type CompatibilityResult,
  useDeviceCompatibility,
  useBatchDeviceCompatibility,
} from './DeviceCompatibility';

// 重新导出 EDeviceType 以便外部使用
export { EDeviceType } from '@onekeyfe/hd-shared';

export {
  checkCompatibilityInParams,
  handleSkipInRequest,
  handleSkipInResponse,
  filterUnsupportedPaths,
  checkBatchCompatibility,
  getSkippedPaths,
} from './helpers';
