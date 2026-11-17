import { Buffer } from 'buffer';
import { describe, expect, jest, test } from '@jest/globals';
import { base58 } from '@scure/base';

import solana from '../../data/solana';
import { prepareSolanaOffchainV1Sample } from './solana';

import type { ManualSigningCall } from './common';
import type { SolSignOffchainMessageParams } from '@onekeyfe/hd-core';

const external = '80'.repeat(32);

function solanaWallet(publicKey: string) {
  const call: ManualSigningCall = jest.fn(() =>
    Promise.resolve({
      success: true,
      payload: { address: base58.encode(Buffer.from(publicKey, 'hex')) },
    })
  );
  return call;
}

const template: SolSignOffchainMessageParams = {
  path: "m/44'/501'/0'/0'",
  messageHex: '48656c6c6f',
  messageVersion: 1,
  requiredSigners: [external],
};

describe('Solana off-chain V1 sample', () => {
  test.each([
    ['before', '11'.repeat(32), ['11'.repeat(32), external]],
    ['after', 'ee'.repeat(32), [external, 'ee'.repeat(32)]],
  ])('sorts the current wallet %s the external signer', async (_, publicKey, signers) => {
    const call = solanaWallet(publicKey);
    await expect(prepareSolanaOffchainV1Sample(call, template)).resolves.toEqual({
      ...template,
      requiredSigners: signers,
    });
    expect(call).toHaveBeenCalledWith('solGetAddress', {
      path: template.path,
      showOnOneKey: false,
    });
  });

  test('does not duplicate a current wallet that is already a signer', async () => {
    const params = await prepareSolanaOffchainV1Sample(solanaWallet(external), template);
    expect(params.requiredSigners).toEqual([external]);
  });

  test('rejects an address that is not a 32-byte public key', async () => {
    const call: ManualSigningCall = jest.fn(() =>
      Promise.resolve({ success: true, payload: { address: base58.encode(Buffer.alloc(31)) } })
    );
    await expect(prepareSolanaOffchainV1Sample(call, template)).rejects.toThrow(
      'invalid Solana address'
    );
  });

  test('only the valid V1 preset rebinds to the current wallet', () => {
    const presets = solana.find(entry => entry.method === 'solSignOffchainMessage')?.presupposes;
    expect(presets?.map(preset => Boolean(preset.prepareSample))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});
