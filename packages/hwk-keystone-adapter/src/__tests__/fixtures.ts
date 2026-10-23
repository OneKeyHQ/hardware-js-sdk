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

// Public test vector from KeystoneHQ/keystone3-firmware rust/apps/wallets/src/blue_wallet.rs.
export const KEYSTONE_BTC_ACCOUNT_EXPORT_CBOR =
  'a2011a73c5da0a0284d90194d9012fa702f403582102707a62fdacc26ea9b63b1c197906f56ee0180d0bcf1966e1a2da34f5f3a09a9b0458204a53a0ab21b9dc95869c4e92a161194e03c0ef3ff5014ac692f433c4765490fc05d90131a20100020006d90130a301861854f500f500f5021a73c5da0a030307d90130a2018400f480f40300081a7ef32bdbd90193d9012fa702f403582103774c910fcf07fa96886ea794f0d5caed9afe30b44b83f7e213bb92930e7df4bd0458203da4bc190a2680111d31fadfdc905f2a7f6ce77c6f109919116f253d4344521905d90131a20100020006d90130a30186182cf500f500f5021a73c5da0a030307d90130a2018400f480f40300081a155bca59d90190d90194d9012fa702f403582102f1f347891b20f7568eae3ec9869fbfb67bcab6f358326f10ecc42356bd55939d0458206eaae365ae0e0a0aab84325cfe7cd76c3b909035f889e7d3f1b847a9a0797ecb05d90131a20100020006d90130a301861831f500f500f5021a73c5da0a030307d90130a2018400f480f40300081a3d05ff75d90199d9012fa702f403582103418278a2885c8bb98148158d1474634097a179c642f23cf1cc04da629ac6f0fb045820c61a8f27e98182314d2444da3e600eb5836ec8ad183c86c311f95df8082b18aa05d90131a20100020006d90130a301861856f500f500f5021a73c5da0a030307d90130a2018400f480f40300081a035270da';
