import { UI_RESPONSE } from '../events/ui-response';

import type { UiPromise, UiPromiseResponse } from '../events/ui-promise';
import type { UiResponseEvent } from '../events/ui-response';

const normalizeUiPromiseError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

export const consumeUiPromise = <T>(
  promise: Promise<T>,
  onFulfilled: (value: T) => void,
  onRejected: (error: Error) => void
) => {
  promise.then(onFulfilled, error => {
    onRejected(normalizeUiPromiseError(error));
  });
};

export const rejectUiPromises = (
  uiPromises: UiPromise<UiPromiseResponse['type']>[],
  error: Error
) => {
  for (const uiPromise of uiPromises) {
    uiPromise.reject(error);
  }
};

const isSensitiveUiResponse = (
  response: UiResponseEvent
): response is Extract<
  UiResponseEvent,
  { type: typeof UI_RESPONSE.RECEIVE_PIN | typeof UI_RESPONSE.RECEIVE_PASSPHRASE }
> => response.type === UI_RESPONSE.RECEIVE_PIN || response.type === UI_RESPONSE.RECEIVE_PASSPHRASE;

export const findUiPromiseForResponse = (
  uiPromises: UiPromise<UiPromiseResponse['type']>[],
  response: UiResponseEvent
) => {
  const candidates = uiPromises.filter(promise => promise.id === response.type);
  if (!isSensitiveUiResponse(response)) {
    return candidates[0];
  }

  const hasInteractionId = typeof response.interactionId === 'string';
  const hasDeviceId = typeof response.deviceId === 'string';
  if (hasInteractionId !== hasDeviceId) {
    return undefined;
  }

  if (hasInteractionId && hasDeviceId) {
    return candidates.find(promise => {
      const correlation = promise.responseCorrelation;
      return (
        correlation?.interactionId === response.interactionId &&
        correlation?.deviceId === response.deviceId
      );
    });
  }

  // Legacy clients do not return correlation metadata. Preserve their single-request
  // behavior, but never guess when multiple sensitive requests are pending.
  return candidates.length === 1 ? candidates[0] : undefined;
};
