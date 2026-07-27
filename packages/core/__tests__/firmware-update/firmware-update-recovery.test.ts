import { EFirmwareType } from '@onekeyfe/hd-shared';

import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import { FirmwareCheckpointWriter } from '../../src/api/firmware/FirmwareCheckpoint';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createMethod = ({ firmwareVersion }: { firmwareVersion: string }) => {
  const checkpoints: unknown[] = [];
  const method = new FirmwareUpdateV3({
    id: 1,
    payload: {
      method: 'firmwareUpdateV3',
      platform: 'desktop',
      firmwareVersion: [4, 10, 0],
      firmwareType: EFirmwareType.Universal,
      checkpointSequenceStart: 1,
      resumeCheckpoint: {
        schemaVersion: 1,
        sequence: 1,
        stage: 'INSTALL_ACCEPTED',
        destructiveActionStarted: true,
        target: 'firmware',
      },
      checkpointSink: {
        commit(checkpoint) {
          checkpoints.push(checkpoint);
          return Promise.resolve();
        },
      },
    },
  });
  method.init();
  (method as any).checkpointWriter = new FirmwareCheckpointWriter((method as any).params, {
    required: true,
  });
  const features = {
    firmwareVersion,
    bootloaderVersion: '2.8.0',
    bleVersion: '1.0.0',
    firmwareType: EFirmwareType.Universal,
    capabilities: [],
  };
  return { checkpoints, features, method };
};

describe('firmware recovery reconciliation', () => {
  it('finishes an acknowledged V3 install only after expected versions match', async () => {
    const { checkpoints, features, method } = createMethod({
      firmwareVersion: '4.10.0',
    });

    await expect((method as any).reconcileInterruptedInstall(features)).resolves.toEqual({
      bootloaderVersion: '2.8.0',
      bleVersion: '1.0.0',
      firmwareVersion: '4.10.0',
    });
    expect(checkpoints).toEqual([
      expect.objectContaining({
        sequence: 2,
        stage: 'FINAL_VERIFIED',
      }),
    ]);
  });

  it('never resends an ambiguous V3 install when versions cannot reconcile it', async () => {
    const { checkpoints, features, method } = createMethod({
      firmwareVersion: '4.9.0',
    });

    await expect((method as any).reconcileInterruptedInstall(features)).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareReconciliationUnavailable',
      },
    });
    expect(checkpoints).toEqual([]);
  });
});
