import { createHash, createHmac } from 'crypto';

import bs58check from 'bs58check';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToNumberBE } from '@noble/curves/abstract/utils';

const HARDENED_OFFSET = 0x80000000;

interface IBip32Node {
  key: Buffer;
  chainCode: Buffer;
}

interface IBip32PathSegment {
  index: number;
  hardened: boolean;
}

interface IBuildPsbtParams {
  accountPath: string;
  accountXpub: string;
  masterFingerprintHex: string;
}

const PSBT_MAGIC = Buffer.from([0x70, 0x73, 0x62, 0x74, 0xff]);

const UINT32_BYTE_LENGTH = 4;

const UINT64_BYTE_LENGTH = 8;

function encodeVarInt(value: number): Buffer {
  if (value < 0xfd) {
    return Buffer.from([value]);
  }
  if (value <= 0xffff) {
    const buffer = Buffer.alloc(3);
    buffer[0] = 0xfd;
    buffer.writeUInt16LE(value, 1);
    return buffer;
  }
  if (value <= 0xffffffff) {
    const buffer = Buffer.alloc(5);
    buffer[0] = 0xfe;
    buffer.writeUInt32LE(value, 1);
    return buffer;
  }
  throw new Error('Value out of range for compactSize uint');
}

function parsePath(path: string): IBip32PathSegment[] {
  const sanitized = path.trim();
  if (!sanitized || sanitized === 'm' || sanitized === 'M') {
    return [];
  }
  const withoutPrefix = sanitized.replace(/^[mM]\//, '');
  if (!withoutPrefix) {
    return [];
  }
  return withoutPrefix.split('/').map(component => {
    const hardened = component.endsWith("'");
    const indexPart = hardened ? component.slice(0, -1) : component;
    const index = Number.parseInt(indexPart, 10);
    if (!Number.isFinite(index) || index < 0) {
      throw new Error(`Invalid path segment: ${component}`);
    }
    return { index, hardened };
  });
}

function decodeXpub(xpub: string): IBip32Node {
  const payload = bs58check.decode(xpub);
  if (payload.length !== 78) {
    throw new Error('Invalid extended key length');
  }
  const chainCode = payload.slice(13, 45);
  const key = payload.slice(45, 78);
  if (key.length !== 33) {
    throw new Error('Extended key must contain compressed public key');
  }
  return { key, chainCode };
}

function deriveChild(node: IBip32Node, index: number): IBip32Node {
  if (index >= HARDENED_OFFSET) {
    throw new Error('Cannot derive hardened child from public key');
  }
  const indexBuffer = Buffer.alloc(UINT32_BYTE_LENGTH);
  indexBuffer.writeUInt32BE(index, 0);
  const data = Buffer.concat([node.key, indexBuffer]);
  const I = createHmac('sha512', node.chainCode).update(data).digest();
  const IL = I.slice(0, 32);
  const IR = I.slice(32);
  const ilNum = bytesToNumberBE(IL);
  if (ilNum === 0n || ilNum >= secp256k1.CURVE.n) {
    throw new Error('Invalid child derivation');
  }
  const parentPoint = secp256k1.ProjectivePoint.fromHex(node.key);
  const childPoint = secp256k1.ProjectivePoint.BASE.multiply(ilNum).add(parentPoint);
  if (childPoint.equals(secp256k1.ProjectivePoint.ZERO)) {
    throw new Error('Derived point at infinity');
  }
  const childKey = Buffer.from(childPoint.toRawBytes(true));
  return {
    key: childKey,
    chainCode: IR,
  };
}

function derivePublicKeyFromXpub(accountXpub: string, relativePath: IBip32PathSegment[]): Buffer {
  let node = decodeXpub(accountXpub);
  relativePath.forEach(segment => {
    node = deriveChild(node, segment.index + (segment.hardened ? HARDENED_OFFSET : 0));
  });
  return node.key;
}

function hash160(buffer: Buffer): Buffer {
  const sha256 = createHash('sha256').update(buffer).digest();
  const ripemd160 = createHash('ripemd160').update(sha256).digest();
  return ripemd160;
}

function buildP2wpkhScript(pubkey: Buffer): Buffer {
  const pubKeyHash = hash160(pubkey);
  return Buffer.concat([Buffer.from([0x00, 0x14]), pubKeyHash]);
}

function serializeUnsignedTx(
  inputScript: Buffer,
  options: { txid: Buffer; index: number; sequence: number },
  outputs: { value: bigint; script: Buffer }[]
): Buffer {
  const chunks: Buffer[] = [];
  const versionBuffer = Buffer.alloc(UINT32_BYTE_LENGTH);
  versionBuffer.writeUInt32LE(2, 0);
  chunks.push(versionBuffer);

  chunks.push(encodeVarInt(1));
  const txidReversed = Buffer.from(options.txid).reverse();
  chunks.push(txidReversed);
  const indexBuffer = Buffer.alloc(UINT32_BYTE_LENGTH);
  indexBuffer.writeUInt32LE(options.index, 0);
  chunks.push(indexBuffer);
  chunks.push(encodeVarInt(inputScript.length));
  chunks.push(inputScript);
  const sequenceBuffer = Buffer.alloc(UINT32_BYTE_LENGTH);
  sequenceBuffer.writeUInt32LE(options.sequence, 0);
  chunks.push(sequenceBuffer);

  chunks.push(encodeVarInt(outputs.length));
  outputs.forEach(output => {
    const valueBuffer = Buffer.alloc(UINT64_BYTE_LENGTH);
    valueBuffer.writeBigUInt64LE(output.value, 0);
    chunks.push(valueBuffer);
    chunks.push(encodeVarInt(output.script.length));
    chunks.push(output.script);
  });

  const lockTimeBuffer = Buffer.alloc(UINT32_BYTE_LENGTH);
  lockTimeBuffer.writeUInt32LE(0, 0);
  chunks.push(lockTimeBuffer);

  return Buffer.concat(chunks);
}

function buildDerivationBuffer(fingerprintHex: string, path: IBip32PathSegment[]): Buffer {
  const fingerprint = Buffer.from(fingerprintHex.padStart(8, '0'), 'hex');
  const buffers = path.map(segment => {
    const buffer = Buffer.alloc(UINT32_BYTE_LENGTH);
    const value = segment.index + (segment.hardened ? HARDENED_OFFSET : 0);
    buffer.writeUInt32LE(value, 0);
    return buffer;
  });
  return Buffer.concat([fingerprint, ...buffers]);
}

export function createDemoPsbtHex(params: IBuildPsbtParams): string {
  const { accountPath, accountXpub, masterFingerprintHex } = params;
  if (!accountPath) {
    throw new Error('Account path is required to build PSBT.');
  }
  if (!accountXpub) {
    throw new Error('Extended public key is required to build PSBT.');
  }
  const accountSegments = parsePath(accountPath);
  const childSegments: IBip32PathSegment[] = [
    { index: 0, hardened: false },
    { index: 0, hardened: false },
  ];
  const fullPathSegments = [...accountSegments, ...childSegments];
  const derivedPubkey = derivePublicKeyFromXpub(accountXpub, childSegments);
  const scriptPubKey = buildP2wpkhScript(derivedPubkey);

  const deterministicSeed = createHash('sha256').update(accountPath).update(derivedPubkey).digest();
  const txid = deterministicSeed.slice(0, 32);
  const unsignedTx = serializeUnsignedTx(
    Buffer.alloc(0),
    { txid, index: 0, sequence: 0xffffffff },
    [
      {
        value: 100_000n,
        script: scriptPubKey,
      },
    ]
  );

  const witnessUtxoValue = Buffer.alloc(UINT64_BYTE_LENGTH);
  witnessUtxoValue.writeBigUInt64LE(100_000n, 0);
  const witnessUtxo = Buffer.concat([
    witnessUtxoValue,
    encodeVarInt(scriptPubKey.length),
    scriptPubKey,
  ]);

  const derivationBuffer = buildDerivationBuffer(masterFingerprintHex, fullPathSegments);

  const globalMap = Buffer.concat([
    encodeVarInt(1),
    Buffer.from([0x00]),
    encodeVarInt(unsignedTx.length),
    unsignedTx,
    Buffer.from([0x00]),
  ]);

  const inputEntries = Buffer.concat([
    encodeVarInt(1),
    Buffer.from([0x01]),
    encodeVarInt(witnessUtxo.length),
    witnessUtxo,
    encodeVarInt(1 + derivedPubkey.length),
    Buffer.concat([Buffer.from([0x06]), derivedPubkey]),
    encodeVarInt(derivationBuffer.length),
    derivationBuffer,
    Buffer.from([0x00]),
  ]);

  const outputEntries = Buffer.concat([
    encodeVarInt(1 + derivedPubkey.length),
    Buffer.concat([Buffer.from([0x02]), derivedPubkey]),
    encodeVarInt(derivationBuffer.length),
    derivationBuffer,
    Buffer.from([0x00]),
  ]);

  const psbtBuffer = Buffer.concat([PSBT_MAGIC, globalMap, inputEntries, outputEntries]);
  return psbtBuffer.toString('hex');
}
