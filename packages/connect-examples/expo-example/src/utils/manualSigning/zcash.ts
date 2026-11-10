import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { base58check } from '@scure/base';
import { payments } from 'bitcoinjs-lib';

import { devicePublicKey, hex, readDevice } from './common';

import type { ManualSigningCall } from './common';
import type { ZcashGetAddressParams, ZcashSignPcztParams } from '@onekeyfe/hd-core';

const GROUP_ID = 0xd884b698;
const BRANCH_ID = 0x37a5165b;

// ZIP 374 PCZT v2 uses postcard unsigned LEB128 integers, not transaction CompactSize.
function variable(value: number): Buffer {
  const bytes: number[] = [];
  let remaining = value;
  do {
    bytes.push((remaining % 128) + (remaining >= 128 ? 128 : 0));
    remaining = Math.floor(remaining / 128);
  } while (remaining > 0);
  return Buffer.from(bytes);
}

function vector(bytes: Uint8Array): Buffer {
  return Buffer.concat([variable(bytes.length), bytes]);
}

/** Read only the unsigned, single-transparent-input/output profile used by these static examples. */
export function readZcashTransparentSample(value: { pczt: string }) {
  const pczt = hex(value.pczt);
  let offset = 0;
  const ensure = (condition: boolean) => {
    if (!condition)
      throw new Error(
        'Dynamic generation requires the selected unsigned transparent PCZT v2/v6 sample.'
      );
  };
  const take = (size: number) => {
    ensure(size >= 0 && size <= pczt.length - offset);
    const result = pczt.subarray(offset, offset + size);
    offset += size;
    return result;
  };
  const uint = () => {
    let result = 0;
    let multiplier = 1;
    for (let i = 0; i < 8; i += 1) {
      const byte = take(1)[0];
      result += (byte % 128) * multiplier;
      ensure(Number.isSafeInteger(result));
      if (byte < 128) {
        ensure(i === 0 || byte !== 0);
        return result;
      }
      multiplier *= 128;
    }
    throw new Error('Invalid PCZT integer.');
  };
  const bytes = () => {
    const start = offset;
    const length = uint();
    const dataStart = offset;
    const value = take(length);
    return { start, dataStart, end: offset, value };
  };
  ensure(take(4).toString() === 'PCZT' && take(4).readUInt32LE() === 2);
  ensure(uint() === 6 && uint() === GROUP_ID && uint() === BRANCH_ID);
  const hasLocktime = take(1)[0];
  ensure(hasLocktime === 0 || hasLocktime === 1);
  const locktime = hasLocktime ? uint() : 0;
  const expiryHeight = uint();
  ensure(uint() === 133 && take(1)[0] === 0 && uint() === 0);
  ensure(take(1)[0] === 1 && uint() === 1);
  const prevout = take(32);
  const prevIndex = uint();
  const hasSequence = take(1)[0];
  ensure(hasSequence === 0 || hasSequence === 1);
  const sequence = hasSequence ? uint() : 0xffffffff;
  ensure(take(3).equals(Buffer.alloc(3)));
  const inputAmountStart = offset;
  const inputAmount = uint();
  const inputScript = bytes();
  ensure(take(1)[0] === 0);
  ensure(uint() === 0 && take(1)[0] === 1 && uint() === 1);
  const publicKeyStart = offset;
  const publicKey = take(33);
  const fingerprintStart = offset;
  take(32);
  ensure(uint() === 5);
  const path = Array.from({ length: 5 }, () => uint());
  ensure(
    path[0] === 0x8000002c &&
      path[1] === 0x80000085 &&
      path[2] >= 0x80000000 &&
      path[2] <= 0xffffffff &&
      path[3] <= 1 &&
      path[4] <= 0x7fffffff
  );
  for (let i = 0; i < 5; i += 1) ensure(uint() === 0);
  ensure(uint() === 1);
  const outputAmountStart = offset;
  const outputAmount = uint();
  const outputScript = bytes();
  ensure(take(1)[0] === 0 && uint() === 0 && take(1)[0] === 1);
  const userAddress = bytes();
  ensure(uint() === 0 && take(3).equals(Buffer.alloc(3)) && offset === pczt.length);
  const expectedInput = payments.p2pkh({ pubkey: publicKey }).output;
  ensure(!!expectedInput && inputScript.value.equals(expectedInput));
  const outputAddress = transparentAddress(outputScript.value);
  ensure(userAddress.value.toString() === outputAddress);
  ensure(
    locktime <= 0xffffffff &&
      expiryHeight <= 0xffffffff &&
      prevIndex <= 0xffffffff &&
      sequence <= 0xffffffff
  );
  return {
    pczt,
    path,
    publicKey,
    prevout,
    prevIndex,
    sequence,
    locktime,
    expiryHeight,
    inputAmount,
    inputScript: inputScript.value,
    outputAmount,
    outputScript: outputScript.value,
    outputAddress,
    positions: {
      inputScript,
      outputScript,
      userAddress,
      publicKeyStart,
      fingerprintStart,
      inputAmountStart,
      outputAmountStart,
    },
  };
}

