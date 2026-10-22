import {
  INTERACTION_PROMPT_DELAY_MS,
  deviceActionToPromise,
} from '../signer/deviceActionToPromise';

import type { DeviceAction } from '../types';

function createMockAction<T>(
  steps: Array<{ status: string; output?: T; error?: unknown; intermediateValue?: unknown }>
): DeviceAction<T> {
  return {
    cancel: jest.fn(),
    observable: {
      subscribe(observer: {
        next: (v: unknown) => void;
        error?: (e: unknown) => void;
        complete?: () => void;
      }) {
        for (const step of steps) {
          observer.next(step);
        }
        observer.complete?.();
        return { unsubscribe: () => {} };
      },
    },
  } as unknown as DeviceAction<T>;
}

/** An action whose states the test emits one at a time, so timing between them can be controlled. */
function createControlledAction<T>() {
  let observer:
    | { next: (v: unknown) => void; error?: (e: unknown) => void; complete?: () => void }
    | undefined;
  const action = {
    cancel: jest.fn(),
    observable: {
      subscribe(nextObserver: NonNullable<typeof observer>) {
        observer = nextObserver;
        return { unsubscribe: jest.fn() };
      },
    },
  } as unknown as DeviceAction<T>;
  const asks = (requiredUserInteraction: string) =>
    observer?.next({ status: 'pending', intermediateValue: { requiredUserInteraction } });
  return {
    action,
    asks,
    completes: (output: T) => observer?.next({ status: 'completed', output }),
    fails: (error: unknown) => observer?.next({ status: 'error', error }),
    errors: (error: unknown) => observer?.error?.(error),
  };
}

