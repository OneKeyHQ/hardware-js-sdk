import { UI_REQUEST } from '../events/ui-request';
import { HardwareErrorCode, createHwkError } from '../types/errors';

import type { DeviceInfo } from '../types/device';
import type { DeviceSelectionRequest, HardwareEventMap } from '../types/wallet';
import type { TypedEventEmitter } from './TypedEventEmitter';
import type { UiRequestRegistry } from './UiRequestRegistry';

/** Discovery and selection share one owner; never connect until the last scan has drained. */
export async function requestBleDeviceSelection({
  emitter,
  registry,
  request,
  scan,
  signal,
  pollIntervalMs = 1500,
}: {
  emitter: TypedEventEmitter<HardwareEventMap>;
  registry: UiRequestRegistry;
  request: Omit<DeviceSelectionRequest, 'requestId' | 'scanning'>;
  scan: () => Promise<DeviceInfo[]>;
  signal: AbortSignal;
  pollIntervalMs?: number;
}): Promise<{ device: DeviceInfo; requestId: string }> {
  const type = UI_REQUEST.REQUEST_SELECT_DEVICE;
  if (signal.aborted) throw signal.reason;
  if (!emitter.listenerCount(type)) {
    throw createHwkError({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'Select a Bluetooth device before continuing',
    });
  }
  const requestId = registry.createRequestId();
  let { devices } = request;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let wake: (() => void) | undefined;
  const stop = () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    wake?.();
  };
  const waitForNextScan = () =>
    new Promise<void>(resolve => {
      wake = resolve;
      timer = setTimeout(resolve, pollIntervalMs);
      if (stopped) resolve();
    });
  const cancel = () => registry.cancel(type, requestId);
  const reply = registry.wait<{ sdkConnectId: string }>(type, { requestId }).finally(stop);
  void reply.catch(() => undefined);
  const publish = () =>
    emitter.emit(type, {
      type,
      payload: { ...request, devices, requestId, scanning: true },
    });
  signal.addEventListener('abort', cancel, { once: true });
  let polling: Promise<void> | undefined;
  try {
    publish();
    polling = (async () => {
      // A host can answer the initial snapshot synchronously.
      await Promise.resolve();
      while (!stopped) {
        const snapshot = await scan();
        if (stopped || signal.aborted) return;
        devices = snapshot;
        publish();
        if (stopped) return;
        await waitForNextScan();
      }
    })();
    const selected = await Promise.race([reply, polling.then(() => reply)]);
    stop();
    await polling;
    if (signal.aborted) throw signal.reason;
    const device = devices.find(candidate => candidate.connectId === selected.sdkConnectId);
    if (!device) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: 'Selected Bluetooth device is no longer available',
      });
    }
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: requestId, status: 'verifying' },
    });
    return { device, requestId };
  } catch (error) {
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: requestId, status: signal.aborted ? 'cancelled' : 'failed' },
    });
    throw error;
  } finally {
    stop();
    signal.removeEventListener('abort', cancel);
    registry.cancel(type, requestId);
    // Keep the vendor's queue occupied until raw discovery has stopped touching its cache.
    await polling?.catch(() => undefined);
  }
}
