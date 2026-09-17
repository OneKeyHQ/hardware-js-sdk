import { prepareSolanaOffchainMessageV1 } from '@onekeyfe/hwk-adapter-core';
import bs58 from 'bs58';

import { solSignMessage } from './sol';

import type { ConnectorContext } from './types';

jest.mock('../../signer/deviceActionToPromise', () => ({
  deviceActionToPromise: (action: { result: unknown }) => Promise.resolve(action.result),
}));

describe('Ledger Solana message signing', () => {
  it('uses raw mode with the exact finalized OCMS v1 bytes', async () => {
    const rawSignature = Uint8Array.from({ length: 64 }, (_, index) => index);
    const sdkSigner = {
      signMessage: jest.fn().mockReturnValue({
        result: { signature: bs58.encode(rawSignature) },
      }),
    };
    const contextBuilder = {
      setChain: jest.fn(),
      removeDefaultLoaders: jest.fn(),
      build: jest.fn().mockReturnValue({}),
    };
    contextBuilder.setChain.mockReturnValue(contextBuilder);
    contextBuilder.removeDefaultLoaders.mockReturnValue(contextBuilder);
    const signerBuilder = {
      withContextModule: jest.fn(),
      build: jest.fn().mockReturnValue(sdkSigner),
    };
    signerBuilder.withContextModule.mockReturnValue(signerBuilder);
    const ContextModuleBuilder = jest.fn().mockReturnValue(contextBuilder);
    const SignerSolanaBuilder = jest.fn().mockReturnValue(signerBuilder);
    const ctx = {
      getOrCreateDmk: jest.fn().mockResolvedValue({}),
      importLedgerKit: jest.fn(async (pkg: string) => {
        if (pkg === '@ledgerhq/context-module') {
          return {
            ContextModuleBuilder,
            ContextModuleChainID: { Solana: 'solana' },
          };
        }
        return {
          SignerSolanaBuilder,
          SignMessageVersion: { Raw: 'raw' },
        };
      }),
      emit: jest.fn(),
      invalidateSession: jest.fn(),
      wrapError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
      clearCanceller: jest.fn(),
      registerCanceller: jest.fn(),
    } as unknown as ConnectorContext;
    const signerA = '01'.repeat(32);
    const signerB = '02'.repeat(32);
    const message = Buffer.from('Hello, Solana');

    await expect(
      solSignMessage(ctx, 'ledger-session', {
        path: "m/44'/501'/0'/0'",
        message: message.toString('hex'),
        messageVersion: 1,
        requiredSigners: [signerB, signerA],
      })
    ).resolves.toEqual({ signature: Buffer.from(rawSignature).toString('hex') });

    const expected = prepareSolanaOffchainMessageV1({
      message,
      requiredSigners: [signerB, signerA],
    }).serializedMessage;
    expect(sdkSigner.signMessage).toHaveBeenCalledWith("44'/501'/0'/0'", expected, {
      version: 'raw',
    });
    expect(contextBuilder.setChain).toHaveBeenCalledWith('solana');
  });
});
