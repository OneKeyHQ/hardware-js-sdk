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

  it.each(['deviceUploadWallpaper', 'uploadPortfolio', 'fileWrite', 'fileRead'])(
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
    'blocks request and response payload logging for signing method %s',
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
