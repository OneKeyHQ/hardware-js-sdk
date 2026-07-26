import JSZip from 'jszip';

import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import { getBinary, getSysResourceBinary } from '../../src/api/firmware/getBinary';
import {
  createLegacyV3MemoryPreparedPlan,
  firmwareHostBindingRegistry,
} from '../../src/firmware-update';

import type { Device } from '../../src/device/Device';
import type { Features } from '../../src/types';
import type { FirmwareUpdateV3Params } from '../../src/types/api/firmwareUpdate';
import type { FirmwareArtifactReader, FirmwareCheckpointSink } from '../../src/firmware-update';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../../src/api/firmware/getBinary', () => ({
  getBinary: jest.fn(),
  getSysResourceBinary: jest.fn(),
}));

const DEVICE_IDENTITY = 'PR123456';
const RESOURCE_BYTES = new Uint8Array([1, 2, 3, 4]);
const BOOTLOADER_BYTES = new Uint8Array([5, 6, 7, 8]);
const FIRMWARE_BYTES = new Uint8Array([9, 10, 11, 12]);
const BLE_BYTES = new Uint8Array([13, 14, 15, 16]);

const mockGetBinary = getBinary as jest.MockedFunction<typeof getBinary>;
const mockGetSysResourceBinary = getSysResourceBinary as jest.MockedFunction<
  typeof getSysResourceBinary
>;

const createPreparedFirmware = () =>
  createLegacyV3MemoryPreparedPlan({
    device: {
      identity: DEVICE_IDENTITY,
      model: 'pro',
      firmwareType: 'universal',
    },
    resourceArchive: new Uint8Array([80, 75, 3, 4]).buffer,
    resourceEntries: [
      {
        entryId: 'resources/resource.bin',
        logicalName: 'resource.bin',
        binary: RESOURCE_BYTES.slice().buffer,
      },
    ],
    bootloaderBinary: BOOTLOADER_BYTES.slice().buffer,
    bootloaderVersion: '2.9.0',
    firmwareBinary: FIRMWARE_BYTES.slice().buffer,
    firmwareVersion: '4.0.0',
    bleBinary: BLE_BYTES.slice().buffer,
    bleVersion: '2.0.0',
  });

const registerFirmwareHost = ({
  events,
  binariesByArtifactRef,
}: {
  events: string[];
  binariesByArtifactRef: ReadonlyMap<string, ArrayBuffer>;
}) => {
  let readerSequence = 0;
  const openReaders = new Map<string, { artifactRef: string; size: number }>();
  const artifactReader: FirmwareArtifactReader = {
    open: jest.fn(({ artifactRef }) => {
      const binary = binariesByArtifactRef.get(artifactRef);
      if (!binary) {
        return Promise.reject(new Error(`Missing artifact ${artifactRef}`));
      }
      readerSequence += 1;
      const readerId = `reader-${readerSequence}`;
      openReaders.set(readerId, { artifactRef, size: binary.byteLength });
      events.push(`reader-open:${artifactRef}`);
      return Promise.resolve({ readerId, size: binary.byteLength });
    }),
    read: jest.fn(({ readerId, offset, length }) => {
      const reader = openReaders.get(readerId);
      if (!reader) {
        return Promise.reject(new Error(`Missing reader ${readerId}`));
      }
      const binary = binariesByArtifactRef.get(reader.artifactRef);
      if (!binary) {
        return Promise.reject(new Error(`Missing artifact ${reader.artifactRef}`));
      }
      events.push(`reader-read:${offset}:${length}`);
      const data = binary.slice(offset, offset + length);
      return Promise.resolve({
        data,
        bytesRead: data.byteLength,
        eof: offset + data.byteLength === reader.size,
      });
    }),
    close: jest.fn(({ readerId }) => {
      openReaders.delete(readerId);
      events.push('reader-close');
      return Promise.resolve();
    }),
    cancel: jest.fn(() => Promise.resolve()),
  };
  const checkpointSink: FirmwareCheckpointSink = {
    commit: jest.fn(checkpoint => {
      events.push(`checkpoint:${checkpoint.state}`);
      return Promise.resolve();
    }),
  };
  firmwareHostBindingRegistry.register({ artifactReader, checkpointSink });
  return artifactReader;
};

