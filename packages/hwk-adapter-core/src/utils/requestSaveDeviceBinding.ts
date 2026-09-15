import { UI_REQUEST } from '../events/ui-request';

import type { SaveDeviceBindingDeclineReason } from '../events/ui-request';
import type { HardwareEventMap, SaveDeviceBindingRequest } from '../types/wallet';
import type { TypedEventEmitter } from './TypedEventEmitter';
import type { UiRequestRegistry } from './UiRequestRegistry';

/**
 * The outcome of asking the host to persist a verified binding. A refusal is
 * reported, never thrown: by this point the SDK has already verified that the
 * connected wallet is the one the operation expects, so anything the host says
 * back is about the host's own records. Losing the binding is worth a warning
 * and a retry next time; it is not a reason to fail work the user asked for.
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
  const declined = (reason: SaveDeviceBindingDeclineReason): SaveDeviceBindingOutcome => {
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: binding.selectionRequestId, status: 'failed' },
    });
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
      // 'mismatch' and 'skipped' both mean the host could not tie this
      // verified connection to the record it is holding. Neither says the
      // user is holding the wrong device — that was settled before we got
      // here — so neither stops the operation.
      return declined(response?.reason ?? 'skipped');
    }
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: binding.selectionRequestId, status: 'saved' },
    });
    return { saved: true };
  } catch (error) {
    emitter.emit(UI_REQUEST.DEVICE_BINDING_STATUS, {
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: {
        selectionRequestId: binding.selectionRequestId,
        status: signal?.aborted ? 'cancelled' : 'failed',
      },
    });
    // A user abort is the one refusal that is genuinely the user's; everything
    // else here is the host failing to answer, which is not the user's problem.
    if (signal?.aborted) throw error;
    return { saved: false, reason: 'skipped' };
  } finally {
    signal?.removeEventListener('abort', cancel);
    registry.cancel(type, requestId);
  }
}
