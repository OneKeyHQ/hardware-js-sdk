import protocolTransport, { DeviceType } from '@onekeyfe/hd-transport';
import { EDeviceType } from '@onekeyfe/hd-shared';

import {
  getOwnedUsbDeviceIdentity,
  probeUsbDeviceIdentitiesWithTransport,
} from '../src/api/SearchDevices';
import DataManager from '../src/data-manager/DataManager';
import TransportManager from '../src/data-manager/TransportManager';

import type { UsbIdentityProbeTransport } from '../src/api/SearchDevices';
import type { OneKeyDeviceInfo, Transport } from '@onekeyfe/hd-transport';
import type { ConnectSettings } from '../src/types';
import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: () => '1.2.8-alpha.12',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.2.8-alpha.12/',
}));

const descriptor = { path: 'USB_DESCRIPTOR_PATH', commType: 'webusb' } as OneKeyDeviceInfo;
const createTransport = () => ({
  init: jest.fn(),
  configure: jest.fn(),
  configureProtocolV2: jest.fn(),
  enumerate: jest.fn().mockResolvedValue([descriptor]),
  acquire: jest.fn().mockResolvedValue('usb-transport-handle'),
  release: jest.fn().mockResolvedValue(undefined),
  getProtocolType: jest.fn().mockReturnValue('V1'),
  call: jest.fn().mockResolvedValue({
    type: 'Features',
    message: {
      onekey_serial_no: 'PHYSICAL_SERIAL',
      onekey_device_type: 'CLASSIC1S',
      device_id: 'WALLET_ID',
    },
  }),
});

