import {
  UI_REQUEST,
  UI_RESPONSE,
  formatLogMethodLabel,
  getLogBlockLabel,
  getSafeLogPayload,
  getSafeLogTask,
} from '../src/events';
import { getLog, initLog, setLoggerPostMessage } from '../src/utils/logger';
import MoneroGetAddress from '../src/api/monero/MoneroGetAddress';
import ZcashGetAddress from '../src/api/zcash/ZcashGetAddress';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

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

  it.each(['zcashGetAddress', 'zcashSignPczt'])(
    'keeps %s wallet data out of logger caches and events with debug disabled',
    method => {
      const postMessage = jest.fn();
      const prefix = `sensitive-zcash-${method}`;
      const logger = initLog(prefix, false);
      setLoggerPostMessage(postMessage);
      const request = {
        event: 'iframe-call',
        payload: { method, pczt: 'synthetic-pczt-marker', includeUfvk: true },
      };
      const response = {
        success: true,
        payload: [
          {
            ufvk: 'synthetic-viewing-key-marker',
            seedFingerprint: 'synthetic-fingerprint-marker',
            pczt: 'synthetic-signed-pczt-marker',
          },
        ],
      };
      const blockLabel = getLogBlockLabel(request);

      expect(blockLabel).toBe(method);
      expect(getLogBlockLabel(request.payload)).toBe(method);
      logger.debug('request:', getSafeLogPayload(request, blockLabel));
      logger.debug('response:', getSafeLogPayload(response, blockLabel));

      const cached = getLog().filter(entry => entry.prefix === prefix);
      expect(cached.map(entry => entry.message[1])).toEqual([
        { method, payload: '[REDACTED]' },
        { method, payload: '[REDACTED]' },
      ]);
      expect(postMessage).toHaveBeenCalledTimes(2);
      for (const output of [JSON.stringify(cached), JSON.stringify(postMessage.mock.calls)]) {
        expect(output).not.toContain('synthetic-');
        expect(output).toContain('[REDACTED]');
      }
      expect(response.payload[0].ufvk).toBe('synthetic-viewing-key-marker');
    }
  );

  it.each(['moneroGetAddress', 'moneroGetWatchKey'])(
    'keeps %s addresses and view keys out of logger caches',
    method => {
      const prefix = `sensitive-monero-${method}`;
      const logger = initLog(prefix, false);
      setLoggerPostMessage(jest.fn());
      const request = { event: 'iframe-call', payload: { method, path: "m/44'/128'/0'" } };
      const response = {
        success: true,
        payload: { address: 'synthetic-address-marker', watchKey: 'synthetic-view-key-marker' },
      };
      const blockLabel = getLogBlockLabel(request);

      expect(blockLabel).toBe(method);
      logger.debug('response:', getSafeLogPayload(response, blockLabel));

      const cached = getLog().filter(entry => entry.prefix === prefix);
      expect(cached.map(entry => entry.message[1])).toEqual([{ method, payload: '[REDACTED]' }]);
      expect(JSON.stringify(cached)).not.toContain('synthetic-');
    }
  );

  it('keeps moneroKeyImageSync transfers and key images out of logger caches', () => {
    const method = 'moneroKeyImageSync';
    const prefix = 'sensitive-monero-key-image-sync';
    const logger = initLog(prefix, false);
    setLoggerPostMessage(jest.fn());
    const request = {
      event: 'iframe-call',
      payload: {
        method,
        path: "m/44'/128'/0'",
        transfers: [{ outKey: 'synthetic-out-key-marker', txPubKey: 'synthetic-tx-key-marker' }],
      },
    };
    const response = {
      success: true,
      payload: {
        encKey: 'synthetic-enc-key-marker',
        keyImages: [{ iv: 'synthetic-iv-marker', blob: 'synthetic-key-image-marker' }],
      },
    };
    const blockLabel = getLogBlockLabel(request);

    expect(blockLabel).toBe(method);
    logger.debug('request:', getSafeLogPayload(request, blockLabel));
    logger.debug('response:', getSafeLogPayload(response, blockLabel));

    const cached = getLog().filter(entry => entry.prefix === prefix);
    expect(cached.map(entry => entry.message[1])).toEqual([
      { method, payload: '[REDACTED]' },
      { method, payload: '[REDACTED]' },
    ]);
    expect(JSON.stringify(cached)).not.toContain('synthetic-');
  });

  // The request reveals the real ring member, masks and amounts; the result
  // carries the key that opens the signatures.
  it('keeps moneroSignTransaction inputs and the opening key out of logger caches', () => {
    const method = 'moneroSignTransaction';
    const prefix = 'sensitive-monero-sign-transaction';
    const logger = initLog(prefix, false);
    setLoggerPostMessage(jest.fn());
    const payload = {
      method,
      path: "m/44'/128'/0'",
      tsxData: { fee: 'synthetic-fee-marker', outputs: [{ amount: 'synthetic-amount-marker' }] },
      inputs: [{ real_output: 'synthetic-real-index-marker', mask: 'synthetic-mask-marker' }],
    };
    const response = {
      success: true,
      payload: {
        signatures: ['synthetic-sealed-signature-marker'],
        openingKey: 'synthetic-opening-key-marker',
      },
    };
    const blockLabel = getLogBlockLabel({ event: 'iframe-call', payload });

    expect(blockLabel).toBe(method);
    logger.debug('request:', getSafeLogPayload(payload, blockLabel));
    logger.debug('response:', getSafeLogPayload(response, blockLabel));
    logger.debug('Cancel Api connect task: ', getSafeLogTask({ id: 9, method: { payload } }));

    const cached = getLog().filter(entry => entry.prefix === prefix);
    expect(cached.map(entry => entry.message[1])).toEqual([
      { method, payload: '[REDACTED]' },
      { method, payload: '[REDACTED]' },
      { id: 9, method, payload: '[REDACTED]' },
    ]);
    expect(JSON.stringify(cached)).not.toContain('synthetic-');
  });

  // Cancel logs the queued task, which holds the method's raw payload.
  it('redacts a queued Zcash task the same way, keeping its id', () => {
    const postMessage = jest.fn();
    const prefix = 'sensitive-zcash-cancel';
    const logger = initLog(prefix, false);
    setLoggerPostMessage(postMessage);
    const task = {
      id: 7,
      method: {
        name: 'zcashSignPczt',
        payload: { method: 'zcashSignPczt', pczt: 'synthetic-pczt-marker' },
        pczt: 'synthetic-pczt-marker',
      },
    };

    logger.debug('Cancel Api connect task: ', getSafeLogTask(task));

    const cached = getLog().filter(entry => entry.prefix === prefix);
    expect(cached.map(entry => entry.message[1])).toEqual([
      { id: 7, method: 'zcashSignPczt', payload: '[REDACTED]' },
    ]);
    expect(JSON.stringify([cached, postMessage.mock.calls])).not.toContain('synthetic-');
  });

  it('keeps Zcash and Monero results of an all-network call out of logs, others intact', () => {
    const response = {
      success: true,
      payload: [
        {
          network: 'evm',
          path: "m/44'/60'/0'/0/0",
          success: true,
          payload: { address: '0xabc', rootFingerprint: 1 },
        },
        {
          network: 'zcash',
          path: "m/32'/133'/0'",
          success: true,
          payload: {
            address: 'u1-marker',
            ufvk: 'synthetic-viewing-key-marker',
            rootFingerprint: 1,
          },
        },
        {
          network: 'xmr',
          path: "m/44'/128'/0'",
          success: true,
          payload: { address: 'synthetic-xmr-address-marker', rootFingerprint: 1 },
        },
        {
          network: 'zcash',
          path: "m/32'/133'/1'",
          success: false,
          payload: { error: 'Device not support', code: 416 },
        },
      ],
    };

    const safe = getSafeLogPayload(response) as typeof response;

    expect(safe.payload[0]).toBe(response.payload[0]);
    expect(safe.payload[1]).toEqual({ ...response.payload[1], payload: '[REDACTED]' });
    expect(safe.payload[2]).toEqual({ ...response.payload[2], payload: '[REDACTED]' });
    expect(safe.payload[3]).toBe(response.payload[3]);
    expect(JSON.stringify(safe)).not.toContain('marker');
    expect(response.payload[1].payload).toHaveProperty('ufvk');
  });

  it('redacts a privacy network result delivered one by one as a callback', () => {
    const message = {
      event: 'IFRAME_CALLBACK',
      payload: {
        callbackId: 'item',
        data: {
          network: 'zcash',
          success: true,
          payload: { ufvk: 'synthetic-viewing-key-marker' },
          index: 0,
        },
      },
    };

    expect(JSON.stringify(getSafeLogPayload(message))).not.toContain('marker');
  });

  it.each([
    {
      method: 'moneroGetAddress',
      create: () =>
        new MoneroGetAddress({
          id: 1,
          payload: { method: 'moneroGetAddress', path: "m/44'/128'/0'" },
        }),
      reply: { address: Buffer.from('synthetic-xmr-address-marker').toString('hex') },
    },
    {
      method: 'zcashGetAddress',
      create: () =>
        new ZcashGetAddress({
          id: 1,
          payload: { method: 'zcashGetAddress', path: "m/32'/133'/0'" },
        }),
      reply: { address: 'synthetic-zcash-address-marker' },
    },
  ])('keeps the $method previous-address event out of logs', async ({ method, create, reply }) => {
    const instance = create();
    instance.init();
    const commands = { typedCall: jest.fn().mockResolvedValue({ message: reply }) };
    instance.device = {
      commands,
      getCommands: () => commands,
      toMessageObject: () => ({}),
    } as unknown as Device;
    const postMessage = jest.fn();
    instance.postMessage = postMessage;
    await instance.run();

    const [[event]] = postMessage.mock.calls;
    expect(event).toMatchObject({
      type: UI_REQUEST.PREVIOUS_ADDRESS_RESULT,
      payload: { method, data: { address: expect.stringContaining('synthetic-') } },
    });
    const blockLabel = getLogBlockLabel(event);
    expect(blockLabel).toBe(method);
    expect(JSON.stringify(getSafeLogPayload(event, blockLabel))).not.toContain('synthetic-');
  });

  it('keeps previous-address events of other methods visible', () => {
    const event = {
      event: 'UI_EVENT',
      type: UI_REQUEST.PREVIOUS_ADDRESS_RESULT,
      payload: { device: {}, method: 'btcGetAddress', data: { address: 'bc1qexample' } },
    };
    expect(getLogBlockLabel(event)).toBeUndefined();
    expect(getSafeLogPayload(event)).toBe(event);
  });

  it('logs other queued tasks as before', () => {
    const task = {
      id: 8,
      method: { name: 'btcSignMessage', payload: { method: 'btcSignMessage' } },
    };
    expect(getSafeLogTask(task)).toBe(task);
    expect(getSafeLogTask(undefined)).toBeUndefined();
  });
});
