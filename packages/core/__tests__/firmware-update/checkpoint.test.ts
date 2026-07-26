import {
  FirmwareCheckpointCoordinator,
  FirmwareHostBindingRegistry,
  FirmwareUpdateErrorCode,
  RecoverableFirmwareExecutor,
} from '../../src/firmware-update';

import type {
  FirmwareArtifactReader,
  FirmwareCheckpoint,
  FirmwareCheckpointSink,
  FirmwareExecutorDriver,
  FirmwareObservedDeviceState,
  PreparedPlan,
} from '../../src/firmware-update';

const PLAN_DIGEST = 'a'.repeat(64);
const FIRMWARE_BYTES = new Uint8Array([1, 2, 3, 4]);

const createPreparedPlan = (): PreparedPlan => ({
  schemaVersion: 2,
  planId: 'classic1s-plan',
  planDigest: PLAN_DIGEST,
  manifestSnapshotDigest: 'b'.repeat(64),
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
      size: FIRMWARE_BYTES.byteLength,
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

const createTwoArtifactPreparedPlan = (): PreparedPlan => {
  const plan = createPreparedPlan();
  const secondReceipt = {
    ...plan.artifactReceipts[0],
    artifactId: 'firmware-second',
    artifactRef: 'artifact-firmware-second',
    sha256: 'd'.repeat(64),
    leaseId: 'lease-2',
  };
  return {
    ...plan,
    artifactReceipts: [...plan.artifactReceipts, secondReceipt],
    epochs: [
      {
        ...plan.epochs[0],
        artifactIds: ['firmware-main', 'firmware-second'],
      },
      plan.epochs[1],
    ],
  } as PreparedPlan;
};

const createArtifactReader = (): FirmwareArtifactReader => ({
  open: jest.fn(() =>
    Promise.resolve({
      readerId: 'reader-1',
      size: FIRMWARE_BYTES.byteLength,
    })
  ),
  read: jest.fn(({ offset, length }) => {
    const bytes = FIRMWARE_BYTES.slice(offset, offset + length);
    return Promise.resolve({
      data: bytes.buffer as ArrayBuffer,
      bytesRead: bytes.byteLength,
      eof: offset + bytes.byteLength === FIRMWARE_BYTES.byteLength,
    });
  }),
  close: jest.fn(() => Promise.resolve()),
  cancel: jest.fn(() => Promise.resolve()),
});

const createObservedState = (): FirmwareObservedDeviceState => ({
  identity: 'device-1',
  model: 'classic1s',
  mode: 'normal',
  versions: {},
  pendingInstall: false,
  statusQuerySupported: true,
  statusAvailable: true,
});

const createExecutorHarness = ({
  checkpointSink,
  initialCheckpoint,
  initialObserved,
  installResponseLost = false,
  preparedPlan = createPreparedPlan(),
  replaceHostBinding = false,
}: {
  checkpointSink: FirmwareCheckpointSink;
  initialCheckpoint?: FirmwareCheckpoint;
  initialObserved?: FirmwareObservedDeviceState;
  installResponseLost?: boolean;
  preparedPlan?: PreparedPlan;
  replaceHostBinding?: boolean;
}) => {
  const registry = new FirmwareHostBindingRegistry();
  if (replaceHostBinding) {
    registry.register({
      artifactReader: createArtifactReader(),
      checkpointSink: {
        commit: jest.fn(() => Promise.resolve()),
      },
    });
  }
  registry.register({
    artifactReader: createArtifactReader(),
    checkpointSink,
  });
  let observed = initialObserved ?? createObservedState();
  const enterLoader = jest.fn(() => Promise.resolve());
  const requestInstall = jest.fn(() => {
    observed = {
      ...observed,
      mode: 'installing',
      pendingInstall: true,
    };
    return installResponseLost
      ? Promise.reject(new Error('install response lost'))
      : Promise.resolve();
  });
  const transferArtifact = jest.fn(
    async ({
      source,
      reportProgress,
    }: Parameters<FirmwareExecutorDriver['transferArtifact']>[0]) => {
      const data = await source.readAt(0, source.size);
      await reportProgress(data.byteLength, source.size);
    }
  );
  const stageEpoch = jest.fn(() => Promise.resolve());
  const driver: FirmwareExecutorDriver = {
    readDeviceState: jest.fn(() => Promise.resolve(observed)),
    enterLoader,
    transferArtifact,
    stageEpoch,
    requestInstall,
    waitForInstall: jest.fn(() => {
      observed = {
        ...observed,
        mode: 'normal',
        pendingInstall: false,
        versions: {
          firmware: '4.0.0',
        },
      };
      return Promise.resolve();
    }),
    rebootBetweenEpochs: jest.fn(() => Promise.resolve()),
    verifyFinal: jest.fn(() => Promise.resolve()),
  };
  const executor = new RecoverableFirmwareExecutor({
    preparedPlan,
    transactionId: 'transaction-1',
    registry,
    driver,
    initialCheckpoint,
  });
  return { driver, enterLoader, executor, requestInstall, stageEpoch, transferArtifact };
};

describe('firmware checkpoint persistence', () => {
  it('commits the destructive checkpoint before entering loader or requesting install', async () => {
    const checkpoints: FirmwareCheckpoint[] = [];
    const checkpointSink: FirmwareCheckpointSink = {
      commit: jest.fn(checkpoint => {
        checkpoints.push(checkpoint);
        return Promise.resolve();
      }),
    };
    const { enterLoader, executor, requestInstall } = createExecutorHarness({
      checkpointSink,
    });

    await expect(executor.run()).resolves.toMatchObject({
      state: 'COMPLETED',
      terminal: true,
    });

    expect(enterLoader).toHaveBeenCalledTimes(1);
    expect(requestInstall).toHaveBeenCalledTimes(1);
    expect(
      checkpoints.findIndex(checkpoint => checkpoint.state === 'ENTERING_LOADER')
    ).toBeLessThan(
      checkpoints.findIndex(checkpoint => checkpoint.state === 'SYNCING_OR_TRANSFERRING')
    );
    expect(
      checkpoints.find(checkpoint => checkpoint.state === 'AWAITING_CONFIRMATION')
    ).toMatchObject({
      installRequestStatus: 'request-pending',
    });
    expect(checkpoints.find(checkpoint => checkpoint.state === 'INSTALL_REQUESTED')).toMatchObject({
      installRequestStatus: 'acknowledged',
    });
  });

  it('fails closed when the pre-loader checkpoint is rejected', async () => {
    const checkpointSink: FirmwareCheckpointSink = {
      commit: jest.fn(checkpoint => {
        if (checkpoint.state === 'ENTERING_LOADER') {
          return Promise.reject(new Error('journal unavailable'));
        }
        return Promise.resolve();
      }),
    };
    const { enterLoader, executor } = createExecutorHarness({ checkpointSink });

    await expect(executor.run()).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareCheckpointRejected,
    });
    expect(enterLoader).not.toHaveBeenCalled();
  });

  it('turns a checkpoint timeout into a stable rejection error', async () => {
    const coordinator = new FirmwareCheckpointCoordinator({
      sink: {
        commit: jest.fn(
          () =>
            new Promise<void>(() => {
              // Intentionally unresolved to exercise the coordinator timeout.
            })
        ),
      },
      generation: 3,
      timeoutMs: 1,
    });

    await expect(
      coordinator.commit({
        schemaVersion: 1,
        transactionId: 'transaction-timeout',
        planDigest: PLAN_DIGEST,
        sequence: 0,
        state: 'PREPARED',
        timestampMs: 1000,
        generation: 3,
      })
    ).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareCheckpointRejected,
    });
  });

  it('reconciles a lost install response and never sends the install request twice', async () => {
    const firstCheckpoints: FirmwareCheckpoint[] = [];
    const firstHarness = createExecutorHarness({
      checkpointSink: {
        commit: jest.fn(checkpoint => {
          firstCheckpoints.push(checkpoint);
          return Promise.resolve();
        }),
      },
      installResponseLost: true,
    });

    await expect(firstHarness.executor.run()).rejects.toThrow('install response lost');
    const pausedCheckpoint = firstHarness.executor.getCheckpoint();
    expect(pausedCheckpoint).toMatchObject({
      state: 'PAUSED',
      installRequestStatus: 'request-pending',
      completedArtifactIds: ['firmware-main'],
    });
    expect(firstHarness.requestInstall).toHaveBeenCalledTimes(1);

    const resumedHarness = createExecutorHarness({
      checkpointSink: {
        commit: jest.fn(() => Promise.resolve()),
      },
      initialCheckpoint: pausedCheckpoint as FirmwareCheckpoint,
      replaceHostBinding: true,
      initialObserved: {
        ...createObservedState(),
        mode: 'installing',
        pendingInstall: true,
      },
    });

    await expect(resumedHarness.executor.run()).resolves.toMatchObject({
      state: 'COMPLETED',
      generation: 2,
    });
    expect(resumedHarness.requestInstall).not.toHaveBeenCalled();
  });

  it('persists PAUSED when install reconciliation is unavailable', async () => {
    const initialCheckpoint: FirmwareCheckpoint = {
      schemaVersion: 1,
      transactionId: 'transaction-1',
      planDigest: PLAN_DIGEST,
      sequence: 8,
      state: 'INSTALLING',
      timestampMs: 1000,
      generation: 1,
      deviceIdentity: 'device-1',
      epochId: 'install-main',
      completedArtifactIds: ['firmware-main'],
      completedEpochIds: [],
      destructiveActionStarted: true,
      terminal: false,
      installRequestStatus: 'acknowledged',
    };
    const harness = createExecutorHarness({
      checkpointSink: {
        commit: jest.fn(() => Promise.resolve()),
      },
      initialCheckpoint,
      initialObserved: {
        ...createObservedState(),
        statusQuerySupported: false,
        statusAvailable: false,
        pendingInstall: undefined,
      },
    });

    await expect(harness.executor.run()).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareReconciliationUnavailable,
    });
    expect(harness.executor.getCheckpoint()).toMatchObject({
      state: 'PAUSED',
      installRequestStatus: 'acknowledged',
    });
    expect(harness.requestInstall).not.toHaveBeenCalled();
  });

  it('abandons safely before execution begins', async () => {
    const harness = createExecutorHarness({
      checkpointSink: {
        commit: jest.fn(() => Promise.resolve()),
      },
    });

    await expect(harness.executor.cancel()).resolves.toMatchObject({
      state: 'ABANDONED',
      terminal: true,
    });
    expect(harness.enterLoader).not.toHaveBeenCalled();
  });

  it('skips completed files and restarts only the interrupted file from offset zero', async () => {
    const initialCheckpoint: FirmwareCheckpoint = {
      schemaVersion: 1,
      transactionId: 'transaction-1',
      planDigest: PLAN_DIGEST,
      sequence: 4,
      state: 'PAUSED',
      timestampMs: 1000,
      generation: 1,
      deviceIdentity: 'device-1',
      epochId: 'install-main',
      artifactId: 'firmware-second',
      artifactOffset: 0,
      completedArtifactIds: ['firmware-main'],
      completedEpochIds: [],
      destructiveActionStarted: true,
      terminal: false,
    };
    const harness = createExecutorHarness({
      checkpointSink: {
        commit: jest.fn(() => Promise.resolve()),
      },
      initialCheckpoint,
      preparedPlan: createTwoArtifactPreparedPlan(),
    });

    await expect(harness.executor.run()).resolves.toMatchObject({
      state: 'COMPLETED',
    });
    expect(harness.transferArtifact).toHaveBeenCalledTimes(1);
    expect(harness.transferArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt: expect.objectContaining({
          artifactId: 'firmware-second',
        }),
        restartOffset: 0,
      })
    );
  });

  it('turns cancellation during transfer into PAUSED without staging or installing', async () => {
    const harness = createExecutorHarness({
      checkpointSink: {
        commit: jest.fn(() => Promise.resolve()),
      },
    });
    let notifyTransferStarted: (() => void) | undefined;
    let releaseTransfer: (() => void) | undefined;
    const transferStarted = new Promise<void>(resolve => {
      notifyTransferStarted = resolve;
    });
    const transferGate = new Promise<void>(resolve => {
      releaseTransfer = resolve;
    });
    harness.driver.transferArtifact = jest.fn(async () => {
      notifyTransferStarted?.();
      await transferGate;
    });

    const runPromise = harness.executor.run();
    await transferStarted;
    await harness.executor.cancel();
    releaseTransfer?.();

    await expect(runPromise).resolves.toMatchObject({
      state: 'PAUSED',
    });
    expect(harness.stageEpoch).not.toHaveBeenCalled();
    expect(harness.requestInstall).not.toHaveBeenCalled();
  });
});
