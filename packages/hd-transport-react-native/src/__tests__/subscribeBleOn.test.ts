import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { subscribeBleOn } from '../subscribeBleOn';

import type { BlePlxManager } from '../types';

type BleState = Parameters<Parameters<BlePlxManager['onStateChange']>[0]>[0];

const createBleManager = () => {
  let stateListener: ((state: BleState) => void) | undefined;
  const remove = jest.fn();
  const bleManager = {
    onStateChange: jest.fn(listener => {
      stateListener = listener;
      return { remove };
    }),
  } as unknown as BlePlxManager;

  return {
    bleManager,
    emitState: (state: BleState) => stateListener?.(state),
    remove,
  };
};

describe('subscribeBleOn', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('resolves when Bluetooth is powered on', async () => {
    const { bleManager, emitState, remove } = createBleManager();
    const result = subscribeBleOn(bleManager);

    emitState('PoweredOn');

    await expect(result).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('cleans up when the current state is emitted synchronously', async () => {
    const remove = jest.fn();
    const bleManager = {
      onStateChange: jest.fn(listener => {
        listener('PoweredOn');
        return { remove };
      }),
    } as unknown as BlePlxManager;

    await expect(subscribeBleOn(bleManager)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([
    ['PoweredOff', HardwareErrorCode.BlePoweredOff],
    ['Unsupported', HardwareErrorCode.BleUnsupported],
    ['Unauthorized', HardwareErrorCode.BlePermissionError],
  ] as const)('maps %s to hardware error %s', async (state, errorCode) => {
    const { bleManager, emitState, remove } = createBleManager();
    const result = subscribeBleOn(bleManager, 2000);
    const rejection = expect(result).rejects.toMatchObject({ errorCode });

    emitState(state);
    jest.advanceTimersByTime(1999);
    expect(remove).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);

    await rejection;
    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('resolves if Bluetooth powers on during the readiness window', async () => {
    const { bleManager, emitState, remove } = createBleManager();
    const result = subscribeBleOn(bleManager);

    emitState('PoweredOff');
    jest.advanceTimersByTime(1999);
    expect(remove).not.toHaveBeenCalled();
    emitState('PoweredOn');

    await expect(result).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['Unknown', 'Resetting'] as const)(
    'reports %s as a scan error if no stable state arrives before timeout',
    async state => {
      const { bleManager, emitState, remove } = createBleManager();
      const result = subscribeBleOn(bleManager, 1000);
      const rejection = expect(result).rejects.toMatchObject({
        errorCode: HardwareErrorCode.BleScanError,
      });

      emitState('PoweredOff');
      emitState(state);
      jest.advanceTimersByTime(1000);

      await rejection;
      expect(remove).toHaveBeenCalledTimes(1);
    }
  );
});
