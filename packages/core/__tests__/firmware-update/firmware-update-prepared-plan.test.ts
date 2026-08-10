import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import {
  buildFirmwareUpdatePlan,
  digestFirmwareUpdateContract,
} from '../../src/api/firmware/FirmwareUpdatePlan';
import {
  assertFirmwareUpdatePreparedPlanBinding,
  assertFirmwareUpdatePreparedPlanDeviceIdentity,
  prepareFirmwareUpdatePlan,
  validateFirmwareUpdatePreparedPlan,
} from '../../src/api/firmware/FirmwareUpdatePreparedPlan';

import type { Features } from '../../src/types';

const buildPlan = () =>
  buildFirmwareUpdatePlan({
    features: {
      deviceType: EDeviceType.Classic1s,
      serialNo: 'classic1s-device-id',
      firmwareVersion: '1.0.0',
      bootloaderVersion: '1.0.0',
    } as Features,
    firmwareType: EFirmwareType.Universal,
    platform: 'native',
    firmware: {
      status: 'outdated',
      release: {
        url: 'https://firmware.onekey.so/classic/firmware.bin',
        expectedSize: 4,
        fingerprint: 'a'.repeat(64),
        version: [3, 0, 0],
        resource: 'https://firmware.onekey.so/classic/resource.zip',
        resourceExpectedSize: 8,
        resourceFingerprint: 'b'.repeat(64),
      },
    },
    ble: {
      status: 'valid',
      release: undefined,
    },
    bootloader: {
      status: 'valid',
      release: undefined,
    },
  });

const artifact = (sha256: string, size: number) => ({
  artifactRef: `fw:${sha256}`,
  size,
  sha256,
});

