import {
  createFactoryApi,
  createTestApi,
  factoryApiMethodExtension,
  testApiMethodExtension,
} from '@onekeyfe/hd-core';
import { createHardwareCommonConnectSdk } from '@onekeyfe/hd-common-connect-sdk';

import type {
  CoreApi,
  CoreMethodExtension,
  FactoryApi,
  TestApi,
  TestApiMethods,
} from '@onekeyfe/hd-core';

export type TestHardwareSdkOptions = {
  /**
   * Required for Pro2 factory provisioning and certificate writes.
   * Read-only factory attestation APIs remain available from the production SDK.
   */
  allowDestructiveOperations?: boolean;
};

const extension: {
  methodExtensions: readonly CoreMethodExtension[];
  createApi: (call: CoreApi['call']) => TestApiMethods & FactoryApi;
} = {
  methodExtensions: [testApiMethodExtension, factoryApiMethodExtension],
  createApi: call => ({
    ...createTestApi(call),
    ...createFactoryApi(call),
  }),
};

export const createTestHardwareSdk = (options: TestHardwareSdkOptions = {}): TestApi =>
  createHardwareCommonConnectSdk({
    extension,
    allowDestructiveOperations: options.allowDestructiveOperations === true,
  });

const HardwareTestSdk = createTestHardwareSdk();

export default HardwareTestSdk;
export type { FactoryApi, TestApi, TestApiMethods } from '@onekeyfe/hd-core';
