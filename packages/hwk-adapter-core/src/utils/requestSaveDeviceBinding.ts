import { UI_REQUEST } from '../events/ui-request';

import type { SaveDeviceBindingDeclineReason } from '../events/ui-request';
import type {
  DeviceBindingStatus,
  HardwareEventMap,
  SaveDeviceBindingRequest,
} from '../types/wallet';
import type { TypedEventEmitter } from './TypedEventEmitter';
import type { UiRequestRegistry } from './UiRequestRegistry';

/**
 * A host refusal is reported, never thrown: wallet identity is already verified, so a lost binding
 * is worth a warning and a retry, not failing the user's work.
 */
export type SaveDeviceBindingOutcome =
  | { saved: true }
  | { saved: false; reason: SaveDeviceBindingDeclineReason };

/** Persist a verified binding through the host. Only a user abort throws. */
export async function requestSaveDeviceBinding(
  emitter: TypedEventEmitter<HardwareEventMap>,
  registry: UiRequestRegistry,
  binding: Omit<SaveDeviceBindingRequest, 'requestId'>,
  signal?: AbortSignal
): Promise<SaveDeviceBindingOutcome> {
  const type = UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING;
  const emitStatus = (status: DeviceBindingStatus['status']) =>
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: binding.selectionRequestId, status },
    });
  const declined = (reason: SaveDeviceBindingDeclineReason): SaveDeviceBindingOutcome => {
    emitStatus('failed');
    return { saved: false, reason };
  };
  if (!emitter.listenerCount(type)) {
    return declined('skipped');
  }
  if (signal?.aborted) throw signal.reason;
  const requestId = registry.createRequestId();
  const pending = registry.wait<{
    saved: boolean;
    reason?: SaveDeviceBindingDeclineReason;
  }>(type, { requestId, operationId: binding.operationId });
  // A synchronous host listener can throw before execution reaches the await.
  void pending.catch(() => undefined);
  const cancel = () => registry.cancel(type, requestId);
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    emitter.emit(type, { type, payload: { ...binding, requestId } });
    const response = await pending;
    if (signal?.aborted) throw signal.reason;
    if (response?.saved !== true) {
      // Both 'mismatch' and 'skipped' concern the host's record, not the verified device.
      return declined(response?.reason ?? 'skipped');
    }
    emitStatus('saved');
    return { saved: true };
  } catch (error) {
    if (signal?.aborted) {
      emitStatus('cancelled');
      throw error;
    }
    // Any other failure is the host not answering.
    return declined('skipped');
  } finally {
    signal?.removeEventListener('abort', cancel);
    registry.cancel(type, requestId);
  }
}
