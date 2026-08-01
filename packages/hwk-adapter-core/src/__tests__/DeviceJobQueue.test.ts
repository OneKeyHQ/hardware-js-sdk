import { DeviceJobQueue } from '../index';

describe('DeviceJobQueue', () => {
  it('should execute a single job and return its result', async () => {
    const queue = new DeviceJobQueue();
    const result = await queue.enqueue('device-1', async () => 42);
    expect(result).toBe(42);
  });

  it('should serialize jobs for the same device', async () => {
    const queue = new DeviceJobQueue();
    const order: number[] = [];

    const job1 = queue.enqueue('device-1', async () => {
      await new Promise(r => setTimeout(r, 50));
      order.push(1);
      return 'a';
    });
    const job2 = queue.enqueue('device-1', async () => {
      order.push(2);
      return 'b';
    });

    const [r1, r2] = await Promise.all([job1, job2]);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
    expect(order).toEqual([1, 2]);
  });

  it('should serialize jobs across different devices (global serial queue)', async () => {
    const queue = new DeviceJobQueue();
    const order: string[] = [];

    const job1 = queue.enqueue('device-1', async () => {
      await new Promise(r => setTimeout(r, 50));
      order.push('d1');
    });
    const job2 = queue.enqueue('device-2', async () => {
      order.push('d2');
    });

    await Promise.all([job1, job2]);
    expect(order).toEqual(['d1', 'd2']);
  });

  it('rejectIfBusy rejects a new job instead of queueing it', async () => {
    const queue = new DeviceJobQueue();
    const busyError = Object.assign(new Error('Device is busy'), {
      code: 10102,
    });
    const started: string[] = [];
    let releaseFirst: () => void = () => {};

    const first = queue.enqueue('device-1', async () => {
      started.push('first');
      await new Promise<void>(resolve => {
        releaseFirst = resolve;
      });
      return 'first';
    });

    const second = queue.enqueue(
      'device-1',
      async () => {
        started.push('second');
        return 'second';
      },
      { rejectIfBusy: true, busyError }
    );

    await expect(second).rejects.toBe(busyError);
    releaseFirst();
    await expect(first).resolves.toBe('first');
    expect(started).toEqual(['first']);
  });

  it('rejectIfBusy keeps rejecting until a cancelled active job settles', async () => {
    const queue = new DeviceJobQueue();
    const busyError = Object.assign(new Error('Device is busy'), {
      code: 10102,
    });
    let rejectActive: (reason?: unknown) => void = () => {};

    const active = queue.enqueue('device-1', async signal => {
      await new Promise<void>((_, reject) => {
        rejectActive = reject;
        signal.addEventListener('abort', () => {
          setTimeout(() => reject(signal.reason), 30);
        });
      });
    });

    await new Promise(r => setTimeout(r, 5));
    queue.clear();

    await expect(
      queue.enqueue('device-1', async () => 'early', { rejectIfBusy: true, busyError })
    ).rejects.toBe(busyError);

    rejectActive(new Error('active settled'));
    await expect(active).rejects.toBeDefined();

    await expect(
      queue.enqueue('device-1', async () => 'after', { rejectIfBusy: true, busyError })
    ).resolves.toBe('after');
  });

  it('should continue after a failed job', async () => {
    const queue = new DeviceJobQueue();

    const job1 = queue.enqueue('device-1', async () => {
      throw new Error('fail');
    });
    await expect(job1).rejects.toThrow('fail');

    const job2 = queue.enqueue('device-1', async () => 'recovered');
    expect(await job2).toBe('recovered');
  });

  it('should clear all queues', async () => {
    const queue = new DeviceJobQueue();
    await queue.enqueue('device-1', async () => 'done');
    queue.clear();
    const result = await queue.enqueue('device-1', async () => 'fresh');
    expect(result).toBe('fresh');
  });

  it('clear() should prevent previously-queued jobs from running after clear', async () => {
    const queue = new DeviceJobQueue();
    const started: string[] = [];

    // Step 1: Enqueue Job A (long-running) for device "d1"
    const jobAPromise = queue.enqueue(
      'd1',
      async signal => {
        started.push('A');
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => resolve(), 200);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(signal.reason);
          });
        });
        return 'A';
      },
      { label: 'Job A' }
    );

    // Step 2: Enqueue Job B for device "d1" — chains behind A
    const jobBPromise = queue.enqueue(
      'd1',
      async () => {
        started.push('B');
        await new Promise(r => setTimeout(r, 100));
        return 'B';
      },
      { label: 'Job B' }
    );

    // Step 3: Wait for A to start running, then clear()
    await new Promise(r => setTimeout(r, 50));
    expect(started).toContain('A');

    queue.clear();

    // Step 4: Enqueue Job C on fresh chain
    const jobCPromise = queue.enqueue(
      'd1',
      async () => {
        started.push('C');
        await new Promise(r => setTimeout(r, 100));
        return 'C';
      },
      { label: 'Job C' }
    );

    const results = await Promise.allSettled([jobAPromise, jobBPromise, jobCPromise]);

    // A should be aborted
    expect(results[0].status).toBe('rejected');
    // B should be rejected by generation check — never started
    expect(results[1].status).toBe('rejected');
    expect(started).not.toContain('B');
    // C should succeed
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'C' });
  });

  it('cancelActiveAndPending() should reject queued jobs with the cancel reason', async () => {
    const queue = new DeviceJobQueue();
    const started: string[] = [];
    const cancelReason = Object.assign(new Error('User aborted operation'), {
      code: 400,
      _tag: 'UserAborted',
    });

    const jobA = queue.enqueue('d', async signal => {
      started.push('A');
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 200);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });
    });

    const jobB = queue.enqueue('d', async () => {
      started.push('B');
      return 'B';
    });

    await new Promise(r => setTimeout(r, 5));
    expect(queue.cancelActiveAndPending('d', cancelReason)).toBe(true);

    const results = await Promise.allSettled([jobA, jobB]);

    expect(results[0]).toEqual({ status: 'rejected', reason: cancelReason });
    expect(results[1]).toEqual({ status: 'rejected', reason: cancelReason });
    expect(started).toEqual(['A']);
  });

  it('clear() during running job does not clobber successor _active (identity guard)', async () => {
    const queue = new DeviceJobQueue();

    // Long job that will be aborted by clear() but takes a moment to actually exit
    const j1 = queue.enqueue('d', async signal => {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, 500);
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          // Delay finally execution so it races with j2's _active set
          setTimeout(() => reject(signal.reason), 30);
        });
      });
    });

    await new Promise(r => setTimeout(r, 5));
    queue.clear();

    // Enqueue j2 immediately after clear — it sets _active.
    // j1's deferred finally must NOT null j2's _active.
    const j2 = queue.enqueue('d', async () => {
      await new Promise(r => setTimeout(r, 60));
      // After j1's stale finally fires (~30ms after abort), _active should
      // still point to j2 because of the identity guard.
      expect(queue.getActiveJob()?.deviceId).toBe('d');
      return 'j2';
    });

    await expect(j1).rejects.toBeDefined();
    await expect(j2).resolves.toBe('j2');
  });

  it('isBusy reflects the active slot', async () => {
    const queue = new DeviceJobQueue();
    expect(queue.isBusy()).toBe(false);

    let release: () => void = () => {};
    const j = queue.enqueue(
      'd',
      () =>
        new Promise<void>(r => {
          release = r;
        })
    );

    await new Promise(r => setTimeout(r, 5));
    expect(queue.isBusy()).toBe(true);

    release();
    await j;
    expect(queue.isBusy()).toBe(false);
  });
});
