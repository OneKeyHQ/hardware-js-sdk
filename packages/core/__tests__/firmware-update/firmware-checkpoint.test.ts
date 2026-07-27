import { FirmwareCheckpointWriter } from '../../src/api/firmware/FirmwareCheckpoint';

describe('FirmwareCheckpointWriter', () => {
  it('requires an awaitable sink for prepared firmware execution', () => {
    expect(() => new FirmwareCheckpointWriter({}, { required: true })).toThrow(
      'Prepared firmware update requires a checkpoint sink'
    );
  });

  it('serializes checkpoints and continues the sequence across SDK calls', async () => {
    const checkpoints: Array<{ sequence: number; stage: string }> = [];
    const sink = {
      commit(checkpoint: { sequence: number; stage: string }) {
        checkpoints.push(checkpoint);
        return Promise.resolve();
      },
    };
    const first = new FirmwareCheckpointWriter({
      checkpointSink: sink,
      checkpointSequenceStart: 4,
    });
    const second = new FirmwareCheckpointWriter({
      checkpointSink: sink,
      checkpointSequenceStart: 4,
    });

    await first.commit({
      stage: 'BEFORE_DEVICE_MODE_CHANGE',
      target: 'firmware',
    });
    await second.commit({
      stage: 'FILE_TRANSFER_STARTED',
      target: 'firmware',
    });

    expect(checkpoints).toEqual([
      expect.objectContaining({
        schemaVersion: 1,
        sequence: 5,
        stage: 'BEFORE_DEVICE_MODE_CHANGE',
        destructiveActionStarted: true,
      }),
      expect.objectContaining({
        schemaVersion: 1,
        sequence: 6,
        stage: 'FILE_TRANSFER_STARTED',
        destructiveActionStarted: true,
      }),
    ]);
  });

  it('fails closed when the sink rejects', async () => {
    const writer = new FirmwareCheckpointWriter(
      {
        checkpointSink: {
          commit: jest.fn().mockRejectedValue(new Error('disk unavailable')),
        },
      },
      { required: true }
    );

    await expect(
      writer.commit({
        stage: 'BEFORE_DEVICE_MODE_CHANGE',
      })
    ).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareCheckpointRejected',
      },
    });
  });

  it('fails closed when a commit does not settle before the deadline', async () => {
    const timeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((callback: (...args: any[]) => void) => {
        Promise.resolve().then(callback);
        return 1 as unknown as ReturnType<typeof setTimeout>;
      });
    const writer = new FirmwareCheckpointWriter(
      {
        checkpointSink: {
          commit: () =>
            new Promise<void>(() => {
              // The pending promise exercises the checkpoint deadline.
            }),
        },
      },
      { required: true }
    );

    const commit = writer.commit({
      stage: 'FILE_TRANSFER_STARTED',
      target: 'firmware',
    });
    const assertion = expect(commit).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareCheckpointRejected',
      },
    });

    await assertion;
    timeoutSpy.mockRestore();
  });
});
