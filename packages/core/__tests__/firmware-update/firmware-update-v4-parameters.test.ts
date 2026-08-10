import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import FirmwareUpdateV4 from '../../src/api/FirmwareUpdateV4';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createMethod = (params: Record<string, unknown>) =>
  new FirmwareUpdateV4({
    id: 1,
    payload: {
      method: 'firmwareUpdateV4',
      platform: 'desktop',
      ...params,
    } as any,
  });

const captureInitError = (method: FirmwareUpdateV4): unknown => {
  try {
    method.init();
  } catch (error) {
    return error;
  }
  throw new Error('Expected FirmwareUpdateV4.init() to throw');
};

describe('FirmwareUpdateV4 parameter migration', () => {
  test('rejects host binding generation when preparedPlan is absent', () => {
    const error = captureInitError(
      createMethod({
        hostBindingGeneration: 1,
        componentArtifacts: {
          boot: {
            artifactRef: 'bootloader',
            size: 3,
            sha256: 'a'.repeat(64),
          },
        },
      })
    );

    expect(error).toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      message: expect.stringContaining(
        'hostBindingGeneration requires preparedPlan for remote updates'
      ),
    });
  });

  test.each(['resourceFiles', 'resourceBundleArtifacts'])(
    'rejects removed %s input with a Remote/Local migration hint',
    removedInput => {
      const error = captureInitError(
        createMethod({
          targetsToUpdate: ['resource'],
          [removedInput]: [],
        })
      );

      expect(error).toMatchObject({
        errorCode: HardwareErrorCode.CallMethodInvalidParameter,
        message: expect.stringContaining(removedInput),
      });
      expect(error).toMatchObject({
        message: expect.stringContaining('resourceArchiveBinary for local updates'),
      });
      expect(error).toMatchObject({
        message: expect.stringContaining(
          'preparedPlan with hostBindingGeneration for remote updates'
        ),
      });
    }
  );

  test('keeps direct Local inputs independent from host bindings', () => {
    const method = createMethod({
      targetsToUpdate: ['boot'],
      bootloaderBinary: new Uint8Array([1, 2, 3]).buffer,
    });

    expect(() => method.init()).not.toThrow();
  });
});
