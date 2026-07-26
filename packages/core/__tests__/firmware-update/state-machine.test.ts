import {
  FirmwareCheckpointCoordinator,
  FirmwareTransactionStateMachine,
  FirmwareUpdateErrorCode,
} from '../../src/firmware-update';

import type {
  FirmwareCheckpoint,
  FirmwareCheckpointSink,
  PreparedPlan,
} from '../../src/firmware-update';

const PLAN_DIGEST = 'a'.repeat(64);
const MANIFEST_DIGEST = 'b'.repeat(64);

const createPreparedPlan = (): PreparedPlan => ({
  schemaVersion: 2,
  planId: 'classic1s-plan',
  planDigest: PLAN_DIGEST,
  manifestSnapshotDigest: MANIFEST_DIGEST,
  catalogEpoch: 1,
  networkPolicy: 'forbid',
  device: {
    identity: 'device-1',
    model: 'classic1s',
  },
  artifactReceipts: [
    {
      artifactId: 'firmware-main',
      role: 'firmware',
      target: 'firmware',
      artifactRef: 'artifact-firmware-main',
      size: 4,
      sha256: 'c'.repeat(64),
      integrity: 'catalog-trusted',
      leaseId: 'lease-1',
      materialization: {
        kind: 'raw',
      },
    },
  ],
  epochs: [
    {
      epochId: 'install-main',
      kind: 'component-install',
      artifactIds: ['firmware-main'],
      dependsOn: [],
      targetIds: ['firmware'],
    },
    {
      epochId: 'final-verify',
      kind: 'final-verify',
      artifactIds: [],
      dependsOn: ['install-main'],
      targetIds: ['firmware'],
    },
  ],
  expectedFinalStates: [
    {
      target: 'firmware',
      version: '4.0.0',
    },
  ],
});

const createMachine = ({
  initialCheckpoint,
}: {
  initialCheckpoint?: FirmwareCheckpoint;
} = {}) => {
  const checkpoints: FirmwareCheckpoint[] = [];
  const sink: FirmwareCheckpointSink = {
    commit: jest.fn(checkpoint => {
      checkpoints.push(checkpoint);
      return Promise.resolve();
    }),
  };
  const coordinator = new FirmwareCheckpointCoordinator({
    sink,
    generation: 7,
    initialCheckpoint,
  });
  const machine = new FirmwareTransactionStateMachine({
    preparedPlan: createPreparedPlan(),
    transactionId: 'transaction-1',
    generation: 7,
    checkpointCoordinator: coordinator,
    initialCheckpoint,
    now: () => 1000 + checkpoints.length,
  });
  return { checkpoints, machine };
};

const expectFirmwareError = async (promise: Promise<unknown>, errorCode: number) => {
  await expect(promise).rejects.toMatchObject({ errorCode });
};

