import { UI_REQUEST } from '../events/ui-request';
import { HardwareErrorCode, createHwkError } from '../types/errors';

import type { SaveDeviceBindingDeclineReason } from '../events/ui-request';
import type { HardwareEventMap, SaveDeviceBindingRequest } from '../types/wallet';
import type { TypedEventEmitter } from './TypedEventEmitter';
import type { UiRequestRegistry } from './UiRequestRegistry';

/** Persist a verified binding through the host. The host must acknowledge it. */
export async function requestSaveDeviceBinding(
  emitter: TypedEventEmitter<HardwareEventMap>,
  registry: UiRequestRegistry,
  binding: Omit<SaveDeviceBindingRequest, 'requestId'>,
  signal?: AbortSignal
): Promise<void> {
  const type = UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING;
  if (!emitter.listenerCount(type)) {
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: binding.selectionRequestId, status: 'failed' },
    });
    throw createHwkError({
      code: HardwareErrorCode.InvalidParams,
      message: `Host must subscribe to ${type} to bind a device connection`,
    });
  }
  if (signal?.aborted) throw signal.reason;
  const requestId = registry.createRequestId();
  const pending = registry.wait<{
    saved: boolean;
    reason?: SaveDeviceBindingDeclineReason;
  }>(type, { requestId });
  // A synchronous host listener can throw before execution reaches the await.
  void pending.catch(() => undefined);
  const cancel = () => registry.cancel(type, requestId);
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    emitter.emit(type, { type, payload: { ...binding, requestId } });
    const response = await pending;
    if (signal?.aborted) throw signal.reason;
    if (response?.saved !== true) {
      // A refusal has two very different causes and they must not share one
      // error: the user picking the wrong physical device is a device
      // mismatch the app can explain, while a host that had nothing to bind
      // is our own contract slipping.
      const mismatch = response?.reason === 'mismatch';
      throw createHwkError({
        code: mismatch ? HardwareErrorCode.DeviceMismatch : HardwareErrorCode.UnknownError,
        message: mismatch
          ? 'Selected device is not the one this wallet is bound to'
          : 'Verified device binding could not be saved',
        origin: mismatch ? 'device' : 'host',
      });
    }
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: binding.selectionRequestId, status: 'saved' },
    });
  } catch (error) {
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: {
        selectionRequestId: binding.selectionRequestId,
        status: signal?.aborted ? 'cancelled' : 'failed',
      },
    });
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    registry.cancel(type, requestId);
  }
}
