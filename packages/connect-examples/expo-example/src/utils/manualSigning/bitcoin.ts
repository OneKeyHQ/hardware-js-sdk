import { Buffer } from 'buffer';
import { Transaction, payments } from 'bitcoinjs-lib';

import { devicePublicKey, hex, readDevice } from './common';

import type { ManualSigningCall } from './common';
import type { BTCSignTransactionParams } from '@onekeyfe/hd-core';

type SpendType = 'SPENDADDRESS' | 'SPENDP2SHWITNESS' | 'SPENDWITNESS';

interface BitcoinSampleTemplate {
  coin: string;
  version?: number;
  locktime?: number;
  inputs: {
    address_n: number[];
    prev_hash: string;
    prev_index: number;
    sequence?: number;
    amount?: string | number;
    script_type?: string;
  }[];
  outputs: {
    address?: string;
    address_n?: number[];
    amount: string | number;
    script_type?: string;
  }[];
  refTxs: {
    hash: string;
    version: number;
    lock_time: number;
    inputs: {
      prev_hash: string;
      prev_index: number;
      script_sig?: string;
      sequence?: number;
    }[];
    bin_outputs: { amount: string | number; script_pubkey: string }[];
  }[];
}

function spendType(type: string | undefined, path: number[]): SpendType {
  if (type === 'SPENDADDRESS' || type === 'PAYTOADDRESS') return 'SPENDADDRESS';
  if (type === 'SPENDP2SHWITNESS' || type === 'PAYTOP2SHWITNESS') return 'SPENDP2SHWITNESS';
  if (type === 'SPENDWITNESS' || type === 'PAYTOWITNESS') return 'SPENDWITNESS';
  if (type === undefined) {
    if (path[0] === 0x8000002c) return 'SPENDADDRESS';
    if (path[0] === 0x80000031) return 'SPENDP2SHWITNESS';
    if (path[0] === 0x80000054) return 'SPENDWITNESS';
  }
  throw new Error('This preset script type is not supported by the offline sample generator.');
}

function paymentFor(publicKey: Buffer, type: SpendType) {
  if (type === 'SPENDADDRESS') return payments.p2pkh({ pubkey: publicKey });
  const witness = payments.p2wpkh({ pubkey: publicKey });
  return type === 'SPENDP2SHWITNESS' ? payments.p2sh({ redeem: witness }) : witness;
}

function satoshis(value: string | number): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid preset amount.');
  return amount;
}

export async function prepareBitcoinSample(
  call: ManualSigningCall,
  template: BitcoinSampleTemplate
): Promise<BTCSignTransactionParams> {
  if (template.coin.toLowerCase() !== 'btc') throw new Error('Select a Bitcoin preset first.');
  const publicKeys = new Map<string, Buffer>();
  const getPublicKey = async (path: number[], type: SpendType) => {
    const key = path.join('/');
    let publicKey = publicKeys.get(key);
    if (!publicKey) {
      publicKey = devicePublicKey(
        await readDevice(call, 'btcGetPublicKey', {
          coin: template.coin,
          path,
          scriptType: type,
          showOnOneKey: false,
        })
      );
      publicKeys.set(key, publicKey);
    }
    return publicKey;
  };

  const inputData: {
    input: BitcoinSampleTemplate['inputs'][number];
    type: SpendType;
    scriptPubKey: Buffer;
    amount: number;
  }[] = [];
  for (const input of template.inputs) {
    const type = spendType(input.script_type, input.address_n);
    const publicKey = await getPublicKey(input.address_n, type);
    const payment = paymentFor(publicKey, type);
    const reference = template.refTxs.find(ref => ref.hash === input.prev_hash);
    const prevout = reference?.bin_outputs[input.prev_index];
    if (!payment.output || !prevout) throw new Error('Incomplete Bitcoin preset input.');
    inputData.push({
      input,
      type,
      scriptPubKey: payment.output,
      amount: satoshis(input.amount ?? prevout.amount),
    });
  }

  // Retain the selected stress case, including every unrelated reference output.
  // Only ownership scripts and their dependent transaction hashes are replaced.
  const references = template.refTxs.map(reference => {
    const binOutputs = reference.bin_outputs.map(output => ({
      ...output,
      amount: String(output.amount),
    }));
    for (const item of inputData.filter(item => item.input.prev_hash === reference.hash)) {
      binOutputs[item.input.prev_index] = {
        amount: String(item.amount),
        script_pubkey: item.scriptPubKey.toString('hex'),
      };
    }
    const funding = new Transaction();
    funding.version = reference.version;
    funding.locktime = reference.lock_time;
    const inputs = reference.inputs.map(input => ({
      ...input,
      script_sig: input.script_sig ?? '',
      sequence: input.sequence ?? 0xffffffff,
    }));
    inputs.forEach(input =>
      funding.addInput(
        Buffer.from(hex(input.prev_hash, 32)).reverse(),
        input.prev_index,
        input.sequence ?? 0xffffffff,
        input.script_sig ? hex(input.script_sig) : Buffer.alloc(0)
      )
    );
    binOutputs.forEach(output =>
      funding.addOutput(hex(output.script_pubkey), satoshis(output.amount))
    );
    return { ...reference, inputs, bin_outputs: binOutputs, hash: funding.getId() };
  });
  const inputs = inputData.map(({ input, type, amount }) => ({
    ...input,
    amount: String(amount),
    script_type: type,
    sequence: input.sequence ?? 0xffffffff,
    prev_hash: references[template.refTxs.findIndex(ref => ref.hash === input.prev_hash)].hash,
  }));
  const outputTypes = {
    SPENDADDRESS: 'PAYTOADDRESS',
    SPENDP2SHWITNESS: 'PAYTOP2SHWITNESS',
    SPENDWITNESS: 'PAYTOWITNESS',
  } as const;
  const outputs = template.outputs.map<BTCSignTransactionParams['outputs'][number]>(output => {
    const amount = String(output.amount);
    if (output.address_n) {
      return {
        address_n: output.address_n,
        amount,
        script_type: outputTypes[spendType(output.script_type, output.address_n)],
      };
    }
    if (!output.address) throw new Error('The preset output has no address.');
    return { address: output.address, amount, script_type: 'PAYTOADDRESS' };
  });
  return { ...template, inputs, outputs, refTxs: references };
}