const createMethod = ({
  preparedPlan,
  legacyParams,
  events,
}: {
  preparedPlan?: ReturnType<typeof createPreparedFirmware>['preparedPlan'];
  legacyParams?: Omit<FirmwareUpdateV3Params, 'platform'>;
  events: string[];
}) => {
  const method = new FirmwareUpdateV3({
    id: 1,
    payload: {
      method: 'firmwareUpdateV3',
      connectId: 'connect-id',
      deviceId: 'device-id',
      platform: 'native',
      ...(preparedPlan
        ? {
            preparedPlan,
            firmwareTransactionId: 'transaction-v3',
          }
        : legacyParams),
    },
  });
  method.init();

  const features: Features = {
    protocol: 'V1',
    deviceType: 'pro',
    firmwareType: 'universal',
    serialNo: DEVICE_IDENTITY,
    firmwareVersion: '3.0.0',
    bootloaderVersion: '2.8.0',
    bleVersion: '1.0.0',
    bootloaderMode: false,
    onekey_device_type: 'PRO',
    onekey_serial_no: DEVICE_IDENTITY,
    onekey_firmware_version: '3.0.0',
    onekey_boot_version: '2.8.0',
    onekey_ble_version: '1.0.0',
    bootloader_mode: false,
    capabilities: [],
  };
  const commands = {
    typedCall: jest.fn((command: string) => {
      if (command === 'DeviceBackToBoot') {
        events.push('device-back-to-boot');
        features.bootloader_mode = true;
        features.bootloaderMode = true;
      }
      return Promise.resolve({ type: 'Success', message: { message: 'success' } });
    }),
    disposed: false,
  };
  const device = {
    features,
    commands,
    getCommands: () => commands,
    getCurrentDeviceType: () => 'pro',
    isBootloader: () => Boolean(features.bootloaderMode),
    isProtocolV2: () => false,
    acquire: jest.fn(() => Promise.resolve()),
    toMessageObject: jest.fn(() => ({})),
  } as unknown as Device;
  method.device = device;
  method.postMessage = jest.fn();
  jest.spyOn(method, 'checkDeviceToBootloader').mockImplementation(() => {
    method.checkPromise = {
      promise: Promise.resolve(true),
    } as NonNullable<FirmwareUpdateV3['checkPromise']>;
  });
  jest.spyOn(method, 'emmcFileWriteWithRetry').mockImplementation((filePath, chunkLength) => {
    events.push(`device-write:${filePath}:${chunkLength}`);
    return Promise.resolve({
      type: 'EmmcFile',
      message: {
        processed_byte: chunkLength,
      },
    } as never);
  });
  jest.spyOn(method, 'startEmmcFirmwareUpdate').mockImplementation(() => {
    events.push('install-request');
    return Promise.resolve();
  });
  const internals = method as unknown as {
    installRequested: boolean;
    latestObservedFeatures: Features | null;
    waitForFirmwareInstall(): Promise<{
      bootloaderVersion: string;
      bleVersion: string;
      firmwareVersion: string;
    }>;
  };
  jest.spyOn(internals, 'waitForFirmwareInstall').mockImplementation(() => {
    events.push('install-completed');
    const updatedFeatures: Features = {
      ...features,
      bootloader_mode: false,
      bootloaderMode: false,
      onekey_boot_version: '2.9.0',
      onekey_firmware_version: '4.0.0',
      onekey_ble_version: '2.0.0',
      bootloaderVersion: '2.9.0',
      firmwareVersion: '4.0.0',
      bleVersion: '2.0.0',
    };
    internals.latestObservedFeatures = updatedFeatures;
    internals.installRequested = false;
    return Promise.resolve({
      bootloaderVersion: '2.9.0',
      bleVersion: '2.0.0',
      firmwareVersion: '4.0.0',
    });
  });
  return method;
};

