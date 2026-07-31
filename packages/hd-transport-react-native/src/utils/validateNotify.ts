import { PROTOCOL_V1_HEADER_BYTE, PROTOCOL_V1_REPORT_ID } from '@onekeyfe/hd-transport';

export const isHeaderChunk = (chunk: Buffer): boolean => {
  if (chunk.length < 9) return false;
  const [MagicQuestionMark, sharp1, sharp2] = chunk;

  if (
    String.fromCharCode(MagicQuestionMark) === String.fromCharCode(PROTOCOL_V1_REPORT_ID) &&
    String.fromCharCode(sharp1) === String.fromCharCode(PROTOCOL_V1_HEADER_BYTE) &&
    String.fromCharCode(sharp2) === String.fromCharCode(PROTOCOL_V1_HEADER_BYTE)
  ) {
    return true;
  }

  return false;
};
