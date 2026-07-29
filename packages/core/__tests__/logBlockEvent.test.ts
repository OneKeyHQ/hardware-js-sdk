import {
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

  it('keeps openWalletSession and passphraseState searchable while redacting wallet secrets', () => {
    const passphraseState = 'wallet-identifier';
    const sessionId = 'wallet-session-id';
    const response = {
      success: true,
      payload: {
        protocol: 'V2',
        walletType: 'hidden',
        deviceId: 'device-id',
        passphraseState,
        sessionId,
        resumed: false,
      },
    };

    const safeResponse = getSafeLogPayload(response, 'openWalletSession');
    const serialized = JSON.stringify(safeResponse);

    expect(safeResponse).toEqual({
      method: 'openWalletSession',
      success: true,
      payload: {
        protocol: 'V2',
        walletType: 'hidden',
        deviceId: 'device-id',
        passphraseState,
        sessionId: '[REDACTED]',
        resumed: false,
      },
    });
    expect(serialized).toContain(passphraseState);
    expect(serialized).not.toContain(sessionId);
  });

  it.each(['deviceUploadWallpaper', 'uploadPortfolio', 'fileWrite', 'fileRead'])(
    'blocks binary payload logging for %s',
    method => {
      expect(getLogBlockLabel({ method, data: new Uint8Array(1024) })).toBe(method);
      expect(getLogBlockLabel({ payload: { method, data: new Uint8Array(1024) } })).toBe(method);
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

  it('puts the API method in the log label so console text search can find it', () => {
    expect(formatLogMethodLabel('response:', 'openWalletSession')).toBe(
      'response: [openWalletSession]'
    );
    expect(formatLogMethodLabel('response:')).toBe('response:');
  });

  it('does not classify events without an API method as method calls', () => {
    expect(getLogBlockLabel({ event: 'DEVICE_EVENT', type: 'device-connect' })).toBeUndefined();
  });
});
