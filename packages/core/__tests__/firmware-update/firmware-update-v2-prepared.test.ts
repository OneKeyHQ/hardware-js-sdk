import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import { getBinary, getSysResourceBinary } from '../../src/api/firmware/getBinary';
import { uploadFirmwareFromByteSource } from '../../src/api/firmware/uploadFirmware';
import {
  createLegacyMemoryPreparedPlan,
  createLegacyV3MemoryPreparedPlan,
  firmwareHostBindingRegistry,
} from '../../src/firmware-update';
import * as utils from '../../src/utils';

import type { Device } from '../../src/device/Device';
import type {
  FirmwareArtifactReader,
  FirmwareCheckpoint,
  FirmwareCheckpointSink,
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
    targetVersion: '4.0.0',
  }).preparedPlan;

const createBundledPreparedPlan = (): PreparedPlan =>
  createLegacyV3MemoryPreparedPlan({
    device: {
      identity: DEVICE_IDENTITY,
      model: 'classic1s',
      firmwareType: 'universal',
    },
    firmwareBinary: FIRMWARE_BYTES.slice().buffer,
    firmwareVersion: '4.0.0',
    bleBinary: FIRMWARE_BYTES.slice().buffer,
    bleVersion: '2.0.0',
  }).preparedPlan;

const createArtifactReader = ({
  events,
  failOpen = false,
}: {
  events: string[];
  failOpen?: boolean;
}): FirmwareArtifactReader => {
  let readerSequence = 0;
  return {
    open: jest.fn(({ artifactRef }) => {
      events.push('reader-open');
      if (failOpen) {
        return Promise.reject(new Error('artifact unavailable'));
      }
      expect(artifactRef).toMatch(/^memory-artifact-/);
      readerSequence += 1;
      return Promise.resolve({
        readerId: `reader-${readerSequence}`,
        size: FIRMWARE_BYTES.byteLength,
      });
    }),
    read: jest.fn(({ offset, length }) => {
      const bytes = FIRMWARE_BYTES.slice(offset, offset + length);
      events.push(`reader-read:${offset}:${length}`);
      return Promise.resolve({
        data: bytes.buffer,
        bytesRead: bytes.byteLength,
        eof: offset + bytes.byteLength === FIRMWARE_BYTES.byteLength,
      });
    }),
    close: jest.fn(() => {
      events.push('reader-close');
      return Promise.resolve();
    }),
    cancel: jest.fn(() => Promise.resolve()),
  };
};

const registerHost = ({
  events,
  failOpen,
  rejectCheckpointState,
}: {
  events: string[];
  failOpen?: boolean;
  rejectCheckpointState?: FirmwareCheckpoint['state'];
}) => {
  const checkpoints: FirmwareCheckpoint[] = [];
  const checkpointSink: FirmwareCheckpointSink = {
    commit: jest.fn(checkpoint => {
      events.push(`checkpoint:${checkpoint.state}`);
      if (checkpoint.state === rejectCheckpointState) {
        return Promise.reject(new Error(`checkpoint rejected at ${checkpoint.state}`));
      }
      checkpoints.push(checkpoint);
      return Promise.resolve();
    }),
  };
  const artifactReader = createArtifactReader({ events, failOpen });
  firmwareHostBindingRegistry.register({
    artifactReader,
    checkpointSink,
  });
  return { artifactReader, checkpoints };
};

