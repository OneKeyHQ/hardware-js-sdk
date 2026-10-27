import MoneroGetAddress from '../src/api/monero/MoneroGetAddress';
import MoneroGetWatchKey from '../src/api/monero/MoneroGetWatchKey';
import { toHardened } from '../src/api/helpers/pathUtils';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

// firmware-pro tests/device_tests/monero/test_getwatchkey.py, account 0.
const ADDRESS =
  '4Ahp23WfMrMFK3wYL2hLWQFGt87ZTeRkufS6JoQZu6MEFDokAQeGWmu9MA3GFq1yVLSJQbKJqVAn9F9DLYGpRzRAEXqAXKM';
const WATCH_KEY = '8722520a581e2a50cc1adab4a1692401effd37b0d63b9d9b60fd7f34ea2b950e';
const ascii = (value: string) => Buffer.from(value, 'utf-8').toString('hex');
const ACCOUNT_0 = [toHardened(44), toHardened(128), toHardened(0)];

const attachDevice = (method: MoneroGetAddress | MoneroGetWatchKey, typedCall: jest.Mock) => {
  const commands = { typedCall };
  method.device = {
    commands,
    getCommands: () => commands,
    toMessageObject: () => ({}),
  } as unknown as Device;
  method.postMessage = jest.fn();
};

const createAddressMethod = (payload: Record<string, unknown>) =>
  new MoneroGetAddress({ id: 1, payload: { method: 'moneroGetAddress', ...payload } });
const createWatchKeyMethod = (payload: Record<string, unknown>) =>
  new MoneroGetWatchKey({ id: 1, payload: { method: 'moneroGetWatchKey', ...payload } });

describe('MoneroGetAddress', () => {
  test('asks for the account address and decodes the ASCII reply', async () => {
    const method = createAddressMethod({ path: "m/44'/128'/0'" });
    method.init();
    const typedCall = jest
      .fn()
      .mockResolvedValue({ type: 'MoneroAddress', message: { address: ascii(ADDRESS) } });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({ path: "m/44'/128'/0'", address: ADDRESS });
    expect(typedCall).toHaveBeenCalledWith('MoneroGetAddress', 'MoneroAddress', {
      address_n: ACCOUNT_0,
      network_type: 0,
      show_display: true,
    });
  });

  test('returns one entry per bundle item', async () => {
    const method = createAddressMethod({
      bundle: [
        { path: "m/44'/128'/0'", showOnOneKey: false },
        { path: "m/44'/128'/1'", showOnOneKey: false },
      ],
    });
    method.init();
    const typedCall = jest
      .fn()
      .mockResolvedValue({ type: 'MoneroAddress', message: { address: ascii(ADDRESS) } });
    attachDevice(method, typedCall);

    const result = await method.run();
    expect(result).toHaveLength(2);
    expect(typedCall.mock.calls[1][2]).toMatchObject({ show_display: false });
  });

  test('leaves which paths are allowed to the device', () => {
    const method = createAddressMethod({ path: "m/44'/128'/0'/0/0" });
    method.init();
    expect(method.params[0].address_n).toEqual([...ACCOUNT_0, 0, 0]);
  });

  test('rejects an unknown network type', () => {
    expect(() => createAddressMethod({ path: "m/44'/128'/0'", networkType: 3 }).init()).toThrow();
  });

  test('fails when the device omits the address', async () => {
    const method = createAddressMethod({ path: "m/44'/128'/0'" });
    method.init();
    attachDevice(method, jest.fn().mockResolvedValue({ type: 'MoneroAddress', message: {} }));

    await expect(method.run()).rejects.toThrow();
  });
});

describe('MoneroGetWatchKey', () => {
  test('returns the view key and the decoded address', async () => {
    const method = createWatchKeyMethod({ path: "m/44'/128'/0'" });
    method.init();
    const typedCall = jest.fn().mockResolvedValue({
      type: 'MoneroWatchKey',
      message: { watch_key: WATCH_KEY, address: ascii(ADDRESS) },
    });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({
      path: "m/44'/128'/0'",
      watchKey: WATCH_KEY,
      address: ADDRESS,
    });
    expect(typedCall).toHaveBeenCalledWith('MoneroGetWatchKey', 'MoneroWatchKey', {
      address_n: ACCOUNT_0,
      network_type: 0,
    });
  });

  test('fails when the device omits the view key', async () => {
    const method = createWatchKeyMethod({ path: "m/44'/128'/0'" });
    method.init();
    attachDevice(
      method,
      jest.fn().mockResolvedValue({ type: 'MoneroWatchKey', message: { address: ascii(ADDRESS) } })
    );

    await expect(method.run()).rejects.toThrow();
  });
});
