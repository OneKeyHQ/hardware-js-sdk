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

const VALID_RELAY_URL =
  'wss://attestation.onekeytest.com/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678';

describe('LedgerConnectorBase runtime genuine-check relay', () => {
  it('rejects relay URLs that do not use secure WebSockets', async () => {
    const connector = new LedgerConnectorBase(async () => ({}));

    await expect(
      connector.configure({
        ledgerGenuineCheckWebSocketUrl: 'https://attestation.onekeytest.com/v1/ledger/session/x',
      })
    ).rejects.toThrow('not allowed');
  });

  it('rejects a host that is not on any OneKey root domain', async () => {
    const connector = new LedgerConnectorBase(async () => ({}));

    for (const url of [
      'wss://attacker.example/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678',
      // Lookalike hosts must not slip through a naive suffix/substring check.
      'wss://notonekeytest.com/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678',
      'wss://onekeytest.com.attacker.example/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678',
    ]) {
      await expect(connector.configure({ ledgerGenuineCheckWebSocketUrl: url })).rejects.toThrow(
        'not allowed'
      );
    }
  });

  it('accepts any subdomain of an allowed root domain, not just a pinned name', async () => {
    const connector = new LedgerConnectorBase(async () => ({}));

    for (const url of [
      'wss://onekeytest.com/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678',
      'wss://relay.onekeytest.com/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678',
      'wss://ws.onekey.com/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678',
    ]) {
      await expect(
        connector.configure({ ledgerGenuineCheckWebSocketUrl: url })
      ).resolves.toBeUndefined();
    }
  });

  it('rejects a relay URL carrying userinfo, query, fragment, or a non-default port', async () => {
    const connector = new LedgerConnectorBase(async () => ({}));
    const base = 'attestation.onekeytest.com/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678';

    for (const url of [
      `wss://user:pass@${base}`,
      `wss://${base}?x=1`,
      `wss://${base}#frag`,
      `wss://attestation.onekeytest.com:8443/v1/ledger/session/AbCdEfGh12345678AbCdEfGh12345678`,
    ]) {
      await expect(connector.configure({ ledgerGenuineCheckWebSocketUrl: url })).rejects.toThrow(
        'not allowed'
      );
    }
  });

  it('rejects a relay URL whose path is not the session-token route', async () => {
    const connector = new LedgerConnectorBase(async () => ({}));

    await expect(
      connector.configure({
        ledgerGenuineCheckWebSocketUrl: 'wss://attestation.onekeytest.com/session/opaque',
      })
    ).rejects.toThrow('not allowed');
  });

  it('passes the short-lived relay base to the DMK builder', async () => {
    const relayUrl = VALID_RELAY_URL;
    const dmk = {};
    const builder = {
      addTransport: jest.fn(),
      addConfig: jest.fn(),
      build: jest.fn(),
    };
    builder.addTransport.mockReturnValue(builder);
    builder.addConfig.mockReturnValue(builder);
    builder.build.mockReturnValue(dmk);
    const DeviceManagementKitBuilder = jest.fn(() => builder);
    const connector = new LedgerConnectorBase(async () => () => ({}));
    (connector as any)._importLedgerKit = jest.fn().mockResolvedValue({
      DeviceManagementKitBuilder,
    });

    await connector.configure({
      ledgerGenuineCheckWebSocketUrl: relayUrl,
    });
    await (connector as any)._getOrCreateDmk();

    expect(builder.addConfig).toHaveBeenCalledWith({
      webSocketUrl: relayUrl,
    });
    expect(builder.build).toHaveBeenCalledTimes(1);
  });

  it('clears a configured relay URL on lifecycle reset', async () => {
    const builder = {
      addTransport: jest.fn(),
      addConfig: jest.fn(),
      build: jest.fn().mockReturnValue({}),
    };
    builder.addTransport.mockReturnValue(builder);
    builder.addConfig.mockReturnValue(builder);
    const connector = new LedgerConnectorBase(async () => () => ({}));
    (connector as any)._importLedgerKit = jest.fn().mockResolvedValue({
      DeviceManagementKitBuilder: jest.fn(() => builder),
    });

    await connector.configure({
      ledgerGenuineCheckWebSocketUrl: VALID_RELAY_URL,
    });
    connector.reset();
    await (connector as any)._getOrCreateDmk();

    expect(builder.addConfig).not.toHaveBeenCalled();
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

  it('filters out OneKey and Trezor descriptors from Ledger discovery', async () => {
    const connector = new SearchConnector(
      [
        {
          path: 'ledger-1',
          name: 'Ledger Nano X',
          transport: 'RN_BLE',
          type: 'nanoX',
        },
        {
          path: 'onekey-1',
          name: 'OneKey Pro 1234',
          transport: 'RN_BLE',
          serviceUUIDs: ['00000001-0000-1000-8000-00805f9b34fb'],
        },
        {
          path: 'trezor-1',
          name: 'Trezor Safe 7',
          transport: 'RN_BLE',
          serviceUUIDs: ['8c000001-a59b-4d58-a9ad-073df69fa1b1'],
        },
      ],
      'ble'
    );

    const devices = await connector.searchDevices();

    expect(devices.map(d => d.connectId)).toEqual(['ledger-1']);
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
