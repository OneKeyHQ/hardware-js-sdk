import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';
import { TREZOR_BLE_UUIDS } from '@onekeyfe/hwk-trezor-adapter';

import { TrezorRnBleConnector } from '../TrezorRnBleConnector';
import { createTrezorRnBleConnector } from '../index';

import type { TrezorBleTransport } from '@onekeyfe/hwk-trezor-adapter';
import type { TrezorConnectorBaseOptions } from '@onekeyfe/hwk-trezor-connector';

describe('TrezorRnBleConnector', () => {
  it('constructs with ble connection type', () => {
    const connector = new TrezorRnBleConnector();
    expect(connector.connectionType).toBe('ble');
  });

  it('factory creates a default RN BLE connector', () => {
    expect(createTrezorRnBleConnector().connectionType).toBe('ble');
  });

  it('discovers only Safe 7 BLE devices', async () => {
    const transport: TrezorBleTransport = {
      scan: jest.fn().mockResolvedValue([
        { id: 'safe-7', name: 'Trezor Safe 7', serviceUUIDs: [TREZOR_BLE_UUIDS.service] },
        { id: 'safe-5', name: 'Trezor Safe 5' },
      ]),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    const connector = new TrezorRnBleConnector({ transportFactory: async () => transport });

    await expect(connector.searchDevices()).resolves.toEqual([
      expect.objectContaining({
        connectId: 'safe-7',
        deviceId: '',
        name: 'Trezor Safe 7',
        model: 'T3W1',
        capabilities: { persistentDeviceIdentity: false },
      }),
    ]);
  });

  it('logs filtered descriptors only when RN BLE scan drops devices', async () => {
    const transport: TrezorBleTransport = {
      scan: jest.fn().mockResolvedValue([
        { id: 'safe-7', name: 'Trezor Safe 7', serviceUUIDs: [TREZOR_BLE_UUIDS.service] },
        { id: 'safe-5', name: 'Trezor Safe 5' },
      ]),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const connector = new TrezorRnBleConnector({
      transportFactory: async () => transport,
      transportOptions: {
        logger: entry => logs.push({ event: entry.event, data: entry.data }),
      },
    });

    await connector.searchDevices();

    expect(logs).toContainEqual({
      event: 'ble.connector.enumerate.filtered',
      data: expect.objectContaining({
        transport: 'rn-ble',
        descriptorCount: 2,
        filteredCount: 1,
        dropped: [
          expect.objectContaining({
            id: 'safe-5',
            matchesTrezorService: false,
          }),
        ],
        kept: [
          expect.objectContaining({
            id: 'safe-7',
            matchesTrezorService: true,
          }),
        ],
      }),
    });
  });

  it('does not log RN BLE scan details when no devices are filtered', async () => {
    const transport: TrezorBleTransport = {
      scan: jest.fn().mockResolvedValue([]),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    const logs: Array<{ event: string; data?: Record<string, unknown> }> = [];
    const connector = new TrezorRnBleConnector({
      transportFactory: async () => transport,
      transportOptions: {
        logger: entry => logs.push({ event: entry.event, data: entry.data }),
      },
    });

    await expect(connector.searchDevices()).resolves.toEqual([]);

    expect(logs.some(log => log.event === 'ble.connector.enumerate.filtered')).toBe(false);
  });

  it('uses BLE-sized 244-byte chunks for protocol calls after connect', async () => {
    const writes: Uint8Array[] = [];
    const transport: TrezorBleTransport = {
      scan: jest
        .fn()
        .mockResolvedValue([
          { id: 'safe-7', name: 'Trezor Safe 7', serviceUUIDs: [TREZOR_BLE_UUIDS.service] },
        ]),
      connect: jest.fn().mockResolvedValue({ id: 'safe-7', name: 'Trezor Safe 7' }),
      disconnect: jest.fn(),
      write: jest.fn(async (_connectId, data) => {
        writes.push(data);
      }),
      read: jest.fn(),
    };
    let factoryChunkSize = 0;
    const deviceSessionFactory: TrezorConnectorBaseOptions['deviceSessionFactory'] = ({
      transport: byteTransport,
      chunkSize,
    }) => {
      factoryChunkSize = chunkSize;
      return {
        features: undefined,
        getThpState: () => undefined,
        initialize: async () => {
          await byteTransport.write(Buffer.alloc(chunkSize));
          return {
            vendor: 'trezor.io',
            major_version: 3,
            minor_version: 0,
            patch_version: 0,
            device_id: 'safe-7',
            model: 'T3W1',
          };
        },
        call: jest.fn(),
      } as never;
    };
    const connector = new TrezorRnBleConnector({
      transportFactory: async () => transport,
      deviceSessionFactory,
    });

    await connector.connect('safe-7');

    expect(factoryChunkSize).toBe(244);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toHaveLength(244);
  });

  it('connects directly by BLE connectId when scanning does not advertise the paired device', async () => {
    const transport: TrezorBleTransport = {
      scan: jest.fn().mockResolvedValue([]),
      connect: jest.fn().mockResolvedValue({ id: '62:79:4D:55:37:8F', name: 'Trezor Safe 7' }),
      disconnect: jest.fn(),
    };
    const connector = new TrezorRnBleConnector({
      transportFactory: async () => transport,
      deviceSessionFactory: () =>
        ({
          features: undefined,
          getThpState: () => undefined,
          initialize: async () => ({
            vendor: 'trezor.io',
            major_version: 3,
            minor_version: 0,
            patch_version: 0,
            device_id: 'device-from-features',
            label: 'Trezor Safe 7',
            model: 'T3W1',
          }),
          call: jest.fn(),
        } as never),
    });

    const session = await connector.connect('62:79:4D:55:37:8F');

    expect(transport.scan).not.toHaveBeenCalled();
    expect(transport.connect).toHaveBeenCalledWith('62:79:4D:55:37:8F');
    expect(session.deviceInfo).toEqual(
      expect.objectContaining({
        connectId: '62:79:4D:55:37:8F',
        deviceId: 'device-from-features',
        label: 'Trezor Safe 7',
        model: 'T3W1',
      })
    );
  });

  it('reports DeviceNotFound when a direct BLE connectId is stale', async () => {
    const transport: TrezorBleTransport = {
      scan: jest.fn().mockResolvedValue([]),
      connect: jest.fn().mockRejectedValue(new Error('native BLE device not found')),
      disconnect: jest.fn(),
    };
    const connector = new TrezorRnBleConnector({
      transportFactory: async () => transport,
    });

    await expect(connector.connect('62:79:4D:55:37:8F')).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'Trezor BLE device not found: 62:79:4D:55:37:8F',
    });
  });

  it('passes THP options into the device session factory', async () => {
    const transport: TrezorBleTransport = {
      scan: jest
        .fn()
        .mockResolvedValue([
          { id: 'safe-7', name: 'Trezor Safe 7', serviceUUIDs: [TREZOR_BLE_UUIDS.service] },
        ]),
      connect: jest.fn().mockResolvedValue({ id: 'safe-7', name: 'Trezor Safe 7' }),
      disconnect: jest.fn(),
    };
    let receivedThp: TrezorConnectorBaseOptions['thp'];
    const connector = new TrezorRnBleConnector({
      transportFactory: async () => transport,
      thp: { hostName: 'OneKey', appName: 'HWK Trezor Demo' },
      deviceSessionFactory: ({ thp }) => {
        receivedThp = thp;
        return {
          features: undefined,
          getThpState: () => undefined,
          initialize: async () => ({
            vendor: 'trezor.io',
            major_version: 3,
            minor_version: 0,
            patch_version: 0,
            device_id: 'safe-7',
            model: 'T3W1',
          }),
          call: jest.fn(),
        } as never;
      },
    });

    await connector.connect('safe-7');

    expect(receivedThp).toEqual(
      expect.objectContaining({
        hostName: 'OneKey',
        appName: 'HWK Trezor Demo',
      })
    );
  });
});
