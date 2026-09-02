import {
  ERRORS,
  HardwareErrorCode,
  ONEKEY_NOTIFY_CHARACTERISTIC_UUID,
  ONEKEY_SERVICE_UUID,
  ONEKEY_WRITE_CHARACTERISTIC_UUID,
  createKnownBleUuidAliases,
  hasOnekeyCommunicationService,
  isOnekeyBluetoothDevice,
  matchesKnownBleUuid,
} from '@onekeyfe/hd-shared';

import type { LowLevelDevice, LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';
import type { Characteristic, Peripheral, Service } from '@stoprocent/noble';

type NobleModule = {
  state: string;
  startScanning(
    serviceUUIDs: string[],
    allowDuplicates: boolean,
    callback?: (error?: Error) => void
  ): void;
  stopScanning(callback?: () => void): void;
  on(event: 'stateChange', listener: (state: string) => void): void;
  on(event: 'discover', listener: (peripheral: Peripheral) => void): void;
  removeListener(event: 'stateChange', listener: (state: string) => void): void;
  removeListener(event: 'discover', listener: (peripheral: Peripheral) => void): void;
};

type CharacteristicPair = {
  write: Characteristic;
  notify: Characteristic;
};

type NoblePendingReceiver = {
  resolve: (data: string) => void;
  reject: (error: Error) => void;
};

type NobleNotificationState = {
  generation: number;
  queue: string[];
  pendingReceivers: Set<NoblePendingReceiver>;
};

type NobleDisconnectListener = {
  peripheral: Peripheral;
  listener: (reason: string) => void;
};

const ONEKEY_SERVICE_UUIDS = [ONEKEY_SERVICE_UUID];
const ONEKEY_SERVICE_UUID_ALIASES = createKnownBleUuidAliases(ONEKEY_SERVICE_UUID);
const ONEKEY_WRITE_UUID_ALIASES = createKnownBleUuidAliases(ONEKEY_WRITE_CHARACTERISTIC_UUID);
const ONEKEY_NOTIFY_UUID_ALIASES = createKnownBleUuidAliases(ONEKEY_NOTIFY_CHARACTERISTIC_UUID);

const BLUETOOTH_INIT_TIMEOUT = 10_000;
const DEVICE_SCAN_TIMEOUT = 8_000;
const CONNECTION_TIMEOUT = 8_000;
const SERVICE_DISCOVERY_TIMEOUT = 10_000;
const BLE_CLEANUP_TIMEOUT = 100;
const BLE_PACKET_SIZE_FALLBACK = 192;
const BLE_PACKET_SIZE_MAX = 244;
const ATT_WRITE_HEADER_SIZE = 3;
const BLE_ENCRYPTION_ERROR_PATTERNS = [/encryption is insufficient/i, /insufficient encryption/i];

export function resolveNobleProtocolV2PacketCapacity(
  mtu: number | null | undefined,
  platform: NodeJS.Platform = process.platform
) {
  if (typeof mtu !== 'number' || !Number.isFinite(mtu) || mtu <= 0) {
    return BLE_PACKET_SIZE_FALLBACK;
  }
  const reportedCapacity = Math.floor(mtu);
  const payloadCapacity =
    platform === 'linux' ? reportedCapacity - ATT_WRITE_HEADER_SIZE : reportedCapacity;
  if (payloadCapacity <= 0) {
    return BLE_PACKET_SIZE_FALLBACK;
  }
  return Math.min(payloadCapacity, BLE_PACKET_SIZE_MAX);
}

let noble: NobleModule | null = null;
let nobleReadyPromise: Promise<void> | null = null;
const discoveredDevices = new Map<string, Peripheral>();
const connectedDevices = new Map<string, Peripheral>();
const deviceCharacteristics = new Map<string, CharacteristicPair>();
const notificationStates = new Map<string, NobleNotificationState>();
const notificationGenerations = new Map<string, number>();
const disconnectListeners = new Map<string, NobleDisconnectListener>();

function isOneKeyPeripheral(peripheral: Peripheral) {
  const serviceUuids = peripheral.advertisement?.serviceUuids;
  return (
    hasOnekeyCommunicationService(serviceUuids) &&
    isOnekeyBluetoothDevice({
      id: peripheral.id,
      localName: peripheral.advertisement?.localName,
      serviceUuids,
    })
  );
}

function enqueueNotification(deviceId: string, generation: number, data: Buffer) {
  const state = notificationStates.get(deviceId);
  if (!state || state.generation !== generation) return;

  const hex = data.toString('hex');
  const [receiver] = state.pendingReceivers;
  if (receiver) {
    state.pendingReceivers.delete(receiver);
    receiver.resolve(hex);
    return;
  }
  state.queue.push(hex);
}

function createNotificationState(deviceId: string) {
  const existing = notificationStates.get(deviceId);
  if (existing) {
    const error = new Error(`BLE notification state replaced for ${deviceId}`);
    existing.pendingReceivers.forEach(receiver => receiver.reject(error));
  }

  const generation = (notificationGenerations.get(deviceId) ?? 0) + 1;
  notificationGenerations.set(deviceId, generation);
  const state: NobleNotificationState = {
    generation,
    queue: [],
    pendingReceivers: new Set(),
  };
  notificationStates.set(deviceId, state);
  return state;
}

function clearNotificationState(deviceId: string, reason: string | Error) {
  const state = notificationStates.get(deviceId);
  if (!state) return;

  notificationStates.delete(deviceId);
  const error = reason instanceof Error ? reason : new Error(reason);
  state.pendingReceivers.forEach(receiver => receiver.reject(error));
  state.pendingReceivers.clear();
  state.queue.length = 0;
}

function removeDisconnectListener(deviceId: string) {
  const tracked = disconnectListeners.get(deviceId);
  if (!tracked) return;
  tracked.peripheral.removeListener('disconnect', tracked.listener);
  disconnectListeners.delete(deviceId);
}

function trackUnexpectedDisconnect(deviceId: string, peripheral: Peripheral) {
  removeDisconnectListener(deviceId);
  const listener = (reason: string) => {
    removeDisconnectListener(deviceId);
    if (connectedDevices.get(deviceId) !== peripheral) return;

    deviceCharacteristics.get(deviceId)?.notify.removeAllListeners('data');
    connectedDevices.delete(deviceId);
    deviceCharacteristics.delete(deviceId);
    clearNotificationState(
      deviceId,
      ERRORS.TypedError(
        HardwareErrorCode.BleDeviceDisconnected,
        reason || `BLE device disconnected: ${deviceId}`
      )
    );
  };
  disconnectListeners.set(deviceId, { peripheral, listener });
  peripheral.on('disconnect', listener);
}

function waitForNobleCleanup(registerCallback: (callback: () => void) => void) {
  return new Promise<void>(resolve => {
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(complete, BLE_CLEANUP_TIMEOUT);
    try {
      registerCallback(complete);
    } catch {
      complete();
    }
  });
}

async function initializeNoble() {
  if (!noble) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      noble = require('@stoprocent/noble') as NobleModule;
    } catch (error) {
      throw ERRORS.TypedError(
        HardwareErrorCode.BleUnsupported,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (noble.state === 'poweredOn') return;

  if (nobleReadyPromise) {
    await nobleReadyPromise;
    return;
  }

  nobleReadyPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      noble?.removeListener('stateChange', onStateChange);
      reject(ERRORS.TypedError(HardwareErrorCode.BlePoweredOff, 'Bluetooth is not powered on'));
    }, BLUETOOTH_INIT_TIMEOUT);

    const onStateChange = (state: string) => {
      if (state === 'poweredOn') {
        clearTimeout(timeout);
        noble?.removeListener('stateChange', onStateChange);
        resolve();
      } else if (state === 'unsupported') {
        clearTimeout(timeout);
        noble?.removeListener('stateChange', onStateChange);
        reject(ERRORS.TypedError(HardwareErrorCode.BleUnsupported));
      }
    };

    noble?.on('stateChange', onStateChange);
  }).finally(() => {
    nobleReadyPromise = null;
  });

  await nobleReadyPromise;
}

