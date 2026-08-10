import { prepareFirmwareUpdateV4MemoryHost } from '../src/api/firmware/FirmwareMemoryHost';

import type { CoreApi } from '../src/types/api';
import type { FirmwareUpdatePlan } from '../src/types/api/firmwareUpdatePlan';

describe('prepareFirmwareUpdateV4MemoryHost', () => {
  test('registers artifact-backed component and resource readers', async () => {
    const componentBinary = new Uint8Array([1, 2, 3, 4]).buffer;
    const archiveBinary = new Uint8Array([5, 6]).buffer;
    const manifestBinary = new TextEncoder().encode('{"schema":1}').buffer;
    let artifactReader: Parameters<
      CoreApi['registerFirmwareUpdateHostBinding']
    >[0]['artifactReader'];
    const unregisterFirmwareUpdateHostBinding = jest.fn();
    const sdk = {
      prepareFirmwareUpdatePlan: jest.fn(({ plan, artifacts }) => ({
        schemaVersion: 2,
        preparedPlanDigest: 'b'.repeat(64),
        planDigest: plan.planDigest,
        networkPolicy: 'forbid',
        executor: plan.executor,
        deviceIdentity: plan.deviceIdentity,
        deviceModel: plan.deviceModel,
        firmwareType: plan.firmwareType,
        platform: plan.platform,
        leaseRef: 'test-lease',
        targetsToUpdate: plan.targetsToUpdate,
        artifacts: plan.artifacts.map(planArtifact => {
          const input = artifacts.find(item => item.artifactId === planArtifact.artifactId);
          return {
            ...planArtifact,
            artifact: input?.artifact,
            materializedEntries: input?.materializedEntries,
          };
        }),
      })),
      registerFirmwareUpdateHostBinding: jest.fn(binding => {
        artifactReader = binding.artifactReader;
        return 7;
      }),
      unregisterFirmwareUpdateHostBinding,
    } as unknown as Pick<
      CoreApi,
      | 'prepareFirmwareUpdatePlan'
      | 'registerFirmwareUpdateHostBinding'
      | 'unregisterFirmwareUpdateHostBinding'
    >;
    const plan = {
      schemaVersion: 2,
      planDigest: 'a'.repeat(64),
      executor: 'v4',
      deviceIdentity: 'device-id',
      deviceModel: 'pro2',
      firmwareType: 0,
      platform: 'web',
      targetsToUpdate: ['boot', 'resource'],
      artifacts: [
        {
          artifactId: 'component:boot',
          role: 'component',
          target: 'boot',
          url: 'https://example.com/boot.okpkg',
          container: 'raw',
        },
        {
          artifactId: 'resource:archive',
          role: 'resourceBundle',
          target: 'resource',
          url: 'https://example.com/resource.zip',
          container: 'zip',
          logicalName: 'resource-archive',
        },
      ],
    } as FirmwareUpdatePlan;

    const host = prepareFirmwareUpdateV4MemoryHost({
      sdk,
      plan,
      artifacts: [
        { artifactId: 'component:boot', binary: componentBinary },
        {
          artifactId: 'resource:archive',
          binary: archiveBinary,
          materializedEntries: [{ entryName: 'manifest.json', binary: manifestBinary }],
        },
      ],
    });

    expect(host.hostBindingGeneration).toBe(7);
    expect(sdk.registerFirmwareUpdateHostBinding).toHaveBeenCalledWith(
      expect.objectContaining({ preparedPlanDigest: host.preparedPlan.preparedPlanDigest })
    );
    const componentArtifact = host.preparedPlan.artifacts.find(
      artifact => artifact.target === 'boot'
    )?.artifact;
    const resourceEntryArtifact = host.preparedPlan.artifacts.find(
      artifact => artifact.target === 'resource'
    )?.materializedEntries?.[0]?.artifact;
    expect(componentArtifact?.size).toBe(componentBinary.byteLength);
    expect(resourceEntryArtifact?.size).toBe(manifestBinary.byteLength);
    if (!artifactReader || !componentArtifact || !resourceEntryArtifact) {
      throw new Error('Firmware memory host test setup is incomplete');
    }
    new Uint8Array(componentBinary).fill(9);
    const opened = await artifactReader.open({
      artifactRef: componentArtifact.artifactRef,
    });
    const chunk = await artifactReader.read({
      readerId: opened.readerId,
      offset: 1,
      length: 2,
    });
    expect(Array.from(new Uint8Array(chunk.data))).toEqual([2, 3]);
    await artifactReader.close({ readerId: opened.readerId });

    // Materialized ZIP entries are receipts only. Execution opens the approved
    // archive and re-derives these bytes, so the memory host must not retain a
    // second readable copy of every expanded resource file.
    expect(() => artifactReader.open({ artifactRef: resourceEntryArtifact.artifactRef })).toThrow(
      'Firmware memory artifact is unavailable'
    );

    host.release();
    expect(unregisterFirmwareUpdateHostBinding).toHaveBeenCalledWith(7);
  });
});
