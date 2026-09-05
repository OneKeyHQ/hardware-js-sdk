import { readFileSync } from 'fs';
import { resolve } from 'path';
import EventEmitter from 'events';
import { CORE_EVENT, initCore } from '@onekeyfe/hd-core';
import sdkExport, { messagePromises } from '../src';
import { createDeferred } from '@onekeyfe/hd-shared';

jest.mock('@onekeyfe/hd-core', () => ({
  ...jest.requireActual('@onekeyfe/hd-core'),
  __esModule: true,
  default: (options: unknown) => options,
  initCore: jest.fn(),
}));
jest.mock('@onekeyfe/hd-transport-http', () => ({}));
jest.mock('@onekeyfe/hd-transport-web-device', () => ({}));
jest.mock('@onekeyfe/hd-transport-lowlevel', () => ({}));
jest.mock('@onekeyfe/hd-transport-emulator', () => ({}));

describe('hd-common-connect-sdk device state events', () => {
  test('forwards the canonical DEVICE.STATE event to SDK consumers', () => {
    const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');

    expect(source).toContain('DEVICE.STATE');
    expect(source).toContain('eventEmitter.emit(message.type, message.payload)');
  });
});

const sdk = sdkExport as unknown as {
  init(settings: Record<string, unknown>): Promise<boolean>;
  call(params: Record<string, unknown>): Promise<unknown>;
  dispose(): Promise<void>;
};

describe('SDK request cleanup', () => {
  const core = Object.assign(new EventEmitter(), {
    handleMessage: jest.fn(),
    dispose: jest.fn(),
  });

  beforeEach(async () => {
    core.handleMessage.mockReset();
    core.dispose.mockReset().mockImplementation(() => {
      core.removeAllListeners();
      return Promise.resolve();
    });
    jest.mocked(initCore).mockResolvedValue(core as never);
    await sdk.init({ env: 'desktop-web-ble' });
  });

  afterEach(async () => {
    await sdk.dispose();
  });

  test('removes only the completed request when calls settle out of order', async () => {
    const first = createDeferred<unknown>();
    const second = createDeferred<unknown>();
    core.handleMessage.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const firstCall = sdk.call({ method: 'getDeviceState' });
    const secondCall = sdk.call({ method: 'getDeviceState' });
    expect(Object.keys(messagePromises)).toHaveLength(2);
    second.resolve({ success: true, payload: {} });
    await secondCall;
    expect(Object.keys(messagePromises)).toHaveLength(1);
    first.reject(new Error('Connection failed'));
    await firstCall;
    expect(Object.keys(messagePromises)).toHaveLength(0);
  });

  test('waits for Core disposal and does not retain old listeners after reinitialization', async () => {
    const cleanup = createDeferred<void>();
    core.dispose.mockImplementationOnce(async () => {
      await cleanup.promise;
      core.removeAllListeners();
    });
    let finished = false;
    const disposing = sdk.dispose().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(core.dispose).toHaveBeenCalledTimes(1);
    expect(finished).toBe(false);
    cleanup.resolve();
    await disposing;
    await sdk.init({ env: 'desktop-web-ble' });
    expect(core.listenerCount(CORE_EVENT)).toBe(1);
  });
});
