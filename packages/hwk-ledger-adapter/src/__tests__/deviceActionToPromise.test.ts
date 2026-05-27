import { deviceActionToPromise } from '../signer/deviceActionToPromise';

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

  it('should call onInteraction without rejecting for non-unlock interactions', async () => {
    // confirm-on-device / confirm-open-app are legitimate pending states
    // — DMK polls until user acts on the device, no error thrown.
    const onInteraction = jest.fn();
    const action = createMockAction([
      { status: 'pending', intermediateValue: { requiredUserInteraction: 'confirm-on-device' } },
      { status: 'completed', output: 'done' },
    ]);
    await deviceActionToPromise(action, onInteraction);
    expect(onInteraction).toHaveBeenCalledWith('confirm-on-device');
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

  it('should clear active interaction when DMK reports none after a prompt', async () => {
    const onInteraction = jest.fn();
    let observer:
      | {
          next: (v: unknown) => void;
          error?: (e: unknown) => void;
          complete?: () => void;
        }
      | undefined;
    const action = {
      cancel: jest.fn(),
      observable: {
        subscribe(nextObserver: {
          next: (v: unknown) => void;
          error?: (e: unknown) => void;
          complete?: () => void;
        }) {
          observer = nextObserver;
          return { unsubscribe: jest.fn() };
        },
      },
    } as unknown as DeviceAction<string>;
    const promise = deviceActionToPromise(action, onInteraction, 0);

    observer?.next({
      status: 'pending',
      intermediateValue: {
        requiredUserInteraction: 'allow-secure-connection',
        step: 'os.installOrUpdateApps.steps.updateDeviceMetadata',
      },
    });
    observer?.next({
      status: 'pending',
      intermediateValue: {
        requiredUserInteraction: 'none',
        step: 'os.installOrUpdateApps.steps.updateDeviceMetadata',
      },
    });

    expect(onInteraction).toHaveBeenNthCalledWith(1, 'allow-secure-connection');
    expect(onInteraction).toHaveBeenNthCalledWith(2, 'interaction-complete');

    observer?.next({ status: 'completed', output: 'done' });

    await expect(promise).resolves.toBe('done');
    expect(onInteraction).toHaveBeenNthCalledWith(3, 'interaction-complete');
  });

  it('should not clear interaction repeatedly for consecutive none states', async () => {
    const onInteraction = jest.fn();
    const action = createMockAction([
      {
        status: 'pending',
        intermediateValue: {
          requiredUserInteraction: 'allow-secure-connection',
          step: 'os.installOrUpdateApps.steps.updateDeviceMetadata',
        },
      },
      {
        status: 'pending',
        intermediateValue: {
          requiredUserInteraction: 'none',
          step: 'os.installOrUpdateApps.steps.updateDeviceMetadata',
        },
      },
      {
        status: 'pending',
        intermediateValue: {
          requiredUserInteraction: 'none',
          step: 'os.installOrUpdateApps.steps.updateDeviceMetadata',
        },
      },
      { status: 'completed', output: 'done' },
    ]);

    await deviceActionToPromise(action, onInteraction);

    expect(onInteraction).toHaveBeenNthCalledWith(1, 'allow-secure-connection');
    expect(onInteraction).toHaveBeenNthCalledWith(2, 'interaction-complete');
    expect(onInteraction).toHaveBeenNthCalledWith(3, 'interaction-complete');
    expect(onInteraction).toHaveBeenCalledTimes(3);
  });

  it('should not emit duplicate events for repeated active interaction states', async () => {
    const onInteraction = jest.fn();
    const action = createMockAction([
      {
        status: 'pending',
        intermediateValue: { requiredUserInteraction: 'confirm-on-device' },
      },
      {
        status: 'pending',
        intermediateValue: { requiredUserInteraction: 'confirm-on-device' },
      },
      { status: 'pending', intermediateValue: { requiredUserInteraction: 'none' } },
      { status: 'completed', output: 'done' },
    ]);

    await deviceActionToPromise(action, onInteraction);

    expect(onInteraction).toHaveBeenNthCalledWith(1, 'confirm-on-device');
    expect(onInteraction).toHaveBeenNthCalledWith(2, 'interaction-complete');
    expect(onInteraction).toHaveBeenNthCalledWith(3, 'interaction-complete');
    expect(onInteraction).toHaveBeenCalledTimes(3);
  });

  it('should clear active interaction when observable errors directly', async () => {
    const onInteraction = jest.fn();
    let observer:
      | {
          next: (v: unknown) => void;
          error?: (e: unknown) => void;
          complete?: () => void;
        }
      | undefined;
    const action = {
      cancel: jest.fn(),
      observable: {
        subscribe(nextObserver: {
          next: (v: unknown) => void;
          error?: (e: unknown) => void;
          complete?: () => void;
        }) {
          observer = nextObserver;
          return { unsubscribe: jest.fn() };
        },
      },
    } as unknown as DeviceAction<string>;
    const error = new Error('transport failed');
    const promise = deviceActionToPromise(action, onInteraction, 0);

    observer?.next({
      status: 'pending',
      intermediateValue: {
        requiredUserInteraction: 'allow-secure-connection',
        step: 'os.installOrUpdateApps.steps.updateDeviceMetadata',
      },
    });
    observer?.error?.(error);

    await expect(promise).rejects.toThrow('transport failed');
    expect(onInteraction).toHaveBeenNthCalledWith(1, 'allow-secure-connection');
    expect(onInteraction).toHaveBeenNthCalledWith(2, 'interaction-complete');
    expect(onInteraction).toHaveBeenCalledTimes(2);
  });

  it('should reject if observable completes without result', async () => {
    const action = createMockAction([{ status: 'pending' }]);
    await expect(deviceActionToPromise(action)).rejects.toThrow('completed without result');
  });
});
