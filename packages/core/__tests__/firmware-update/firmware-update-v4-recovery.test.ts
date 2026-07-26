import {
  FirmwareUpdateErrorCode,
  buildProtocolV2InstallTargets,
  reconcileProtocolV2InstallRecords,
} from '../../src/firmware-update';

import type { FirmwareUpdateEpoch } from '../../src/firmware-update';

const componentEpoch: FirmwareUpdateEpoch = {
  epochId: 'component-install',
  kind: 'component-install',
  artifactIds: ['p1', 'se01'],
  dependsOn: [],
  targetIds: ['p1', 'se01'],
};

describe('Protocol V2 firmware install recovery', () => {
  it('derives target ids and staging paths entirely from the SDK table', () => {
    expect(buildProtocolV2InstallTargets(componentEpoch)).toEqual([
      { target_id: 4, path: 'vol0:/application_p1.bin' },
      { target_id: 7, path: 'vol0:/se01.bin' },
    ]);
  });

  it('attaches to matching in-progress records without resending the request', () => {
    expect(
      reconcileProtocolV2InstallRecords({
        epoch: componentEpoch,
        records: [
          {
            target_id: 'FW_MGMT_TARGET_APPLICATION_P1',
            status: 'FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS',
            path: 'vol0:/application_p1.bin',
          },
          {
            target_id: 7,
            status: 0,
            path: 'vol0:/se01.bin',
          },
        ],
      })
    ).toEqual({
      decision: 'attach',
      pendingInstall: true,
      versions: {},
      targets: [
        { target: 'p1', status: 'installing' },
        { target: 'se01', status: 'pending' },
      ],
    });
  });

  it('uses finished record payload versions for epoch reconciliation', () => {
    expect(
      reconcileProtocolV2InstallRecords({
        epoch: componentEpoch,
        records: [
          {
            target_id: 4,
            status: 2,
            payload_version: 0x010203,
            path: 'vol0:/application_p1.bin',
          },
          {
            target_id: 7,
            status: 2,
            payload_version: 0x040506,
            path: 'vol0:/se01.bin',
          },
        ],
      })
    ).toMatchObject({
      decision: 'finished',
      pendingInstall: false,
      versions: {
        p1: '1.2.3',
        se01: '4.5.6',
      },
    });
  });

  it.each([
    {
      name: 'path conflict',
      records: [
        {
          target_id: 4,
          status: 1,
          path: 'vol0:/wrong.bin',
        },
        {
          target_id: 7,
          status: 0,
          path: 'vol0:/se01.bin',
        },
      ],
    },
    {
      name: 'missing target record',
      records: [
        {
          target_id: 4,
          status: 1,
          path: 'vol0:/application_p1.bin',
        },
      ],
    },
    {
      name: 'active CRATE record',
      records: [
        {
          target_id: 1,
          status: 1,
          path: 'vol0:/crate.bin',
        },
      ],
    },
    {
      name: 'unknown status',
      records: [
        {
          target_id: 4,
          status: 'FW_MGMT_UPDATER_TASK_STATUS_UNKNOWN',
          path: 'vol0:/application_p1.bin',
        },
        {
          target_id: 7,
          status: 0,
          path: 'vol0:/se01.bin',
        },
      ],
    },
  ])('rejects $name instead of attaching to another transaction', ({ records }) => {
    expect(() =>
      reconcileProtocolV2InstallRecords({
        epoch: componentEpoch,
        records,
      })
    ).toThrow(
      expect.objectContaining({
        errorCode: FirmwareUpdateErrorCode.FirmwareTransactionConflict,
      })
    );
  });
});
