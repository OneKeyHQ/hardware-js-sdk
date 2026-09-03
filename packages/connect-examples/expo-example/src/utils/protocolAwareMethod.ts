import { getMethodSupportedProtocols, projectDeviceStateFeatures } from '@onekeyfe/hd-core';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { getProtocolAwareFeatures } from './protocolAwareFeatures';

import type { CoreApi, DeviceState } from '@onekeyfe/hd-core';

export type ConnectProtocol = 'V1' | 'V2';
export type MethodCallMode = 'no-connection' | 'connection' | 'device';

type ProtocolAwareMethodOptions = {
  sdk: CoreApi;
  method: string;
  connectId: string;
  deviceId: string;
  params?: Record<string, unknown>;
  protocol?: ConnectProtocol;
  mode?: MethodCallMode;
};

const protocolV2FeatureAdapters = new Set(['getFeatures', 'getOnekeyFeatures']);

function isProtocolV2UnlockSatisfied(state: DeviceState, pinType: unknown) {
  if (state.status.unlocked !== true) return false;

  if (pinType === DeviceSessionPinType.Any) return true;
  if (pinType === DeviceSessionPinType.AttachToPin) {
    return state.status.unlockedAttachPin === true;
  }

  return (
    (pinType === undefined || pinType === DeviceSessionPinType.Main) &&
    state.status.unlockedAttachPin === false
  );
}

export function isMethodSupportedOnProtocol(
  method: string,
  protocol: ConnectProtocol,
  params?: Record<string, unknown>
) {
  if (protocol === 'V2' && protocolV2FeatureAdapters.has(method)) {
    return true;
  }

  return getMethodSupportedProtocols(method, params).includes(protocol);
}

export function createProtocolUnsupportedResponse(method: string, protocol: ConnectProtocol) {
  return {
    success: false as const,
    payload: {
      code: HardwareErrorCode.DeviceNotSupportMethod,
      error: `${method} is not available on Protocol ${protocol}`,
      method,
      protocol,
    },
  };
}

async function resolveProtocol(
  sdk: CoreApi,
  connectId: string,
  protocol?: ConnectProtocol
): Promise<ConnectProtocol> {
  if (protocol) return protocol;

  const response = await sdk.detectDeviceConnectProtocol(connectId);
  if (!response.success) {
    throw new Error(response.payload?.error || 'Unable to detect the device protocol');
  }
  return response.payload;
}

/**
 * Execute an example method without crossing Core's protocol boundary. Legacy feature
 * calls are adapted to DeviceState on V2; other unsupported methods return a stable 415
 * response so test runners can mark them as skipped instead of failing after acquisition.
 */
export async function executeProtocolAwareMethod({
  sdk,
  method,
  connectId,
  deviceId,
  params = {},
  protocol: protocolHint,
  mode = 'device',
}: ProtocolAwareMethodOptions): Promise<any> {
  if (mode === 'no-connection') {
    return (sdk as any)[method]();
  }

  const protocol = await resolveProtocol(sdk, connectId, protocolHint);

  if (protocol === 'V2' && method === 'getFeatures') {
    return getProtocolAwareFeatures(sdk, connectId, params, protocol);
  }

  if (protocol === 'V2' && method === 'getOnekeyFeatures') {
    return sdk.getDeviceState(connectId, { ...params, scope: 'firmware' });
  }

  if (!isMethodSupportedOnProtocol(method, protocol, params)) {
    return createProtocolUnsupportedResponse(method, protocol);
  }

  if (protocol === 'V2' && mode === 'connection' && method === 'deviceUnlock') {
    const stateResponse = await sdk.getDeviceState(connectId, { scope: 'runtime' });
    if (!stateResponse.success) return stateResponse;

    if (isProtocolV2UnlockSatisfied(stateResponse.payload, params.pinType)) {
      return {
        ...stateResponse,
        payload: projectDeviceStateFeatures(stateResponse.payload),
      };
    }
  }

  if (mode === 'connection') {
    return (sdk as any)[method](connectId, params);
  }

  return (sdk as any)[method](connectId, deviceId, params);
}
