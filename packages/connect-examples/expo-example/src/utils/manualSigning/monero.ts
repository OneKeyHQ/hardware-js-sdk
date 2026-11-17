import { Buffer } from 'buffer';
import { ed25519 } from '@noble/curves/ed25519';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';

import { hex, readDevice } from './common';

import type { ManualSigningCall } from './common';
import type { MoneroKeyImageSyncParams, MoneroSignTransactionParams } from '@onekeyfe/hd-core';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BLOCK_LENGTHS = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const { ORDER } = ed25519.Point.Fn;

function numberLE(bytes: Uint8Array): bigint {
  return BigInt(`0x${Buffer.from(bytes).reverse().toString('hex')}`);
}

export function decodeMoneroAddress(address: string): Buffer {
  if (address.length !== 95) throw new Error('Expected a standard Monero account address.');
  const blocks: Buffer[] = [];
  for (let offset = 0; offset < address.length; offset += 11) {
    const encoded = address.slice(offset, offset + 11);
    const size = BLOCK_LENGTHS.indexOf(encoded.length);
    if (size < 1) throw new Error('Invalid Monero address block.');
    let value = 0n;
    for (const character of encoded) {
      const digit = ALPHABET.indexOf(character);
      if (digit < 0) throw new Error('Invalid Monero address character.');
      value = value * 58n + BigInt(digit);
    }
    if (value >= 2n ** BigInt(size * 8)) throw new Error('Invalid Monero address block size.');
    blocks.push(Buffer.from(value.toString(16).padStart(size * 2, '0'), 'hex'));
  }
  const decoded = Buffer.concat(blocks);
  if (
    decoded[0] !== 18 ||
    !decoded.subarray(65).equals(Buffer.from(keccak256(decoded.subarray(0, 65))).subarray(0, 4))
  ) {
    throw new Error('Expected a mainnet Monero account address with a valid checksum.');
  }
  return decoded.subarray(1, 65);
}

export function encodeMoneroAddress(keys: Uint8Array): string {
  if (keys.length !== 64) throw new Error('A Monero address needs two public keys.');
  const data = Buffer.concat([Buffer.from([18]), Buffer.from(keys)]);
  const bytes = Buffer.concat([data, Buffer.from(keccak256(data)).subarray(0, 4)]);
  let address = '';
  for (let offset = 0; offset < bytes.length; offset += 8) {
    const block = bytes.subarray(offset, offset + 8);
    let value = BigInt(`0x${block.toString('hex')}`);
    let encoded = '';
    while (value > 0n) {
      encoded = ALPHABET[Number(value % 58n)] + encoded;
      value /= 58n;
    }
    address += encoded.padStart(BLOCK_LENGTHS[block.length], '1');
  }
  return address;
}

function outputIndexBytes(value: number): Buffer {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid static output index.');
  const bytes = [];
  let remaining = BigInt(value);
  do {
    bytes.push(Number(remaining % 128n) + (remaining >= 128n ? 128 : 0));
    remaining /= 128n;
  } while (remaining > 0n);
  return Buffer.from(bytes);
}

