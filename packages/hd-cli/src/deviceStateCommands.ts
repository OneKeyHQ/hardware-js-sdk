import type { CoreApi, DeviceStateScope, KnownDevice, SearchDevice } from '@onekeyfe/hd-core';

type DeviceStateSdk = Pick<CoreApi, 'searchDevices' | 'getDeviceState' | 'getFeatures'>;

type DiscoveredDevice = SearchDevice & Partial<Pick<KnownDevice, 'features' | 'state'>>;

const createDeviceNotFoundResult = (connectId?: string) => ({
  success: false as const,
  payload: {
    code: 'DEVICE_NOT_FOUND',
    error: connectId ? `Device not found: ${connectId}` : 'No device found',
  },
});

const resolveSearchDevice = async (sdk: DeviceStateSdk, connectId?: string) => {
  const searchResult = await sdk.searchDevices();
  if (!searchResult.success) return searchResult;

  const devices = searchResult.payload as DiscoveredDevice[];
  const device = connectId ? devices.find(item => item.connectId === connectId) : devices[0];

  if (!device?.connectId) return createDeviceNotFoundResult(connectId);
  return { success: true as const, payload: device };
};

/**
 * 新 CLI 的统一状态入口。先通过搜索把用户态 connectId 映射到当前进程的设备缓存，
 * 避免 V1 设备的序列号 connectId 与底层 USB path 不一致时直接读取失败。
 */
export const getCanonicalDeviceState = async (
  sdk: DeviceStateSdk,
  connectId: string | undefined,
  scope: DeviceStateScope
) => {
  const deviceResult = await resolveSearchDevice(sdk, connectId);
  if (!deviceResult.success) return deviceResult;

  if (scope === 'runtime' && deviceResult.payload.state) {
    return { success: true as const, payload: deviceResult.payload.state };
  }

  const resolvedConnectId = deviceResult.payload.connectId ?? undefined;
  if (!resolvedConnectId) return createDeviceNotFoundResult();
  return sdk.getDeviceState(resolvedConnectId, { scope });
};

/**
 * 仅供旧 CLI 命令使用：V1 保持 getFeatures 行为，V2 复用 SDK 搜索时生成的兼容投影。
 * 公共 SDK.getFeatures 仍只服务 V1，不在此处改变 SDK 契约。
 */
export const getCompatibleFeatures = async (sdk: DeviceStateSdk, connectId?: string) => {
  const deviceResult = await resolveSearchDevice(sdk, connectId);
  if (!deviceResult.success) return deviceResult;

  const device = deviceResult.payload;
  const protocol = device.state?.protocol ?? device.features?.protocol;
  if (protocol === 'V2') {
    if (!device.features) {
      return {
        success: false as const,
        payload: {
          code: 'DEVICE_FEATURES_UNAVAILABLE',
          error: 'Protocol V2 compatibility features are unavailable',
        },
      };
    }
    return { success: true as const, payload: device.features };
  }

  return sdk.getFeatures(device.connectId ?? '');
};
