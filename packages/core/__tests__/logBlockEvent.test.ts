import {
  UI_REQUEST,
  UI_RESPONSE,
  formatLogMethodLabel,
  getLogBlockLabel,
  getSafeLogPayload,
} from '../src/events';

describe('getLogBlockLabel', () => {
  it('blocks evmSignTypedData params before logging large typed data', () => {
    expect(
      getLogBlockLabel({
        method: 'evmSignTypedData',
        data: {
          message: {
            data: `0x${'ab'.repeat(4096)}`,
          },
        },
      })
    ).toBe('evmSignTypedData');
  });

  it('blocks evmSignTypedData iframe call payload before bridge logging', () => {
    expect(
      getLogBlockLabel({
        event: 'iframe-call',
        type: 'iframe-call',
        payload: {
          method: 'evmSignTypedData',
          data: {
            message: {
              data: `0x${'ab'.repeat(4096)}`,
            },
          },
        },
      })
    ).toBe('evmSignTypedData');
  });

  it('keeps existing sensitive UI response blocking', () => {
    expect(getLogBlockLabel({ type: UI_RESPONSE.RECEIVE_PIN })).toBe(UI_RESPONSE.RECEIVE_PIN);
  });

  it.each([UI_REQUEST.REQUEST_PASSPHRASE, UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE])(
    'blocks wallet identifiers in %s event logging',
    type => {
      expect(
        getLogBlockLabel({
          type,
          payload: {
            passphraseState: 'wallet-identifier',
            expectedPassphraseState: 'expected-wallet-identifier',
          },
        })
      ).toBe(type);
    }
  );

  it('blocks openWalletSession wallet identifiers in direct and iframe call logging', () => {
    const payload = {
      method: 'openWalletSession',
      mode: 'resume-hidden',
      deviceId: 'device-id',
      passphraseState: 'wallet-identifier',
    };

    expect(getLogBlockLabel(payload)).toBe('openWalletSession');
    expect(
      getLogBlockLabel({
        event: 'iframe-call',
        type: 'iframe-call',
        payload,
      })
    ).toBe('openWalletSession');
  });

  it('keeps openWalletSession metadata while redacting wallet session identifiers', () => {
    const safeResponse = getSafeLogPayload(
      {
        success: true,
        payload: {
          protocol: 'V2',
          walletType: 'hidden',
          deviceId: 'device-id',
          passphraseState: 'wallet-identifier',
          sessionId: 'wallet-session-id',
          resumed: false,
        },
      },
      'openWalletSession'
    );

    expect(safeResponse).toEqual({
      method: 'openWalletSession',
      success: true,
      payload: {
        protocol: 'V2',
        walletType: 'hidden',
        deviceId: 'device-id',
        passphraseState: '[REDACTED]',
        sessionId: '[REDACTED]',
        resumed: false,
      },
    });
  });

  it.each(['deviceUploadNft', 'deviceUploadWallpaper', 'uploadPortfolio'])(
    'skips large Base64 resource payload logging for %s',
    method => {
      const request = { method, path: 'resource.bin', data: 'A'.repeat(1024 * 1024) };
      expect(getLogBlockLabel(request)).toBe(method);
      expect(getSafeLogPayload(request, method)).toEqual({
        method,
        payload: '[REDACTED]',
      });
    }
  );

  it.each(['fileWrite', 'fileRead'])(
    'keeps metadata and replaces binary payloads with their size for %s',
    method => {
      const request = { method, path: 'resource.bin', data: new Uint8Array(1024) };
      expect(getLogBlockLabel(request)).toBe(method);
      expect(getSafeLogPayload(request, method)).toEqual({
        method,
        path: 'resource.bin',
        data: '[BINARY:1024]',
      });
    }
  );

  it.each(['evmSignMessage', 'btcSignMessage', 'evmSignTransaction'])(
    'identifies signing method %s for safe logging',
    method => {
      expect(getLogBlockLabel({ method, message: 'sensitive signing payload' })).toBe(method);
      expect(
        getLogBlockLabel({
          event: 'iframe-call',
          payload: { method, message: 'sensitive signing payload' },
        })
      ).toBe(method);
    }
  );

  it('reveals signing request fields in debug logs while redacting red-line secrets', () => {
    const request = {
      event: 'iframe-call',
      type: 'iframe-call',
      payload: {
        method: 'btcSignMessage',
        path: "m/44'/0'/0'/0/0",
        messageHex: '68656c6c6f',
        noScriptType: true,
        coin: 'Bitcoin',
        passphraseState: 'wallet-identifier-for-qa',
        useEmptyPassphrase: false,
        keepSession: true,
        initSession: false,
        passphrase: 'hidden-wallet-secret',
        private_key: 'private-key-secret',
        privateKeyHex: 'private-key-hex-secret',
        mnemonic: 'mnemonic-secret',
        nested: {
          apiKey: 'api-key-secret',
          session: 'session-secret',
          sessionId: 'session-id',
          walletSessionId: 'wallet-session-id',
        },
        accounts: [
          {
            seed: 'seed-secret',
            xprv: 'xprv-secret',
            entropy: 'entropy-secret',
            password: 'password-secret',
            token: 'token-secret',
            credential: 'credential-secret',
            pin: 'pin-secret',
            accessToken: 'access-token-secret',
            auth_token: 'auth-token-secret',
            bearerToken: 'bearer-token-secret',
            'refresh-token': 'refresh-token-secret',
            secret: 'generic-secret',
            words: 'recovery-words',
          },
        ],
      },
    };

    expect(getSafeLogPayload(request, 'btcSignMessage', { revealSigningPayload: true })).toEqual({
      event: 'iframe-call',
      type: 'iframe-call',
      payload: {
        method: 'btcSignMessage',
        path: "m/44'/0'/0'/0/0",
        messageHex: '68656c6c6f',
        noScriptType: true,
        coin: 'Bitcoin',
        passphraseState: 'wallet-identifier-for-qa',
        useEmptyPassphrase: false,
        keepSession: true,
        initSession: false,
        passphrase: '[REDACTED]',
        private_key: '[REDACTED]',
        privateKeyHex: '[REDACTED]',
        mnemonic: '[REDACTED]',
        nested: {
          apiKey: '[REDACTED]',
          session: '[REDACTED]',
          sessionId: 'session-id',
          walletSessionId: 'wallet-session-id',
        },
        accounts: [
          {
            seed: '[REDACTED]',
            xprv: '[REDACTED]',
            entropy: '[REDACTED]',
            password: '[REDACTED]',
            token: '[REDACTED]',
            credential: '[REDACTED]',
            pin: '[REDACTED]',
            accessToken: '[REDACTED]',
            auth_token: '[REDACTED]',
            bearerToken: '[REDACTED]',
            'refresh-token': '[REDACTED]',
            secret: '[REDACTED]',
            words: '[REDACTED]',
          },
        ],
      },
    });
  });

  it('keeps signing request payloads blocked when debug reveal is not requested', () => {
    expect(
      getSafeLogPayload({ method: 'btcSignMessage', messageHex: '68656c6c6f' }, 'btcSignMessage')
    ).toEqual({
      method: 'btcSignMessage',
      payload: '[REDACTED]',
    });
  });

  it('handles circular arrays in debug signing payloads', () => {
    const accounts: unknown[] = [{ secret: 'generic-secret' }];
    accounts.push(accounts);

    expect(
      getSafeLogPayload({ method: 'btcSignMessage', accounts }, 'btcSignMessage', {
        revealSigningPayload: true,
      })
    ).toEqual({
      method: 'btcSignMessage',
      accounts: [{ secret: '[REDACTED]' }, '[CIRCULAR]'],
    });
  });

  it('keeps safe signing request metadata visible without debug reveal', () => {
    expect(
      getSafeLogPayload(
        {
          event: 'iframe-call',
          payload: {
            method: 'evmSignTransaction',
            path: "m/44'/60'/0'/0/0",
            transaction: {
              chainId: 1,
              txType: 2,
              to: '0xrecipient',
              data: '0xcontract-call-data',
            },
          },
        },
        'evmSignTransaction'
      )
    ).toEqual({
      method: 'evmSignTransaction',
      chainId: 1,
      transactionType: 2,
    });

    expect(
      getSafeLogPayload(
        {
          method: 'btcSignTransaction',
          coin: 'Bitcoin',
          inputs: [{ prev_hash: 'input-1' }, { prev_hash: 'input-2' }],
          outputs: [{ address: 'recipient' }],
          refTxs: [{ hash: 'previous-transaction' }],
        },
        'btcSignTransaction'
      )
    ).toEqual({
      method: 'btcSignTransaction',
      coin: 'Bitcoin',
      inputCount: 2,
      outputCount: 1,
    });
  });

  it('keeps signing success responses minimal', () => {
    expect(
      getSafeLogPayload(
        {
          success: true,
          payload: {
            signature: 'signature-secret',
            address: 'address-for-wallet-correlation',
          },
        },
        'btcSignMessage',
        { revealSigningPayload: true }
      )
    ).toEqual({
      method: 'btcSignMessage',
      success: true,
    });
  });

  it('keeps the original SDK signing error while omitting error params', () => {
    expect(
      getSafeLogPayload(
        {
          success: false,
          payload: {
            code: 'DeviceBusy',
            error: 'Original SDK device error',
            params: {
              connectId: 'connect-id',
              deviceId: 'device-id',
              passphrase: 'hidden-wallet-secret',
            },
          },
        },
        'btcSignMessage',
        { revealSigningPayload: true }
      )
    ).toEqual({
      method: 'btcSignMessage',
      success: false,
      code: 'DeviceBusy',
      error: 'Original SDK device error',
    });
  });

  it('does not serialize non-string signing error values', () => {
    expect(
      getSafeLogPayload(
        {
          success: false,
          payload: {
            code: 500,
            error: { passphrase: 'hidden-wallet-secret' },
          },
        },
        'btcSignMessage'
      )
    ).toEqual({
      method: 'btcSignMessage',
      success: false,
      code: 500,
    });
  });

  it('never reveals sensitive UI or resource upload payloads through debug logging', () => {
    expect(
      getSafeLogPayload(
        { type: UI_RESPONSE.RECEIVE_PIN, payload: '1234' },
        UI_RESPONSE.RECEIVE_PIN,
        { revealSigningPayload: true }
      )
    ).toEqual({
      method: UI_RESPONSE.RECEIVE_PIN,
      payload: '[REDACTED]',
    });
    expect(
      getSafeLogPayload({ method: 'deviceUploadNft', data: 'large-base64' }, 'deviceUploadNft', {
        revealSigningPayload: true,
      })
    ).toEqual({
      method: 'deviceUploadNft',
      payload: '[REDACTED]',
    });
  });

  it('keeps ordinary API requests and responses visible', () => {
    const request = { method: 'getDeviceState', connectId: 'connect-id', scope: 'runtime' };
    const response = { success: true, payload: { protocol: 'V2', initialized: true } };

    expect(getLogBlockLabel(request)).toBeUndefined();
    expect(getSafeLogPayload(request)).toEqual(request);
    expect(getSafeLogPayload(response)).toEqual(response);
  });

  it('redacts sensitive keys even for ordinary API payloads', () => {
    expect(
      getSafeLogPayload({
        method: 'ordinaryMethod',
        payload: { session_id: 'session-secret', nested: { pin: '1234' } },
      })
    ).toEqual({
      method: 'ordinaryMethod',
      payload: { session_id: '[REDACTED]', nested: { pin: '[REDACTED]' } },
    });
  });

  it('puts sensitive API method names in the log label', () => {
    expect(formatLogMethodLabel('response:', 'openWalletSession')).toBe(
      'response: [openWalletSession]'
    );
    expect(formatLogMethodLabel('response:')).toBe('response:');
  });

  it('does not classify events without an API method as method calls', () => {
    expect(getLogBlockLabel({ event: 'DEVICE_EVENT', type: 'device-connect' })).toBeUndefined();
  });
});
