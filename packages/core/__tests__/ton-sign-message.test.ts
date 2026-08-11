import { EDeviceType } from '@onekeyfe/hd-shared';

import TonSignMessage from '../src/api/ton/TonSignMessage';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createMethod = (deviceType: EDeviceType) => {
  const method = new TonSignMessage({
    id: 1,
    payload: {
      method: 'tonSignMessage',
    },
  });

  Object.defineProperty(method, 'device', {
    value: {
      getCurrentDeviceType: () => deviceType,
    },
  });

  return method;
};

describe('TonSignMessage response compatibility', () => {
  test.each([EDeviceType.Pro2, EDeviceType.Neo])(
    'uses the corrected signing_message field for %s',
    async deviceType => {
      const method = createMethod(deviceType);

      await expect(
        method.processTxRequest(
          {
            signature: 'signature',
            signing_message: 'serialized-message',
          },
          ''
        )
      ).resolves.toEqual({
        signature: 'signature',
        signing_message: 'serialized-message',
        skip_validate: false,
      });
    }
  );

  test('normalizes the legacy Protocol V1 field without removing it', async () => {
    const method = createMethod(EDeviceType.Classic1s);

    await expect(
      method.processTxRequest(
        {
          signature: 'signature',
          signning_message: 'message-hash',
        },
        ''
      )
    ).resolves.toEqual({
      signature: 'signature',
      signning_message: 'message-hash',
      signing_message: 'message-hash',
      skip_validate: true,
    });
  });

  test('skips validation when blind signing omits the signing message', async () => {
    const method = createMethod(EDeviceType.Pro2);

    await expect(
      method.processTxRequest(
        {
          signature: 'signature',
        },
        ''
      )
    ).resolves.toEqual({
      signature: 'signature',
      signing_message: undefined,
      skip_validate: true,
    });
  });
});
