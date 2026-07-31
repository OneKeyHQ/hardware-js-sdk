import { prepareSession } from '../cli';
import { resolvePassphraseByChoice } from '../sdk';
import { preloadSessionFromKeychain } from '../session';

jest.mock('../session', () => ({
  clearSessionFromKeychain: jest.fn(),
  preloadSessionFromKeychain: jest.fn(),
}));

describe('CLI wallet session', () => {
  test('maps the Attach PIN choice to an on-device Attach PIN response', async () => {
    await expect(resolvePassphraseByChoice('4')).resolves.toEqual({
      value: '',
      passphraseOnDevice: false,
      attachPinOnDevice: true,
    });
  });

  test('uses the public wallet identity without persisting an internal session id', async () => {
    const sdk = {
      searchDevices: jest.fn().mockResolvedValue({
        success: true,
        payload: [
          {
            connectId: 'pro2-connect-id',
            deviceId: 'device-id',
            deviceType: 'pro2',
            features: {
              deviceId: 'device-id',
              deviceType: 'pro2',
              unlocked: true,
              passphraseProtection: true,
            },
          },
        ],
      }),
      getFeatures: jest.fn(),
      openWalletSession: jest.fn().mockResolvedValue({
        success: true,
        payload: {
          protocol: 'V2',
          walletType: 'hidden',
          deviceId: 'device-id',
          passphraseState: 'wallet-state',
          resumed: false,
        },
      }),
    };
    const globalOpts: Record<string, unknown> = {};
    (preloadSessionFromKeychain as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(prepareSession(sdk as never, globalOpts)).resolves.toBe('wallet-state');

    expect(sdk.openWalletSession).toHaveBeenCalledWith('pro2-connect-id', {
      mode: 'select-hidden',
    });
    expect(sdk.getFeatures).not.toHaveBeenCalled();
    expect(globalOpts).toMatchObject({
      connectId: 'pro2-connect-id',
      deviceId: 'device-id',
      passphraseState: 'wallet-state',
    });
  });
});
