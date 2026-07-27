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
 * Unified state entry for the new CLI. Resolve the user-facing connectId through
 * discovery so V1 serial IDs map to the process-local USB path.
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
 * Legacy CLI only: retain getFeatures for V1 and reuse the discovery projection for V2.
 * Public SDK.getFeatures remains V1-only.
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
