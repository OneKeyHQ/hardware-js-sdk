import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { buildFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePlan';

import type { Features } from '../../src/types';

const createFeatures = ({
  deviceType,
  firmwareVersion = '1.0.0',
  bootloaderVersion = '1.0.0',
}: {
  deviceType: EDeviceType;
  firmwareVersion?: string;
  bootloaderVersion?: string;
}) =>
  ({
    deviceType,
    serialNo: `${deviceType}-device-id`,
    firmwareVersion,
    bootloaderVersion,
  } as Features);

const noUpdate = {
  status: 'valid',
  release: undefined,
};

describe('buildFirmwareUpdatePlan', () => {
  test('selects all legacy artifacts before execution and chooses the desktop full resource', () => {
    const plan = buildFirmwareUpdatePlan({
      features: createFeatures({
        deviceType: EDeviceType.Classic1s,
        firmwareVersion: '1.0.0',
      }),
      firmwareType: EFirmwareType.Universal,
      platform: 'desktop',
      firmware: {
        status: 'outdated',
        release: {
          url: 'https://firmware.onekey.so/classic/firmware.bin',
          expectedSize: 1024,
          fingerprint: '1111111111111111111111111111111111111111111111111111111111111111',
          version: [3, 0, 0],
          resource: 'https://firmware.onekey.so/classic/resource.zip',
          fullResource: 'https://firmware.onekey.so/classic/full-resource.zip',
          fullResourceExpectedSize: 4096,
          fullResourceFingerprint:
            '2222222222222222222222222222222222222222222222222222222222222222',
          fullResourceRange: ['2.0.0', '3.0.0'],
        },
      },
      ble: {
        status: 'outdated',
        release: {
          webUpdate: 'https://firmware.onekey.so/classic/ble.bin',
          expectedSize: 512,
          fingerprintWeb: '3333333333333333333333333333333333333333333333333333333333333333',
        },
      },
      bootloader: {
        status: 'outdated',
        shouldUpdate: true,
        release: {
          bootloaderResource: 'https://firmware.onekey.so/classic/bootloader.bin',
          bootloaderExpectedSize: 768,
          bootloaderFingerprint: '4444444444444444444444444444444444444444444444444444444444444444',
          bootloaderVersion: [2, 0, 0],
        },
      },
    });

    expect(plan.executor).toBe('v2');
    expect(plan.artifacts).toEqual([
      expect.objectContaining({
        artifactId: 'bootloader',
        role: 'bootloader',
        expectedSize: 768,
        targetVersion: '2.0.0',
      }),
      expect.objectContaining({
        artifactId: 'firmware',
        role: 'firmware',
        expectedSize: 1024,
        targetVersion: '3.0.0',
      }),
      expect.objectContaining({
        artifactId: 'resource',
        role: 'resource',
        url: 'https://firmware.onekey.so/classic/full-resource.zip',
        expectedSize: 4096,
      }),
      expect.objectContaining({
        artifactId: 'ble',
        role: 'ble',
        expectedSize: 512,
      }),
    ]);
    expect(plan.targetsToUpdate).toEqual(['bootloader', 'firmware', 'resource', 'ble']);
  });

  test('selects V3 for Pro with bootloader 2.8 or newer', () => {
    const plan = buildFirmwareUpdatePlan({
      features: createFeatures({
        deviceType: EDeviceType.Pro,
        bootloaderVersion: '2.8.0',
      }),
      firmwareType: EFirmwareType.BitcoinOnly,
      platform: 'native',
      firmware: {
        status: 'outdated',
        release: {
          url: 'https://firmware.onekey.so/pro/firmware.bin',
          version: [4, 0, 0],
        },
      },
      ble: noUpdate,
      bootloader: noUpdate,
    });

    expect(plan.executor).toBe('v3');
    expect(plan.firmwareType).toBe(EFirmwareType.BitcoinOnly);
    expect(plan.platform).toBe('native');
  });

  test('rejects a prepared native plan without a stable device identity', () => {
    const features = createFeatures({
      deviceType: EDeviceType.Classic1s,
    });
    delete (features as Partial<Features>).serialNo;

    expect(() =>
      buildFirmwareUpdatePlan({
        features,
        firmwareType: EFirmwareType.Universal,
        platform: 'native',
        firmware: {
          status: 'outdated',
          release: {
            url: 'https://firmware.onekey.so/classic/firmware.bin',
          },
        },
        ble: noUpdate,
        bootloader: noUpdate,
      })
    ).toThrow('requires a stable device identity');
  });

  test('maps the Pro2 component order and resource bundles without downloading them', () => {
    const plan = buildFirmwareUpdatePlan({
      features: createFeatures({ deviceType: EDeviceType.Pro2 }),
      firmwareType: EFirmwareType.Universal,
      platform: 'desktop',
      firmware: {
        status: 'required',
        release: {
          installOrder: ['bootloader', 'applicationP1'],
          components: {
            applicationP1: {
              target: 'APPLICATION_P1',
              url: 'https://firmware.onekey.so/pro2/application-p1.bin',
              expectedSize: 1024,
              fingerprint: '1111111111111111111111111111111111111111111111111111111111111111',
            },
            bootloader: {
              target: 'BOOTLOADER',
              url: 'https://firmware.onekey.so/pro2/bootloader.bin',
            },
            se01: {
              target: 'SE01',
              url: 'https://firmware.onekey.so/pro2/se01.bin',
            },
          },
          resourceBundles: [
            {
              name: 'images',
              url: 'https://firmware.onekey.so/pro2/images.okpkg',
            },
          ],
        },
      },
      ble: noUpdate,
      bootloader: noUpdate,
    });

    expect(plan.executor).toBe('v4');
    expect(plan.artifacts.map(artifact => artifact.artifactId)).toEqual([
      'component:boot',
      'component:app_v1',
      'component:se01',
      'resourceBundle:images',
    ]);
    expect(plan.targetsToUpdate).toEqual(['boot', 'app_v1', 'se01', 'resource']);
    expect(plan.epochs).toEqual([
      {
        epoch: 0,
        kind: 'resource-sync',
        artifactIds: ['resourceBundle:images'],
        targets: ['resource'],
      },
      {
        epoch: 1,
        kind: 'bootloader-install',
        artifactIds: ['component:boot'],
        targets: ['boot'],
      },
      {
        epoch: 2,
        kind: 'bootloader-verify',
        artifactIds: [],
        targets: ['boot'],
      },
      {
        epoch: 3,
        kind: 'component-install',
        artifactIds: ['component:app_v1', 'component:se01'],
        targets: ['app_v1', 'se01'],
      },
      {
        epoch: 4,
        kind: 'final-verify',
        artifactIds: [],
        targets: ['boot', 'app_v1', 'se01', 'resource'],
      },
    ]);
    expect(plan.artifacts[1]).toEqual(
      expect.objectContaining({
        expectedSize: 1024,
        expectedSha256: '1111111111111111111111111111111111111111111111111111111111111111',
      })
    );
  });

  test('rejects Pro2 ROMLOADER because it requires a separate loader flow', () => {
    expect(() =>
      buildFirmwareUpdatePlan({
        features: createFeatures({ deviceType: EDeviceType.Pro2 }),
        firmwareType: EFirmwareType.Universal,
        platform: 'desktop',
        firmware: {
          status: 'required',
          release: {
            components: {
              romloader: {
                target: 'ROMLOADER',
                url: 'https://firmware.onekey.so/pro2/romloader.bin',
              },
            },
          },
        },
        ble: noUpdate,
        bootloader: noUpdate,
      })
    ).toThrow('ROMLOADER requires its dedicated loader flow');
  });

  test.each([
    {
      label: 'component target',
      release: {
        components: {
          application: {
            target: 'APPLICATION_P1',
            url: 'https://firmware.onekey.so/pro2/application.bin',
          },
          applicationDuplicate: {
            target: 'APPLICATION_P1',
            url: 'https://firmware.onekey.so/pro2/application-duplicate.bin',
          },
        },
      },
      expectedError: 'duplicates target app_v1',
    },
    {
      label: 'resource bundle name',
      release: {
        components: {
          application: {
            target: 'APPLICATION_P1',
            url: 'https://firmware.onekey.so/pro2/application.bin',
          },
        },
        resourceBundles: [
          {
            name: 'images',
            url: 'https://firmware.onekey.so/pro2/images.okpkg',
          },
          {
            name: 'images',
            url: 'https://firmware.onekey.so/pro2/images-duplicate.okpkg',
          },
        ],
      },
      expectedError: 'duplicates name images',
    },
  ])('rejects a duplicate Pro2 $label', ({ release, expectedError }) => {
    expect(() =>
      buildFirmwareUpdatePlan({
        features: createFeatures({ deviceType: EDeviceType.Pro2 }),
        firmwareType: EFirmwareType.Universal,
        platform: 'desktop',
        firmware: {
          status: 'required',
          release,
        },
        ble: noUpdate,
        bootloader: noUpdate,
      })
    ).toThrow(expectedError);
  });

  test('produces a deterministic digest and binds it to the platform', () => {
    const input = {
      features: createFeatures({ deviceType: EDeviceType.Classic1s }),
      firmwareType: EFirmwareType.Universal,
      firmware: noUpdate,
      ble: noUpdate,
      bootloader: noUpdate,
    };
    const first = buildFirmwareUpdatePlan({ ...input, platform: 'native' });
    const second = buildFirmwareUpdatePlan({ ...input, platform: 'native' });
    const desktop = buildFirmwareUpdatePlan({ ...input, platform: 'desktop' });

    expect(first.planDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.planDigest).toBe(second.planDigest);
    expect(first.planDigest).not.toBe(desktop.planDigest);
  });

  test('binds trusted artifact integrity metadata into the plan digest', () => {
    const createPlan = (fingerprint: string) =>
      buildFirmwareUpdatePlan({
        features: createFeatures({ deviceType: EDeviceType.Classic1s }),
        firmwareType: EFirmwareType.Universal,
        platform: 'native',
        firmware: {
          status: 'outdated',
          release: {
            url: 'https://firmware.onekey.so/classic/firmware.bin',
            version: [3, 0, 0],
            expectedSize: 1024,
            fingerprint,
          },
        },
        ble: noUpdate,
        bootloader: noUpdate,
      });

    const first = createPlan('1111111111111111111111111111111111111111111111111111111111111111');
    const second = createPlan('2222222222222222222222222222222222222222222222222222222222222222');

    expect(first.artifacts[0]).toEqual(
      expect.objectContaining({
        expectedSize: 1024,
        expectedSha256: '1111111111111111111111111111111111111111111111111111111111111111',
      })
    );
    expect(first.planDigest).not.toBe(second.planDigest);
  });
});
