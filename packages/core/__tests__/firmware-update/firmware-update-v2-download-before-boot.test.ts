import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import { getBinary } from '../../src/api/firmware/getBinary';
import { uploadFirmware } from '../../src/api/firmware/uploadFirmware';
import * as utils from '../../src/utils';

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
  updateResources: jest.fn(),
  uploadFirmware: jest.fn(),
}));

jest.mock('../../src/device/DevicePool', () => ({
  DevicePool: {
    clearDeviceCache: jest.fn(),
    devicesCache: {},
  },
}));

const mockGetBinary = getBinary as jest.MockedFunction<typeof getBinary>;
const mockUploadFirmware = uploadFirmware as jest.MockedFunction<typeof uploadFirmware>;

type DeviceType = 'CLASSIC1S' | 'PURE';

const createCustomBuffer = (byteLength: number) => {
  const customBuffer: {
    [index: number]: number;
    byteLength: number;
    constructor: {
      isBuffer: (value: unknown) => boolean;
    };
    length: number;
  } = {
    byteLength,
    constructor: {
      isBuffer: (value: unknown) => value === customBuffer,
    },
    length: byteLength,
  };
  for (let index = 0; index < byteLength; index += 1) {
    customBuffer[index] = index + 1;
  }
  return customBuffer;
};

const countCommandCalls = (typedCall: jest.Mock, command: string) =>
  typedCall.mock.calls.filter(([calledCommand]) => calledCommand === command).length;

const expectNoFirmwareMutationCalls = (typedCall: jest.Mock) => {
  expect(countCommandCalls(typedCall, 'DeviceBackToBoot')).toBe(0);
  expect(countCommandCalls(typedCall, 'FirmwareErase')).toBe(0);
  expect(countCommandCalls(typedCall, 'FirmwareErase_ex')).toBe(0);
  expect(countCommandCalls(typedCall, 'FirmwareUpload')).toBe(0);
  expect(countCommandCalls(typedCall, 'UpgradeFileHeader')).toBe(0);
};

const createMethod = ({
  binary,
  updateType = 'firmware',
  isUpdateBootloader,
  deviceType = 'CLASSIC1S',
  bootloaderMode = false,
}: {
  binary?: unknown;
  updateType?: 'firmware' | 'ble';
  isUpdateBootloader?: boolean;
  deviceType?: DeviceType;
  bootloaderMode?: boolean;
} = {}) => {
  const method = new FirmwareUpdateV2({
    id: 1,
    payload: {
      method: 'firmwareUpdateV2',
      connectId: 'connect-id',
      deviceId: 'device-id',
      platform: 'desktop',
      updateType,
      isUpdateBootloader,
      ...(binary !== undefined ? { binary } : { version: [3, 0, 0] }),
    },
  });
  method.init();

  const typedCall = jest.fn().mockResolvedValue({ type: 'Success' });
  const checkDisposed = jest.fn();
  const acquire = jest.fn().mockResolvedValue(undefined);
  const commands = {
    typedCall,
    checkDisposed,
    disposed: false,
  };

  method.device = {
    features: {
      onekey_device_type: deviceType,
      onekey_serial_no: deviceType === 'PURE' ? 'CP123456' : 'CL123456',
      bootloader_mode: bootloaderMode,
      major_version: 3,
      minor_version: 0,
      patch_version: 0,
      capabilities: [],
    },
    commands,
    getCommands: () => commands,
    acquire,
    toMessageObject: jest.fn(() => ({})),
  } as any;
  method.postMessage = jest.fn();
  jest.spyOn(method, 'checkDeviceToBootloader').mockImplementation(() => {
    method.checkPromise = {
      promise: Promise.resolve(true),
    } as any;
  });

  return {
    method,
    typedCall,
    acquire,
  };
};

