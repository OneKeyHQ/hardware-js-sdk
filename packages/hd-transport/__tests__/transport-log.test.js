const { createTransportCallLog, getSafeTransportLogPayload } = require('../src/utils/transportLog');

describe('transport log sanitization', () => {
  test('redacts Babylon derived secrets from response logs', () => {
    expect(
      getSafeTransportLogPayload({ secret: '00'.repeat(32) }, 'BabylonDerivedContextHash')
    ).toEqual({ secret: '[REDACTED]' });
  });

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

  test('redacts Zcash viewing keys and fingerprints in protocol and API field names', () => {
    const payload = {
      address: 'synthetic-address-marker',
      ufvk: 'synthetic-viewing-key-marker',
      seed_fingerprint: 'synthetic-fingerprint-marker',
      nested: [{ seedFingerprint: 'synthetic-fingerprint-marker' }],
    };
    expect(getSafeTransportLogPayload(payload, 'ZcashAddress')).toEqual({
      address: '[REDACTED]',
      ufvk: '[REDACTED]',
      seed_fingerprint: '[REDACTED]',
      nested: [{ seedFingerprint: '[REDACTED]' }],
    });
    expect(payload.ufvk).toBe('synthetic-viewing-key-marker');
  });

  test.each([
    'ZcashSignPczt',
    'ZcashPcztChunkRequest',
    'ZcashPcztChunkAck',
    'ZcashSignedPczt',
    'ZcashSignedPcztChunkRequest',
  ])('redacts the complete %s request and response', name => {
    const payload = { data_chunk: 'synthetic-pczt-marker', chunk_length: 64 };
    expect(createTransportCallLog(name, 'V2', payload).request).toBe('[REDACTED]');
    expect(getSafeTransportLogPayload(payload, name)).toBe('[REDACTED]');
  });

  test('redacts named PCZT fields even without protocol message context', () => {
    expect(
      getSafeTransportLogPayload({
        pczt: 'synthetic-pczt-marker',
        signedPczt: 'synthetic-signed-pczt-marker',
        data_chunk: 'synthetic-chunk-marker',
        nested: { dataChunk: 'synthetic-chunk-marker' },
      })
    ).toEqual({
      pczt: '[REDACTED]',
      signedPczt: '[REDACTED]',
      data_chunk: '[REDACTED]',
      nested: { dataChunk: '[REDACTED]' },
    });
  });
});
