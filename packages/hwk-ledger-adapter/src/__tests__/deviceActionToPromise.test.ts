import { deviceActionToPromise } from '../signer/deviceActionToPromise';

function createMockAction<T>(
  steps: Array<{ status: string; output?: T; error?: unknown; intermediateValue?: any }>
) {
  return {
    observable: {
      subscribe(observer: {
        next: (v: any) => void;
        error?: (e: any) => void;
        complete?: () => void;
      }) {
        for (const step of steps) {
          observer.next(step);
        }
        observer.complete?.();
        return { unsubscribe: () => {} };
      },
    },
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
        subscribe(observer: { next: (v: any) => void }) {
          observer.next({
            status: 'pending',
            intermediateValue: { requiredUserInteraction: 'confirm-on-device' },
          });
          return { unsubscribe: jest.fn() };
        },
      },
    };

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
