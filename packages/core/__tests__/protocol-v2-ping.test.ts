import { validateProtocolV2PingMessage } from '../src/api/protocol-v2/Ping';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('Protocol V2 diagnostic Ping validation', () => {
  test('accepts messages up to the firmware UTF-8 byte limit', () => {
    expect(validateProtocolV2PingMessage('x'.repeat(63))).toBe('x'.repeat(63));
    expect(validateProtocolV2PingMessage('测'.repeat(21))).toBe('测'.repeat(21));
  });

  test('rejects messages larger than the firmware UTF-8 byte limit', () => {
    expect(() => validateProtocolV2PingMessage('x'.repeat(64))).toThrow(
      'Protocol V2 Ping message must not exceed 63 UTF-8 bytes.'
    );
    expect(() => validateProtocolV2PingMessage('测'.repeat(22))).toThrow(
      'Protocol V2 Ping message must not exceed 63 UTF-8 bytes.'
    );
  });

  test('rejects non-string messages at the runtime API boundary', () => {
    expect(() => validateProtocolV2PingMessage(64)).toThrow(
      'Protocol V2 Ping message must be a string.'
    );
  });
});
