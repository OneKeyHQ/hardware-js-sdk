import { createHardwareCommonConnectSdk } from '@onekeyfe/hd-common-connect-sdk';

import HardwareTestSdk, { createTestHardwareSdk } from '../src';

jest.mock('@onekeyfe/hd-core', () => ({
  createFactoryApi: jest.fn(() => ({ factoryApi: true })),
  createTestApi: jest.fn(() => ({ testApi: true })),
  factoryApiMethodExtension: { name: 'factory-api', methods: {} },
  testApiMethodExtension: { name: 'test-api', methods: {} },
}));

jest.mock('@onekeyfe/hd-common-connect-sdk', () => ({
  createHardwareCommonConnectSdk: jest.fn(options => options),
}));

const createCommonSdkMock = jest.mocked(createHardwareCommonConnectSdk);

describe('hd-test-api extension', () => {
  test('keeps destructive factory methods disabled by default', () => {
    expect(HardwareTestSdk).toEqual(expect.objectContaining({ allowDestructiveOperations: false }));
  });

  test('forwards explicit destructive authorization to the Common SDK instance', () => {
    createTestHardwareSdk({ allowDestructiveOperations: true });

    expect(createCommonSdkMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ allowDestructiveOperations: true })
    );
  });
});
