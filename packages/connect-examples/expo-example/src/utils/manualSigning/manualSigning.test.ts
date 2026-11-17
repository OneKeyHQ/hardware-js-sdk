import { Buffer } from 'buffer';
import { describe, expect, jest, test } from '@jest/globals';
import { ed25519 } from '@noble/curves/ed25519';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { base58check } from '@scure/base';
import { payments } from 'bitcoinjs-lib';
import transparent from '../../data/fixtures/zcash-transparent.json';
import orchard from '../../data/fixtures/zcash-orchard.json';
import ironwood from '../../data/fixtures/zcash-ironwood.json';
import singleInput from '../../data/fixtures/monero-1-inputs.json';
import twoInputs from '../../data/fixtures/monero-2-inputs.json';
import { hex } from './common';
import {
  decodeMoneroAddress,
  encodeMoneroAddress,
  prepareMoneroSample,
  prepareMoneroKeyImageSample,
} from './monero';
import { prepareZcashSample, readZcashTransparentSample } from './zcash';
import type { ManualSigningCall } from './common';

function zcashWallet() {
  const publicKey = Buffer.from(secp256k1.ProjectivePoint.BASE.multiply(2n).toRawBytes(true));
  const payment = payments.p2pkh({ pubkey: publicKey });
  if (!payment.output || !payment.hash) throw new Error('Missing payment');
  const address = base58check(sha256).encode(
    Buffer.concat([Buffer.from([0x1c, 0xb8]), payment.hash])
  );
  const call: ManualSigningCall = jest.fn(method =>
    Promise.resolve({
      success: true,
      payload:
        method === 'zcashGetAddress'
          ? { address, seedFingerprint: '11'.repeat(32) }
          : { node: { public_key: publicKey.toString('hex') } },
    })
  );
  return { call, publicKey };
}