function stopScanning() {
  try {
    noble?.stopScanning();
  } catch {
    // ignore best-effort scan cleanup
  }
}

async function scanDevices(targetDeviceId?: string) {
  await initializeNoble();
  if (!noble) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Noble not initialized');
  }

  if (!targetDeviceId) {
    discoveredDevices.clear();
  }

  const nobleInstance = noble;
  return new Promise<Peripheral[]>((resolve, reject) => {
    const found = new Map<string, Peripheral>();

    const cleanup = () => {
      clearTimeout(timeout);
      nobleInstance.removeListener('discover', onDiscover);
      stopScanning();
    };

    const finish = () => {
      cleanup();
      resolve([...found.values()]);
    };

    const onDiscover = (peripheral: Peripheral) => {
      if (targetDeviceId && peripheral.id !== targetDeviceId) return;
      if (!isOneKeyPeripheral(peripheral)) return;

      discoveredDevices.set(peripheral.id, peripheral);
      found.set(peripheral.id, peripheral);
      if (targetDeviceId) {
        finish();
      }
    };

    const timeout = setTimeout(finish, DEVICE_SCAN_TIMEOUT);
    nobleInstance.on('discover', onDiscover);
    nobleInstance.startScanning([], false, (error?: Error) => {
      if (error) {
        cleanup();
        reject(ERRORS.TypedError(HardwareErrorCode.BleScanError, error.message));
      }
    });
  });
}

