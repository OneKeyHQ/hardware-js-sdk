import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { LedgerConnectorBase } from '../connector/LedgerConnectorBase';
import { ERROR_TAG } from '../errors';

import type { ConnectionType, DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';

class SearchConnector extends LedgerConnectorBase {
  constructor(private readonly descriptors: DeviceDescriptor[], connectionType: ConnectionType) {
    super(async () => ({}), { connectionType, dmk: {} as any });
  }

  protected override async _discoverDescriptors(): Promise<DeviceDescriptor[]> {
    return this.descriptors;
  }
}

describe('LedgerConnectorBase error wrapping', () => {
  it('preserves serialized hardware errors without remapping them', () => {
    const connector = new LedgerConnectorBase(async () => ({}));
    const source = Object.assign(new Error('Failed to open "Tron"'), {
      _tag: ERROR_TAG.OpenAppCommand,
      code: HardwareErrorCode.AppNotInstalled,
      appName: 'Tron',
      errorCode: '',
    });

    const wrapped = (connector as any)._wrapError(source, {
      defaultAppName: 'Tron',
    });

    expect(wrapped).toMatchObject({
      code: HardwareErrorCode.AppNotInstalled,
      appName: 'Tron',
      _tag: ERROR_TAG.OpenAppCommand,
      errorCode: '',
    });
    expect(wrapped.message).toBe('Failed to open "Tron"');
  });

  it('does not treat raw numeric APDU codes as serialized hardware errors', () => {
    const connector = new LedgerConnectorBase(async () => ({}));
    const source = Object.assign(new Error('Invalid data'), {
      _tag: ERROR_TAG.EthAppCommand,
      code: 0x6a80,
      errorCode: '6a80',
    });

    const wrapped = (connector as any)._wrapError(source, {
      defaultAppName: 'Ethereum',
    });

    expect(wrapped).toMatchObject({
      code: HardwareErrorCode.UnknownError,
      appName: 'Ethereum',
      _tag: ERROR_TAG.EthAppCommand,
      errorCode: '6a80',
    });
  });
});

describe('LedgerConnectorBase BLE discovery', () => {
  it('allows transport ids as BLE connectId even when they are not four-character names', async () => {
    const connector = new SearchConnector(
      [
        {
          path: 'D5:75:7D:4B:51:E8',
          name: 'Nano X 123',
          bleName: 'A58F',
          transport: 'RN_BLE',
          type: 'nanoX',
        },
      ],
      'ble'
    );

    await expect(connector.searchDevices()).resolves.toEqual([
      expect.objectContaining({
        connectId: 'D5:75:7D:4B:51:E8',
        deviceId: 'D5:75:7D:4B:51:E8',
        name: 'Nano X 123',
        model: 'nanoX',
      }),
    ]);
  });
});

describe('LedgerConnectorBase USB discovery', () => {
  const usbDescriptors: DeviceDescriptor[] = [
    {
      path: 'usb-path-a',
      name: 'Ledger Stax',
      transport: 'WEB-HID',
      type: 'stax',
    },
    {
      path: 'usb-path-b',
      name: 'Ledger Nano Gen5',
      transport: 'WEB-HID',
      type: 'apex',
    },
  ];

  it('returns all USB devices (single-device restriction is enforced on auto-connect, not discovery)', async () => {
    const connector = new SearchConnector(usbDescriptors, 'usb');

    const devices = await connector.searchDevices();

    expect(devices.map(d => d.connectId)).toEqual(['usb-path-a', 'usb-path-b']);
  });
});
describe('LedgerConnectorBase BLE direct-connect gate', () => {
  const TARGET_PATH = 'D5:75:7D:4B:51:E8';

  function makeFakeDm(opts: {
    liveDevices?: { id: string }[];
    connectImpl?: () => Promise<string>;
  }) {
    return {
      hasDiscoveredDevice: jest.fn().mockReturnValue(false),
      getLiveDevices: jest.fn().mockResolvedValue(opts.liveDevices ?? []),
      connect: jest.fn().mockImplementation(opts.connectImpl ?? (() => Promise.resolve('s-1'))),
      getDeviceName: jest.fn(),
      getDiscoveredDeviceInfo: jest.fn().mockReturnValue(undefined),
      disposeKeepingDmk: jest.fn(),
    };
  }

  function setupConnector(requirePreFlightScan: boolean) {
    // _watchSessionState now propagates subscribe failures (so missing
    // subscriptions can't silently leave ghost entries in the adapter's
    // _sessions map). Provide a no-op observable so happy-path connect()
    // tests don't trip on the new strict behavior.
    const fakeDmk = {
      getDeviceSessionState: jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
      }),
    };
    const connector = new LedgerConnectorBase(async () => ({}), {
      connectionType: 'ble',
      dmk: fakeDmk as any,
      requirePreFlightScan,
    });
    return connector;
  }

  it('iOS (requirePreFlightScan=true): empty scan throws DeviceNotAdvertising before dm.connect', async () => {
    const connector = setupConnector(true);
    const dm = makeFakeDm({ liveDevices: [] });
    (connector as any)._deviceManager = dm;

    await expect(connector.connect(TARGET_PATH)).rejects.toMatchObject({
      _tag: ERROR_TAG.DeviceNotAdvertising,
      code: HardwareErrorCode.DeviceNotFound,
    });
    expect(dm.connect).not.toHaveBeenCalled();
  });

  it('iOS: scan finds the device → proceeds to dm.connect', async () => {
    const connector = setupConnector(true);
    const dm = makeFakeDm({
      liveDevices: [{ id: TARGET_PATH }],
      connectImpl: () => Promise.resolve('session-ok'),
    });
    (connector as any)._deviceManager = dm;

    await expect(connector.connect(TARGET_PATH)).resolves.toMatchObject({
      sessionId: 'session-ok',
    });
    expect(dm.connect).toHaveBeenCalledWith(TARGET_PATH);
  });

  it('Android (requirePreFlightScan=false): dm.connect "not in cache" gets wrapped as DeviceNotAdvertising', async () => {
    const connector = setupConnector(false);
    const dmNotFoundErr = Object.assign(new Error('Device not found in discovery cache.'), {
      _tag: ERROR_TAG.DeviceNotInDiscoveryCache,
    });
    const dm = makeFakeDm({
      liveDevices: [],
      connectImpl: () => Promise.reject(dmNotFoundErr),
    });
    (connector as any)._deviceManager = dm;

    await expect(connector.connect(TARGET_PATH)).rejects.toMatchObject({
      _tag: ERROR_TAG.DeviceNotAdvertising,
      code: HardwareErrorCode.DeviceNotFound,
    });
    expect(dm.connect).toHaveBeenCalledWith(TARGET_PATH);
  });

  it('Android: other DMK errors propagate untouched (not wrapped as NotAdvertising)', async () => {
    const connector = setupConnector(false);
    const otherErr = Object.assign(new Error('GATT bonding failed'), {
      _tag: ERROR_TAG.BleGattBondingFailed,
    });
    const dm = makeFakeDm({
      liveDevices: [{ id: TARGET_PATH }],
      connectImpl: () => Promise.reject(otherErr),
    });
    (connector as any)._deviceManager = dm;

    await expect(connector.connect(TARGET_PATH)).rejects.toMatchObject({
      _tag: ERROR_TAG.BleGattBondingFailed,
    });
  });
});
