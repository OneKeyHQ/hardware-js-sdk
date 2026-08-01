import type { Characteristic } from '@stoprocent/noble';
import type { Logger } from './types/noble-extended';

type BleCallback = (error?: Error) => void;

export function runBleCallbackOperation(
  operation: (callback: BleCallback) => void,
  options: { timeoutMs: number; timeoutBehavior: 'resolve' | 'reject' }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const timeout = setTimeout(() => {
      if (options.timeoutBehavior === 'reject') {
        settle(new Error(`BLE operation timed out after ${options.timeoutMs}ms`));
      } else {
        settle();
      }
    }, options.timeoutMs);

    try {
      operation(settle);
    } catch (error) {
      settle(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export interface SoftRefreshParams {
  deviceId: string;
  notifyCharacteristic: Characteristic | null | undefined;
  subscriptionOperations: Map<string, 'subscribing' | 'unsubscribing' | 'idle'>;
  subscribedDevices: Map<string, boolean>;
  pairedDevices: Set<string>;
  onNotificationData: (deviceId: string, data: Buffer) => void;
  logger: Logger | null;
}

export async function softRefreshSubscription(params: SoftRefreshParams): Promise<void> {
  const {
    deviceId,
    notifyCharacteristic,
    subscriptionOperations,
    subscribedDevices,
    pairedDevices,
    onNotificationData,
    logger,
  } = params;

  if (!notifyCharacteristic) {
    throw new Error(`Notify characteristic not available for device ${deviceId}`);
  }

  logger?.info('[BLE-OPS] Starting subscription refresh', { deviceId });

  subscriptionOperations.set(deviceId, 'subscribing');

  await runBleCallbackOperation(callback => notifyCharacteristic.unsubscribe(callback), {
    timeoutMs: 250,
    timeoutBehavior: 'resolve',
  });

  await runBleCallbackOperation(callback => notifyCharacteristic.subscribe(callback), {
    timeoutMs: 8_000,
    timeoutBehavior: 'reject',
  });

  notifyCharacteristic.removeAllListeners('data');
  notifyCharacteristic.on('data', (data: Buffer) => {
    if (!pairedDevices.has(deviceId)) {
      pairedDevices.add(deviceId);
      logger?.info('[BLE-OPS] Device paired successfully', { deviceId });
    }

    onNotificationData(deviceId, data);
  });

  subscribedDevices.set(deviceId, true);
  subscriptionOperations.set(deviceId, 'idle');
  logger?.info('[BLE-OPS] Subscription refresh completed', { deviceId });
}
