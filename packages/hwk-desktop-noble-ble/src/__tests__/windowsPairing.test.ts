import { EventEmitter } from 'events';

import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';

import { initThirdPartyBleSupport, withThirdPartyBleIpcErrors } from '../main';
import { THIRD_PARTY_BLE_CHANNELS } from '../constants';

import type { IpcMainLike } from '../main';
import type { NobleBleHandlerOptions } from '../NobleBleHandler';

const mockPair = jest.fn();
jest.mock('../windowsPairingHelper', () => ({
  pairWindowsBleDevice: (...args: unknown[]) => mockPair(...args),
}));

const profiles = {
  ledger: {
    vendor: 'ledger',
    serviceUuid: '13d63400-2c97-0004-0000-4c6564676572',
    writeUuid: '13d63400-2c97-0004-0002-4c6564676572',
    notifyUuid: '13d63400-2c97-0004-0001-4c6564676572',
    write: { mode: 'raw' as const, maxLength: 255 },
  },
  trezor: {
    vendor: 'trezor',
    serviceUuid: '8c000001-a59b-4d58-a9ad-073df69fa1b1',
    writeUuid: '8c000002-a59b-4d58-a9ad-073df69fa1b1',
    notifyUuid: '8c000003-a59b-4d58-a9ad-073df69fa1b1',
    write: { mode: 'padded' as const, chunkSize: 244 },
  },
};

const originalPlatform = process.platform;
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
async function advance(ms: number) {
  await flush();
  for (let elapsed = 0; elapsed < ms; elapsed += 300) {
    jest.advanceTimersByTime(Math.min(300, ms - elapsed));
    await flush();
  }
}

function setup(windowsPairing = true, wrapErrors = false) {
  const devices = (['ledger', 'trezor'] as const).map(vendor => {
    const profile = profiles[vendor];
    const characteristics = [profile.writeUuid, profile.notifyUuid].map(uuid =>
      Object.assign(new EventEmitter(), {
        uuid,
        writeAsync: jest.fn(async () => undefined),
        subscribeAsync: jest.fn(async () => undefined),
        unsubscribeAsync: jest.fn(async () => undefined),
      })
    );
    return Object.assign(new EventEmitter(), {
      id: vendor,
      address: `${vendor}-address`,
      advertisement: {
        localName: vendor === 'trezor' ? 'Trezor Safe 7' : 'Nano X',
        serviceUuids: [profile.serviceUuid],
      },
      rssi: -50,
      state: 'disconnected',
      connectAsync: jest.fn(async () => undefined),
      disconnectAsync: jest.fn(async () => undefined),
      discoverSomeServicesAndCharacteristicsAsync: jest.fn(async () => ({ characteristics })),
    });
  });
  const noble = Object.assign(new EventEmitter(), {
    state: 'poweredOn',
    startScanningAsync: jest.fn(async () =>
      devices.forEach(device => noble.emit('discover', device))
    ),
    stopScanningAsync: jest.fn(async () => undefined),
  });
  const handlers = new Map<string, Parameters<IpcMainLike['handle']>[1]>();
  const ipcMain: IpcMainLike = {
    handle: (channel, listener) => {
      handlers.set(channel, listener);
    },
    removeHandler: channel => {
      handlers.delete(channel);
    },
  };
  const options: NobleBleHandlerOptions = {
    nobleFactory: () => noble,
    ...(windowsPairing
      ? {
          windowsPairing: {
            helperPath: '/helper.exe',
            onPairingRequest: async () => 'cancel' as const,
          },
        }
      : {}),
  };
  const support = initThirdPartyBleSupport(
    { send: jest.fn() },
    {
      ...options,
      ipcMain: wrapErrors ? withThirdPartyBleIpcErrors(ipcMain) : ipcMain,
    }
  );
  const invoke = (channel: string, ...args: unknown[]) =>
    Promise.resolve(handlers.get(channel)?.({}, ...args));
  const connect = async (vendor: keyof typeof profiles) => {
    const pending = invoke(THIRD_PARTY_BLE_CHANNELS.connect, vendor, profiles[vendor]);
    await flush();
    await advance(300);
    return pending;
  };
  return { support, invoke, connect, noble, ledger: devices[0], trezor: devices[1] };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPair.mockReset();
  mockPair.mockResolvedValue('already-paired');
  Object.defineProperty(process, 'platform', { value: 'win32' });
  jest.useFakeTimers({ doNotFake: ['performance', 'setImmediate'] });
});
afterEach(() => {
  jest.useRealTimers();
  Object.defineProperty(process, 'platform', { value: originalPlatform });
});

