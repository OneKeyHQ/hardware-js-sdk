const { createTransportCallLog, getSafeTransportLogPayload } = require('../src/utils/transportLog');

describe('transport log sanitization', () => {
  test('logs non-sensitive request fields and redacts passphrases recursively', () => {
    expect(
      createTransportCallLog('DeviceSessionAskPassphrase', 'V2', {
        passphrase: 'hidden-wallet-secret',
        on_device: false,
        metadata: {
          retry: 1,
          session_id: 'wallet-session-secret',
        },
      })
    ).toEqual({
      name: 'DeviceSessionAskPassphrase',
      protocol: 'V2',
      request: {
        passphrase: '[REDACTED]',
        on_device: false,
        metadata: {
          retry: 1,
          session_id: '[REDACTED]',
        },
      },
    });
  });

  test('logs response fields while redacting device and wallet identifiers', () => {
    expect(
      getSafeTransportLogPayload({
        message: 'Passphrase accepted',
        device_id: 'device-secret',
        nested: {
          btc_test_address: 'wallet-address',
          unlocked: true,
        },
      })
    ).toEqual({
      message: 'Passphrase accepted',
      device_id: '[REDACTED]',
      nested: {
        btc_test_address: '[REDACTED]',
        unlocked: true,
      },
    });
  });

  test('does not log raw signing request or response payloads', () => {
    expect(
      getSafeTransportLogPayload(
        {
          transaction: 'raw-transaction',
          path: "m/44'/60'/0'/0/0",
        },
        'EthereumSignTx'
      )
    ).toBe('[REDACTED]');
    expect(
      getSafeTransportLogPayload(
        {
          signature: 'raw-signature',
        },
        'EthereumSignedTx'
      )
    ).toBe('[REDACTED]');
  });

  test('replaces binary content with its byte length', () => {
    expect(
      getSafeTransportLogPayload({
        file_name: 'resource.bin',
        data: new Uint8Array(128),
      })
    ).toEqual({
      file_name: 'resource.bin',
      data: '[BINARY:128]',
    });
  });
});
