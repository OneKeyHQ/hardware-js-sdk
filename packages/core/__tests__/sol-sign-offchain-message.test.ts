import { SolanaOffChainMessageFormat, SolanaOffChainMessageVersion } from '@onekeyfe/hd-transport';

import SolSignOffchainMessage from '../src/api/solana/SolSignOffchainMessage';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const signerA = '11'.repeat(32);
const signerB = '22'.repeat(32);
const requiredSigners = Array.from({ length: 11 }, (_, index) =>
  index.toString(16).padStart(64, '0')
);

const createMethod = (overrides: Record<string, unknown> = {}) =>
  new SolSignOffchainMessage({
    id: 1,
    payload: {
      method: 'solSignOffchainMessage',
      path: "m/44'/501'/0'/0'",
      messageHex: '48656c6c6f',
      messageVersion: SolanaOffChainMessageVersion.MESSAGE_VERSION_1,
      messageFormat: SolanaOffChainMessageFormat.V0_LIMITED_UTF8,
      applicationDomainHex: `0x${'aa'.repeat(32)}`,
      requiredSigners,
      ...overrides,
    },
  });

describe('SolSignOffchainMessage', () => {
  test.each([
    { description: 'without a host-side signer count limit', requiredSigners },
    { description: 'with omitted optional signers', requiredSigners: undefined },
  ])('maps V1 parameters $description', async ({ requiredSigners }) => {
    const method = createMethod({ requiredSigners });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({
      message: { signature: 'signature', public_key: signerA },
    });
    method.device = { commands: { typedCall } } as unknown as Device;

    await expect(method.run()).resolves.toEqual({ signature: 'signature', pub: signerA });
    expect(typedCall).toHaveBeenCalledWith('SolanaSignOffChainMessage', 'SolanaMessageSignature', {
      address_n: [2147483692, 2147484149, 2147483648, 2147483648],
      message: '48656c6c6f',
      message_version: SolanaOffChainMessageVersion.MESSAGE_VERSION_1,
      message_format: SolanaOffChainMessageFormat.V0_LIMITED_UTF8,
      application_domain: 'aa'.repeat(32),
      required_signers: requiredSigners ?? [],
    });
  });

  test.each([
    { requiredSigners: ['11'], error: '32-byte hex public key' },
    { requiredSigners: [signerB, signerA], error: 'strictly sorted and unique' },
    { requiredSigners: [signerA, signerA], error: 'strictly sorted and unique' },
  ])('rejects invalid required signers: $error', ({ requiredSigners, error }) => {
    expect(() => createMethod({ requiredSigners }).init()).toThrow(error);
  });
});
