import { prepareSession } from '../cli';
import { preloadSessionFromKeychain, saveSessionToKeychain } from '../session';

jest.mock('../session', () => ({
  clearSessionFromKeychain: jest.fn(),
  preloadSessionFromKeychain: jest.fn(),
  saveSessionToKeychain: jest.fn(),
}));

describe('CLI wallet session', () => {
  test('persists the session returned by openWalletSession without reading it from features', async () => {
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
          sessionId: 'wallet-session-id',
          resumed: false,
        },
      }),
    };
    const globalOpts: Record<string, unknown> = {};
    (preloadSessionFromKeychain as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(prepareSession(sdk as never, globalOpts)).resolves.toBe('wallet-state');

    expect(sdk.openWalletSession).toHaveBeenCalledWith('pro2-connect-id', {
      mode: 'hidden',
      access: 'passphrase',
    });
    expect(sdk.getFeatures).not.toHaveBeenCalled();
    expect(saveSessionToKeychain).toHaveBeenCalledWith(
      'device-id',
      'wallet-state',
      'wallet-session-id'
    );
    expect(globalOpts).toMatchObject({
      connectId: 'pro2-connect-id',
      deviceId: 'device-id',
      passphraseState: 'wallet-state',
    });
  });
});
