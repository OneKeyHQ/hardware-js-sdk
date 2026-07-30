import { UI_REQUEST, UI_RESPONSE, getLogBlockLabel } from '../src/events';

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

  it.each(['deviceUploadWallpaper', 'uploadPortfolio', 'fileWrite', 'fileRead'])(
    'blocks binary payload logging for %s',
    method => {
      expect(getLogBlockLabel({ method, data: new Uint8Array(1024) })).toBe(method);
      expect(getLogBlockLabel({ payload: { method, data: new Uint8Array(1024) } })).toBe(method);
    }
  );

  it.each(['evmSignMessage', 'btcSignMessage', 'evmSignTransaction'])(
    'blocks request and response payload logging for every API method including %s',
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

  it('does not classify events without an API method as method calls', () => {
    expect(getLogBlockLabel({ event: 'DEVICE_EVENT', type: 'device-connect' })).toBeUndefined();
  });
});
