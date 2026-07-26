import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import { getBinary, getSysResourceBinary } from '../../src/api/firmware/getBinary';
import { uploadFirmwareFromByteSource } from '../../src/api/firmware/uploadFirmware';
import {
  createLegacyMemoryPreparedPlan,
  firmwareHostBindingRegistry,
} from '../../src/firmware-update';
import * as utils from '../../src/utils';

import type { Device } from '../../src/device/Device';
import type {
  FirmwareArtifactReader,
  FirmwareCheckpoint,
  PreparedPlan,
} from '../../src/firmware-update';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../../src/api/firmware/getBinary', () => ({
  getBinary: jest.fn(),
  getInfo: jest.fn(),
  getSysResourceBinary: jest.fn(),
}));

jest.mock('../../src/api/firmware/uploadFirmware', () => ({
  readFirmwareByteSourceFully: jest.fn(),
  updateResources: jest.fn(),
  uploadFirmwareFromByteSource: jest.fn(),
}));

jest.mock('../../src/device/DevicePool', () => ({
  DevicePool: {
    clearDeviceCache: jest.fn(),
    devicesCache: {},
  },
}));

const FIRMWARE_BYTES = new Uint8Array([1, 2, 3, 4]);
const DEVICE_IDENTITY = 'CL123456';

const mockGetBinary = getBinary as jest.MockedFunction<typeof getBinary>;
const mockGetSysResourceBinary = getSysResourceBinary as jest.MockedFunction<
  typeof getSysResourceBinary
>;
const mockUploadFirmwareFromByteSource = uploadFirmwareFromByteSource as jest.MockedFunction<
  typeof uploadFirmwareFromByteSource
>;

const createPreparedPlan = (): PreparedPlan =>
  createLegacyMemoryPreparedPlan({
    binary: FIRMWARE_BYTES.slice().buffer,
    device: {
      identity: DEVICE_IDENTITY,
      model: 'classic1s',
    },
    updateType: 'firmware',
  }).preparedPlan;

const createArtifactReader = (openedReaderIds: string[]): FirmwareArtifactReader => {
  let sequence = 0;
  return {
    open: jest.fn(() => {
      sequence += 1;
      const readerId = `reader-${openedReaderIds.length + 1}-${sequence}`;
      openedReaderIds.push(readerId);
      return Promise.resolve({
        readerId,
        size: FIRMWARE_BYTES.byteLength,
      });
    }),
    read: jest.fn(({ offset, length }) => {
      const bytes = FIRMWARE_BYTES.slice(offset, offset + length);
      return Promise.resolve({
        data: bytes.buffer,
        bytesRead: bytes.byteLength,
        eof: offset + bytes.byteLength === FIRMWARE_BYTES.byteLength,
      });
    }),
    close: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
  };
};

const registerHost = (openedReaderIds: string[], checkpoints: FirmwareCheckpoint[]): number =>
  firmwareHostBindingRegistry.register({
    artifactReader: createArtifactReader(openedReaderIds),
    checkpointSink: {
      commit: jest.fn(checkpoint => {
        checkpoints.push(checkpoint);
        return Promise.resolve();
      }),
    },
  });