const createMethod = ({
  preparedPlan,
  firmwareCheckpoint,
  bootloaderMode = false,
  events,
}: {
  preparedPlan: PreparedPlan;
  firmwareCheckpoint?: FirmwareCheckpoint;
  bootloaderMode?: boolean;
  events: string[];
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
    onekey_ble_version: '1.0.0',
    bootloader_mode: bootloaderMode,
    capabilities: [],
  };
  const typedCall = jest.fn((command: string) => {
    if (command === 'DeviceBackToBoot') {
      events.push('device-back-to-boot');
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
  const device = {
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
  method.device = device;
  method.postMessage = jest.fn();
  jest.spyOn(method, 'checkDeviceToBootloader').mockImplementation(() => {
    method.checkPromise = {
      promise: Promise.resolve(true),
    } as unknown as NonNullable<FirmwareUpdateV2['checkPromise']>;
  });

  return { method, typedCall };
};

describe('FirmwareUpdateV2 prepared execution', () => {
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

  it('rejects ambiguous prepared and legacy artifact inputs', () => {
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        connectId: 'connect-id',
        deviceId: 'device-id',
        platform: 'native',
        updateType: 'firmware',
        preparedPlan: createPreparedPlan(),
        binary: FIRMWARE_BYTES.slice().buffer,
      },
    });

    let error: unknown;
    try {
      method.init();
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
  });

  it('rejects a recovery checkpoint without its prepared plan', () => {
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        connectId: 'connect-id',
        deviceId: 'device-id',
        platform: 'native',
        updateType: 'firmware',
        firmwareCheckpoint: {},
      },
    });

    let error: unknown;
    try {
      method.init();
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
  });

  it('executes a PREPARED plan offline and opens the artifact before DeviceBackToBoot', async () => {
    const events: string[] = [];
    const preparedPlan = createPreparedPlan();
    registerHost({ events });
    const expectedResponse = { message: 'firmware installed' };
    mockUploadFirmwareFromByteSource.mockImplementation(
      async (_updateType, _typedCall, _postMessage, _device, source) => {
        events.push('upload');
        await expect(source.readAt(0, source.size)).resolves.toEqual(FIRMWARE_BYTES.slice().buffer);
        return expectedResponse;
      }
    );
    const { method, typedCall } = createMethod({ preparedPlan, events });

    await expect(method.run()).resolves.toBe(expectedResponse);

    expect(mockGetBinary).not.toHaveBeenCalled();
    expect(mockGetSysResourceBinary).not.toHaveBeenCalled();
    expect(events.filter(event => event === 'reader-open')).toHaveLength(2);
    expect(typedCall).toHaveBeenCalledWith('DeviceBackToBoot', 'Success');
    expect(events.indexOf('reader-open')).toBeLessThan(events.indexOf('device-back-to-boot'));
    expect(events.indexOf('checkpoint:ENTERING_LOADER')).toBeLessThan(
      events.indexOf('device-back-to-boot')
    );
    expect(events.indexOf('device-back-to-boot')).toBeLessThan(events.indexOf('upload'));
  });

  it('executes firmware and BLE receipts from one prepared epoch', async () => {
    const events: string[] = [];
    const preparedPlan = createBundledPreparedPlan();
    registerHost({ events });
    mockUploadFirmwareFromByteSource.mockImplementation(
      async (updateType, _typedCall, _postMessage, _device, source) => {
        events.push(`upload:${updateType}`);
        await source.readAt(0, source.size);
        return { message: `${updateType} installed` };
      }
    );
    const { method, typedCall } = createMethod({ preparedPlan, events });

    await expect(method.run()).resolves.toEqual({ message: 'ble installed' });

    expect(events.filter(event => event === 'upload:firmware')).toHaveLength(1);
    expect(events.filter(event => event === 'upload:ble')).toHaveLength(1);
    expect(typedCall).toHaveBeenCalledWith('DeviceBackToBoot', 'Success');
  });

  it('does not enter bootloader when artifact preflight fails', async () => {
    const events: string[] = [];
    const preparedPlan = createPreparedPlan();
    registerHost({ events, failOpen: true });
    const { method, typedCall } = createMethod({ preparedPlan, events });

    await expect(method.run()).rejects.toThrow('artifact unavailable');

    expect(typedCall).not.toHaveBeenCalledWith('DeviceBackToBoot', 'Success');
    expect(mockUploadFirmwareFromByteSource).not.toHaveBeenCalled();
    expect(mockGetBinary).not.toHaveBeenCalled();
  });

  it('returns a compatible success response when reconciliation proves the plan is complete', async () => {
    const events: string[] = [];
    const preparedPlan: PreparedPlan = {
      ...createPreparedPlan(),
      expectedFinalStates: [
        {
          target: 'firmware',
          version: '3.0.0',
        },
      ],
    };
    registerHost({ events });
    const { method, typedCall } = createMethod({ preparedPlan, events });

    await expect(method.run()).resolves.toEqual({
      message: 'Firmware update already completed',
    });

    expect(typedCall).not.toHaveBeenCalledWith('DeviceBackToBoot', 'Success');
    expect(mockUploadFirmwareFromByteSource).not.toHaveBeenCalled();
    expect(mockGetBinary).not.toHaveBeenCalled();
  });

  it('does not enter bootloader when the destructive checkpoint is rejected', async () => {
    const events: string[] = [];
    const preparedPlan = createPreparedPlan();
    registerHost({ events, rejectCheckpointState: 'ENTERING_LOADER' });
    const { method, typedCall } = createMethod({ preparedPlan, events });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareCheckpointRejected,
    });

    expect(typedCall).not.toHaveBeenCalledWith('DeviceBackToBoot', 'Success');
    expect(mockUploadFirmwareFromByteSource).not.toHaveBeenCalled();
  });

  it('reopens the artifact from offset zero after an interrupted transfer', async () => {
    const events: string[] = [];
    const preparedPlan = createPreparedPlan();
    const { checkpoints } = registerHost({ events });
    mockUploadFirmwareFromByteSource
      .mockImplementationOnce(async (_updateType, _typedCall, _postMessage, _device, source) => {
        await source.readAt(0, source.size);
        throw new Error('transfer interrupted');
      })
      .mockImplementationOnce(async (_updateType, _typedCall, _postMessage, _device, source) => {
        await expect(source.readAt(0, source.size)).resolves.toEqual(FIRMWARE_BYTES.slice().buffer);
        return { message: 'firmware installed' };
      });
    const firstMethod = createMethod({ preparedPlan, events });

    await expect(firstMethod.method.run()).rejects.toThrow('transfer interrupted');
    const checkpoint = checkpoints.at(-1);
    expect(checkpoint).toMatchObject({
      state: 'PAUSED',
      artifactOffset: 0,
      completedArtifactIds: [],
    });

    const resumedMethod = createMethod({
      preparedPlan,
      firmwareCheckpoint: checkpoint,
      bootloaderMode: true,
      events,
    });
    await expect(resumedMethod.method.run()).resolves.toEqual({
      message: 'firmware installed',
    });

    expect(events.filter(event => event === 'reader-open')).toHaveLength(4);
    expect(mockUploadFirmwareFromByteSource).toHaveBeenCalledTimes(2);
    expect(mockGetBinary).not.toHaveBeenCalled();
    expect(
      resumedMethod.typedCall.mock.calls.filter(([command]) => command === 'DeviceBackToBoot')
    ).toHaveLength(0);
  });
});
