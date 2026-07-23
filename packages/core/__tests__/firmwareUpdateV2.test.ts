import { getBinary } from '../src/api/firmware/getBinary';
import { uploadFirmware } from '../src/api/firmware/uploadFirmware';
import FirmwareUpdateV2 from '../src/api/FirmwareUpdateV2';
import * as utils from '../src/utils';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/api/firmware/getBinary', () => ({
  getBinary: jest.fn(),
  getInfo: jest.fn(),
  getSysResourceBinary: jest.fn(),
}));

jest.mock('../src/api/firmware/uploadFirmware', () => ({
  updateResources: jest.fn(),
  uploadFirmware: jest.fn(),
}));

describe('FirmwareUpdateV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(utils, 'wait').mockResolvedValue(undefined);
  });

  it('Classic 1S 应在进入 Bootloader 前下载固件', async () => {
    const calls: string[] = [];
    const firmwareBinary = new ArrayBuffer(8);
    const commands = {
      typedCall: jest.fn((type: string) => {
        if (type === 'DeviceBackToBoot') {
          calls.push('进入 Bootloader');
        }
        return Promise.resolve({ type: 'Success', message: {} });
      }),
      checkDisposed: jest.fn(),
      disposed: false,
    };
    const device = {
      features: {
        onekey_device_type: 'CLASSIC1S',
        bootloader_mode: false,
        onekey_serial_no: 'CL123456',
      },
      commands,
      getCommands: () => commands,
      acquire: jest.fn(),
      toMessageObject: jest.fn(() => ({})),
    };

    (getBinary as jest.Mock).mockImplementation(() => {
      calls.push('下载固件');
      return Promise.resolve({ binary: firmwareBinary });
    });
    (uploadFirmware as jest.Mock).mockImplementation(() => {
      calls.push('升级固件');
      return Promise.resolve({ message: 'ok' });
    });

    const method = new FirmwareUpdateV2({
      payload: {
        method: 'firmwareUpdateV2',
        updateType: 'firmware',
        version: [3, 0, 0],
        platform: 'desktop',
      },
    });
    method.init();
    method.device = device as any;
    method.postMessage = jest.fn();
    method.checkDeviceToBootloader = jest.fn(() => {
      method.checkPromise = {
        promise: Promise.resolve(true),
        resolve: jest.fn(),
        reject: jest.fn(),
      } as any;
    });

    await method.run();

    expect(calls).toEqual(['下载固件', '进入 Bootloader', '升级固件']);
  });
});