describe('Selected static samples become current-wallet API parameters', () => {
  test('keeps a Zcash self-transfer bound to the current wallet', async () => {
    const current = zcashWallet();
    const result = readZcashTransparentSample(await prepareZcashSample(current.call, transparent));
    expect(result.publicKey.equals(current.publicKey)).toBe(true);
    expect(result.inputScript.equals(result.outputScript)).toBe(true);
    expect(
      result.pczt
        .subarray(result.positions.fingerprintStart, result.positions.fingerprintStart + 32)
        .equals(Buffer.alloc(32, 0x11))
    ).toBe(true);
  });

  test('rebinds Zcash ownership while preserving amounts, paths and external recipients', async () => {
    const current = zcashWallet();
    const original = readZcashTransparentSample(transparent);
    const bytes = Buffer.from(original.pczt);
    // Change the low varint bits without changing its encoded length.
    for (const position of [
      original.positions.inputAmountStart,
      original.positions.outputAmountStart,
    ]) {
      bytes[position] += bytes[position] % 2 === 0 ? 1 : -1;
    }
    const recipient = payments.p2pkh({
      pubkey: Buffer.from(secp256k1.ProjectivePoint.BASE.multiply(3n).toRawBytes(true)),
    });
    if (!recipient.output || !recipient.hash) throw new Error('Missing recipient');
    recipient.output.copy(bytes, original.positions.outputScript.dataStart);
    const address = base58check(sha256).encode(
      Buffer.concat([Buffer.from([0x1c, 0xb8]), recipient.hash])
    );
    expect(address.length).toBe(original.positions.userAddress.value.length);
    Buffer.from(address).copy(bytes, original.positions.userAddress.dataStart);
    const template = { pczt: bytes.toString('hex') };
    const expected = readZcashTransparentSample(template);
    const params = await prepareZcashSample(current.call, template);
    const result = readZcashTransparentSample(params);
    expect(result.publicKey.equals(current.publicKey)).toBe(true);
    expect([
      result.inputAmount,
      result.outputAmount,
      result.prevIndex,
      result.sequence,
      result.locktime,
      result.expiryHeight,
    ]).toEqual([
      expected.inputAmount,
      expected.outputAmount,
      expected.prevIndex,
      expected.sequence,
      expected.locktime,
      expected.expiryHeight,
    ]);
    expect(result.path).toEqual(expected.path);
    expect(result.prevout.equals(expected.prevout)).toBe(true);
    expect(result.outputScript.equals(recipient.output) && result.outputAddress === address).toBe(
      true
    );
    expect(template.pczt === bytes.toString('hex')).toBe(true);
    expect(jest.mocked(current.call).mock.calls.map(([method]) => method)).toEqual([
      'zcashGetAddress',
      'btcGetPublicKey',
    ]);
  });

  test.each([orchard, ironwood, { pczt: '00' }])(
    'rejects unsupported Zcash profiles before reading the wallet',
    async template => {
      const { call } = zcashWallet();
      await expect(prepareZcashSample(call, template)).rejects.toThrow();
      expect(call).not.toHaveBeenCalled();
    }
  );

  test('rejects different Zcash wallet selections between public-data reads', async () => {
    const current = zcashWallet();
    const call: ManualSigningCall = jest.fn((...[method, params]: Parameters<ManualSigningCall>) =>
      method === 'zcashGetAddress'
        ? Promise.resolve({
            success: true,
            payload: { address: 'different-wallet', seedFingerprint: '11'.repeat(32) },
          })
        : current.call(method, params)
    );
    await expect(prepareZcashSample(call, transparent)).rejects.toThrow('different wallet');
  });

  test.each([
    singleInput,
    twoInputs,
    { ...singleInput, tsxData: { ...singleInput.tsxData, fee: '1' } },
  ])(
    'preserves the selected Monero structure and binds real outputs to the current wallet',
    async template => {
      const before = JSON.stringify(template);
      const spend = ed25519.Point.BASE.multiply(2n);
      const keys = Buffer.concat([
        Buffer.from(spend.toBytes()),
        Buffer.from(ed25519.Point.BASE.multiply(3n).toBytes()),
      ]);
      const address = encodeMoneroAddress(keys);
      expect(decodeMoneroAddress(address).equals(keys)).toBe(true);
      const call: ManualSigningCall = jest.fn(() =>
        Promise.resolve({ success: true, payload: { address } })
      );
      const params = await prepareMoneroSample(call, template);
      expect(params.tsxData.fee).toBe(template.tsxData.fee);
      expect(params.inputs.map(input => input.amount)).toEqual(
        template.inputs.map(input => input.amount)
      );
      expect(
        JSON.stringify(params.tsxData.outputs[0]) === JSON.stringify(template.tsxData.outputs[0])
      ).toBe(true);
      expect(params.tsxData.change_dts?.original).toBe(address);
      expect(params.tsxData.change_dts?.amount).toBe(template.tsxData.change_dts.amount);
      params.inputs.forEach((input, index) => {
        const original = template.inputs[index];
        const derivation = ed25519.Point.fromHex(hex(input.real_out_tx_key, 32))
          .multiply(3n)
          .multiply(8n)
          .toBytes();
        const hash = keccak256(
          Buffer.concat([
            Buffer.from(derivation),
            Buffer.from([input.real_output_in_tx_index ?? 0]),
          ])
        );
        const offset =
          BigInt(`0x${Buffer.from(hash).reverse().toString('hex')}`) % ed25519.Point.Fn.ORDER;
        const real = input.real_output ?? 0;
        expect(
          input.outputs[real].key?.dest ===
            ed25519.Point.BASE.multiplyUnsafe(offset).add(spend).toHex()
        ).toBe(true);
        expect(
          input.mask === original.mask && input.outputs.length === original.outputs.length
        ).toBe(true);
        expect(
          input.outputs.every(
            (output, i) =>
              output.idx === original.outputs[i].idx &&
              output.key?.commitment === original.outputs[i].key.commitment &&
              (i === real || output.key?.dest === original.outputs[i].key.dest)
          )
        ).toBe(true);
      });
      const sync = await prepareMoneroKeyImageSample(call, template);
      expect(sync.transfers.length).toBe(params.inputs.length);
      sync.transfers.forEach((transfer, index) => {
        const input = params.inputs[index];
        expect(
          transfer.outKey === input.outputs[input.real_output ?? 0].key?.dest &&
            transfer.txPubKey === input.real_out_tx_key
        ).toBe(true);
      });
      expect(jest.mocked(call).mock.calls.map(([method]) => method)).toEqual([
        'moneroGetAddress',
        'moneroGetAddress',
      ]);
      expect(JSON.stringify(template) === before).toBe(true);
    }
  );

  test('stops preparation on a failed read or unsupported Monero network', async () => {
    const call: ManualSigningCall = jest.fn(() => Promise.resolve({ success: false }));
    await expect(prepareMoneroSample(call, { ...singleInput, networkType: 1 })).rejects.toThrow(
      'unsupported'
    );
    expect(call).not.toHaveBeenCalled();
    await expect(prepareZcashSample(call, transparent)).rejects.toThrow('No further signing');
    await expect(prepareMoneroSample(call, singleInput)).rejects.toThrow('No further signing');
    expect(call).toHaveBeenCalledTimes(2);
  });
});
