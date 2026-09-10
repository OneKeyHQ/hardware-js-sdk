import {
  DeviceModelId,
  defaultApduReceiverServiceStubBuilder,
  defaultApduSenderServiceStubBuilder,
} from '@ledgerhq/device-management-kit';
import { Nothing } from 'purify-ts';
import { firstValueFrom } from 'rxjs';

import { LedgerElectronBleTransport } from '../LedgerElectronBleTransport';

import type {
  LoggerPublisherService,
  TransportArgs,
  TransportDeviceModel,
} from '@ledgerhq/device-management-kit';
import type { ElectronBleApi } from '@onekeyfe/hwk-adapter-core';

const model: TransportDeviceModel = {
  id: DeviceModelId.NANO_X,
  productName: 'Nano X',
  usbProductId: 0x40,
  bootloaderUsbProductId: 4,
  usbOnly: false,
  memorySize: 0,
  getBlockSize: () => 0,
  masks: [],
};
const profile = {
  deviceModel: model,
  serviceUuid: '13d63400-2c97-0004-0000-4c6564676572',
  writeUuid: '13d63400-2c97-0004-0002-4c6564676572',
  writeCmdUuid: '13d63400-2c97-0004-0003-4c6564676572',
  notifyUuid: '13d63400-2c97-0004-0001-4c6564676572',
};

