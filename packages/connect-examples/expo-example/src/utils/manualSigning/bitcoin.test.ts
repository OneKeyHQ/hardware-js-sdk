import { Buffer } from 'buffer';
import { describe, expect, jest, test } from '@jest/globals';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Transaction } from 'bitcoinjs-lib';

import bitcoin from '../../data/bitcoin';
import { prepareBitcoinSample } from './bitcoin';
import { record } from './common';

import type { ManualSigningCall } from './common';

const presets = bitcoin.find(entry => entry.method === 'btcSignTransaction')?.presupposes;
if (!presets) throw new Error('Missing Bitcoin signing presets');

function wallet() {
  const publicKey = secp256k1.ProjectivePoint.BASE.toHex(true);
  const call: ManualSigningCall = jest.fn((...[method, params]: Parameters<ManualSigningCall>) => {
    if (method !== 'btcGetPublicKey' || !Array.isArray(params.path))
      throw new Error('Unexpected wallet read');
    return Promise.resolve({
      success: true,
      payload: { node: { public_key: publicKey } },
    });
  });
  return { call };
}

describe('Bitcoin selected-preset generation', () => {
  test.each<[number, number, 'SPENDADDRESS' | 'SPENDP2SHWITNESS']>([
    [0, 2, 'SPENDP2SHWITNESS'],
    [1, 501, 'SPENDADDRESS'],
    [2, 80002, 'SPENDP2SHWITNESS'],
  ])(
    'keeps preset %i reference size %i and its ownership data',
    async (index, referenceOutputs, inputType) => {
      const preset = presets[index];
      const { value: original, prepareSample } = preset;
      if (!prepareSample) throw new Error('Missing preset generator');
      const originalHash = original.inputs[0].prev_hash;
      const current = wallet();
      const params = await prepareSample(current.call);
      if (
        !Array.isArray(params.inputs) ||
        !Array.isArray(params.outputs) ||
        !Array.isArray(params.refTxs)
      )
        throw new Error('Invalid generated sample');
      expect(params.inputs.length).toBe(original.inputs.length);
      expect(params.outputs.length).toBe(original.outputs.length);
      const input = record(params.inputs[0]);
      expect(input.script_type).toBe(inputType);
      expect(input.prev_index).toBe(original.inputs[0].prev_index);
      expect(String(input.amount) === String(original.inputs[0].amount)).toBe(true);
      expect(record(params.outputs[0]).address === original.outputs[0].address).toBe(true);
      const reference = record(params.refTxs[0]);
      if (!Array.isArray(reference.bin_outputs) || !Array.isArray(reference.inputs))
        throw new Error('Missing generated reference transaction');
      expect(reference.bin_outputs.length).toBe(referenceOutputs);
      expect(input.prev_hash === reference.hash && input.prev_hash !== originalHash).toBe(true);
      expect(original.inputs[0].prev_hash === originalHash).toBe(true);
      expect(original.refTxs[0].hash === originalHash).toBe(true);
      expect(
        reference.bin_outputs.every(
          (raw, outputIndex) =>
            outputIndex === Number(input.prev_index) ||
            record(raw).script_pubkey === original.refTxs[0].bin_outputs[outputIndex].script_pubkey
        )
      ).toBe(true);
      expect(
        params.outputs.every(
          (raw, outputIndex) =>
            String(record(raw).amount) === String(original.outputs[outputIndex].amount)
        )
      ).toBe(true);
      const funding = new Transaction();
      funding.version = Number(reference.version);
      funding.locktime = Number(reference.lock_time);
      reference.inputs.forEach(raw => {
        const previous = record(raw);
        funding.addInput(
          Buffer.from(String(previous.prev_hash), 'hex').reverse(),
          Number(previous.prev_index),
          Number(previous.sequence ?? 0xffffffff),
          Buffer.from(String(previous.script_sig), 'hex')
        );
      });
      reference.bin_outputs.forEach(raw => {
        const output = record(raw);
        funding.addOutput(Buffer.from(String(output.script_pubkey), 'hex'), Number(output.amount));
      });
      expect(funding.getId() === reference.hash).toBe(true);
    },
    15000
  );

  test('fails an unsupported script or wallet read instead of generating a different default transaction', async () => {
    const current = wallet();
    await expect(
      prepareBitcoinSample(current.call, {
        ...presets[0].value,
        inputs: [{ ...presets[0].value.inputs[0], script_type: 'SPENDTAPROOT' }],
      })
    ).rejects.toThrow('not supported');
    expect(current.call).not.toHaveBeenCalled();
    const failed: ManualSigningCall = jest.fn(() => Promise.resolve({ success: false }));
    await expect(prepareBitcoinSample(failed, presets[0].value)).rejects.toThrow(
      'No further signing'
    );
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
