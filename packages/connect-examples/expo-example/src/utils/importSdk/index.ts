import type { CoreApi } from '@onekeyfe/hd-core';

export const importSdk = async (isNodeEnv = false) => {
  if (isNodeEnv) {
    return (await import('@onekeyfe/hd-common-connect-sdk')).default as unknown as CoreApi;
  }
  return (await import('@onekeyfe/hd-web-sdk')).default as unknown as CoreApi;
};