describe('FirmwareUpdateV2 download-before-reboot safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(utils, 'wait').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    {
      context: 'Classic 1S normal mode',
      deviceType: 'CLASSIC1S' as const,
      bootloaderMode: false,
    },
    {
      context: 'Classic Pure normal mode',
      deviceType: 'PURE' as const,
      bootloaderMode: false,
    },
    {
      context: 'initial bootloader mode',
      deviceType: 'CLASSIC1S' as const,
      bootloaderMode: true,
    },
  ])('blocks all firmware mutation after final download failure in $context', async options => {
    mockGetBinary.mockRejectedValue(new Error('request failed'));
    const { method, typedCall, acquire } = createMethod(options);

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
    });

    expect(mockGetBinary).toHaveBeenCalledTimes(1);
    expectNoFirmwareMutationCalls(typedCall);
    expect(acquire).not.toHaveBeenCalled();
    expect(mockUploadFirmware).not.toHaveBeenCalled();
  });

  it.each([
    {
      mode: 'firmware release.url',
      updateType: 'firmware' as const,
      isUpdateBootloader: undefined,
      deviceType: 'CLASSIC1S' as const,
      firmwareBinary: new ArrayBuffer(4),
    },
    {
      mode: 'BLE webUpdate',
      updateType: 'ble' as const,
      isUpdateBootloader: undefined,
      deviceType: 'PURE' as const,
      firmwareBinary: Buffer.from([1, 2, 3, 4]),
    },
    {
      mode: 'bootloaderResource',
      updateType: 'firmware' as const,
      isUpdateBootloader: true,
      deviceType: 'CLASSIC1S' as const,
      firmwareBinary: new ArrayBuffer(8),
    },
  ])(
    'acquires $mode before rebooting and preserves the response shape',
    async ({ updateType, isUpdateBootloader, deviceType = 'CLASSIC1S', firmwareBinary }) => {
      const callOrder: string[] = [];
      const expectedResponse = {
        success: true,
        payload: {
          firmwareVersion: '3.0.0',
        },
      };
      mockGetBinary.mockImplementation(() => {
        callOrder.push('download');
        return Promise.resolve({
          binary: firmwareBinary,
        } as Awaited<ReturnType<typeof getBinary>>);
      });
      mockUploadFirmware.mockImplementation(() => {
        callOrder.push('upload');
        return Promise.resolve(expectedResponse as Awaited<ReturnType<typeof uploadFirmware>>);
      });
      const { method, typedCall } = createMethod({
        updateType,
        isUpdateBootloader,
        deviceType,
      });
      typedCall.mockImplementation(type => {
        if (type === 'DeviceBackToBoot') {
          callOrder.push('reboot');
        }
        return Promise.resolve({ type: 'Success' });
      });

      await expect(method.run()).resolves.toBe(expectedResponse);

      expect(callOrder).toEqual(['download', 'reboot', 'upload']);
      expect(mockGetBinary).toHaveBeenCalledWith(
        expect.objectContaining({
          updateType,
          isUpdateBootloader,
          requestOptions: {
            connectTimeoutMs: 60_000,
            readTimeoutMs: 60_000,
            overallTimeoutMs: 180_000,
            maxRetries: 2,
            retryDelayMs: 500,
          },
        })
      );
      expect(mockUploadFirmware).toHaveBeenCalledWith(
        updateType,
        expect.any(Function),
        expect.any(Function),
        method.device,
        {
          payload: firmwareBinary,
          rebootOnSuccess: true,
        },
        isUpdateBootloader
      );
    }
  );

  it('downloads before acquiring and uploading when the device starts in bootloader mode', async () => {
    const callOrder: string[] = [];
    const firmwareBinary = new ArrayBuffer(4);
    mockGetBinary.mockImplementation(() => {
      callOrder.push('download');
      return Promise.resolve({
        binary: firmwareBinary,
      } as Awaited<ReturnType<typeof getBinary>>);
    });
    mockUploadFirmware.mockImplementation(() => {
      callOrder.push('upload');
      return Promise.resolve({
        success: true,
      } as Awaited<ReturnType<typeof uploadFirmware>>);
    });
    const { method, typedCall, acquire } = createMethod({
      bootloaderMode: true,
    });
    acquire.mockImplementation(() => {
      callOrder.push('acquire');
      return Promise.resolve();
    });

    await method.run();

    expect(callOrder).toEqual(['download', 'acquire', 'upload']);
    expect(countCommandCalls(typedCall, 'DeviceBackToBoot')).toBe(0);
  });

  it('does not reboot while the firmware download is pending', async () => {
    let resolveDownload!: (result: Awaited<ReturnType<typeof getBinary>>) => void;
    const firmwareBinary = new ArrayBuffer(4);
    mockGetBinary.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveDownload = resolve;
        })
    );
    mockUploadFirmware.mockResolvedValue({
      success: true,
    } as Awaited<ReturnType<typeof uploadFirmware>>);
    const { method, typedCall } = createMethod();

    const runPromise = method.run();

    expect(mockGetBinary).toHaveBeenCalledTimes(1);
    expect(countCommandCalls(typedCall, 'DeviceBackToBoot')).toBe(0);

    resolveDownload({
      binary: firmwareBinary,
    } as Awaited<ReturnType<typeof getBinary>>);
    await runPromise;

    expect(countCommandCalls(typedCall, 'DeviceBackToBoot')).toBe(1);
  });

  it.each([
    ['ArrayBuffer', new ArrayBuffer(0)],
    ['Buffer', Buffer.alloc(0)],
  ])('does not reboot or upload an empty downloaded %s', async (_kind, firmwareBinary) => {
    mockGetBinary.mockResolvedValue({
      binary: firmwareBinary,
    } as Awaited<ReturnType<typeof getBinary>>);
    const { method, typedCall, acquire } = createMethod();

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
    });

    expectNoFirmwareMutationCalls(typedCall);
    expect(acquire).not.toHaveBeenCalled();
    expect(mockUploadFirmware).not.toHaveBeenCalled();
  });

  it.each([
    ['ArrayBuffer', new ArrayBuffer(4)],
    ['Buffer', Buffer.from([1, 2, 3, 4])],
  ])(
    'keeps the non-empty %s binary overload and never downloads it again',
    async (_kind, binary) => {
      mockUploadFirmware.mockResolvedValue({
        success: true,
      } as Awaited<ReturnType<typeof uploadFirmware>>);
      const { method } = createMethod({ binary });

      await method.run();

      expect(mockGetBinary).not.toHaveBeenCalled();
      expect(mockUploadFirmware).toHaveBeenCalledWith(
        'firmware',
        expect.any(Function),
        expect.any(Function),
        method.device,
        {
          payload: binary,
          rebootOnSuccess: true,
        },
        undefined
      );
    }
  );

  it.each([
    ['Uint8Array subview', new Uint8Array([9, 1, 2, 9]).subarray(1, 3), [1, 2]],
    ['DataView', new DataView(new Uint8Array([9, 3, 4, 9]).buffer, 1, 2), [3, 4]],
    ['custom Buffer', createCustomBuffer(4), [1, 2, 3, 4]],
  ])('normalizes a non-empty %s before rebooting', async (_kind, binary, expectedBytes) => {
    mockUploadFirmware.mockResolvedValue({
      success: true,
    } as Awaited<ReturnType<typeof uploadFirmware>>);
    const { method } = createMethod({ binary });

    await method.run();

    expect(mockGetBinary).not.toHaveBeenCalled();
    const normalizedBinary = mockUploadFirmware.mock.calls[0][4].payload;
    expect(normalizedBinary).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(normalizedBinary))).toEqual(expectedBytes);
  });

  it.each([
    ['ArrayBuffer', new ArrayBuffer(0)],
    ['Buffer', Buffer.alloc(0)],
    ['ArrayBufferView', new Uint8Array(0)],
    ['custom Buffer', createCustomBuffer(0)],
  ])('rejects an empty supplied %s before rebooting', async (_kind, binary) => {
    const { method, typedCall, acquire } = createMethod({ binary });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
    });

    expect(mockGetBinary).not.toHaveBeenCalled();
    expectNoFirmwareMutationCalls(typedCall);
    expect(acquire).not.toHaveBeenCalled();
    expect(mockUploadFirmware).not.toHaveBeenCalled();
  });
});
