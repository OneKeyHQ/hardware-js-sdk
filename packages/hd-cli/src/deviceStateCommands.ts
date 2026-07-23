import type {
  CoreApi,
  DeviceStateScope,
  KnownDevice,
  SearchDevice,
} from '@onekeyfe/hd-core';

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
 * 新 CLI 的统一状态入口。显式 connectId 不额外搜索；未指定设备时才自动选择第一台。
 */
export const getCanonicalDeviceState = async (
  sdk: DeviceStateSdk,
  connectId: string | undefined,
  scope: DeviceStateScope
) => {
  let resolvedConnectId = connectId;
  if (!resolvedConnectId) {
    const deviceResult = await resolveSearchDevice(sdk);
    if (!deviceResult.success) return deviceResult;
    resolvedConnectId = deviceResult.payload.connectId ?? undefined;
  }

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
