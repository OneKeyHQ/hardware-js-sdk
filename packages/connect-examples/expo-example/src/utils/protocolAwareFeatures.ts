import { projectDeviceStateFeatures } from '@onekeyfe/hd-core';

import type { CoreApi } from '@onekeyfe/hd-core';

type GetFeaturesResponse = Awaited<ReturnType<CoreApi['getFeatures']>>;
type GetFeaturesParams = Parameters<CoreApi['getFeatures']>[1];
type ConnectProtocol = 'V1' | 'V2';

type PassphraseCompatibleFeatures = {
  passphraseProtection?: boolean | null;
  passphrase_protection?: boolean;
};

/**
 * 统一读取 V1 的 protobuf 字段与 V2 DeviceState 投影字段。
 */
export function isPassphraseProtectionEnabled(features?: unknown): boolean {
  if (!features || typeof features !== 'object') return false;
  const compatible = features as PassphraseCompatibleFeatures;
  return compatible.passphraseProtection ?? compatible.passphrase_protection ?? false;
}

/**
 * Keep legacy example screens working while respecting the SDK protocol boundary:
 * getFeatures is V1-only, while Protocol V2 exposes the canonical device state API.
 */
export async function getProtocolAwareFeatures(
  sdk: CoreApi,
  connectId?: string,
  params?: GetFeaturesParams,
  protocolHint?: ConnectProtocol
): Promise<GetFeaturesResponse> {
  let protocol = protocolHint;

  if (!protocol) {
    const protocolResponse = await sdk.detectDeviceConnectProtocol(connectId ?? '');
    if (!protocolResponse.success) return protocolResponse as GetFeaturesResponse;
    protocol = protocolResponse.payload;
  }

  if (protocol === 'V1') {
    return sdk.getFeatures(connectId, params);
  }

  const stateResponse = await sdk.getDeviceState(connectId, {
    ...params,
    scope: 'firmware',
  });
  if (!stateResponse.success) return stateResponse as GetFeaturesResponse;

  return {
    ...stateResponse,
    payload: projectDeviceStateFeatures(stateResponse.payload),
  } as GetFeaturesResponse;
}

/**
 * Read the complete firmware identity through the canonical API on both protocol
 * families, then expose the existing Features projection to legacy example views.
 */
export async function getProtocolAwareFirmwareFeatures(
  sdk: CoreApi,
  connectId?: string
): Promise<GetFeaturesResponse> {
  const stateResponse = await sdk.getDeviceState(connectId, { scope: 'firmware' });
  if (!stateResponse.success) return stateResponse as GetFeaturesResponse;

  return {
    ...stateResponse,
    payload: projectDeviceStateFeatures(stateResponse.payload),
  } as GetFeaturesResponse;
}
