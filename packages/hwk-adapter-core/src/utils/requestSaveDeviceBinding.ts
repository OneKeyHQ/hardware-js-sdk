import { UI_REQUEST } from '../events/ui-request';
import { HardwareErrorCode, createHwkError } from '../types/errors';

import type { HardwareEventMap, SaveDeviceBindingRequest } from '../types/wallet';
import type { TypedEventEmitter } from './TypedEventEmitter';
import type { UiRequestRegistry } from './UiRequestRegistry';

/** Legacy hosts keep their notification path until they subscribe to the acknowledged contract. */
export async function requestSaveDeviceBinding(
  emitter: TypedEventEmitter<HardwareEventMap>,
  registry: UiRequestRegistry,
  binding: Omit<SaveDeviceBindingRequest, 'requestId'>,
  signal?: AbortSignal
): Promise<boolean> {
  const type = UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING;
  if (!emitter.listenerCount(type)) return false;
  if (signal?.aborted) throw signal.reason;
  const requestId = registry.createRequestId();
  const pending = registry.wait<{ saved: boolean }>(type, { requestId });
  // A synchronous host listener can throw before execution reaches the await.
  void pending.catch(() => undefined);
  const cancel = () => registry.cancel(type, requestId);
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    emitter.emit(type, { type, payload: { ...binding, requestId } });
    const response = await pending;
    if (signal?.aborted) throw signal.reason;
    if (response?.saved !== true) {
      throw createHwkError({
        code: HardwareErrorCode.UnknownError,
        message: 'Verified device binding could not be saved',
      });
    }
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: binding.selectionRequestId, status: 'saved' },
    });
    return true;
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
