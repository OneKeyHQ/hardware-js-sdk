import { createHardwareCommonConnectSdk } from '@onekeyfe/hd-common-connect-sdk';

import HardwareTestSdk, {
  TEST_API_METHOD_NAMES,
  createTestHardwareSdk,
  hardwareTestApiExtension,
} from '../src';

jest.mock('@onekeyfe/hd-common-connect-sdk', () => ({
  createHardwareCommonConnectSdk: jest.fn(() => ({ call: jest.fn() })),
}));

const createCommonSdkMock = jest.mocked(createHardwareCommonConnectSdk);

describe('hd-test-api extension', () => {
  test('injects isolated protobuf schemas and keeps destructive access disabled by default', () => {
    expect(HardwareTestSdk).toBeDefined();
    expect(hardwareTestApiExtension.protobufSchemas).toEqual(
      expect.objectContaining({
        v1CurrentSchema: expect.any(Object),
        v1LegacySchema: expect.any(Object),
        v2Schema: expect.any(Object),
      })
    );
    expect(createCommonSdkMock).toHaveBeenLastCalledWith({
      methodExtensions: [hardwareTestApiExtension],
      allowDestructiveOperations: false,
    });
  });

  test('forwards explicit destructive authorization', () => {
    createTestHardwareSdk({ allowDestructiveOperations: true });

    expect(createCommonSdkMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ allowDestructiveOperations: true })
    );
  });

  test('registers the complete test/api method set outside Core', () => {
    TEST_API_METHOD_NAMES.forEach(name => {
      if (name !== 'deviceReadSEPublicCert' && name !== 'deviceSESignMessage') {
        expect(hardwareTestApiExtension.methods[name]).toBeInstanceOf(Function);
      }
    });
    expect(hardwareTestApiExtension.destructiveMethods).toContain('firmwareErase');
    expect(hardwareTestApiExtension.destructiveMethods).toContain('deviceSpiFlashWrite');
  });

  test('routes factory and diagnostic calls through the Common SDK boundary', async () => {
    const call = jest.fn().mockResolvedValue({ success: true });
    createCommonSdkMock.mockReturnValueOnce({ call } as any);
    const sdk = createTestHardwareSdk();

    await sdk.deviceReadFactoryInfo('neo', { connectProtocol: 'V2' });
    await sdk.testProtocolV2Ping('neo', { message: 'health', connectProtocol: 'V2' });

    expect(call).toHaveBeenNthCalledWith(1, {
      method: 'deviceReadFactoryInfo',
      connectId: 'neo',
      connectProtocol: 'V2',
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      method: 'testProtocolV2Ping',
      connectId: 'neo',
      message: 'health',
      connectProtocol: 'V2',
    });
  });
});
