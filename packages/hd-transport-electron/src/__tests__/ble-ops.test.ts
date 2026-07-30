import { runBleCallbackOperation } from '../ble-ops';

describe('Electron Noble callback operations', () => {
  test('settles when Noble never invokes the callback', async () => {
    const result = await runBleCallbackOperation(() => undefined, {
      timeoutMs: 5,
      timeoutBehavior: 'resolve',
    });

    expect(result).toBeUndefined();
  });

  test('rejects callback errors before the timeout', async () => {
    await expect(
      runBleCallbackOperation(callback => callback(new Error('operation failed')), {
        timeoutMs: 50,
        timeoutBehavior: 'reject',
      })
    ).rejects.toThrow('operation failed');
  });
});
