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

type NoblePendingCredit = {
  resolve: () => void;
  reject: (error: Error) => void;
};

type NobleNotificationState = {
  generation: number;
  queue: string[];
  pendingReceivers: Set<NoblePendingReceiver>;
  flowCredits: number;
  flowStarted: boolean;
  flowError?: Error;
  flowStartPromise?: Promise<void>;
  flowStartResolve?: () => void;
  flowStartReject?: (error: Error) => void;
  flowStartTimer?: NodeJS.Timeout;
  flowWaiters: Set<NoblePendingCredit>;
  flowLastLoggedAt: number;
  flowCreditWaitMs: number;
  flowCreditWaitCount: number;
  flowCreditImmediateCount: number;
  flowCreditWaitMaxMs: number;
  flowCreditWaitOver15Ms: number;
  flowCreditWaitOver30Ms: number;
  flowGrantCount: number;
  flowGrantedSlots: number;
  flowWriteMs: number;
  flowWriteCount: number;
  flowWriteBytes: number;
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
const FLOW_HELLO = Buffer.from([0x7e, 0x4f, 0x4b, 0x46, 0x43, 1]);
const FLOW_CREDIT_PREFIX = Buffer.from([0x7f, 0x4f, 0x4b, 0x46, 0x43, 1]);
const FLOW_CREDIT_PACKET_LENGTH = 42;
const FLOW_START_TIMEOUT_MS = 5000;

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

  if (
    data.length === FLOW_CREDIT_PACKET_LENGTH &&
    data.subarray(0, FLOW_CREDIT_PREFIX.length).equals(FLOW_CREDIT_PREFIX)
  ) {
    const grant = data[6];
    const status = data[7];
    if (status !== 0) {
      const error = new Error(
        `BLE stream flow stopped: status ${status}, scheduler drops ${data.readUInt16LE(
          14
        )}, UART failures ${data.readUInt16LE(16)}, replies queued/sent ${data.readUInt16LE(
          22
        )}/${data.readUInt16LE(24)}, reply busy/invalid/full ${data.readUInt16LE(
          26
        )}/${data.readUInt16LE(28)}/${data.readUInt16LE(30)}, queue peak/depth ${data[32]}/${
          data[33]
        }, main credit ${data.readUInt16LE(34)}, granted/in-flight ${data[36]}/${data[37]}`
      );
      state.flowError = error;
      if (state.flowStartTimer) clearTimeout(state.flowStartTimer);
      state.flowStartReject?.(error);
      state.flowWaiters.forEach(waiter => waiter.reject(error));
      state.flowWaiters.clear();
      state.flowCredits = 0;
      return;
    }
    state.flowCredits += grant;
    if (grant > 0) {
      state.flowGrantCount++;
      state.flowGrantedSlots += grant;
    }
    if (grant > 0 && !state.flowStarted) {
      state.flowStarted = true;
      if (state.flowStartTimer) clearTimeout(state.flowStartTimer);
      state.flowStartResolve?.();
    }
    while (state.flowCredits > 0 && state.flowWaiters.size > 0) {
      const [waiter] = state.flowWaiters;
      state.flowWaiters.delete(waiter);
      state.flowCredits--;
      waiter.resolve();
    }
    const now = Date.now();
    if (state.flowLastLoggedAt === 0 || now - state.flowLastLoggedAt >= 10_000) {
      state.flowLastLoggedAt = now;
      const intervalMs = (data.readUInt16LE(8) * 1.25).toFixed(2);
      const dataLength = data.readUInt16LE(12);
      const schedulerDrops = data.readUInt16LE(14);
      const uartFailures = data.readUInt16LE(16);
      const uartAverageMs = data.readUInt16LE(18);
      const uartMaxMs = data.readUInt16LE(20);
      const replyQueued = data.readUInt16LE(22);
      const replySent = data.readUInt16LE(24);
      const replyResourceWaits = data.readUInt16LE(26);
      const replyInvalidState = data.readUInt16LE(28);
      const replyQueueFull = data.readUInt16LE(30);
      const mainCredit = data.readUInt16LE(34);
      const uartPackets = data.readUInt32LE(38);
      const creditWaitMs = state.flowCreditWaitCount
        ? (state.flowCreditWaitMs / state.flowCreditWaitCount).toFixed(1)
        : '0';
      const writeMs = state.flowWriteCount
        ? (state.flowWriteMs / state.flowWriteCount).toFixed(3)
        : '0';
      process.stderr.write(
        `[onekey-hw] BLE stream: PHY ${data[10]}/${data[11]}, interval ${intervalMs} ms, DLE ${dataLength}, credit wait ${creditWaitMs}/${state.flowCreditWaitMaxMs} ms avg/max (${state.flowCreditWaitCount} waited, ${state.flowCreditImmediateCount} immediate, >15/>30 ms ${state.flowCreditWaitOver15Ms}/${state.flowCreditWaitOver30Ms}), grants ${state.flowGrantedSlots}/${state.flowGrantCount} slots/notifications, Mac write API ${writeMs} ms, UART ${uartAverageMs}/${uartMaxMs} ms avg/max, drops ${schedulerDrops}/${uartFailures}, replies ${replyQueued}/${replySent} queued/sent, busy ${replyResourceWaits}, invalid ${replyInvalidState}, full ${replyQueueFull}, peak ${data[32]}, depth ${data[33]}, packets Mac/UART ${state.flowWriteCount}/${uartPackets}, Mac bytes ${state.flowWriteBytes}, main credit ${mainCredit}, slots ${data[36]}/${data[37]} granted/in-flight\n`
      );
    }
    return;
  }

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
    flowCredits: 0,
    flowStarted: false,
    flowWaiters: new Set(),
    flowLastLoggedAt: 0,
    flowCreditWaitMs: 0,
    flowCreditWaitCount: 0,
    flowCreditImmediateCount: 0,
    flowCreditWaitMaxMs: 0,
    flowCreditWaitOver15Ms: 0,
    flowCreditWaitOver30Ms: 0,
    flowGrantCount: 0,
    flowGrantedSlots: 0,
    flowWriteMs: 0,
    flowWriteCount: 0,
    flowWriteBytes: 0,
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
  state.flowStartReject?.(error);
  if (state.flowStartTimer) clearTimeout(state.flowStartTimer);
  state.flowWaiters.forEach(waiter => waiter.reject(error));
  state.flowWaiters.clear();
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

    async startProtocolV2FlowControl(uuid: string) {
      const state = notificationStates.get(uuid);
      const characteristics = deviceCharacteristics.get(uuid);
      if (!state || !characteristics) {
        throw new Error(`BLE stream device is not connected: ${uuid}`);
      }
      if (state.flowStarted) return;
      if (state.flowStartPromise) return state.flowStartPromise;

      state.flowStartPromise = new Promise<void>((resolve, reject) => {
        state.flowStartResolve = resolve;
        state.flowStartReject = reject;
        state.flowStartTimer = setTimeout(
          () => reject(new Error('BLE stream credit handshake timed out')),
          FLOW_START_TIMEOUT_MS
        );
      });
      try {
        await writeCharacteristic(characteristics.write, FLOW_HELLO, true);
      } catch (error) {
        state.flowStartReject?.(error instanceof Error ? error : new Error(String(error)));
      }
      return state.flowStartPromise;
    },

    async takeProtocolV2FlowCredit(uuid: string) {
      const state = notificationStates.get(uuid);
      if (!state || !state.flowStarted) return;
      if (state.flowError) throw state.flowError;
      if (state.flowCredits > 0) {
        state.flowCredits--;
        state.flowCreditImmediateCount++;
        return;
      }
      const startedAt = Date.now();
      return new Promise<void>((resolve, reject) => {
        state.flowWaiters.add({
          resolve: () => {
            const waitMs = Date.now() - startedAt;
            state.flowCreditWaitMs += waitMs;
            state.flowCreditWaitCount++;
            state.flowCreditWaitMaxMs = Math.max(state.flowCreditWaitMaxMs, waitMs);
            if (waitMs > 15) state.flowCreditWaitOver15Ms++;
            if (waitMs > 30) state.flowCreditWaitOver30Ms++;
            resolve();
          },
          reject,
        });
      });
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
      const flowState = notificationStates.get(uuid);
      for (let offset = 0; offset < buffer.length; offset += packetCapacity) {
        const chunk = buffer.subarray(offset, Math.min(offset + packetCapacity, buffer.length));
        const startedAt = flowState?.flowStarted ? performance.now() : 0;
        await writeCharacteristic(characteristics.write, chunk, withoutResponse);
        if (startedAt && flowState) {
          flowState.flowWriteMs += performance.now() - startedAt;
          flowState.flowWriteCount++;
          flowState.flowWriteBytes += chunk.length;
        }
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
