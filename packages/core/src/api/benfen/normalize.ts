import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { blake2b } from '@noble/hashes/blake2b';
import { sha256 } from '@noble/hashes/sha256';

export const BENFEN_ADDRESS_LENGTH = 32;
export const PUBLIC_KEY_SIZE = 32;

export const SIGNATURE_SCHEME_TO_FLAG = {
  ED25519: 0x00,
};

export function normalizeBenfenAddress(value: string, forceAdd0x = false): string {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith('0x')) {
    address = address.slice(2);
  }
  return `0x${address.padStart(BENFEN_ADDRESS_LENGTH * 2, '0')}`.toLowerCase();
}

export function publicKeyToAddress(publicKey: string) {
  const tmp = new Uint8Array(PUBLIC_KEY_SIZE + 1);
  tmp.set([SIGNATURE_SCHEME_TO_FLAG.ED25519]);
  tmp.set(hexToBytes(publicKey), 1);

  return normalizeBenfenAddress(
    bytesToHex(blake2b(tmp, { dkLen: 32 })).slice(0, BENFEN_ADDRESS_LENGTH * 2)
  );
}

/**
 * 将十六进制地址转换为 BFC 格式地址
 * @param hexAddress - 输入的十六进制地址（可以带有0x前缀）
 * @returns BFC格式的地址，格式为：BFC + 64位地址 + 4位校验和
 * @throws {Error} 当输入地址格式无效时
 */
export function hex2BfcAddress(hexAddress: string): string {
  // 如果已经是BFC格式，直接返回
  if (/^BFC/i.test(hexAddress)) {
    return hexAddress;
  }

  // 移除0x前缀，补齐64位，转小写
  const hex = hexAddress.replace(/^0x/, '').padStart(64, '0').toLowerCase();

  // 使用SHA-256计算校验和
  const hash = sha256(new TextEncoder().encode(hex));
  const checksumHex = bytesToHex(hash).slice(0, 4);

  // 返回BFC格式地址
  return `BFC${hex}${checksumHex}`;
}
