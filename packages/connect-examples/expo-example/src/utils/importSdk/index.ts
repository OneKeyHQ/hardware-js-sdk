import type { CoreApi, LowLevelCoreApi } from '@onekeyfe/hd-core';

export const importSdk = async (isNodeEnv = false) => {
  if (isNodeEnv) {
    return (await import('@onekeyfe/hd-common-connect-sdk')).default as unknown as CoreApi;
  }
  return (await import('@onekeyfe/hd-web-sdk')).default.HardwareWebSdk as unknown as CoreApi;
};

export const importLowLevelSDK = async () =>
  (await import('@onekeyfe/hd-web-sdk')).default.HardwareSDKLowLevel as unknown as LowLevelCoreApi;