function fixture() {
  const notifications = new Set<(id: string, hex: string) => void>();
  const disconnects = new Set<(id: string) => void>();
  const notify = (hex: string) => notifications.forEach(handler => handler('ledger-test', hex));
  const info = { id: 'ledger-test', advertisedServiceUuids: [profile.serviceUuid] };
  const bridge = {
    checkAvailability: jest.fn(async () => ({
      available: true,
      state: 'poweredOn',
      initialized: true,
    })),
    scan: jest.fn(async () => [info]),
    stopScan: jest.fn(async () => undefined),
    getDevice: jest.fn(async () => info),
    connect: jest.fn(async () => ({ id: info.id })),
    disconnect: jest.fn(async (): Promise<void> => undefined),
    subscribe: jest.fn(async () => undefined),
    unsubscribe: jest.fn(async () => undefined),
    write: jest.fn(async (_id: string, hex: string) => {
      if (hex === '0800000000') notify('080000000014');
    }),
    onNotification: jest.fn((handler: (id: string, hex: string) => void) => {
      notifications.add(handler);
      return () => {
        notifications.delete(handler);
      };
    }),
    onDeviceDisconnected: jest.fn((handler: (id: string) => void) => {
      disconnects.add(handler);
      return () => {
        disconnects.delete(handler);
      };
    }),
  } satisfies ElectronBleApi;
  const logger: LoggerPublisherService = {
    subscribers: [],
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  const senderFactory = jest.fn(
    (options: Parameters<TransportArgs['apduSenderServiceFactory']>[0]) =>
      defaultApduSenderServiceStubBuilder(
        { ...options, channel: Nothing, padding: false },
        () => logger
      )
  );
  const args: Pick<
    TransportArgs,
    'deviceModelDataSource' | 'apduSenderServiceFactory' | 'apduReceiverServiceFactory'
  > = {
    deviceModelDataSource: {
      getAllDeviceModels: () => [model],
      getDeviceModel: () => model,
      filterDeviceModels: () => [model],
      getBluetoothServices: () => [profile.serviceUuid],
      getBluetoothServicesInfos: () => ({ [profile.serviceUuid]: profile }),
    },
    apduSenderServiceFactory: senderFactory,
    apduReceiverServiceFactory: () =>
      defaultApduReceiverServiceStubBuilder({ channel: Nothing }, () => logger),
  };
  const transport = new LedgerElectronBleTransport(bridge, args);
  return { bridge, transport, senderFactory, notifications, disconnects, notify };
}

describe('Ledger Electron BLE lifecycle', () => {
  it('starts discovery on subscription and coalesces concurrent scans', async () => {
    const { transport, bridge } = fixture();
    const stream = transport.listenToAvailableDevices();
    expect(bridge.scan).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([firstValueFrom(stream), firstValueFrom(stream)]);
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ id: 'ledger-test', transport: 'ELECTRON_BLE' });
    expect(bridge.scan).toHaveBeenCalledTimes(1);
    expect(bridge.scan).toHaveBeenCalledWith({
      vendor: 'ledger',
      serviceUuids: [profile.serviceUuid],
    });
  });

  it('uses the cached advertisement profile and negotiates a safe frame size', async () => {
    const { transport, bridge, senderFactory, notifications } = fixture();
    const result = await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() });
    expect(result.isRight()).toBe(true);
    expect(bridge.scan).not.toHaveBeenCalled();
    expect(bridge.connect).toHaveBeenCalledWith('ledger-test', {
      vendor: 'ledger',
      serviceUuid: profile.serviceUuid,
      writeUuid: profile.writeUuid,
      notifyUuid: profile.notifyUuid,
    });
    expect(senderFactory).toHaveBeenCalledWith({ frameSize: 20 });
    await transport.disconnect({ connectedDevice: result.unsafeCoerce() });
    expect(notifications.size).toBe(0);
  });

  it('rejects a second acquire while the first connection is still opening', async () => {
    const { transport, bridge } = fixture();
    const first = transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() });
    const second = transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() });
    const results = await Promise.all([first, second]);
    expect(results.map(result => result.isRight())).toEqual([true, false]);
    expect(bridge.connect).toHaveBeenCalledTimes(1);
    await transport.disconnect({ connectedDevice: results[0].unsafeCoerce() });
  });

  it('closes an invalid MTU negotiation and allows a fresh acquire', async () => {
    const { transport, bridge, notify, notifications, disconnects } = fixture();
    bridge.write.mockImplementationOnce(async () => {
      notify('080000000005');
    });
    expect(
      (await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })).isLeft()
    ).toBe(true);
    expect(bridge.disconnect).toHaveBeenCalledTimes(1);
    expect(notifications.size).toBe(0);
    expect(disconnects.size).toBe(0);
    const next = await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() });
    expect(next.isRight()).toBe(true);
    await transport.disconnect({ connectedDevice: next.unsafeCoerce() });
  });

  it('uses DMK framing for a multi-frame exchange without replay', async () => {
    const { transport, bridge, notify } = fixture();
    const connected = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })
    ).unsafeCoerce();
    bridge.write.mockClear();
    bridge.write.mockImplementation(async () => {
      if (bridge.write.mock.calls.length === 3) notify('05000000029000');
    });
    const response = await connected.sendApdu(new Uint8Array(40), false);
    expect(response.isRight()).toBe(true);
    expect(Array.from(response.unsafeCoerce().statusCode)).toEqual([0x90, 0]);
    expect(bridge.write).toHaveBeenCalledTimes(3);
    expect(bridge.write.mock.calls.every(([, hex]) => hex.length <= 40)).toBe(true);
    await transport.disconnect({ connectedDevice: connected });
  });

  it('rejects a concurrent exchange while preserving the first response', async () => {
    const { transport, notify } = fixture();
    const connected = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })
    ).unsafeCoerce();
    const pending = connected.sendApdu(Uint8Array.of(0), false);
    expect((await connected.sendApdu(Uint8Array.of(1), false)).isLeft()).toBe(true);
    notify('05000000029000');
    expect((await pending).isRight()).toBe(true);
    await transport.disconnect({ connectedDevice: connected });
  });

  it('reports one disconnect and rejects the pending exchange', async () => {
    const { transport, disconnects, notifications } = fixture();
    const onDisconnect = jest.fn();
    const connected = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect })
    ).unsafeCoerce();
    const pending = connected.sendApdu(Uint8Array.of(0), false);
    disconnects.forEach(handler => handler('ledger-test'));
    expect((await pending).isLeft()).toBe(true);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(notifications.size).toBe(0);
  });

  it('does not let a late release close a replacement connection', async () => {
    const { transport, bridge, disconnects } = fixture();
    const first = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })
    ).unsafeCoerce();
    disconnects.forEach(handler => handler('ledger-test'));
    const replacement = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })
    ).unsafeCoerce();
    await transport.disconnect({ connectedDevice: first });
    expect(bridge.disconnect).not.toHaveBeenCalled();
    await transport.disconnect({ connectedDevice: replacement });
    expect(bridge.disconnect).toHaveBeenCalledTimes(1);
  });

  it('retains connection ownership until native teardown completes', async () => {
    const { transport, bridge } = fixture();
    const connected = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })
    ).unsafeCoerce();
    let finishTeardown: (() => void) | undefined;
    bridge.disconnect.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishTeardown = resolve;
        })
    );
    const teardown = transport.disconnect({ connectedDevice: connected });
    expect(
      (await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })).isLeft()
    ).toBe(true);
    if (!finishTeardown) throw new Error('Expected native teardown to start');
    finishTeardown();
    await teardown;
    const replacement = await transport.connect({
      deviceId: 'ledger-test',
      onDisconnect: jest.fn(),
    });
    expect(replacement.isRight()).toBe(true);
    await transport.disconnect({ connectedDevice: replacement.unsafeCoerce() });
  });

  it('makes a timed-out exchange link-fatal without replaying it', async () => {
    const { transport, bridge } = fixture();
    const connected = (
      await transport.connect({ deviceId: 'ledger-test', onDisconnect: jest.fn() })
    ).unsafeCoerce();
    bridge.write.mockClear();
    expect((await connected.sendApdu(Uint8Array.of(0), false, 10)).isLeft()).toBe(true);
    expect((await connected.sendApdu(Uint8Array.of(1), false)).isLeft()).toBe(true);
    expect(bridge.write).toHaveBeenCalledTimes(1);
    expect(bridge.disconnect).toHaveBeenCalledTimes(1);
  });
});