function transparentAddress(scriptPubKey: Buffer): string {
  if (
    scriptPubKey.length !== 25 ||
    scriptPubKey.subarray(0, 3).toString('hex') !== '76a914' ||
    scriptPubKey.subarray(23).toString('hex') !== '88ac'
  )
    throw new Error('The static sample requires a P2PKH output.');
  return base58check(sha256).encode(
    Buffer.concat([Buffer.from([0x1c, 0xb8]), scriptPubKey.subarray(3, 23)])
  );
}

export async function prepareZcashSample(
  call: ManualSigningCall,
  template: { pczt: string }
): Promise<ZcashSignPcztParams> {
  const source = readZcashTransparentSample(template);
  const account = await readDevice(call, 'zcashGetAddress', {
    path: `m/32'/133'/${source.path[2] - 0x80000000}'`,
    addressType: 1,
    scope: source.path[3],
    diversifierIndex: source.path[4],
    showOnOneKey: false,
    includeSeedFingerprint: true,
  } satisfies ZcashGetAddressParams);
  const fingerprint = hex(account.seedFingerprint, 32);
  const publicKey = devicePublicKey(
    await readDevice(call, 'btcGetPublicKey', {
      path: source.path,
      coin: 'zec',
      showOnOneKey: false,
    })
  );
  const payment = payments.p2pkh({ pubkey: publicKey });
  if (!payment.output) throw new Error('Unable to construct the Zcash script.');
  const inputScript = payment.output;
  const currentAddress = transparentAddress(inputScript);
  if (account.address !== currentAddress)
    throw new Error('The Zcash address and public key belong to different wallet selections.');
  const ownedOutput = source.outputScript.equals(source.inputScript);
  const outputScript = ownedOutput ? inputScript : source.outputScript;
  const encodedAddress = Buffer.from(ownedOutput ? currentAddress : source.outputAddress);
  const patches = [
    {
      start: source.positions.inputScript.dataStart,
      end: source.positions.inputScript.end,
      value: inputScript,
    },
    {
      start: source.positions.publicKeyStart,
      end: source.positions.publicKeyStart + 33,
      value: publicKey,
    },
    {
      start: source.positions.fingerprintStart,
      end: source.positions.fingerprintStart + 32,
      value: fingerprint,
    },
  ];
  if (ownedOutput)
    patches.push(
      {
        start: source.positions.outputScript.dataStart,
        end: source.positions.outputScript.end,
        value: outputScript,
      },
      {
        start: source.positions.userAddress.start,
        end: source.positions.userAddress.end,
        value: vector(encodedAddress),
      }
    );
  const parts: Buffer[] = [];
  let offset = 0;
  patches
    .sort((a, b) => a.start - b.start)
    .forEach(patch => {
      parts.push(source.pczt.subarray(offset, patch.start), patch.value);
      offset = patch.end;
    });
  parts.push(source.pczt.subarray(offset));
  const pczt = Buffer.concat(parts);
  return { pczt: pczt.toString('hex') };
}
