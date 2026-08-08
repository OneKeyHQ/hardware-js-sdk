import type { CoreApi } from '@onekeyfe/hd-core';

export const importSdk = async () =>
  (await import('@onekeyfe/hd-common-connect-sdk')).default as unknown as CoreApi;
