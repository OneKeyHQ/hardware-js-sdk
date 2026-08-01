const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  let index = 0;

  while (index < bytes.length) {
    const first = bytes[index++];
    const second = index < bytes.length ? bytes[index++] : Number.NaN;
    const third = index < bytes.length ? bytes[index++] : Number.NaN;

    output += BASE64_CHARS[first >> 2];
    output += BASE64_CHARS[((first & 0x03) << 4) | ((second || 0) >> 4)];
    output += Number.isNaN(second)
      ? '='
      : BASE64_CHARS[((second & 0x0f) << 2) | ((third || 0) >> 6)];
    output += Number.isNaN(third) ? '=' : BASE64_CHARS[third & 0x3f];
  }

  return output;
}

export function base64ToBytes(value: string): Uint8Array {
  const sanitized = value.replace(/\s/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  const output = new Uint8Array((sanitized.length / 4) * 3 - padding);
  let outputIndex = 0;

  for (let index = 0; index < sanitized.length; index += 4) {
    const encoded =
      (decodeBase64Char(sanitized[index]) << 18) |
      (decodeBase64Char(sanitized[index + 1]) << 12) |
      (decodeBase64Char(sanitized[index + 2]) << 6) |
      decodeBase64Char(sanitized[index + 3]);

    if (outputIndex < output.length) output[outputIndex++] = (encoded >> 16) & 0xff;
    if (outputIndex < output.length) output[outputIndex++] = (encoded >> 8) & 0xff;
    if (outputIndex < output.length) output[outputIndex++] = encoded & 0xff;
  }

  return output;
}

function decodeBase64Char(char: string): number {
  if (char === '=') return 0;
  const value = BASE64_CHARS.indexOf(char);
  if (value < 0) throw new Error('Invalid base64 input');
  return value;
}
