import type { TestApi } from '@onekeyfe/hd-core';

export const importSdk = async () =>
  (await import('@onekeyfe/hd-test-api')).default as unknown as TestApi;