function connectPeripheral(peripheral: Peripheral) {
  if (peripheral.state === 'connected') return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'Connection timeout'));
    }, CONNECTION_TIMEOUT);

    peripheral.connect((error?: Error) => {
      clearTimeout(timeout);
      if (error) {
        reject(ERRORS.TypedError(HardwareErrorCode.BleConnectedError, error.message));
        return;
      }
      resolve();
    });
  });
}

async function discoverCharacteristics(peripheral: Peripheral): Promise<CharacteristicPair> {
  const services = await new Promise<Service[]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, 'Service discovery timeout'));
    }, SERVICE_DISCOVERY_TIMEOUT);

    peripheral.discoverServices([], (error, discoveredServices) => {
      clearTimeout(timeout);
      if (error) {
        reject(ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, error.message));
        return;
      }
      resolve(discoveredServices);
    });
  });

  const service = services.find(s => matchesKnownBleUuid(s.uuid, ONEKEY_SERVICE_UUID_ALIASES));
  if (!service) {
    throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound, 'No BLE service found');
  }
  const selectedService = service;

  const characteristics = await new Promise<Characteristic[]>((resolve, reject) => {
    selectedService.discoverCharacteristics([], (error, discoveredCharacteristics) => {
      if (error) {
        reject(ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound, error.message));
        return;
      }
      resolve(discoveredCharacteristics);
    });
  });

  let writeCharacteristic: Characteristic | undefined;
  let notifyCharacteristic: Characteristic | undefined;
  for (const characteristic of characteristics) {
    if (matchesKnownBleUuid(characteristic.uuid, ONEKEY_WRITE_UUID_ALIASES)) {
      writeCharacteristic = characteristic;
    } else if (matchesKnownBleUuid(characteristic.uuid, ONEKEY_NOTIFY_UUID_ALIASES)) {
      notifyCharacteristic = characteristic;
    }
  }

  if (!writeCharacteristic || !notifyCharacteristic) {
    throw ERRORS.TypedError(
      HardwareErrorCode.BleCharacteristicNotFound,
      'Required OneKey BLE characteristics not found'
    );
  }

  return {
    write: writeCharacteristic,
    notify: notifyCharacteristic,
  };
}

function subscribeNotifications(
  deviceId: string,
  generation: number,
  notifyCharacteristic: Characteristic
) {
  return waitForNobleCleanup(callback => notifyCharacteristic.unsubscribe(callback))
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          notifyCharacteristic.subscribe((error?: Error) => {
            if (error) {
              const errorMessage = error.message || String(error);
              if (BLE_ENCRYPTION_ERROR_PATTERNS.some(pattern => pattern.test(errorMessage))) {
                reject(
                  ERRORS.TypedError(
                    HardwareErrorCode.BleDeviceNotBonded,
                    `BLE device ${deviceId} is not paired or the encrypted link is not ready: ${errorMessage}`
                  )
                );
                return;
              }
              reject(
                ERRORS.TypedError(
                  HardwareErrorCode.BleCharacteristicNotifyChangeFailure,
                  `Failed to subscribe notifications for ${deviceId}: ${errorMessage}`
                )
              );
              return;
            }
            resolve();
          });
        })
    )
    .then(() => {
      notifyCharacteristic.removeAllListeners('data');
      notifyCharacteristic.on('data', data => enqueueNotification(deviceId, generation, data));
    })
    .catch(error => {
      notifyCharacteristic.removeAllListeners('data');
      if (error) {
        throw error;
      }
      throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotifyChangeFailure);
    });
}

