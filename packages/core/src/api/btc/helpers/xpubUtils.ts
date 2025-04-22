import { sha256 } from '@noble/hashes/sha256';
import type { HDNodeType, InputScriptType } from '@onekeyfe/hd-transport';

// 定义版本字节常量
const VERSION_BYTES = {
  // xpub - (SPENDADDRESS, SPENDMULTISIG)
  XPUB: 0x0488b21e,
  // ypub - (SPENDP2SHWITNESS)
  YPUB: 0x049d7cb2,
  // zpub - (SPENDWITNESS)
  ZPUB: 0x04b24746,
};

function getVersionBytes(scriptType?: InputScriptType): number {
  switch (scriptType) {
    case 'SPENDADDRESS':
    case 'SPENDMULTISIG':
      return VERSION_BYTES.XPUB;
    case 'SPENDP2SHWITNESS':
      return VERSION_BYTES.YPUB;
    case 'SPENDWITNESS':
      return VERSION_BYTES.ZPUB;
    default:
      return VERSION_BYTES.XPUB;
  }
}

function base58Check(data: Buffer): string {
  const checksum = sha256(sha256(new Uint8Array(data))).slice(0, 4);
  const withChecksum = Buffer.concat([new Uint8Array(data), new Uint8Array(checksum)]);
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  let result = '';
  let num = BigInt(`0x${withChecksum.toString('hex')}`);
  const base = BigInt(58);

  while (num > 0) {
    const mod = Number(num % base);
    num /= base;
    result = ALPHABET[mod] + result;
  }

  // 处理前导零字节
  for (let i = 0; i < withChecksum.length; i++) {
    if (withChecksum[i] === 0) {
      result = `1${result}`;
    } else {
      break;
    }
  }

  return result;
}

function generateExtendedPublicKey(
  depth: number,
  fingerprint: number,
  childNum: number,
  chainCode: string,
  publicKey: string,
  scriptType?: InputScriptType
): string {
  const versionBytes = getVersionBytes(scriptType);

  const buffer = Buffer.alloc(78);
  buffer.writeUInt32BE(versionBytes, 0);
  buffer.writeUInt8(depth, 4);
  buffer.writeUInt32BE(fingerprint, 5);
  buffer.writeUInt32BE(childNum, 9);
  buffer.write(chainCode, 13, 'hex');
  buffer.write(publicKey, 45, 'hex');

  return base58Check(buffer);
}

export function createExtendedPublicKey(node: HDNodeType, scriptType?: InputScriptType): string {
  return generateExtendedPublicKey(
    node.depth,
    node.fingerprint,
    node.child_num,
    node.chain_code,
    node.public_key,
    scriptType
  );
}