describe('isolated USB identity probe', () => {
  test('identifies V1 by live identity while preserving the active BLE settings and transport', async () => {
    const previousSettings = DataManager.settings;
    const previousTransport = TransportManager.transport;
    const activeBLE = { name: 'active-ble', pendingOperation: true } as unknown as Transport;
    const settings = { env: 'desktop-web-ble' } as ConnectSettings;
    DataManager.settings = settings;
    TransportManager.transport = activeBLE;
    const transport = createTransport();
    try {
      await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'webusb')).resolves.toEqual([
        {
          path: 'USB_DESCRIPTOR_PATH',
          serialNo: 'PHYSICAL_SERIAL',
          deviceId: 'WALLET_ID',
          deviceType: EDeviceType.Classic1s,
          connectProtocol: 'V1',
          commType: 'webusb',
        },
      ]);
      expect(DataManager.settings).toBe(settings);
      expect(TransportManager.transport).toBe(activeBLE);
      expect(transport.call).toHaveBeenCalledWith(
        'usb-transport-handle',
        'GetFeatures',
        {},
        { timeoutMs: 3000 }
      );
      expect(transport.release).toHaveBeenCalledWith('usb-transport-handle', false);
    } finally {
      DataManager.settings = previousSettings;
      TransportManager.transport = previousTransport;
    }
  });

  test.each([
    EDeviceType.Classic,
    EDeviceType.Classic1s,
    EDeviceType.ClassicPure,
    EDeviceType.Mini,
    EDeviceType.Touch,
    EDeviceType.Pro,
  ])('reads the V1 identity for %s without initializing a wallet', async deviceType => {
    const transport = createTransport();
    transport.call.mockResolvedValue({
      type: 'Features',
      message: {
        onekey_serial_no: 'V1_PHYSICAL_SERIAL',
        onekey_device_type:
          deviceType === EDeviceType.ClassicPure ? 'PURE' : deviceType.toUpperCase(),
        device_id: 'V1_WALLET_ID',
      },
    });
    const result = await probeUsbDeviceIdentitiesWithTransport(transport, 'webusb');
    expect(result).toMatchObject([
      {
        serialNo: 'V1_PHYSICAL_SERIAL',
        deviceId: 'V1_WALLET_ID',
        deviceType,
        connectProtocol: 'V1',
      },
    ]);
    expect(transport.call.mock.calls.map(call => call[1])).toEqual(['GetFeatures']);
    expect(transport.release).toHaveBeenCalledTimes(1);
  });

  test('continues identifying other devices after one device disconnects', async () => {
    const transport = createTransport();
    transport.enumerate.mockResolvedValue([descriptor, { ...descriptor, path: 'SECOND_USB_PATH' }]);
    transport.call.mockRejectedValueOnce(new Error('Disconnected'));
    const result = await probeUsbDeviceIdentitiesWithTransport(transport, 'webusb');
    expect(result).toMatchObject([{ path: 'SECOND_USB_PATH', serialNo: 'PHYSICAL_SERIAL' }]);
    expect(transport.release).toHaveBeenCalledTimes(2);
  });

  test.each([DeviceType.PRO2, DeviceType.NEO])(
    'reads V2 hardware identity without opening a wallet (%s)',
    async deviceType => {
      const transport = createTransport();
      transport.getProtocolType.mockReturnValue('V2');
      transport.call.mockResolvedValue({
        type: 'DeviceInfo',
        message: { hw: { Device_type: deviceType, serial_no: 'V2_PHYSICAL_SERIAL' } },
      });
      const result = await probeUsbDeviceIdentitiesWithTransport(transport, 'webusb');
      expect(result[0]).toMatchObject({
        serialNo: 'V2_PHYSICAL_SERIAL',
        connectProtocol: 'V2',
        deviceId: null,
      });
      expect(transport.call.mock.calls.map(call => call[1])).toEqual(['DeviceInfoGet']);
      expect(transport.release).toHaveBeenCalledTimes(1);
    }
  );

  test('reads vendor identity when legacy Features do not report a physical serial', async () => {
    const transport = createTransport();
    transport.call
      .mockResolvedValueOnce({
        type: 'Features',
        message: { device_id: 'WALLET_ID', onekey_device_type: 'CLASSIC1S' },
      })
      .mockResolvedValueOnce({
        type: 'OnekeyFeatures',
        message: { onekey_serial_no: 'VENDOR_SERIAL' },
      });
    await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'webusb')).resolves.toMatchObject(
      [{ serialNo: 'VENDOR_SERIAL', deviceId: 'WALLET_ID' }]
    );
  });

  test.each([
    { onekey_device_type: 'CLASSIC', major_version: 2, minor_version: 8, patch_version: 0 },
    { onekey_device_type: 'TOUCH', major_version: 4, minor_version: 4, patch_version: 0 },
  ])(
    'preserves GetFeatures identity when the legacy V1 schema has no vendor query (%s)',
    async firmware => {
      const transport = createTransport();
      let messages = protocolTransport.parseConfigure(
        JSON.stringify(DataManager.getProtobufMessages())
      );
      transport.configure.mockImplementation((schema: string) => {
        messages = protocolTransport.parseConfigure(schema);
      });
      transport.call.mockImplementation((_session, name, data) => {
        protocolTransport.ProtocolV1.encodeMessageChunks(messages, name, data);
        return Promise.resolve({
          type: 'Features',
          message: { ...firmware, device_id: 'LEGACY_WALLET_ID' },
        });
      });
      await expect(
        probeUsbDeviceIdentitiesWithTransport(transport, 'webusb')
      ).resolves.toMatchObject([
        {
          path: descriptor.path,
          serialNo: null,
          deviceId: 'LEGACY_WALLET_ID',
          connectProtocol: 'V1',
        },
      ]);
      expect(transport.call.mock.calls.map(call => call[1])).toEqual(['GetFeatures']);
      expect(transport.release).toHaveBeenCalledWith('usb-transport-handle', false);
    }
  );

  test('does not substitute a USB path for a missing business identity', async () => {
    const transport = createTransport();
    transport.call
      .mockResolvedValueOnce({ type: 'Features', message: { onekey_device_type: 'MINI' } })
      .mockResolvedValueOnce({ type: 'Failure', message: {} });
    await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'webusb')).resolves.toMatchObject(
      [{ path: 'USB_DESCRIPTOR_PATH', serialNo: null, deviceId: null }]
    );
  });

  test.each([
    { ...descriptor, device: { opened: true } },
    { ...descriptor, commType: 'bridge', session: 'owned-bridge-transport' },
  ])('leaves an owned USB connection untouched', async occupied => {
    const transport = createTransport();
    transport.enumerate.mockResolvedValue([occupied]);
    await expect(
      probeUsbDeviceIdentitiesWithTransport(transport, occupied.commType as 'webusb' | 'bridge')
    ).resolves.toEqual([]);
    expect(transport.acquire).not.toHaveBeenCalled();
    expect(transport.release).not.toHaveBeenCalled();
  });

  test('retries its own failed Bridge release before probing again', async () => {
    const transport = createTransport();
    let held: string | undefined;
    transport.enumerate.mockImplementation(() =>
      Promise.resolve([{ ...descriptor, commType: 'bridge', session: held }])
    );
    transport.acquire.mockImplementation(() => {
      held = 'probe-transport-handle';
      return Promise.resolve(held);
    });
    transport.release
      .mockRejectedValueOnce(new Error('release request lost'))
      .mockRejectedValueOnce(new Error('Bridge still unavailable'))
      .mockImplementation(() => {
        held = undefined;
        return Promise.resolve(undefined);
      });

    await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'bridge')).resolves.toEqual([]);
    await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'bridge')).resolves.toEqual([]);
    expect(transport.acquire).toHaveBeenCalledTimes(1);
    expect(transport.call).toHaveBeenCalledTimes(1);
    await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'bridge')).resolves.toHaveLength(
      1
    );
    expect(transport.acquire).toHaveBeenCalledTimes(2);
    expect(transport.release).toHaveBeenCalledTimes(4);
  });

  test.each([undefined, 'foreign-transport-handle'])(
    'does not retry a stale Bridge release when ownership changes to %s',
    async replacement => {
      const transport = createTransport();
      transport.enumerate.mockResolvedValue([{ ...descriptor, commType: 'bridge' }]);
      transport.release.mockRejectedValueOnce(new Error('release response lost'));
      await probeUsbDeviceIdentitiesWithTransport(transport, 'bridge');
      transport.enumerate.mockResolvedValue([
        { ...descriptor, commType: 'bridge', session: replacement },
      ]);
      transport.release.mockClear();
      const result = await probeUsbDeviceIdentitiesWithTransport(transport, 'bridge');
      expect(result).toHaveLength(replacement ? 0 : 1);
      expect(transport.release).toHaveBeenCalledTimes(replacement ? 0 : 1);
      if (replacement) {
        transport.enumerate.mockResolvedValue([{ ...descriptor, commType: 'bridge' }]);
        await expect(
          probeUsbDeviceIdentitiesWithTransport(transport, 'bridge')
        ).resolves.toHaveLength(1);
      }
    }
  );

  test('never cleans up a Bridge handle recorded by another transport instance', async () => {
    const transport = createTransport();
    transport.enumerate.mockResolvedValue([{ ...descriptor, commType: 'bridge' }]);
    transport.release.mockRejectedValueOnce(new Error('release request lost'));
    await probeUsbDeviceIdentitiesWithTransport(transport, 'bridge');
    const other = createTransport();
    other.enumerate.mockResolvedValue([
      { ...descriptor, commType: 'bridge', session: 'usb-transport-handle' },
    ]);
    await expect(probeUsbDeviceIdentitiesWithTransport(other, 'bridge')).resolves.toEqual([]);
    expect(other.release).not.toHaveBeenCalled();
    expect(other.acquire).not.toHaveBeenCalled();
  });

  test('reuses identity only for the exact active WebUSB handle', () => {
    const handle = {};
    const endpoint = { ...descriptor, device: handle };
    const device = {
      features: {},
      mainId: descriptor.path,
      originalDescriptor: endpoint,
      getCurrentSerialNo: () => 'OWNER_SERIAL',
      getCurrentDeviceId: () => 'OWNER_WALLET',
      getCurrentDeviceType: () => EDeviceType.Pro,
      getProtocol: () => 'V1',
    } as unknown as Device;
    const queue = {
      getRequestTasksIdByConnectId: () => [1],
      getTask: () => ({ method: { device } }),
    };
    expect(getOwnedUsbDeviceIdentity(endpoint, queue)).toMatchObject({ serialNo: 'OWNER_SERIAL' });
    expect(
      getOwnedUsbDeviceIdentity({ ...endpoint, device: {} } as typeof endpoint, queue)
    ).toBeUndefined();
    expect(getOwnedUsbDeviceIdentity({ ...endpoint, commType: 'ble' }, queue)).toBeUndefined();
  });

  test('returns the active request owner identity without acquiring its USB handle', async () => {
    const transport = createTransport();
    transport.enumerate.mockResolvedValue([{ ...descriptor, device: { opened: true } }]);
    const owner = {
      path: descriptor.path,
      serialNo: 'OWNER_SERIAL',
      deviceId: 'OWNER_WALLET',
      deviceType: EDeviceType.Pro,
      connectProtocol: 'V1' as const,
      commType: 'webusb' as const,
    };
    await expect(
      probeUsbDeviceIdentitiesWithTransport(transport, 'webusb', () => owner)
    ).resolves.toEqual([owner]);
    expect(transport.acquire).not.toHaveBeenCalled();
  });

  test('rejects ambiguous paths rather than probing a different USB handle', async () => {
    const transport = createTransport();
    transport.enumerate.mockResolvedValue([descriptor, { ...descriptor }]);
    await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'webusb')).resolves.toEqual([]);
    expect(transport.acquire).not.toHaveBeenCalled();
  });

  test.each(['read failure', 'unexpected response', 'release failure'] as const)(
    'cleans up without approving the target after %s',
    async failure => {
      const transport = createTransport();
      if (failure === 'read failure')
        transport.call.mockRejectedValue(new Error('USB disconnected'));
      if (failure === 'unexpected response')
        transport.call.mockResolvedValue({ type: 'Failure', message: {} });
      if (failure === 'release failure')
        transport.release.mockRejectedValue(new Error('release failed'));
      await expect(probeUsbDeviceIdentitiesWithTransport(transport, 'webusb')).resolves.toEqual([]);
      expect(transport.release).toHaveBeenCalledTimes(1);
    }
  );

  test('does not approve an endpoint without a wire-confirmed protocol', async () => {
    const transport = createTransport();
    transport.getProtocolType.mockReturnValue(undefined);
    await expect(
      probeUsbDeviceIdentitiesWithTransport(transport as UsbIdentityProbeTransport, 'webusb')
    ).resolves.toEqual([]);
    expect(transport.call).not.toHaveBeenCalled();
    expect(transport.release).toHaveBeenCalledTimes(1);
  });
});
