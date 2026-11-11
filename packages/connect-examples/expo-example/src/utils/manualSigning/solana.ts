import { Buffer } from 'buffer';
import { base58 } from '@scure/base';

import { hex, readDevice } from './common';

import type { ManualSigningCall } from './common';
import type { SolSignOffchainMessageParams } from '@onekeyfe/hd-core';

function solanaPublicKey(address: unknown): string {
  if (typeof address !== 'string')
    throw new Error('The device returned an invalid Solana address.');
  const publicKey = Buffer.from(base58.decode(address));
  if (publicKey.length !== 32) throw new Error('The device returned an invalid Solana address.');
  return publicKey.toString('hex');
}

// V1 firmware only signs when the derived key is one of the sorted, unique required signers.
export async function prepareSolanaOffchainV1Sample(
  call: ManualSigningCall,
  template: SolSignOffchainMessageParams
): Promise<SolSignOffchainMessageParams> {
  const account = await readDevice(call, 'solGetAddress', {
    path: template.path,
    showOnOneKey: false,
  });
  const signers = new Set(
    (template.requiredSigners ?? []).map(signer => hex(signer, 32).toString('hex'))
  );
  signers.add(solanaPublicKey(account.address));
  return { ...template, requiredSigners: [...signers].sort() };
}
