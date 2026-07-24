import XrpGetAddress from '../src/api/xrp/XrpGetAddress';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('XrpGetAddress timeout', () => {
  test('bounds non-interactive device responses without timing user confirmation', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { address: 'rAddress' } })
      .mockResolvedValueOnce({ message: { public_keys: ['public-key'] } });
    const method = new XrpGetAddress({
      id: 1,
      payload: {
        method: 'xrpGetAddress',
        path: "m/44'/144'/0'/0/0",
        showOnOneKey: false,
      },
    });
    method.device = {
      commands: { typedCall },
      toMessageObject: jest.fn(() => ({})),
    } as any;
    method.postMessage = jest.fn();

    method.init();
    await method.run();

    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'RippleGetAddress',
      'RippleAddress',
      expect.any(Object),
      { timeoutMs: 10_000 }
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'BatchGetPublickeys',
      'EcdsaPublicKeys',
      expect.any(Object),
      { timeoutMs: 10_000 }
    );
  });

  test('does not time the device confirmation prompt', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { address: 'rAddress' } })
      .mockResolvedValueOnce({ message: { public_keys: ['public-key'] } });
    const method = new XrpGetAddress({
      id: 1,
      payload: {
        method: 'xrpGetAddress',
        path: "m/44'/144'/0'/0/0",
        showOnOneKey: true,
      },
    });
    method.device = {
      commands: { typedCall },
      toMessageObject: jest.fn().mockReturnValue({}),
    } as any;
    method.postMessage = jest.fn();

    method.init();
    await method.run();

    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'RippleGetAddress',
      'RippleAddress',
      expect.any(Object)
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'BatchGetPublickeys',
      'EcdsaPublicKeys',
      expect.any(Object),
      { timeoutMs: 10_000 }
    );
  });
});
