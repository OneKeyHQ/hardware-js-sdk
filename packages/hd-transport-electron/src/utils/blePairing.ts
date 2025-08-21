/*
 * BLE Pairing Utilities - periodic pairing probe
 * Unsubscribe → subscribe → write every interval until response or max cycles
 */

import type { Characteristic } from '@stoprocent/noble';
import type { Logger } from '../types/noble-extended';

export interface Step3Options {
  intervalMs?: number;          // default 3000
  maxCycles?: number;           // default 10
  initDataHex?: string;         // hex string to write; default OneKey init
}

const DEFAULT_INIT_DATA =
  '3f232300000000000882f4030088f403010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

export async function runPairingProbe(
  logger: Logger | null,
  deviceId: string,
  notifyCharacteristic: Characteristic,
  writeCharacteristic: Characteristic,
  options: Step3Options = {}
): Promise<void> {
  const intervalMs = options.intervalMs ?? 3000;
  const maxCycles = options.maxCycles ?? 10;
  const initDataHex = options.initDataHex ?? DEFAULT_INIT_DATA;

  return new Promise<void>((resolve, reject) => {
    let resolved = false;
    let responseReceived = false;
    let cycles = 0;
    let intervalId: NodeJS.Timeout | null = null;

    const startTime = Date.now();

    const cleanup = () => {
      if (intervalId) clearInterval(intervalId);
      // pairing阶段结束前，先移除一次性侦听器，避免泄露
      notifyCharacteristic.removeAllListeners('data');
    };

    const onData = (data: Buffer) => {
      if (resolved || responseReceived) return;
      responseReceived = true;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger?.info('[Pairing] response', { deviceId, cycles, elapsed: elapsed, len: data.length });
      cleanup();
      resolved = true;
      resolve();
    };

    const buffer = Buffer.from(initDataHex, 'hex');

    const doCycle = () => {
      if (resolved || responseReceived) return;
      cycles += 1;
      const t = ((Date.now() - startTime) / 1000).toFixed(1);
      logger?.info('[Pairing] cycle', { deviceId, cycle: cycles, t });

      logger?.info(`[Pairing] Listeners before cycle: ${notifyCharacteristic.listenerCount('data')}`);

      // 清理旧监听，确保不会累积
      notifyCharacteristic.removeAllListeners('data');

      logger?.info(`[Pairing] Listeners after cleanup: ${notifyCharacteristic.listenerCount('data')}`);

      // 取消订阅 → 重新订阅 → 写入
      notifyCharacteristic.unsubscribe(() => {
        notifyCharacteristic.subscribe((subscribeError?: Error) => {
          if (subscribeError) {
            logger?.error('[Pairing] subscribe failed', { deviceId, cycle: cycles, error: subscribeError.message });
            return; // 等待下一轮
          }

          // 仅监听一次本轮的回包
          notifyCharacteristic.once('data', onData);

          writeCharacteristic.write(buffer, true, (writeError?: Error) => {
          logger?.info(`[Pairing] Listeners after attach: ${notifyCharacteristic.listenerCount('data')}`);

            if (writeError) {
              logger?.error('[Pairing] write failed', { deviceId, cycle: cycles, error: writeError.message });
              return; // 等待下一轮
            }
            logger?.info('[Pairing] write', { deviceId, cycle: cycles });

          });
        });
      });

      // 达到最大轮次后，停止继续调度，立即判定为超时
      if (cycles >= maxCycles && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        if (!resolved && !responseReceived) {
          const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          logger?.info('[Pairing] timeout', { deviceId, cycles, elapsed: totalElapsed });
          cleanup();
          reject(new Error('pairing_timeout'));
        }
      }
    };

    // 立即开始第一轮，然后每 intervalMs 一轮
    doCycle();
    intervalId = setInterval(doCycle, intervalMs);
  });
}

