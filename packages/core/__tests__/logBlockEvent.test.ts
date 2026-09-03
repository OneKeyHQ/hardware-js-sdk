import {
  UI_REQUEST,
  UI_RESPONSE,
  formatLogMethodLabel,
  getLogBlockLabel,
  getSafeLogPayload,
} from '../src/events';

describe('getLogBlockLabel', () => {
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
      expect(
        getSafeLogPayload(
          {
            type,
            payload: {
              passphraseState: 'wallet-identifier',
            },
          },
          type
        )
      ).toEqual({
        method: type,
        payload: '[REDACTED]',
      });
    }
  );

  it.each(['deviceUploadNft', 'deviceUploadWallpaper', 'uploadPortfolio', 'fileWrite', 'fileRead'])(
    'skips large resource or binary payload logging for %s',
    method => {
      const request = { method, path: 'resource.bin', data: 'A'.repeat(1024) };
      expect(getLogBlockLabel(request)).toBe(method);
      expect(getSafeLogPayload(request, method)).toEqual({
        method,
        payload: '[REDACTED]',
      });
    }
  );

  it('logs signing requests and responses as-is', () => {
    const request = {
      method: 'btcSignMessage',
      path: "m/44'/0'/0'/0/0",
      messageHex: '68656c6c6f',
      coin: 'Bitcoin',
    };
    const iframeRequest = {
      event: 'iframe-call',
      payload: request,
    };
    const response = {
      success: true,
      payload: {
        signature: 'signature-bytes',
        address: 'bc1qexample',
      },
    };

    expect(getLogBlockLabel(request)).toBeUndefined();
    expect(getLogBlockLabel(iframeRequest)).toBeUndefined();
    expect(getSafeLogPayload(request)).toBe(request);
    expect(getSafeLogPayload(response)).toBe(response);
  });

  it('keeps ordinary API requests and responses visible', () => {
    const request = { method: 'getDeviceState', connectId: 'connect-id', scope: 'runtime' };
    const response = { success: true, payload: { protocol: 'V2', initialized: true } };

    expect(getLogBlockLabel(request)).toBeUndefined();
    expect(getSafeLogPayload(request)).toBe(request);
    expect(getSafeLogPayload(response)).toBe(response);
  });

  it('puts blocked method names in the log label', () => {
    expect(formatLogMethodLabel('response:', 'deviceUploadNft')).toBe(
      'response: [deviceUploadNft]'
    );
    expect(formatLogMethodLabel('response:')).toBe('response:');
  });

  it('does not classify events without an API method as method calls', () => {
    expect(getLogBlockLabel({ event: 'DEVICE_EVENT', type: 'device-connect' })).toBeUndefined();
  });
});
