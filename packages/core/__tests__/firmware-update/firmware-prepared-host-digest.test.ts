import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import DeviceUpdateBootloader from '../../src/api/device/DeviceUpdateBootloader';
import {
  registerFirmwareUpdateHostBinding,
  unregisterFirmwareUpdateHostBinding,
} from '../../src/api/firmware/FirmwareHostBinding';
import { prepareFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePreparedPlan';
import { buildFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePlan';

import type { FirmwareArtifactReference } from '../../src/types/api/firmwareUpdate';
import type { Features } from '../../src/types';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const noUpdate = {
  status: 'valid' as const,
  release: undefined,
};

const createPreparedPlan = ({
  executor,
  target,
}: {
  executor: 'v2' | 'v3';
  target: 'firmware' | 'bootloader';
}) => {
  const sha256 = target === 'firmware' ? 'a'.repeat(64) : 'b'.repeat(64);
  const artifact: FirmwareArtifactReference = {
    artifactRef: `fw:${sha256}`,
    size: 4,
    sha256,
  };
  const isV3 = executor === 'v3';
  const plan = buildFirmwareUpdatePlan({
    features: {
      deviceType: isV3 ? EDeviceType.Pro : EDeviceType.Classic1s,
      serialNo: isV3 ? 'pro-device-id' : 'classic-device-id',
      firmwareVersion: '1.0.0',
      bootloaderVersion: isV3 ? '2.8.0' : '1.0.0',
    } as Features,
    firmwareType: EFirmwareType.Universal,
    platform: 'desktop',
    firmware:
      target === 'firmware'
        ? {
            status: 'outdated',
            release: {
              url: 'https://firmware.onekey.so/firmware.bin',
              expectedSize: artifact.size,
              fingerprint: artifact.sha256,
              version: [3, 0, 0],
            },
          }
        : noUpdate,
    ble: noUpdate,
    bootloader:
      target === 'bootloader'
        ? {
            status: 'outdated',
            shouldUpdate: true,
            release: {
              bootloaderResource: 'https://firmware.onekey.so/bootloader.bin',
              bootloaderExpectedSize: artifact.size,
              bootloaderFingerprint: artifact.sha256,
              bootloaderVersion: [2, 0, 0],
            },
          }
        : noUpdate,
  });
  expect(plan.executor).toBe(executor);
  const preparedPlan = prepareFirmwareUpdatePlan({
    plan,
    leaseRef: `fwlease:${executor}:${target}`,
    artifacts: [{ artifactId: target, artifact }],
  });
  return { artifact, preparedPlan };
};

const registerMismatchedHost = () => {
  const artifactReader = {
    open: jest.fn(),
    read: jest.fn(),
    close: jest.fn(),
  };
  const hostBindingGeneration = registerFirmwareUpdateHostBinding({
    preparedPlanDigest: 'f'.repeat(64),
    artifactReader,
  });
  return { artifactReader, hostBindingGeneration };
};

describe('prepared firmware host digest binding', () => {
  afterEach(() => {
    unregisterFirmwareUpdateHostBinding();
    jest.restoreAllMocks();
  });

  test('FirmwareUpdateV2 rejects a host registered for another prepared plan', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'firmware',
    });
    const { artifactReader, hostBindingGeneration } = registerMismatchedHost();
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        platform: 'desktop',
        updateType: 'firmware',
        artifact,
        preparedPlan,
        hostBindingGeneration,
      },
    });

    expect(() => method.init()).toThrow('does not match the prepared plan');
    expect(artifactReader.open).not.toHaveBeenCalled();
  });

  test('FirmwareUpdateV3 rejects a host registered for another prepared plan', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v3',
      target: 'firmware',
    });
    const { artifactReader, hostBindingGeneration } = registerMismatchedHost();
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        artifacts: { firmware: artifact },
        preparedPlan,
        hostBindingGeneration,
      },
    });

    expect(() => method.init()).toThrow('does not match the prepared plan');
    expect(artifactReader.open).not.toHaveBeenCalled();
  });

  test('DeviceUpdateBootloader rejects a host registered for another prepared plan', async () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'bootloader',
    });
    const { artifactReader, hostBindingGeneration } = registerMismatchedHost();
    const method = new DeviceUpdateBootloader({
      id: 1,
      payload: {
        method: 'deviceUpdateBootloader',
        artifact,
        preparedPlan,
        hostBindingGeneration,
      },
    });
    method.device = {
      features: {
        deviceType: EDeviceType.Classic1s,
        serialNo: 'classic-device-id',
      },
    } as any;

    await expect(method.run()).rejects.toThrow('does not match the prepared plan');
    expect(artifactReader.open).not.toHaveBeenCalled();
  });

  test('keeps non-prepared direct binary calls on the legacy paths', async () => {
    const v2 = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        platform: 'desktop',
        updateType: 'firmware',
        binary: new ArrayBuffer(4),
      },
    });
    const v3 = new FirmwareUpdateV3({
      id: 2,
      payload: {
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        firmwareBinary: new ArrayBuffer(4),
      },
    });
    const bootloader = new DeviceUpdateBootloader({
      id: 3,
      payload: {
        method: 'deviceUpdateBootloader',
        binary: new ArrayBuffer(4),
      },
    });
    bootloader.device = {
      features: {},
      getCurrentDeviceType: () => EDeviceType.Touch,
      getCurrentFirmwareType: () => EFirmwareType.Universal,
    } as any;
    jest.spyOn(bootloader, 'updateTouchBootloader').mockResolvedValue(true);

    expect(() => v2.init()).not.toThrow();
    expect(() => v3.init()).not.toThrow();
    await expect(bootloader.run()).resolves.toBe(true);
  });
});
