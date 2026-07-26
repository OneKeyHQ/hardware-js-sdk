import { FirmwareUpdateErrorCode, reconcileFirmwareTransaction } from '../../src/firmware-update';

import type {
  FirmwareCheckpoint,
  FirmwareObservedDeviceState,
  PreparedPlan,
} from '../../src/firmware-update';

const PLAN_DIGEST = 'a'.repeat(64);

const preparedPlan: PreparedPlan = {
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
      targetIds: ['firmware', 'ble'],
    },
  ],
  expectedFinalStates: [
    {
      target: 'firmware',
      version: '4.0.0',
    },
    {
      target: 'ble',
      version: '2.0.0',
    },
  ],
};

const createCheckpoint = (overrides: Partial<FirmwareCheckpoint> = {}): FirmwareCheckpoint => ({
  schemaVersion: 1,
  transactionId: 'transaction-1',
  planDigest: PLAN_DIGEST,
  sequence: 8,
  state: 'AWAITING_CONFIRMATION',
  timestampMs: 1000,
  generation: 2,
  deviceIdentity: 'device-1',
  epochId: 'install-main',
  artifactId: 'firmware-main',
  artifactOffset: 0,
  completedArtifactIds: [],
  completedEpochIds: [],
  destructiveActionStarted: true,
  terminal: false,
  installRequestStatus: 'request-pending',
  ...overrides,
});

const createObservedState = (
  overrides: Partial<FirmwareObservedDeviceState> = {}
): FirmwareObservedDeviceState => ({
  identity: 'device-1',
  model: 'classic1s',
  mode: 'normal',
  versions: {},
  pendingInstall: false,
  statusQuerySupported: true,
  statusAvailable: true,
  ...overrides,
});

describe('firmware transaction reconciliation', () => {
  it('preserves completed files and always restarts the interrupted file from zero', async () => {
    const result = await reconcileFirmwareTransaction({
      preparedPlan,
      checkpoint: createCheckpoint({
        state: 'PAUSED',
        completedArtifactIds: ['firmware-main'],
      }),
      readDeviceState: jest.fn(() => Promise.resolve(createObservedState())),
    });

    expect(result.completedArtifactIds).toEqual(['firmware-main']);
    expect(result.currentArtifactRestartOffset).toBe(0);
  });

  it('attaches to a pending install instead of issuing it again', async () => {
    const result = await reconcileFirmwareTransaction({
      preparedPlan,
      checkpoint: createCheckpoint({
        state: 'INSTALL_REQUESTED',
        installRequestStatus: 'acknowledged',
      }),
      readDeviceState: jest.fn(() =>
        Promise.resolve(
          createObservedState({
            mode: 'installing',
            pendingInstall: true,
          })
        )
      ),
    });

    expect(result.decision).toBe('attach-install');
  });

  it('recognizes an installed epoch and a fully completed transaction from versions', async () => {
    await expect(
      reconcileFirmwareTransaction({
        preparedPlan,
        checkpoint: createCheckpoint(),
        readDeviceState: jest.fn(() =>
          Promise.resolve(
            createObservedState({
              versions: {
                firmware: '4.0.0',
              },
            })
          )
        ),
      })
    ).resolves.toMatchObject({
      decision: 'epoch-completed',
    });

    await expect(
      reconcileFirmwareTransaction({
        preparedPlan,
        checkpoint: createCheckpoint(),
        readDeviceState: jest.fn(() =>
          Promise.resolve(
            createObservedState({
              versions: {
                firmware: '4.0.0',
                ble: '2.0.0',
              },
            })
          )
        ),
      })
    ).resolves.toMatchObject({
      decision: 'transaction-completed',
    });
  });

  it('fails instead of resending an acknowledged install with conflicting device state', async () => {
    await expect(
      reconcileFirmwareTransaction({
        preparedPlan,
        checkpoint: createCheckpoint({
          state: 'INSTALL_REQUESTED',
          installRequestStatus: 'acknowledged',
        }),
        readDeviceState: jest.fn(() =>
          Promise.resolve(
            createObservedState({
              pendingInstall: false,
            })
          )
        ),
      })
    ).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareTransactionConflict,
    });
  });

  it('pauses recovery with a stable error when status reconciliation is unavailable', async () => {
    await expect(
      reconcileFirmwareTransaction({
        preparedPlan,
        checkpoint: createCheckpoint({
          state: 'INSTALLING',
          installRequestStatus: 'acknowledged',
        }),
        readDeviceState: jest.fn(() =>
          Promise.resolve(
            createObservedState({
              statusQuerySupported: false,
              statusAvailable: false,
              pendingInstall: undefined,
            })
          )
        ),
      })
    ).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareReconciliationUnavailable,
    });
  });

  it('rejects recovery against a different physical device', async () => {
    await expect(
      reconcileFirmwareTransaction({
        preparedPlan,
        checkpoint: createCheckpoint(),
        readDeviceState: jest.fn(() =>
          Promise.resolve(
            createObservedState({
              identity: 'device-2',
            })
          )
        ),
      })
    ).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
    });
  });
});
