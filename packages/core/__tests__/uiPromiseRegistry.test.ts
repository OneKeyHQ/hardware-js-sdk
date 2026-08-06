import { createDeferred } from '@onekeyfe/hd-shared';

import {
  consumeUiPromise,
  findUiPromiseForResponse,
  rejectUiPromises,
} from '../src/core/uiPromiseRegistry';
import { UI_RESPONSE } from '../src/events';

import type { UiPromise, UiPromiseResponse } from '../src/events';

const createPinPromise = (interactionId: string, deviceId: string) => {
  const promise = createDeferred(UI_RESPONSE.RECEIVE_PIN) as UiPromise<
    typeof UI_RESPONSE.RECEIVE_PIN
  >;
  promise.responseCorrelation = { interactionId, deviceId };
  return promise;
};

const asRegistry = (promises: UiPromise<typeof UI_RESPONSE.RECEIVE_PIN>[]) =>
  promises as UiPromise<UiPromiseResponse['type']>[];

describe('UI response promise correlation', () => {
  test('consumes a rejected UI promise and normalizes its callback error', async () => {
    const pending = createDeferred<string>();
    const onFulfilled = jest.fn();
    const onRejected = jest.fn();

    consumeUiPromise(pending.promise, onFulfilled, onRejected);
    pending.reject('cancelled' as unknown as Error);
    await Promise.resolve();

    expect(onFulfilled).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledWith(expect.any(Error));
    expect(onRejected.mock.calls[0][0].message).toBe('cancelled');
  });

  test('matches a sensitive response by type, interactionId and deviceId', () => {
    const deviceA = createPinPromise('interaction-a', 'device-a');
    const deviceB = createPinPromise('interaction-b', 'device-b');

    expect(
      findUiPromiseForResponse(asRegistry([deviceA, deviceB]), {
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '123',
        interactionId: 'interaction-b',
        deviceId: 'device-b',
      })
    ).toBe(deviceB);
  });

  test('does not match incomplete or incorrect correlation metadata', () => {
    const pending = createPinPromise('interaction-a', 'device-a');

    expect(
      findUiPromiseForResponse(asRegistry([pending]), {
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '123',
        interactionId: 'interaction-a',
      })
    ).toBeUndefined();
    expect(
      findUiPromiseForResponse(asRegistry([pending]), {
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '123',
        interactionId: 'interaction-a',
        deviceId: 'device-b',
      })
    ).toBeUndefined();
  });

  test('keeps legacy responses only when the sensitive candidate is unique', () => {
    const deviceA = createPinPromise('interaction-a', 'device-a');
    const deviceB = createPinPromise('interaction-b', 'device-b');
    const legacyResponse = {
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: '123',
    } as const;

    expect(findUiPromiseForResponse(asRegistry([deviceA]), legacyResponse)).toBe(deviceA);
    expect(
      findUiPromiseForResponse(asRegistry([deviceA, deviceB]), legacyResponse)
    ).toBeUndefined();
  });

  test('applies the same exact matching to passphrase responses', () => {
    const promise = createDeferred(UI_RESPONSE.RECEIVE_PASSPHRASE) as UiPromise<
      typeof UI_RESPONSE.RECEIVE_PASSPHRASE
    >;
    promise.responseCorrelation = {
      interactionId: 'passphrase-interaction',
      deviceId: 'device-a',
    };

    expect(
      findUiPromiseForResponse([promise] as UiPromise<UiPromiseResponse['type']>[], {
        type: UI_RESPONSE.RECEIVE_PASSPHRASE,
        payload: { value: 'redacted' },
        interactionId: 'passphrase-interaction',
        deviceId: 'device-a',
      })
    ).toBe(promise);
  });

  test('rejects every pending UI promise removed during cleanup', async () => {
    const deviceA = createPinPromise('interaction-a', 'device-a');
    const deviceB = createPinPromise('interaction-b', 'device-b');
    const cancellation = new Error('UI request was cancelled');

    rejectUiPromises(asRegistry([deviceA, deviceB]), cancellation);

    await expect(deviceA.promise).rejects.toBe(cancellation);
    await expect(deviceB.promise).rejects.toBe(cancellation);
  });
});