it.each(['ledger', 'trezor'] as const)(
  'pairs %s through the public SDK initializer without an IPC wrapper',
  async vendor => {
    const { support, invoke, connect, noble } = setup();
    try {
      await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor });
      await expect(connect(vendor)).resolves.toMatchObject({ id: vendor });
      expect(mockPair).toHaveBeenCalledWith(
        expect.any(Object),
        {
          id: vendor,
          vendor,
          address: `${vendor}-address`,
        },
        expect.any(AbortSignal),
        undefined
      );
      expect(noble.stopScanningAsync).toHaveBeenCalled();
    } finally {
      await support.dispose();
    }
  }
);

it.each(['darwin', 'linux', 'unconfigured'])(
  'keeps %s native connections independent of Windows pairing',
  async platform => {
    if (platform !== 'unconfigured')
      Object.defineProperty(process, 'platform', { value: platform });
    const { support, invoke, connect } = setup(platform !== 'unconfigured');
    try {
      await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
      await expect(connect('trezor')).resolves.toMatchObject({ id: 'trezor' });
      expect(mockPair).not.toHaveBeenCalled();
    } finally {
      await support.dispose();
    }
  }
);

it('pauses a second vendor scan until Windows pairing and connection finish', async () => {
  const { support, invoke, noble } = setup();
  let finishPairing!: (outcome: string) => void;
  mockPair.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        expect(noble.stopScanningAsync).toHaveBeenCalledTimes(1);
        finishPairing = resolve;
      })
  );
  try {
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
    const connecting = invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger);
    await flush();
    expect(mockPair).toHaveBeenCalledTimes(1);
    await advance(13_000);
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    expect(noble.startScanningAsync).toHaveBeenCalledTimes(1);
    expect(await invoke(THIRD_PARTY_BLE_CHANNELS.getDevice, 'ledger')).toMatchObject({
      id: 'ledger',
    });

    finishPairing('already-paired');
    await advance(300);
    await expect(connecting).resolves.toMatchObject({ id: 'ledger' });
    await flush();
    expect(noble.startScanningAsync).toHaveBeenCalledTimes(2);
  } finally {
    await support.dispose();
  }
});

it('validates vendor and GATT framing before asking Windows to pair', async () => {
  const { support, invoke } = setup();
  try {
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    await expect(
      invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'trezor', {
        ...profiles.trezor,
        write: { mode: 'raw', maxLength: 255 },
      })
    ).rejects.toThrow();
    await expect(
      invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'trezor', {
        ...profiles.trezor,
        vendor: 'unknown',
      })
    ).rejects.toThrow();
    expect(mockPair).not.toHaveBeenCalled();
  } finally {
    await support.dispose();
  }
});

it('never pairs a device advertised by another vendor', async () => {
  const { support, invoke } = setup();
  try {
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    const result = invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'trezor', profiles.ledger).catch(
      error => error
    );
    await advance(300);
    expect(await result).toBeInstanceOf(Error);
    expect(mockPair).not.toHaveBeenCalled();
  } finally {
    await support.dispose();
  }
});

it('serializes ceremonies across handlers, cancels a queued target, and ignores late success', async () => {
  let finish!: (outcome: string) => void;
  mockPair.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  const first = setup();
  const second = setup();
  try {
    await first.invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    await second.invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
    const active = first
      .invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'trezor', profiles.trezor)
      .catch(error => error);
    const queued = second
      .invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger)
      .catch(error => error);
    await flush();
    expect(mockPair).toHaveBeenCalledTimes(1);
    await second.invoke(THIRD_PARTY_BLE_CHANNELS.cancelPairing, { vendor: 'ledger', id: 'ledger' });
    expect(await queued).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
    await first.invoke(THIRD_PARTY_BLE_CHANNELS.cancelPairing, { vendor: 'ledger' });
    expect(mockPair.mock.calls[0][2].aborted).toBe(false);
    await first.invoke(THIRD_PARTY_BLE_CHANNELS.cancelPairing, {
      vendor: 'trezor',
      id: 'different-id',
    });
    expect(mockPair.mock.calls[0][2].aborted).toBe(false);
    await first.invoke(THIRD_PARTY_BLE_CHANNELS.cancelPairing, { vendor: 'trezor', id: 'trezor' });
    expect(await active).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
    finish('already-paired');
    await flush();
    expect(mockPair).toHaveBeenCalledTimes(1);
    expect(first.trezor.connectAsync).not.toHaveBeenCalled();
    expect(second.ledger.connectAsync).not.toHaveBeenCalled();
  } finally {
    await first.support.dispose();
    await second.support.dispose();
  }
});

it('cancels an OS ceremony when its SDK handler is disposed', async () => {
  let finish!: (outcome: string) => void;
  mockPair.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  const { support, invoke, ledger } = setup();
  await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
  const pending = invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger).catch(
    error => error
  );
  await flush();
  await support.dispose();
  expect(mockPair.mock.calls[0][2].aborted).toBe(true);
  finish('already-paired');
  expect(await pending).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
  expect(ledger.connectAsync).not.toHaveBeenCalled();
  await flush();
});

