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

  it('should allow parallel jobs for different devices', async () => {
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
    expect(order).toEqual(['d2', 'd1']);
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
    const jobAPromise = queue.enqueue('d1', async (signal) => {
      started.push('A');
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 200);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });
      return 'A';
    }, { interruptibility: 'none', label: 'Job A' });

    // Step 2: Enqueue Job B for device "d1" — chains behind A
    const jobBPromise = queue.enqueue('d1', async () => {
      started.push('B');
      await new Promise(r => setTimeout(r, 100));
      return 'B';
    }, { interruptibility: 'none', label: 'Job B' });

    // Step 3: Wait for A to start running, then clear()
    await new Promise(r => setTimeout(r, 50));
    expect(started).toContain('A');

    queue.clear();

    // Step 4: Enqueue Job C on fresh chain
    const jobCPromise = queue.enqueue('d1', async () => {
      started.push('C');
      await new Promise(r => setTimeout(r, 100));
      return 'C';
    }, { interruptibility: 'none', label: 'Job C' });

    const results = await Promise.allSettled([jobAPromise, jobBPromise, jobCPromise]);

    // A should be aborted
    expect(results[0].status).toBe('rejected');
    // B should be rejected by generation check — never started
    expect(results[1].status).toBe('rejected');
    expect(started).not.toContain('B');
    // C should succeed
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'C' });
  });
});
