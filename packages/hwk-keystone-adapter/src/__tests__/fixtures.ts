import * as bitcoin from 'bitcoinjs-lib';

import type { KeystoneUr } from '../urEngine/types';

export function urJson(ur: { type: string; cbor: Buffer }): KeystoneUr {
  return { urType: ur.type, urData: ur.cbor.toString('hex') };
}

/** A real PSBT paying `outputValue`; `signed` adds a partial signature, which signing may do. */
export function psbtFixtureHex(outputValue = 9000n, signed = false): string {
  const psbt = new bitcoin.Psbt();
  psbt.addInput({
    hash: '11'.repeat(32),
    index: 0,
    witnessUtxo: { script: Buffer.from(`0014${'22'.repeat(20)}`, 'hex'), value: 10000n },
  });
  psbt.addOutput({ script: Buffer.from(`0014${'33'.repeat(20)}`, 'hex'), value: outputValue });
  if (signed) {
    psbt.updateInput(0, {
      partialSig: [
        {
          pubkey: Buffer.from(`02${'44'.repeat(32)}`, 'hex'),
          signature: Buffer.from('300602010102010101', 'hex'),
        },
      ],
    });
  }
  return psbt.toHex();
}
