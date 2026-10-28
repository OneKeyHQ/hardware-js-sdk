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

  test('redacts Monero view keys in protocol and API field names', () => {
    expect(
      getSafeTransportLogPayload(
        {
          address: 'synthetic-address-marker',
          watch_key: 'synthetic-view-key-marker',
          nested: { watchKey: 'synthetic-view-key-marker' },
        },
        'MoneroWatchKey'
      )
    ).toEqual({
      address: '[REDACTED]',
      watch_key: '[REDACTED]',
      nested: { watchKey: '[REDACTED]' },
    });
  });

  test.each([
    [
      'MoneroKeyImageExportInitRequest',
      { num: 1, hash: 'synthetic-hash-marker', subs: [{ account: 0, minor_indices: [2] }] },
    ],
    [
      'MoneroKeyImageSyncStepRequest',
      {
        tdis: [
          {
            out_key: 'synthetic-out-key-marker',
            tx_pub_key: 'synthetic-tx-key-marker',
            internal_output_index: 1,
          },
        ],
      },
    ],
    [
      'MoneroKeyImageSyncStepAck',
      { kis: [{ iv: 'synthetic-iv-marker', blob: 'synthetic-key-image-marker' }] },
    ],
    ['MoneroKeyImageSyncFinalAck', { enc_key: 'synthetic-enc-key-marker' }],
    ['MoneroGetTxKeyAck', { salt: 'synthetic-salt-marker', tx_keys: 'synthetic-tx-keys-marker' }],
    [
      'MoneroLiveRefreshStepAck',
      { salt: 'synthetic-salt-marker', key_image: 'synthetic-ki-marker' },
    ],
  ])('redacts the complete Monero key image message %s', (name, payload) => {
    expect(createTransportCallLog(name, 'V1', payload).request).toBe('[REDACTED]');
    expect(getSafeTransportLogPayload(payload, name)).toBe('[REDACTED]');
  });

  test('redacts Monero key image fields even without protocol message context', () => {
    expect(
      getSafeTransportLogPayload({
        encKey: 'synthetic-enc-key-marker',
        transfers: [
          {
            outKey: 'synthetic-out-key-marker',
            txPubKey: 'synthetic-tx-key-marker',
            additional_tx_pub_keys: ['synthetic-additional-key-marker'],
            internalOutputIndex: 1,
          },
        ],
      })
    ).toEqual({
      encKey: '[REDACTED]',
      transfers: [
        {
          outKey: '[REDACTED]',
          txPubKey: '[REDACTED]',
          additional_tx_pub_keys: '[REDACTED]',
          internalOutputIndex: 1,
        },
      ],
    });
  });

  test.each([
    'MoneroTransactionInitRequest',
    'MoneroTransactionInitAck',
    'MoneroTransactionSetInputRequest',
    'MoneroTransactionSetInputAck',
    'MoneroTransactionInputViniRequest',
    'MoneroTransactionInputViniAck',
    'MoneroTransactionAllInputsSetRequest',
    'MoneroTransactionAllInputsSetAck',
    'MoneroTransactionSetOutputRequest',
    'MoneroTransactionSetOutputAck',
    'MoneroTransactionAllOutSetRequest',
    'MoneroTransactionAllOutSetAck',
    'MoneroTransactionSignInputRequest',
    'MoneroTransactionSignInputAck',
    'MoneroTransactionFinalRequest',
    'MoneroTransactionFinalAck',
  ])('redacts the complete Monero signing message %s', name => {
    const payload = { src_entr: { mask: 'synthetic-mask-marker' }, opening_key: 'synthetic-key' };
    expect(createTransportCallLog(name, 'V1', payload).request).toBe('[REDACTED]');
    expect(getSafeTransportLogPayload(payload, name)).toBe('[REDACTED]');
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
