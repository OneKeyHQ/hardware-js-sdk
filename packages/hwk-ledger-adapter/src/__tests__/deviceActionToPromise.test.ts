import { describe, it, expect, vi } from 'vitest';
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

  it('should call onInteraction for pending states with interaction', async () => {
    const onInteraction = vi.fn();
    const action = createMockAction([
      { status: 'pending', intermediateValue: { requiredUserInteraction: 'unlock-device' } },
      { status: 'completed', output: 'done' },
    ]);
    await deviceActionToPromise(action, onInteraction);
    expect(onInteraction).toHaveBeenCalledWith('unlock-device');
  });

  it('should NOT call onInteraction for "none" interaction', async () => {
    const onInteraction = vi.fn();
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
