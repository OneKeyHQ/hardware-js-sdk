import { MESSAGE_TOP_CHAR, MESSAGE_HEADER_BYTE } from '@onekeyfe/hd-transport';

export const isHeaderChunk = (chunk: Buffer | Uint8Array): boolean => {
  if (chunk.length < 9) return false;
  const [MagicQuestionMark, sharp1, sharp2] = chunk;

  if (
    String.fromCharCode(MagicQuestionMark) === String.fromCharCode(MESSAGE_TOP_CHAR) &&
    String.fromCharCode(sharp1) === String.fromCharCode(MESSAGE_HEADER_BYTE) &&
    String.fromCharCode(sharp2) === String.fromCharCode(MESSAGE_HEADER_BYTE)
  ) {
    return true;
  }

  return false;
};

export const isOnekeyDevice = (name: string | null, id?: string): boolean => {
  if (id?.startsWith?.('MI')) {
    return true;
  }

  // 过滤 BixinKeyxxx 和 Kxxxx 和 Txxxx
  // i 忽略大小写模式
  const re = /(BixinKey\d{10})|(K\d{4})|(T\d{4})|(Touch\s\w{4})|(Pro\s\w{4})/i;
  if (name && re.exec(name)) {
    return true;
  }
  return false;
};