describe('deviceActionToPromise', () => {
  it('should resolve on completed status', async () => {
    const action = createMockAction([
      { status: 'pending' },
      { status: 'completed', output: { address: '0x123', publicKey: '0xpk' } },
    ]);
    const result = await deviceActionToPromise(action);
    expect(result).toEqual({ address: '0x123', publicKey: '0xpk' });
  });

  it('should reject on error status', async () => {
    const action = createMockAction([{ status: 'error', error: new Error('device locked') }]);
    await expect(deviceActionToPromise(action)).rejects.toThrow('device locked');
  });

  it('should attach non-enumerable step context to rejected errors', async () => {
    const error = new Error('Invalid data');
    const action = createMockAction([
      {
        status: 'pending',
        intermediateValue: { step: 'signer.eth.steps.signTransaction' },
      },
      {
        status: 'pending',
        intermediateValue: { step: 'signer.eth.steps.blindSignTransactionFallback' },
      },
      {
        status: 'pending',
        intermediateValue: { step: 'signer.eth.steps.detectBlindSigning' },
      },
      { status: 'error', error },
    ]);

    await expect(deviceActionToPromise(action)).rejects.toMatchObject({
      message: 'Invalid data',
    });
    expect((error as Error & { _lastStep?: string })._lastStep).toBe(
      'signer.eth.steps.detectBlindSigning'
    );
    expect((error as Error & { _deviceActionSteps?: string[] })._deviceActionSteps).toEqual([
      'signer.eth.steps.signTransaction',
      'signer.eth.steps.blindSignTransactionFallback',
      'signer.eth.steps.detectBlindSigning',
    ]);
    expect(Object.keys(error)).not.toContain('_lastStep');
    expect(Object.keys(error)).not.toContain('_deviceActionSteps');
  });

  it('should propagate unlock-device via onInteraction without rejecting', async () => {
    // unlock-device is DMK's signal that the SE is locked. DMK has its own
    // 60s waitForDeviceUnlock that polls and self-recovers when the user
    // unlocks. We forward as ui-event so the app shows a toast; we do NOT
    // reject. Don't fire the 30s default timeout while the action is in
    // unlock-device pending — DMK's own observable goes silent during the
    // poll (returns EMPTY) and we'd otherwise cancel mid-wait.
    const onInteraction = jest.fn();
    const action = createMockAction([
      { status: 'pending', intermediateValue: { requiredUserInteraction: 'unlock-device' } },
      { status: 'completed', output: 'done' },
    ]);
    await deviceActionToPromise(action, onInteraction);
    expect(onInteraction).toHaveBeenCalledWith('unlock-device');
  });

  describe('prompt timing', () => {
    beforeEach(() => jest.useFakeTimers({ doNotFake: ['performance'] }));
    afterEach(() => jest.useRealTimers());

    it('shows a predicted interaction only once the device leaves it unanswered', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('confirm-on-device');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS - 1);
      expect(onInteraction).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(onInteraction).toHaveBeenCalledWith('confirm-on-device');

      device.completes('done');
      await expect(promise).resolves.toBe('done');
    });

    it('never shows an open-app prompt the device answers at once', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('confirm-open-app');
      jest.advanceTimersByTime(50);
      device.fails(Object.assign(new Error('app not installed'), { errorCode: '6807' }));
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);

      await expect(promise).rejects.toThrow('app not installed');
      expect(onInteraction).not.toHaveBeenCalledWith('confirm-open-app');
    });

    it('shows unlock-device at once', () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      void deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('unlock-device');

      expect(onInteraction).toHaveBeenCalledWith('unlock-device');
    });

    it('clears a shown prompt as soon as the device moves on, and delays the next', () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      void deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('confirm-open-app');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);
      device.asks('verify-address');

      expect(onInteraction.mock.calls.map(([name]) => name)).toEqual([
        'confirm-open-app',
        'interaction-complete',
      ]);
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);
      expect(onInteraction).toHaveBeenLastCalledWith('verify-address');
    });

    it('clears a shown prompt when DMK reports none', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('allow-secure-connection');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);
      device.asks('none');
      device.completes('done');

      await expect(promise).resolves.toBe('done');
      expect(onInteraction.mock.calls.map(([name]) => name)).toEqual([
        'allow-secure-connection',
        'interaction-complete',
        'interaction-complete',
      ]);
    });

    it('does not clear repeatedly for consecutive none states', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('allow-secure-connection');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);
      device.asks('none');
      device.asks('none');
      device.completes('done');

      await expect(promise).resolves.toBe('done');
      expect(onInteraction).toHaveBeenCalledTimes(3);
    });

    it('neither repeats nor restarts the wait for repeated interaction states', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('confirm-on-device');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS - 1);
      device.asks('confirm-on-device');
      jest.advanceTimersByTime(1);
      device.asks('confirm-on-device');
      device.asks('none');
      device.completes('done');

      await expect(promise).resolves.toBe('done');
      expect(onInteraction.mock.calls.map(([name]) => name)).toEqual([
        'confirm-on-device',
        'interaction-complete',
        'interaction-complete',
      ]);
    });

    it('clears a shown prompt when the observable errors directly', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('allow-secure-connection');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);
      device.errors(new Error('transport failed'));

      await expect(promise).rejects.toThrow('transport failed');
      expect(onInteraction.mock.calls.map(([name]) => name)).toEqual([
        'allow-secure-connection',
        'interaction-complete',
      ]);
    });

    it('drops a prompt still waiting when the action settles', async () => {
      const onInteraction = jest.fn();
      const device = createControlledAction<string>();
      const promise = deviceActionToPromise(device.action, onInteraction, 0);

      device.asks('sign-transaction');
      device.completes('done');
      jest.advanceTimersByTime(INTERACTION_PROMPT_DELAY_MS);

      await expect(promise).resolves.toBe('done');
      expect(onInteraction).not.toHaveBeenCalledWith('sign-transaction');
    });
  });

  it('should keep a bounded watchdog for confirm-on-device pending states', async () => {
    const onInteraction = jest.fn();
    const rejectSpy = jest.fn();
    const cancel = jest.fn();
    const action = {
      cancel,
      observable: {
        subscribe(observer: { next: (v: unknown) => void }) {
          observer.next({
            status: 'pending',
            intermediateValue: { requiredUserInteraction: 'confirm-on-device' },
          });
          return { unsubscribe: jest.fn() };
        },
      },
    } as unknown as DeviceAction<unknown>;

    void deviceActionToPromise(action, onInteraction, 10).catch(rejectSpy);
    await new Promise(resolve => {
      setTimeout(resolve, 20);
    });

    expect(rejectSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(cancel).toHaveBeenCalled();
  });

  it('should NOT call onInteraction for "none" interaction', async () => {
    const onInteraction = jest.fn();
    const action = createMockAction([
      { status: 'pending', intermediateValue: { requiredUserInteraction: 'none' } },
      { status: 'completed', output: 'done' },
    ]);
    await deviceActionToPromise(action, onInteraction);
    // "none" means no user interaction needed — should not fire the interaction name
    // only "interaction-complete" on completion is expected
    expect(onInteraction).not.toHaveBeenCalledWith('none');
    expect(onInteraction).toHaveBeenCalledWith('interaction-complete');
  });

  it('should reject if observable completes without result', async () => {
    const action = createMockAction([{ status: 'pending' }]);
    await expect(deviceActionToPromise(action)).rejects.toThrow('completed without result');
  });
});