const createMethod = ({
  preparedPlan,
  firmwareCheckpoint,
  bootloaderMode,
}: {
  preparedPlan: PreparedPlan;
  firmwareCheckpoint?: FirmwareCheckpoint;
  bootloaderMode: boolean;
}) => {
  const method = new FirmwareUpdateV2({
    id: 1,
    payload: {
      method: 'firmwareUpdateV2',
      connectId: 'connect-id',
      deviceId: 'device-id',
      platform: 'native',
      updateType: 'firmware',
      preparedPlan,
      firmwareCheckpoint,
      firmwareTransactionId: 'transaction-1',
    },
  });
  method.init();

  const features = {
    protocol: 'V1' as const,
    deviceType: 'classic1s' as const,
    firmwareType: 'universal' as const,
    serialNo: DEVICE_IDENTITY,
    firmwareVersion: '3.0.0',
    bootloaderVersion: '2.0.0',
    bleVersion: '1.0.0',
    bootloaderMode,
    onekey_device_type: 'CLASSIC1S',
    onekey_serial_no: DEVICE_IDENTITY,
    onekey_firmware_version: '3.0.0',
    onekey_boot_version: '2.0.0',
    bootloader_mode: bootloaderMode,
    capabilities: [],
  };
  const typedCall = jest.fn((command: string) => {
    if (command === 'DeviceBackToBoot') {
      features.bootloader_mode = true;
      features.bootloaderMode = true;
    }
    return Promise.resolve({ type: 'Success', message: { message: 'success' } });
  });
  const commands = {
    typedCall,
    checkDisposed: jest.fn(),
    disposed: false,
  };
  method.device = {
    features,
    commands,
    getCommands: () => commands,
    getCurrentDeviceType: () => utils.getDeviceType(features),
    getCurrentFirmwareType: () => utils.getFirmwareType(features),
    isBootloader: () => Boolean(features.bootloaderMode),
    isProtocolV2: () => false,
    acquire: jest.fn(() => Promise.resolve()),
    toMessageObject: jest.fn(() => ({})),
  } as unknown as Device;
  method.postMessage = jest.fn();
  jest.spyOn(method, 'checkDeviceToBootloader').mockImplementation(() => {
    method.checkPromise = {
      promise: Promise.resolve(true),
    } as unknown as NonNullable<FirmwareUpdateV2['checkPromise']>;
  });
  return { method, typedCall };
};

describe('FirmwareUpdateV2 recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBinary.mockRejectedValue(new Error('network is unavailable'));
    mockGetSysResourceBinary.mockRejectedValue(new Error('network is unavailable'));
    jest.spyOn(utils, 'wait').mockResolvedValue(undefined);
  });

  afterEach(() => {
    firmwareHostBindingRegistry.reset();
    jest.restoreAllMocks();
  });

  it('reopens the local artifact on a new host generation without redownloading', async () => {
    const preparedPlan = createPreparedPlan();
    const openedReaderIds: string[] = [];
    const firstCheckpoints: FirmwareCheckpoint[] = [];
    const firstGeneration = registerHost(openedReaderIds, firstCheckpoints);
    mockUploadFirmwareFromByteSource
      .mockImplementationOnce(async (_updateType, _typedCall, _postMessage, _device, source) => {
        await source.readAt(0, source.size);
        throw new Error('transfer interrupted');
      })
      .mockImplementationOnce(async (_updateType, _typedCall, _postMessage, _device, source) => {
        await expect(source.readAt(0, source.size)).resolves.toEqual(FIRMWARE_BYTES.slice().buffer);
        return { message: 'firmware installed' };
      });
    const first = createMethod({
      preparedPlan,
      bootloaderMode: false,
    });

    await expect(first.method.run()).rejects.toThrow('transfer interrupted');
    const pausedCheckpoint = firstCheckpoints.at(-1);
    expect(pausedCheckpoint).toMatchObject({
      state: 'PAUSED',
      generation: firstGeneration,
      artifactOffset: 0,
      completedArtifactIds: [],
    });

    const resumedCheckpoints: FirmwareCheckpoint[] = [];
    const resumedGeneration = registerHost(openedReaderIds, resumedCheckpoints);
    expect(resumedGeneration).toBeGreaterThan(firstGeneration);
    const resumed = createMethod({
      preparedPlan,
      firmwareCheckpoint: pausedCheckpoint,
      bootloaderMode: true,
    });

    await expect(resumed.method.run()).resolves.toEqual({
      message: 'firmware installed',
    });

    expect(resumedCheckpoints.at(-1)).toMatchObject({
      state: 'COMPLETED',
      generation: resumedGeneration,
    });
    expect(openedReaderIds).toHaveLength(4);
    expect(new Set(openedReaderIds)).toHaveProperty('size', 4);
    expect(mockUploadFirmwareFromByteSource).toHaveBeenCalledTimes(2);
    expect(mockGetBinary).not.toHaveBeenCalled();
    expect(mockGetSysResourceBinary).not.toHaveBeenCalled();
    expect(
      resumed.typedCall.mock.calls.filter(([command]) => command === 'DeviceBackToBoot')
    ).toHaveLength(0);
  });
});