export async function prepareMoneroSample(
  call: ManualSigningCall,
  template: MoneroSignTransactionParams
): Promise<MoneroSignTransactionParams> {
  if (
    (template.networkType ?? 0) !== 0 ||
    (template.tsxData.account ?? 0) !== 0 ||
    template.inputs.some(
      input =>
        (input.subaddr_minor ?? 0) !== 0 ||
        !input.rct ||
        input.real_out_additional_tx_keys.length > 0
    )
  ) {
    throw new Error('The selected Monero sample requires an unsupported network or subaddress.');
  }
  if (template.inputs.length === 0 || template.tsxData.num_inputs !== template.inputs.length) {
    throw new Error('Invalid static Monero input count.');
  }
  const change = template.tsxData.change_dts;
  if (!change?.addr || !change.original)
    throw new Error('The static sample has no change address.');
  const changeIndices = template.tsxData.outputs.flatMap((output, index) =>
    output.original === change.original &&
    String(output.amount) === String(change.amount) &&
    output.addr?.spend_public_key === change.addr?.spend_public_key &&
    output.addr?.view_public_key === change.addr?.view_public_key
      ? [index]
      : []
  );
  if (changeIndices.length !== 1)
    throw new Error('The static sample must identify one change output.');
  const response = await readDevice(call, 'moneroGetAddress', {
    path: template.path,
    networkType: template.networkType ?? 0,
    showOnOneKey: false,
  });
  if (typeof response.address !== 'string')
    throw new Error('The device omitted the Monero address.');
  const keys = decodeMoneroAddress(response.address);
  const spend = ed25519.Point.fromHex(keys.subarray(0, 32));
  const view = ed25519.Point.fromHex(keys.subarray(32));
  if (!spend.isTorsionFree() || !view.isTorsionFree() || spend.is0() || view.is0()) {
    throw new Error('Invalid Monero account public keys.');
  }
  const inputs = template.inputs.map(input => {
    const realIndex = input.real_output ?? 0;
    if (!Number.isInteger(realIndex) || realIndex < 0 || !input.outputs[realIndex]?.key) {
      throw new Error('Invalid static Monero ring index.');
    }
    if (input.amount == null) throw new Error('The static Monero input omitted its amount.');
    const amount = BigInt(input.amount);
    const mask = numberLE(hex(input.mask, 32));
    if (amount < 0n || amount > 0xffffffffffffffffn || mask >= ORDER)
      throw new Error('Invalid static Monero amount or mask.');
    // Rebind the synthetic sender output; preserve the selected ring, mask and amount.
    const r =
      (numberLE(
        keccak256(
          Buffer.concat([
            Buffer.from('OneKey offline funding'),
            keys,
            hex(input.real_out_tx_key, 32),
          ])
        )
      ) %
        (ORDER - 1n)) +
      1n;
    const derivation = view.multiply(r).multiply(8n).toBytes();
    const offset =
      numberLE(
        keccak256(
          Buffer.concat([
            Buffer.from(derivation),
            outputIndexBytes(input.real_output_in_tx_index ?? 0),
          ])
        )
      ) % ORDER;
    const outKey = ed25519.Point.BASE.multiplyUnsafe(offset).add(spend).toHex();
    return {
      ...input,
      real_out_tx_key: ed25519.Point.BASE.multiply(r).toHex(),
      real_out_additional_tx_keys: [...input.real_out_additional_tx_keys],
      outputs: input.outputs.map((output, index) => ({
        ...output,
        key: index === realIndex ? { ...output.key, dest: outKey } : { ...output.key },
      })),
    };
  });
  const ownedChange = {
    ...change,
    original: response.address,
    addr: {
      ...change.addr,
      spend_public_key: keys.subarray(0, 32).toString('hex'),
      view_public_key: keys.subarray(32).toString('hex'),
    },
  };
  const outputs = template.tsxData.outputs.map((output, index) =>
    index === changeIndices[0] ? ownedChange : { ...output, addr: { ...output.addr } }
  );
  return {
    ...template,
    inputs,
    tsxData: { ...template.tsxData, outputs, change_dts: ownedChange },
  };
}

export function moneroKeyImageParams(
  template: MoneroSignTransactionParams
): MoneroKeyImageSyncParams {
  return {
    path: template.path,
    networkType: template.networkType ?? 0,
    transfers: template.inputs.map(input => {
      const real = input.outputs[input.real_output ?? 0];
      if (!real?.key?.dest || !input.real_out_tx_key) {
        throw new Error('The static sample has no real Monero output or transaction public key.');
      }
      return {
        outKey: real.key.dest,
        txPubKey: input.real_out_tx_key,
        additionalTxPubKeys: [...input.real_out_additional_tx_keys],
        internalOutputIndex: input.real_output_in_tx_index ?? 0,
        subAddrMajor: template.tsxData.account ?? 0,
        subAddrMinor: input.subaddr_minor ?? 0,
      };
    }),
  };
}

export async function prepareMoneroKeyImageSample(
  call: ManualSigningCall,
  template: MoneroSignTransactionParams
): Promise<MoneroKeyImageSyncParams> {
  return moneroKeyImageParams(await prepareMoneroSample(call, template));
}
