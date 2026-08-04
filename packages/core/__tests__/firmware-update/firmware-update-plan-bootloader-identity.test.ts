import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { buildFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePlan';
import {
  assertFirmwareUpdatePreparedPlanDeviceIdentity,
  prepareFirmwareUpdatePlan,
} from '../../src/api/firmware/FirmwareUpdatePreparedPlan';

import type { Features } from '../../src/types';

const FIRMWARE_SHA256 = 'a'.repeat(64);

const BLE_SHA256 = 'b'.repeat(64);

const buildDesktopPlan = (
  features: Partial<Features>,
  options?: {
    ble?: { status: string; release?: Record<string, unknown> };
    firmwareStatus?: string;
  }
) =>
  buildFirmwareUpdatePlan({
    features: features as Features,
    firmwareType: EFirmwareType.Universal,
    platform: 'desktop',
    firmware: {
      status: options?.firmwareStatus ?? 'none',
      release: {
        url: 'https://firmware.onekey.so/classic/firmware.bin',
        expectedSize: 4,
        fingerprint: FIRMWARE_SHA256,
        version: [3, 20, 0],
      },
    },
    ble: options?.ble ?? {
      status: 'valid',
      release: undefined,
    },
    bootloader: {
      status: 'valid',
      release: undefined,
    },
  });

const bleNoneWithRelease = {
  status: 'none',
  release: {
    url: 'https://firmware.onekey.so/classic/ble.bin',
    webUpdate: 'https://firmware.onekey.so/classic/ble.bin',
    expectedSize: 8,
    fingerprint: BLE_SHA256,
    version: [1, 5, 6],
  },
};

// A classic1s that lost its firmware reports no serial in bootloader mode; the
// recovery flow must still be able to build (and later execute) a prepared plan.
const bootloaderClassic1sFeatures: Partial<Features> = {
  deviceType: EDeviceType.Classic1s,
  bootloaderMode: true,
  firmwareVersion: '0.0.0',
  bootloaderVersion: '2.1.2',
};

describe('firmware update plan identity in bootloader mode', () => {
  test('builds a degraded-identity plan for a serial-less bootloader classic1s on desktop', () => {
    const plan = buildDesktopPlan(bootloaderClassic1sFeatures);
    expect(plan.deviceIdentity).toBe('unavailable');
    expect(plan.executor).not.toBe('v4');
    expect(plan.targetsToUpdate).toContain('firmware');
  });

  test('bootloader mode with intact firmware (status unknown) still gets the firmware artifact', () => {
    const plan = buildDesktopPlan(
      {
        deviceType: EDeviceType.Classic1s,
        bootloaderMode: true,
        firmwareVersion: '2.1.2',
        bootloaderVersion: '2.1.2',
      },
      { firmwareStatus: 'unknown' }
    );
    expect(plan.targetsToUpdate).toContain('firmware');
    expect(plan.deviceIdentity).toBe('unavailable');
  });

  test('normal-mode status none with a release available still adds no artifacts', () => {
    const plan = buildDesktopPlan({
      deviceType: EDeviceType.Classic1s,
      serialNo: 'CLA45F0023',
      firmwareVersion: '3.19.0',
      bootloaderVersion: '2.1.2',
    });
    expect(plan.targetsToUpdate).toEqual([]);
  });

  test('recovery plan carries the BLE artifact when the BLE version is unreadable in bootloader', () => {
    const plan = buildDesktopPlan(bootloaderClassic1sFeatures, { ble: bleNoneWithRelease });
    expect(plan.targetsToUpdate).toEqual(expect.arrayContaining(['firmware', 'ble']));
  });

  test('a normal-mode device without BLE hardware (status none) gets no BLE artifact', () => {
    const plan = buildFirmwareUpdatePlan({
      features: {
        deviceType: EDeviceType.Mini,
        serialNo: 'mini-device-id',
        firmwareVersion: '3.9.0',
        bootloaderVersion: '2.0.0',
      } as Features,
      firmwareType: EFirmwareType.Universal,
      platform: 'desktop',
      firmware: {
        status: 'outdated',
        release: {
          url: 'https://firmware.onekey.so/mini/firmware.bin',
          expectedSize: 4,
          fingerprint: FIRMWARE_SHA256,
          version: [3, 10, 0],
        },
      },
      ble: { status: 'none', release: undefined },
      bootloader: { status: 'valid', release: undefined },
    });
    expect(plan.targetsToUpdate).toEqual(['firmware']);
  });

  test('still rejects a serial-less normal-mode device on desktop', () => {
    expect(() =>
      buildDesktopPlan(
        {
          deviceType: EDeviceType.Classic1s,
          firmwareVersion: '3.19.0',
          bootloaderVersion: '2.1.2',
        },
        { firmwareStatus: 'outdated' }
      )
    ).toThrow(/stable device identity/);
  });

  test('keeps rejecting degraded identity for serial-less Pro (v3) in bootloader', () => {
    expect(() =>
      buildDesktopPlan(
        {
          deviceType: EDeviceType.Pro,
          bootloaderMode: true,
          firmwareVersion: '0.0.0',
          bootloaderVersion: '2.8.0',
        },
        { firmwareStatus: 'none' }
      )
    ).toThrow(/stable device identity/);
  });

  test('degraded plans are v2-only', () => {
    const plan = buildDesktopPlan(bootloaderClassic1sFeatures);
    expect(plan.executor).toBe('v2');
  });

  describe('prepared plan device identity assertion', () => {
    const prepareDegradedPlan = () => {
      const plan = buildDesktopPlan(bootloaderClassic1sFeatures);
      return prepareFirmwareUpdatePlan({
        plan,
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000001',
        artifacts: [
          {
            artifactId: 'firmware',
            artifact: {
              artifactRef: `fw:${FIRMWARE_SHA256}`,
              size: 4,
              sha256: FIRMWARE_SHA256,
            },
          },
        ],
      });
    };

    test('accepts a degraded plan when the live device is also identity-less in bootloader mode', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: undefined,
          bootloaderMode: true,
          deviceModel: String(EDeviceType.Classic1s),
        })
      ).not.toThrow();
    });

    test('rejects a degraded plan outside bootloader mode', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: undefined,
          bootloaderMode: false,
          deviceModel: String(EDeviceType.Classic1s),
        })
      ).toThrow();
    });

    test('rejects a degraded plan when bootloader mode is not stated', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: undefined,
          deviceModel: String(EDeviceType.Classic1s),
        })
      ).toThrow();
    });

    test('rejects a degraded plan when the live device reports a real identity', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: 'CLA45F0023',
          bootloaderMode: true,
          deviceModel: String(EDeviceType.Classic1s),
        })
      ).toThrow();
    });

    test('rejects a degraded plan on a different device model', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: undefined,
          bootloaderMode: true,
          deviceModel: String(EDeviceType.Mini),
        })
      ).toThrow();
    });

    test('rejects a degraded plan when the live model is unstated', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: undefined,
          bootloaderMode: true,
        })
      ).toThrow();
    });

    test('a live serial equal to the reserved sentinel never matches a degraded plan', () => {
      const preparedPlan = prepareDegradedPlan();
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: 'unavailable',
          bootloaderMode: false,
          deviceModel: String(EDeviceType.Classic1s),
        })
      ).toThrow();
    });

    test('rejects a real-identity plan when the live device is identity-less in bootloader mode', () => {
      const plan = buildDesktopPlan(
        {
          deviceType: EDeviceType.Classic1s,
          serialNo: 'CLA45F0023',
          firmwareVersion: '3.19.0',
          bootloaderVersion: '2.1.2',
        },
        { firmwareStatus: 'outdated' }
      );
      const preparedPlan = prepareFirmwareUpdatePlan({
        plan,
        leaseRef: 'fwlease:00000000-0000-4000-8000-000000000002',
        artifacts: [
          {
            artifactId: 'firmware',
            artifact: {
              artifactRef: `fw:${FIRMWARE_SHA256}`,
              size: 4,
              sha256: FIRMWARE_SHA256,
            },
          },
        ],
      });
      expect(() =>
        assertFirmwareUpdatePreparedPlanDeviceIdentity({
          preparedPlan,
          deviceIdentity: undefined,
          bootloaderMode: true,
          deviceModel: String(EDeviceType.Classic1s),
        })
      ).toThrow();
    });
  });
});
