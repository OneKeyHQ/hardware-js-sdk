import { describe, it, expect } from 'vitest';
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
});
