/// <reference types="jest" />

import { redactSensitiveLogValue } from '../utils/logRedaction';

describe('playground logger redaction', () => {
  test('redacts wallet secrets and binary payloads', () => {
    const result = redactSensitiveLogValue({
      deviceId: 'device-1',
      passphraseState: 'wallet-secret',
      request: {
        pin: '1234',
        binary: new Uint8Array([1, 2, 3]),
      },
    });

    expect(result).toEqual({
      deviceId: 'device-1',
      passphraseState: '[Redacted]',
      request: {
        pin: '[Redacted]',
        binary: '[Redacted]',
      },
    });
  });
});
