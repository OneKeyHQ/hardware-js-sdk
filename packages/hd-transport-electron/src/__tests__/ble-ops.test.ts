import { EventEmitter } from 'events';
import { runBleCallbackOperation, softRefreshSubscription } from '../ble-ops';

import type { Characteristic } from '@stoprocent/noble';

describe('Electron Noble callback operations', () => {
  test('settles when Noble never invokes the callback', async () => {
    const result = await runBleCallbackOperation(() => undefined, {
      timeoutMs: 5,
      timeoutBehavior: 'resolve',
    });

    expect(result).toBeUndefined();
  });

  test('rejects callback errors before the timeout', async () => {
    await expect(
      runBleCallbackOperation(callback => callback(new Error('operation failed')), {
        timeoutMs: 50,
        timeoutBehavior: 'reject',
      })
    ).rejects.toThrow('operation failed');
  });

  test('softRefreshSubscription records post-refresh notifications in pairedDevices and bondedDevices', async () => {
    const deviceId = 'win-soft-refresh-device';
    const notifyCharacteristic = Object.assign(new EventEmitter(), {
      unsubscribe: jest.fn((callback: (error?: Error) => void) => callback()),
      subscribe: jest.fn((callback: (error?: Error) => void) => callback()),
    }) as unknown as Characteristic;
    const subscriptionOperations = new Map<string, 'subscribing' | 'unsubscribing' | 'idle'>();
    const subscribedDevices = new Map<string, boolean>();
    const pairedDevices = new Set<string>();
    const bondedDevices = new Set<string>();
    const pairingCanceledDevices = new Set<string>();
    const onNotificationData = jest.fn();

    await softRefreshSubscription({
      deviceId,
      notifyCharacteristic,
      subscriptionOperations,
      subscribedDevices,
      pairedDevices,
      bondedDevices,
      pairingCanceledDevices,
      onNotificationData,
      logger: null,
    });

    const payload = Buffer.from('aabb', 'hex');
    notifyCharacteristic.emit('data', payload);

    expect(pairedDevices.has(deviceId)).toBe(true);
    expect(bondedDevices.has(deviceId)).toBe(true);
    expect(subscribedDevices.get(deviceId)).toBe(true);
    expect(subscriptionOperations.get(deviceId)).toBe('idle');
    expect(onNotificationData).toHaveBeenCalledWith(deviceId, payload);
  });

  test('softRefreshSubscription does not record bond history while pairing is canceled', async () => {
    const deviceId = 'win-soft-refresh-canceled-device';
    const notifyCharacteristic = Object.assign(new EventEmitter(), {
      unsubscribe: jest.fn((callback: (error?: Error) => void) => callback()),
      subscribe: jest.fn((callback: (error?: Error) => void) => callback()),
    }) as unknown as Characteristic;
    const subscriptionOperations = new Map<string, 'subscribing' | 'unsubscribing' | 'idle'>();
    const subscribedDevices = new Map<string, boolean>();
    const pairedDevices = new Set<string>();
    const bondedDevices = new Set<string>();
    const pairingCanceledDevices = new Set<string>([deviceId]);
    const onNotificationData = jest.fn();

    await softRefreshSubscription({
      deviceId,
      notifyCharacteristic,
      subscriptionOperations,
      subscribedDevices,
      pairedDevices,
      bondedDevices,
      pairingCanceledDevices,
      onNotificationData,
      logger: null,
    });

    const payload = Buffer.from('ccdd', 'hex');
    notifyCharacteristic.emit('data', payload);

    expect(pairedDevices.has(deviceId)).toBe(false);
    expect(bondedDevices.has(deviceId)).toBe(false);
    expect(onNotificationData).toHaveBeenCalledWith(deviceId, payload);
  });
});
