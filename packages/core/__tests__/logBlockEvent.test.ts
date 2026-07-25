import { UI_RESPONSE, getLogBlockLabel } from '../src/events';

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

  it('blocks deviceSessionOpen secrets in direct and iframe call logging', () => {
    const payload = {
      method: 'deviceSessionOpen',
      host_passphrase: 'hidden-wallet-secret',
    };

    expect(getLogBlockLabel(payload)).toBe('deviceSessionOpen');
    expect(
      getLogBlockLabel({
        event: 'iframe-call',
        type: 'iframe-call',
        payload,
      })
    ).toBe('deviceSessionOpen');
  });

  it.each(['deviceUploadWallpaper', 'uploadPortfolio', 'fileWrite', 'fileRead'])(
    'blocks binary payload logging for %s',
    method => {
      expect(getLogBlockLabel({ method, data: new Uint8Array(1024) })).toBe(method);
      expect(getLogBlockLabel({ payload: { method, data: new Uint8Array(1024) } })).toBe(method);
    }
  );
});
