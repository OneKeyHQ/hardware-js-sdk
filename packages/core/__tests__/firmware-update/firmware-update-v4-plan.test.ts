import {
  FirmwareUpdateErrorCode,
  createProtocolV2MemoryPreparedPlan,
  parseProtocolV2PayloadPackageHeader,
} from '../../src/firmware-update';
import FirmwareUpdateV4 from '../../src/api/FirmwareUpdateV4';

import type { FirmwareTarget } from '../../src/firmware-update';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createPayloadPackage = (version: [number, number, number], fill: number): ArrayBuffer => {
  const bytes = new Uint8Array(0x52a0);
  bytes.set([0x4f, 0x4b, 0x50, 0x50], 0);
  bytes.set([0x46, 0x57, 0x20, 0x20], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0x0c, 0x52a0, true);
  view.setUint32(0x10, version[0] * 0x10000 + version[1] * 0x100 + version[2], true);
  bytes.fill(fill, 0x200, 0x280);
  return bytes.buffer;
};

const createPlan = (targets: readonly FirmwareTarget[]) =>
  createProtocolV2MemoryPreparedPlan({
    device: {
      identity: 'pro2-device',
      model: 'pro2',
      firmwareType: 'universal',
    },
    artifacts: targets.map((target, index) => ({
      target: target as Exclude<FirmwareTarget, 'firmware' | 'ble'>,
      binary: createPayloadPackage([1, 2, index + 1], index + 1),
      ...(target === 'resource'
        ? {
            logicalName: index === 0 ? 'images' : 'translations',
          }
        : {}),
    })),
  });

describe('Protocol V2 firmware epoch builder', () => {
  it('parses the local payload package header used for target verification', () => {
    expect(
      parseProtocolV2PayloadPackageHeader(new Uint8Array(createPayloadPackage([3, 4, 5], 0xab)))
    ).toMatchObject({
      type: 'FW  ',
      version: '3.4.5',
      packedVersion: 0x030405,
      payloadHash: 'ab'.repeat(64),
      headerHash: 'ab'.repeat(64),
    });
  });

  it('compiles every Pro2 component and candidate bundle into immutable epochs', () => {
    const { preparedPlan, binariesByArtifactRef } = createPlan([
      'resource',
      'bootloader',
      'p1',
      'p2',
      'coprocessor',
      'se01',
      'se02',
      'se03',
      'se04',
    ]);

    expect(preparedPlan.epochs.map(epoch => epoch.kind)).toEqual([
      'resource-sync',
      'bootloader-install',
      'bootloader-verify',
      'component-install',
      'final-verify',
    ]);
    expect(preparedPlan.epochs[1]).toMatchObject({
      targetIds: ['bootloader'],
    });
    expect(preparedPlan.epochs[3]).toMatchObject({
      targetIds: ['p1', 'p2', 'coprocessor', 'se01', 'se02', 'se03', 'se04'],
    });
    expect(preparedPlan.artifactReceipts).toHaveLength(9);
    expect(binariesByArtifactRef.size).toBe(9);
    expect(preparedPlan.networkPolicy).toBe('forbid');
    expect(JSON.stringify(preparedPlan)).not.toMatch(/sourceUrls|devicePath|binary|arrayBuffer/i);
  });

  it('omits both bootloader epochs when the plan has no bootloader target', () => {
    const { preparedPlan } = createPlan(['p1', 'coprocessor']);

    expect(preparedPlan.epochs.map(epoch => epoch.kind)).toEqual([
      'component-install',
      'final-verify',
    ]);
  });

  it('fails closed for targets outside the supported bootloader executor', () => {
    expect(() =>
      createProtocolV2MemoryPreparedPlan({
        device: { identity: 'pro2-device', model: 'pro2' },
        artifacts: [
          {
            target: 'romloader' as never,
            binary: createPayloadPackage([1, 0, 0], 1),
          },
        ],
      })
    ).toThrow(
      expect.objectContaining({
        errorCode: FirmwareUpdateErrorCode.FirmwarePlanInvalid,
      })
    );
    expect(() =>
      createProtocolV2MemoryPreparedPlan({
        device: { identity: 'pro2-device', model: 'pro2' },
        artifacts: [
          {
            target: 'crate' as never,
            binary: createPayloadPackage([1, 0, 0], 1),
          },
        ],
      })
    ).toThrow(
      expect.objectContaining({
        errorCode: FirmwareUpdateErrorCode.FirmwarePlanInvalid,
      })
    );
  });

  it('returns a version, hash, and status for every planned target', () => {
    const { preparedPlan } = createPlan(['resource', 'p1', 'coprocessor']);
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'native',
      },
    });
    (method as any).protocolV2InstalledTargets.add('p1');
    (method as any).protocolV2ResourceStatuses.set('images', 'unchanged');
    (method as any).protocolV2LatestStatusRecords = [
      {
        target_id: 4,
        status: 2,
        payload_version: 0x010202,
        path: 'vol0:/application_p1.bin',
      },
    ];

    const result = (method as any).buildProtocolV2Result(preparedPlan, {
      firmwareVersion: '1.2.2',
      bootloaderVersion: '0.0.0',
      bleVersion: '1.2.3',
      verify: {
        firmwareHash: 'AA',
        bleHash: 'BB',
      },
    });

    expect(result.targets).toEqual([
      {
        target: 'p1',
        version: '1.2.2',
        hash: 'aa',
        status: 'installed',
      },
      {
        target: 'coprocessor',
        version: '1.2.3',
        hash: 'bb',
        status: 'verified',
      },
      {
        target: 'resource',
        hash: preparedPlan.expectedFinalStates.find(state => state.target === 'resource')?.sha256,
        status: 'unchanged',
      },
    ]);
  });
});