function writeCharacteristic(
  characteristic: Characteristic,
  buffer: Buffer,
  withoutResponse: boolean
) {
  return new Promise<void>((resolve, reject) => {
    characteristic.write(buffer, withoutResponse, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function disconnectDevice(uuid: string) {
  const peripheral = connectedDevices.get(uuid);
  const characteristics = deviceCharacteristics.get(uuid);
  removeDisconnectListener(uuid);
  clearNotificationState(uuid, `BLE device disconnected: ${uuid}`);
  if (characteristics) {
    characteristics.notify.removeAllListeners('data');
    await waitForNobleCleanup(callback => characteristics.notify.unsubscribe(callback));
  }

  connectedDevices.delete(uuid);
  deviceCharacteristics.delete(uuid);

  if (!peripheral || peripheral.state === 'disconnected') return;

  await waitForNobleCleanup(callback => peripheral.disconnect(callback));
}

export function createNobleBlePlugin(): LowlevelTransportSharedPlugin {
  return {
    version: 'OneKey-CLI-Noble-1.0',

    async init() {
      await initializeNoble();
    },

    async enumerate(): Promise<LowLevelDevice[]> {
      const devices = await scanDevices();
      return devices.map(device => ({
        commType: 'ble',
        id: device.id,
        name: device.advertisement?.localName || 'Unknown BLE Device',
      }));
    },

    async connect(uuid: string) {
      let peripheral = discoveredDevices.get(uuid);
      if (!peripheral) {
        [peripheral] = await scanDevices(uuid);
      }
      if (!peripheral) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `BLE device not found: ${uuid}`);
      }

      await connectPeripheral(peripheral);
      let characteristics: CharacteristicPair | undefined;
      try {
        characteristics = await discoverCharacteristics(peripheral);
        const notificationState = createNotificationState(uuid);
        await subscribeNotifications(uuid, notificationState.generation, characteristics.notify);
        connectedDevices.set(uuid, peripheral);
        deviceCharacteristics.set(uuid, characteristics);
        trackUnexpectedDisconnect(uuid, peripheral);
      } catch (error) {
        removeDisconnectListener(uuid);
        clearNotificationState(uuid, `BLE notification subscription failed: ${uuid}`);
        if (characteristics) {
          characteristics.notify.removeAllListeners('data');
          await waitForNobleCleanup(callback => characteristics?.notify.unsubscribe(callback));
        }
        if (peripheral.state !== 'disconnected') {
          await waitForNobleCleanup(callback => peripheral?.disconnect(callback));
        }
        throw error;
      }
    },

    async disconnect(uuid: string) {
      await disconnectDevice(uuid);
    },

    getProtocolV2PacketCapacity(uuid: string) {
      return resolveNobleProtocolV2PacketCapacity(connectedDevices.get(uuid)?.mtu);
    },

    async send(uuid: string, data: string, options?: { withoutResponse?: boolean }) {
      const characteristics = deviceCharacteristics.get(uuid);
      if (!characteristics) {
        throw ERRORS.TypedError(
          HardwareErrorCode.BleCharacteristicNotFound,
          `BLE device is not connected: ${uuid}`
        );
      }

      const buffer = Buffer.from(data, 'hex');
      const withoutResponse = options?.withoutResponse ?? true;
      const packetCapacity = resolveNobleProtocolV2PacketCapacity(connectedDevices.get(uuid)?.mtu);
      for (let offset = 0; offset < buffer.length; offset += packetCapacity) {
        const chunk = buffer.subarray(offset, Math.min(offset + packetCapacity, buffer.length));
        await writeCharacteristic(characteristics.write, chunk, withoutResponse);
      }
    },

    async receive(uuid?: string) {
      const resolvedUuid =
        uuid ??
        (notificationStates.size === 1 ? notificationStates.keys().next().value : undefined);
      if (!resolvedUuid) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'BLE receive requires a device UUID when multiple devices are connected'
        );
      }

      const state = notificationStates.get(resolvedUuid);
      if (!state) {
        throw ERRORS.TypedError(
          HardwareErrorCode.TransportNotFound,
          `BLE notification state not found: ${resolvedUuid}`
        );
      }
      const queued = state.queue.shift();
      if (queued !== undefined) return queued;
      return new Promise<string>((resolve, reject) => {
        state.pendingReceivers.add({ resolve, reject });
      });
    },
  };
}