it('retains a queued target beyond the discovery idle lifetime', async () => {
  let finish!: (outcome: string) => void;
  mockPair.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  const first = setup();
  const second = setup();
  try {
    await first.invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    await second.invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
    const active = first.invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'trezor', profiles.trezor);
    const queued = second.invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger);
    await advance(13_000);
    expect(mockPair).toHaveBeenCalledTimes(1);
    expect(second.support.handler.getDevice('ledger')).toMatchObject({ id: 'ledger' });
    finish('already-paired');
    await advance(300);
    await expect(active).resolves.toMatchObject({ id: 'trezor' });
    await expect(queued).resolves.toMatchObject({ id: 'ledger' });
    expect(second.ledger.connectAsync).toHaveBeenCalledTimes(1);
  } finally {
    await first.support.dispose();
    await second.support.dispose();
  }
});

it('retries GATT once after a fresh bond, without repeating pairing', async () => {
  mockPair.mockResolvedValue('paired');
  const { support, invoke, ledger } = setup();
  try {
    ledger.connectAsync.mockRejectedValueOnce(new Error('link still held'));
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
    const pending = invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger);
    await advance(3600);
    await expect(pending).resolves.toMatchObject({ id: 'ledger' });
    expect(ledger.connectAsync).toHaveBeenCalledTimes(2);
    expect(mockPair).toHaveBeenCalledTimes(1);
  } finally {
    await support.dispose();
  }
});

it.each(['ledger', 'trezor'] as const)(
  'classifies an early bonded %s drop without mislabeling Trezor as a lost bond',
  async vendor => {
    const { support, invoke, ledger, trezor } = setup();
    try {
      const target = vendor === 'ledger' ? ledger : trezor;
      target.connectAsync.mockRejectedValueOnce(
        createHwkError({
          code: HardwareErrorCode.BleConnectFailed,
          message: 'GATT unreachable',
          params: { phase: 'connect', gattUnreachable: true, msSinceLink: 80 },
        })
      );
      await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor });
      const pending = invoke(THIRD_PARTY_BLE_CHANNELS.connect, vendor, profiles[vendor]).catch(
        error => error
      );
      await advance(300);
      expect(await pending).toMatchObject({
        code:
          vendor === 'ledger'
            ? HardwareErrorCode.BleBondInvalid
            : HardwareErrorCode.BleConnectFailed,
      });
      expect(target.connectAsync).toHaveBeenCalledTimes(1);
    } finally {
      await support.dispose();
    }
  }
);

it('does not retry after a native connect timeout', async () => {
  mockPair.mockResolvedValue('paired');
  const { support, invoke, ledger } = setup();
  let finish!: () => void;
  ledger.connectAsync.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = () => resolve(undefined);
      })
  );
  try {
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
    const pending = invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger).catch(
      error => error
    );
    await advance(31_000);
    expect(await pending).toMatchObject({ params: { timedOut: true } });
    expect(ledger.connectAsync).toHaveBeenCalledTimes(1);
    finish();
    await flush();
  } finally {
    await support.dispose();
  }
});

it('cancels the fresh-bond retry delay immediately without starting another native connect', async () => {
  mockPair.mockResolvedValue('paired');
  const { support, invoke, ledger } = setup();
  try {
    ledger.connectAsync.mockRejectedValueOnce(new Error('link still held'));
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'ledger' });
    const pending = invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'ledger', profiles.ledger).catch(
      error => error
    );
    await advance(300);
    await invoke(THIRD_PARTY_BLE_CHANNELS.cancelPairing, { vendor: 'ledger', id: 'ledger' });
    expect(await pending).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
    await advance(3000);
    expect(ledger.connectAsync).toHaveBeenCalledTimes(1);
  } finally {
    await support.dispose();
  }
});

it('preserves OS pairing failures across the public IPC error envelope', async () => {
  mockPair.mockRejectedValue(
    createHwkError({
      code: HardwareErrorCode.BlePairingTimeout,
      message: 'Device declined pairing',
      params: { phase: 'pairing', pairingStatus: 19 },
    })
  );
  const { support, invoke } = setup(true, true);
  try {
    await invoke(THIRD_PARTY_BLE_CHANNELS.scan, { vendor: 'trezor' });
    await expect(
      invoke(THIRD_PARTY_BLE_CHANNELS.connect, 'trezor', profiles.trezor)
    ).resolves.toMatchObject({
      success: false,
      error: { code: HardwareErrorCode.BlePairingTimeout, params: { pairingStatus: 19 } },
    });
  } finally {
    await support.dispose();
  }
});
