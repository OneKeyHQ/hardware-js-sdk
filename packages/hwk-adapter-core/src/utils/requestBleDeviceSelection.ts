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
  allowUsbFallback = false,
  pollIntervalMs = 1500,
}: {
  emitter: TypedEventEmitter<HardwareEventMap>;
  registry: UiRequestRegistry;
  request: Omit<DeviceSelectionRequest, 'requestId' | 'scanning'>;
  scan: () => Promise<DeviceInfo[]>;
  signal: AbortSignal;
  /** The adapter must verify a returned USB candidate before dispatching any business call. */
  allowUsbFallback?: boolean;
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
  let devices = allowUsbFallback
    ? request.devices.filter(device => device.connectionType === 'ble')
    : request.devices;
  const publishedDevices = new Map<string, DeviceInfo>();
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
  const publish = () => {
    // UI replies can refer to a displayed snapshot while the next scan completes.
    for (const device of devices) publishedDevices.set(device.connectId, device);
    emitter.emit(type, {
      type,
      payload: { ...request, devices, requestId, scanning: true },
    });
  };
  signal.addEventListener('abort', cancel, { once: true });
  let polling: Promise<DeviceInfo | undefined> | undefined;
  try {
    publish();
    polling = (async () => {
      // A host can answer the initial snapshot synchronously.
      await Promise.resolve();
      while (!stopped) {
        const snapshot = await scan();
        if (stopped || signal.aborted) return;
        const usbFallback = allowUsbFallback
          ? snapshot.find(device => device.connectionType === 'usb')
          : undefined;
        if (usbFallback) return usbFallback;
        devices = snapshot;
        publish();
        if (stopped) return;
        await waitForNextScan();
      }
    })();
    const userSelection = reply.then(selected => publishedDevices.get(selected.sdkConnectId));
    const device = await Promise.race([
      userSelection,
      polling.then(usbFallback => usbFallback ?? userSelection),
    ]);
    stop();
    await polling;
    if (signal.aborted) throw signal.reason;
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