describe('FirmwareUpdatePreparedPlan', () => {
  test('binds all receipts into a URL-free, network-forbidden plan', () => {
    const plan = buildPlan();
    const prepared = prepareFirmwareUpdatePlan({
      plan,
      leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
      artifacts: [
        {
          artifactId: 'firmware',
          artifact: artifact('a'.repeat(64), 4),
        },
        {
          artifactId: 'resource',
          artifact: artifact('b'.repeat(64), 8),
          materializedEntries: [
            {
              entryName: 'resource/index.bin',
              artifact: artifact('c'.repeat(64), 2),
            },
          ],
        },
      ],
    });

    expect(prepared.networkPolicy).toBe('forbid');
    expect(prepared.planDigest).toBe(plan.planDigest);
    expect(prepared.preparedPlanDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(prepared)).not.toContain('https://');
    expect(validateFirmwareUpdatePreparedPlan(prepared)).toEqual(prepared);
    expect(
      assertFirmwareUpdatePreparedPlanDeviceIdentity({
        preparedPlan: prepared,
        deviceIdentity: plan.deviceIdentity,
      })
    ).toEqual(prepared);
    expect(() =>
      assertFirmwareUpdatePreparedPlanDeviceIdentity({
        preparedPlan: prepared,
        deviceIdentity: 'different-device-id',
      })
    ).toThrow();
    expect(
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan: prepared,
        executor: 'v2',
        platform: 'native',
        scopeTargets: ['firmware', 'resource'],
        bindings: [
          {
            target: 'firmware',
            artifact: artifact('a'.repeat(64), 4),
          },
          {
            target: 'resource',
            entryName: 'resource/index.bin',
            artifact: artifact('c'.repeat(64), 2),
          },
        ],
      })
    ).toEqual(prepared);
    expect(() =>
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan: prepared,
        executor: 'v2',
        platform: 'native',
        scopeTargets: ['firmware', 'resource'],
        bindings: [
          {
            target: 'firmware',
            artifact: artifact('a'.repeat(64), 4),
          },
          {
            target: 'resource',
            artifact: artifact('b'.repeat(64), 8),
          },
        ],
      })
    ).toThrow('artifact binding is invalid');
    expect(() =>
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan: prepared,
        executor: 'v2',
        platform: 'native',
        scopeTargets: ['firmware'],
        bindings: [
          {
            target: 'firmware',
            artifact: artifact('b'.repeat(64), 8),
          },
        ],
      })
    ).toThrow('artifact binding is invalid');
  });

  test('rejects receipt drift and a tampered update plan digest', () => {
    const plan = buildPlan();
    expect(() =>
      prepareFirmwareUpdatePlan({
        plan,
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
        artifacts: [
          {
            artifactId: 'firmware',
            artifact: artifact('d'.repeat(64), 4),
          },
          {
            artifactId: 'resource',
            artifact: artifact('b'.repeat(64), 8),
            materializedEntries: [
              {
                entryName: 'resource/index.bin',
                artifact: artifact('c'.repeat(64), 2),
              },
            ],
          },
        ],
      })
    ).toThrow('receipt does not match');

    expect(() =>
      prepareFirmwareUpdatePlan({
        plan: { ...plan, planDigest: 'f'.repeat(64) },
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
        artifacts: [],
      })
    ).toThrow('plan digest is invalid');
  });

  test('projects portable archive paths to unique device resource names', () => {
    const plan = buildPlan();
    const buildArtifacts = (entryNames: string[]) => [
      {
        artifactId: 'firmware',
        artifact: artifact('a'.repeat(64), 4),
      },
      {
        artifactId: 'resource',
        artifact: artifact('b'.repeat(64), 8),
        materializedEntries: entryNames.map((entryName, index) => ({
          entryName,
          artifact: artifact(String(index + 1).repeat(64), 2),
        })),
      },
    ];

    expect(() =>
      prepareFirmwareUpdatePlan({
        plan,
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
        artifacts: buildArtifacts(['icons/index.bin', 'fonts/index.bin']),
      })
    ).toThrow('duplicate entry names');
    expect(() =>
      prepareFirmwareUpdatePlan({
        plan,
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
        artifacts: buildArtifacts(['../index.bin']),
      })
    ).toThrow('entry name is invalid');
  });

  test('rejects duplicate materialized entry names during standalone validation', () => {
    const plan = buildPlan();
    const prepared = prepareFirmwareUpdatePlan({
      plan,
      leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
      artifacts: [
        {
          artifactId: 'firmware',
          artifact: artifact('a'.repeat(64), 4),
        },
        {
          artifactId: 'resource',
          artifact: artifact('b'.repeat(64), 8),
          materializedEntries: [
            {
              entryName: 'resource/index.bin',
              artifact: artifact('c'.repeat(64), 2),
            },
          ],
        },
      ],
    });
    const resourceArtifact = prepared.artifacts.find(item => item.target === 'resource')!;
    const tamperedWithoutDigest = {
      ...prepared,
      artifacts: prepared.artifacts.map(item =>
        item === resourceArtifact
          ? {
              ...item,
              materializedEntries: [
                ...resourceArtifact.materializedEntries!,
                {
                  entryName: 'other/index.bin',
                  artifact: artifact('d'.repeat(64), 2),
                },
              ],
            }
          : item
      ),
    };
    const { preparedPlanDigest: _preparedPlanDigest, ...digestInput } = tamperedWithoutDigest;
    const tampered = {
      ...tamperedWithoutDigest,
      preparedPlanDigest: digestFirmwareUpdateContract(digestInput),
    };

    expect(() => validateFirmwareUpdatePreparedPlan(tampered)).toThrow('duplicate entry names');
  });

  test('rejects unknown fields even when a caller presents a plan-shaped object', () => {
    const plan = buildPlan();
    expect(() =>
      prepareFirmwareUpdatePlan({
        plan: {
          ...plan,
          artifacts: [
            {
              ...plan.artifacts[0],
              unexpectedUrl: 'https://attacker.invalid/payload',
            },
            plan.artifacts[1],
          ],
        } as typeof plan,
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
        artifacts: [],
      })
    ).toThrow('invalid field set');
  });
});
