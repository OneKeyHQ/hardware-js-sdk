import type { Characteristic } from '@stoprocent/noble';
import type { Logger } from './types/noble-extended';

export interface SoftRefreshParams {
  deviceId: string;
  notifyCharacteristic: Characteristic | null | undefined;
  subscriptionOperations: Map<string, 'subscribing' | 'unsubscribing' | 'idle'>;
  subscribedDevices: Map<string, boolean>;
  pairedDevices: Set<string>;
  notificationCallbacks: Map<string, (hex: string) => void>;
  processNotificationData: (
    deviceId: string,
    data: Buffer
  ) => {
    isComplete: boolean;
    completePacket?: string;
    error?: string;
  };
  logger: Logger | null;
}

export async function softRefreshSubscription(params: SoftRefreshParams): Promise<void> {
  const {
    deviceId,
    notifyCharacteristic,
    subscriptionOperations,
    subscribedDevices,
    pairedDevices,
    notificationCallbacks,
    processNotificationData,
    logger,
  } = params;

  if (!notifyCharacteristic) {
    throw new Error(`Notify characteristic not available for device ${deviceId}`);
  }

  logger?.info('[BLE-OPS] Starting subscription refresh', { deviceId });

  subscriptionOperations.set(deviceId, 'subscribing');

  await new Promise<void>(resolve => {
    notifyCharacteristic.unsubscribe(() => resolve());
  });

  await new Promise<void>((resolve, reject) => {
    notifyCharacteristic.subscribe((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  notifyCharacteristic.removeAllListeners('data');
  notifyCharacteristic.on('data', (data: Buffer) => {
    if (!pairedDevices.has(deviceId)) {
      pairedDevices.add(deviceId);
      logger?.info('[BLE-OPS] Device paired successfully', { deviceId });
    }

    const result = processNotificationData(deviceId, data);
    if (result.error) {
      logger?.error('[BLE-OPS] Packet processing error:', result.error);
      return;
    }
    if (result.isComplete && result.completePacket) {
      const appCb = notificationCallbacks.get(deviceId);
      if (appCb) appCb(result.completePacket);
    }
  });

  subscribedDevices.set(deviceId, true);
  subscriptionOperations.set(deviceId, 'idle');
  logger?.info('[BLE-OPS] Subscription refresh completed', { deviceId });
}
