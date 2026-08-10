import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import FirmwareUpdateV4 from '../../src/api/FirmwareUpdateV4';
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

const preparedArtifactBytes = Uint8Array.from([1, 2, 3, 4]);
const preparedArtifactSha256 = bytesToHex(sha256(preparedArtifactBytes));

const createPreparedPlan = ({
  executor,
  target,
}: {
  executor: 'v2' | 'v3';
  target: 'firmware' | 'bootloader';
}) => {
  const artifact: FirmwareArtifactReference = {
    artifactRef: `fw:${preparedArtifactSha256}`,
    size: preparedArtifactBytes.byteLength,
    sha256: preparedArtifactSha256,
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

const createPreparedV4Plan = () => {
  const artifact: FirmwareArtifactReference = {
    artifactRef: `fw:${preparedArtifactSha256}`,
    size: preparedArtifactBytes.byteLength,
    sha256: preparedArtifactSha256,
  };
  const plan = buildFirmwareUpdatePlan({
    features: {
      deviceType: EDeviceType.Pro2,
      serialNo: 'pro2-device-id',
      firmwareVersion: '1.0.0',
      bootloaderVersion: '1.0.0',
    } as Features,
    firmwareType: EFirmwareType.Universal,
    platform: 'desktop',
    firmware: {
      status: 'outdated',
      release: {
        components: {
          applicationP1: {
            target: 'APPLICATION_P1',
            url: 'https://firmware.onekey.so/pro2/application-p1.bin',
            expectedSize: artifact.size,
            fingerprint: artifact.sha256,
          },
        },
      },
    },
    ble: noUpdate,
    bootloader: noUpdate,
  });
  expect(plan.executor).toBe('v4');
  const preparedPlan = prepareFirmwareUpdatePlan({
    plan,
    leaseRef: 'fwlease:v4:app_v1',
    artifacts: [{ artifactId: 'component:app_v1', artifact }],
  });
  return { artifact, preparedPlan };
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

  test('FirmwareUpdateV2 rejects a direct reader when the prepared host generation is missing', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'firmware',
    });
    const directArtifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        platform: 'desktop',
        updateType: 'firmware',
        artifact,
        preparedPlan,
        artifactReader: directArtifactReader,
      },
    });

    expect(() => method.init()).toThrow('host binding generation NaN is stale');
    expect(directArtifactReader.open).not.toHaveBeenCalled();
  });

  test('FirmwareUpdateV2 does not treat a binary call carrying a prepared plan as legacy', () => {
    const { preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'firmware',
    });
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        platform: 'desktop',
        updateType: 'firmware',
        binary: new ArrayBuffer(4),
        preparedPlan,
      },
    });

    expect(() => method.init()).toThrow(
      'Prepared firmware plans cannot be combined with legacy firmware inputs'
    );
  });

  test('FirmwareUpdateV2 derives its component artifact from the digest-bound plan', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'firmware',
    });
    const artifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: preparedPlan.preparedPlanDigest,
      artifactReader,
    });
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        platform: 'desktop',
        updateType: 'firmware',
        preparedPlan,
        hostBindingGeneration,
      },
    });

    expect(() => method.init()).not.toThrow();
    expect((method as unknown as { params: { artifact: unknown } }).params.artifact).toEqual(
      artifact
    );
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

  test('FirmwareUpdateV3 rejects a direct reader when the prepared host generation is missing', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v3',
      target: 'firmware',
    });
    const directArtifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        artifacts: { firmware: artifact },
        preparedPlan,
        artifactReader: directArtifactReader,
      },
    });

    expect(() => method.init()).toThrow('host binding generation NaN is stale');
    expect(directArtifactReader.open).not.toHaveBeenCalled();
  });

  test('FirmwareUpdateV3 does not execute legacy inputs outside the prepared plan', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v3',
      target: 'firmware',
    });
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        artifacts: { firmware: artifact },
        preparedPlan,
        bleBinary: new ArrayBuffer(4),
      },
    });

    expect(() => method.init()).toThrow(
      'Prepared firmware plans cannot be combined with legacy firmware inputs'
    );
  });

  test('FirmwareUpdateV3 derives its component artifacts from the digest-bound plan', () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v3',
      target: 'firmware',
    });
    const artifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: preparedPlan.preparedPlanDigest,
      artifactReader,
    });
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        preparedPlan,
        hostBindingGeneration,
      },
    });

    expect(() => method.init()).not.toThrow();
    expect(
      (method as unknown as { params: { artifacts: { firmware: unknown } } }).params.artifacts
        .firmware
    ).toEqual(artifact);
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

  test('DeviceUpdateBootloader rejects a direct reader when the prepared host generation is missing', async () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'bootloader',
    });
    const directArtifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const method = new DeviceUpdateBootloader({
      id: 1,
      payload: {
        method: 'deviceUpdateBootloader',
        artifact,
        preparedPlan,
        artifactReader: directArtifactReader,
      },
    });
    method.device = {
      features: {
        deviceType: EDeviceType.Classic1s,
        serialNo: 'classic-device-id',
      },
    } as any;

    await expect(method.run()).rejects.toThrow('host binding generation NaN is stale');
    expect(directArtifactReader.open).not.toHaveBeenCalled();
  });

  test('DeviceUpdateBootloader does not treat a binary call carrying a prepared plan as legacy', async () => {
    const { preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'bootloader',
    });
    const method = new DeviceUpdateBootloader({
      id: 1,
      payload: {
        method: 'deviceUpdateBootloader',
        binary: new ArrayBuffer(4),
        preparedPlan,
      },
    });
    method.device = { features: undefined } as any;

    await expect(method.run()).rejects.toThrow(
      'Prepared bootloader plans cannot be combined with a legacy binary'
    );
  });

  test('DeviceUpdateBootloader derives its artifact from the digest-bound plan', async () => {
    const { artifact, preparedPlan } = createPreparedPlan({
      executor: 'v2',
      target: 'bootloader',
    });
    const artifactReader = {
      open: jest.fn().mockResolvedValue({ readerId: 'bootloader-reader', size: artifact.size }),
      read: jest.fn(({ offset, length }: { offset: number; length: number }) => {
        const data = preparedArtifactBytes.slice(offset, offset + length).buffer;
        return Promise.resolve({
          data,
          bytesRead: data.byteLength,
          eof: offset + length === preparedArtifactBytes.byteLength,
        });
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: preparedPlan.preparedPlanDigest,
      artifactReader,
    });
    const method = new DeviceUpdateBootloader({
      id: 1,
      payload: {
        method: 'deviceUpdateBootloader',
        preparedPlan,
        hostBindingGeneration,
      },
    });
    method.device = {
      features: {
        deviceType: EDeviceType.Classic1s,
        serialNo: 'classic-device-id',
      },
      getCurrentDeviceType: () => EDeviceType.Touch,
    } as any;
    const updateTouchBootloader = jest
      .spyOn(method, 'updateTouchBootloader')
      .mockResolvedValue(true);

    await expect(method.run()).resolves.toBe(true);
    expect(artifactReader.open).toHaveBeenCalledWith({ artifactRef: artifact.artifactRef });
    expect(updateTouchBootloader).toHaveBeenCalledWith(
      expect.objectContaining({ firmwareType: preparedPlan.firmwareType })
    );
  });

  test('FirmwareUpdateV4 rejects a prepared plan without a host binding generation', () => {
    const { preparedPlan } = createPreparedV4Plan();
    const directArtifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'desktop',
        preparedPlan,
        artifactReader: directArtifactReader,
      },
    });

    expect(() => method.init()).toThrow('host binding generation NaN is stale');
    expect(directArtifactReader.open).not.toHaveBeenCalled();
  });

  test('FirmwareUpdateV4 rejects a host registered for another prepared plan', () => {
    const { preparedPlan } = createPreparedV4Plan();
    const { artifactReader, hostBindingGeneration } = registerMismatchedHost();
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'desktop',
        preparedPlan,
        hostBindingGeneration,
      },
    });

    expect(() => method.init()).toThrow('does not match the prepared plan');
    expect(artifactReader.open).not.toHaveBeenCalled();
  });

  test('FirmwareUpdateV4 obtains the prepared reader only from the digest-bound host', async () => {
    const { artifact, preparedPlan } = createPreparedV4Plan();
    const directArtifactReader = {
      open: jest.fn(),
      read: jest.fn(),
      close: jest.fn(),
    };
    const boundArtifactReader = {
      open: jest.fn().mockResolvedValue({ readerId: 'bound-reader', size: artifact.size }),
      read: jest.fn(),
      close: jest.fn(),
    };
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: preparedPlan.preparedPlanDigest,
      artifactReader: boundArtifactReader,
    });
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'desktop',
        preparedPlan,
        hostBindingGeneration,
        artifactReader: directArtifactReader,
      },
    });

    method.init();
    const executionReader = (
      method as unknown as {
        params: { artifactReader: typeof boundArtifactReader };
      }
    ).params.artifactReader;
    await executionReader.open({ artifactRef: artifact.artifactRef });

    expect(boundArtifactReader.open).toHaveBeenCalledWith({ artifactRef: artifact.artifactRef });
    expect(directArtifactReader.open).not.toHaveBeenCalled();
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