describe('FirmwareUpdateV3 prepared streaming execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBinary.mockRejectedValue(new Error('network is unavailable after PREPARED'));
    mockGetSysResourceBinary.mockRejectedValue(new Error('network is unavailable after PREPARED'));
  });

  afterEach(() => {
    firmwareHostBindingRegistry.reset();
    jest.restoreAllMocks();
  });

  it('preflights all artifacts, streams safe device paths, and installs once offline', async () => {
    const events: string[] = [];
    const { preparedPlan, binariesByArtifactRef } = createPreparedFirmware();
    const artifactReader = registerFirmwareHost({ events, binariesByArtifactRef });
    const method = createMethod({ preparedPlan, events });
    const loadArchive = jest.spyOn(JSZip, 'loadAsync');

    await expect(method.run()).resolves.toEqual({
      bootloaderVersion: '2.9.0',
      bleVersion: '2.0.0',
      firmwareVersion: '4.0.0',
    });

    const firstDeviceAction = events.indexOf('device-back-to-boot');
    const preflightOpenCount = preparedPlan.artifactReceipts.length;
    expect(
      events.slice(0, firstDeviceAction).filter(event => event.startsWith('reader-open:'))
    ).toHaveLength(preflightOpenCount);
    expect(events).toEqual(
      expect.arrayContaining([
        'device-write:0:res/resource.bin:4',
        'device-write:0:boot/bootloader.bin:4',
        'device-write:0:updates/firmware.bin:4',
        'device-write:0:updates/ble-firmware.bin:4',
      ])
    );
    expect(events.filter(event => event === 'install-request')).toHaveLength(1);
    expect(loadArchive).not.toHaveBeenCalled();
    expect(mockGetBinary).not.toHaveBeenCalled();
    expect(mockGetSysResourceBinary).not.toHaveBeenCalled();
    expect((artifactReader.read as jest.Mock).mock.calls).toHaveLength(4);
  });

  it('converts the legacy ZIP and binary overload before reboot, then uses the same executor', async () => {
    const events: string[] = [];
    const zip = new JSZip();
    zip.file('resources/resource.bin', RESOURCE_BYTES);
    const resourceBinary = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
    });
    const loadArchive = jest.spyOn(JSZip, 'loadAsync').mockImplementation((data, options) => {
      events.push('zip-load');
      return new JSZip().loadAsync(data, options);
    });
    const method = createMethod({
      events,
      legacyParams: {
        resourceBinary,
        bootloaderBinary: BOOTLOADER_BYTES.slice().buffer,
        bootloaderVersion: [2, 9, 0],
        firmwareBinary: FIRMWARE_BYTES.slice().buffer,
        firmwareVersion: [4, 0, 0],
        bleBinary: BLE_BYTES.slice().buffer,
        bleVersion: [2, 0, 0],
      },
    });

    await expect(method.run()).resolves.toEqual({
      bootloaderVersion: '2.9.0',
      bleVersion: '2.0.0',
      firmwareVersion: '4.0.0',
    });

    expect(loadArchive).toHaveBeenCalledTimes(1);
    expect(events.indexOf('zip-load')).toBeLessThan(events.indexOf('device-back-to-boot'));
    expect(events).toEqual(
      expect.arrayContaining([
        'device-write:0:res/resource.bin:4',
        'device-write:0:boot/bootloader.bin:4',
        'device-write:0:updates/firmware.bin:4',
        'device-write:0:updates/ble-firmware.bin:4',
      ])
    );
    expect(events.filter(event => event === 'install-request')).toHaveLength(1);
    expect(mockGetBinary).not.toHaveBeenCalled();
    expect(mockGetSysResourceBinary).not.toHaveBeenCalled();
  });
});