describe('firmware transaction state machine', () => {
  it('persists a legal multi-epoch transaction and creates a terminal tombstone', async () => {
    const { checkpoints, machine } = createMachine();

    await machine.transition({ state: 'PREPARED', generation: 7 });
    await machine.transition({
      state: 'REVALIDATING_DEVICE',
      generation: 7,
      epochId: 'install-main',
    });
    await machine.transition({
      state: 'ENTERING_LOADER',
      generation: 7,
      epochId: 'install-main',
      destructiveAction: true,
    });
    await machine.transition({
      state: 'SYNCING_OR_TRANSFERRING',
      generation: 7,
      epochId: 'install-main',
      artifactId: 'firmware-main',
      artifactOffset: 0,
    });
    await machine.transition({
      state: 'SYNCING_OR_TRANSFERRING',
      generation: 7,
      epochId: 'install-main',
      completedArtifactId: 'firmware-main',
    });
    await machine.transition({
      state: 'STAGED',
      generation: 7,
      epochId: 'install-main',
    });
    await machine.transition({
      state: 'AWAITING_CONFIRMATION',
      generation: 7,
      epochId: 'install-main',
      installRequestStatus: 'request-pending',
    });
    await machine.transition({
      state: 'INSTALL_REQUESTED',
      generation: 7,
      epochId: 'install-main',
      installRequestStatus: 'acknowledged',
    });
    await machine.transition({
      state: 'INSTALLING',
      generation: 7,
      epochId: 'install-main',
      installRequestStatus: 'acknowledged',
    });
    await machine.transition({
      state: 'REBOOTING_BETWEEN_EPOCHS',
      generation: 7,
      epochId: 'install-main',
      completedEpochId: 'install-main',
    });
    await machine.transition({
      state: 'REVALIDATING_DEVICE',
      generation: 7,
      epochId: 'install-main',
    });
    await machine.transition({
      state: 'FINAL_VERIFYING',
      generation: 7,
      epochId: 'final-verify',
      completedEpochId: 'final-verify',
    });
    const terminal = await machine.transition({
      state: 'COMPLETED',
      generation: 7,
    });

    expect(terminal.terminal).toBe(true);
    expect(terminal.completedArtifactIds).toEqual(['firmware-main']);
    expect(terminal.completedEpochIds).toEqual(['install-main', 'final-verify']);
    expect(checkpoints.map(checkpoint => checkpoint.sequence)).toEqual(
      checkpoints.map((_checkpoint, index) => index)
    );
    await expectFirmwareError(
      machine.transition({ state: 'COMPLETED', generation: 7 }),
      FirmwareUpdateErrorCode.FirmwareCheckpointRejected
    );
  });

  it('rejects state regression, epoch skipping, and nonzero recovery offsets', async () => {
    const { machine } = createMachine();
    await machine.transition({ state: 'PREPARED', generation: 7 });

    await expectFirmwareError(
      machine.transition({
        state: 'REVALIDATING_DEVICE',
        generation: 7,
        epochId: 'final-verify',
      }),
      FirmwareUpdateErrorCode.FirmwareTransactionConflict
    );
    await machine.transition({
      state: 'REVALIDATING_DEVICE',
      generation: 7,
      epochId: 'install-main',
    });
    await expectFirmwareError(
      machine.transition({ state: 'PREPARED', generation: 7 }),
      FirmwareUpdateErrorCode.FirmwareTransactionConflict
    );
    await machine.transition({
      state: 'ENTERING_LOADER',
      generation: 7,
      epochId: 'install-main',
    });
    await expectFirmwareError(
      machine.transition({
        state: 'SYNCING_OR_TRANSFERRING',
        generation: 7,
        epochId: 'install-main',
        artifactId: 'firmware-main',
        artifactOffset: 2,
      }),
      FirmwareUpdateErrorCode.FirmwareTransactionConflict
    );
  });

  it('binds resume to the same plan, device, transaction, and generation', () => {
    const checkpoint: FirmwareCheckpoint = {
      schemaVersion: 1,
      transactionId: 'transaction-1',
      planDigest: PLAN_DIGEST,
      sequence: 3,
      state: 'PAUSED',
      timestampMs: 1000,
      generation: 7,
      deviceIdentity: 'different-device',
      completedArtifactIds: [],
      completedEpochIds: [],
      destructiveActionStarted: false,
      terminal: false,
    };
    const coordinator = new FirmwareCheckpointCoordinator({
      sink: { commit: jest.fn(() => Promise.resolve()) },
      generation: 7,
      initialCheckpoint: checkpoint,
    });

    expect(
      () =>
        new FirmwareTransactionStateMachine({
          preparedPlan: createPreparedPlan(),
          transactionId: 'transaction-1',
          generation: 7,
          checkpointCoordinator: coordinator,
          initialCheckpoint: checkpoint,
        })
    ).toThrow(
      expect.objectContaining({
        errorCode: FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
      })
    );
  });

  it('only permits abandonment after destructive work when reconciliation proves safety', async () => {
    const { machine } = createMachine();
    await machine.transition({ state: 'PREPARED', generation: 7 });
    await machine.transition({
      state: 'REVALIDATING_DEVICE',
      generation: 7,
      epochId: 'install-main',
    });
    await machine.transition({
      state: 'ENTERING_LOADER',
      generation: 7,
      epochId: 'install-main',
    });
    await machine.transition({ state: 'PAUSED', generation: 7 });

    await expectFirmwareError(
      machine.transition({ state: 'ABANDONED', generation: 7 }),
      FirmwareUpdateErrorCode.FirmwareTransactionConflict
    );
    await expect(
      machine.transition({
        state: 'ABANDONED',
        generation: 7,
        safeToAbandon: true,
      })
    ).resolves.toMatchObject({
      state: 'ABANDONED',
      terminal: true,
    });
  });

  it('rejects late progress callbacks after the terminal tombstone', async () => {
    const { machine } = createMachine();
    await machine.transition({ state: 'ABANDONED', generation: 7, safeToAbandon: true });

    await expectFirmwareError(
      machine.reportProgress(
        7,
        {
          transactionId: 'transaction-1',
          phase: 'ABANDONED',
          completed: 0,
          total: 0,
        },
        { report: jest.fn() }
      ),
      FirmwareUpdateErrorCode.FirmwareCheckpointRejected
    );
  });
});
