import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import CheckAllFirmwareRelease from '../../src/api/CheckAllFirmwareRelease';
import { buildFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePlan';
import {
  getBleFirmwareReleaseInfo,
  getBootloaderReleaseInfo,
  getFirmwareReleaseInfo,
} from '../../src/api/firmware/releaseHelper';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../../src/api/firmware/FirmwareUpdatePlan', () => ({
  buildFirmwareUpdatePlan: jest.fn(),
}));

jest.mock('../../src/api/firmware/releaseHelper', () => ({
  getBleFirmwareReleaseInfo: jest.fn(),
  getBootloaderReleaseInfo: jest.fn(),
  getFirmwareReleaseInfo: jest.fn(),
}));

const mockBuildFirmwareUpdatePlan = buildFirmwareUpdatePlan as jest.MockedFunction<
  typeof buildFirmwareUpdatePlan
>;
const mockGetBleFirmwareReleaseInfo = getBleFirmwareReleaseInfo as jest.MockedFunction<
  typeof getBleFirmwareReleaseInfo
>;
const mockGetBootloaderReleaseInfo = getBootloaderReleaseInfo as jest.MockedFunction<
  typeof getBootloaderReleaseInfo
>;
const mockGetFirmwareReleaseInfo = getFirmwareReleaseInfo as jest.MockedFunction<
  typeof getFirmwareReleaseInfo
>;

describe('CheckAllFirmwareRelease', () => {
  test('keeps release information available when an optional Plan cannot be built', async () => {
    const firmware = {
      status: 'outdated' as const,
      release: {
        url: 'https://firmware.onekey.so/classic/firmware.bin',
        version: [3, 0, 0],
      },
    };
    const noUpdate = {
      status: 'valid' as const,
      release: undefined,
    };
    mockGetFirmwareReleaseInfo.mockReturnValue(firmware);
    mockGetBootloaderReleaseInfo.mockReturnValue(noUpdate);
    mockGetBleFirmwareReleaseInfo.mockReturnValue(noUpdate);
    mockBuildFirmwareUpdatePlan.mockImplementation(() => {
      throw new Error('FirmwarePlanInvalid');
    });

    const method = new CheckAllFirmwareRelease({
      id: 1,
      payload: {
        method: 'checkAllFirmwareRelease',
        platform: 'native',
      },
    });
    method.init();
    method.device = {
      features: {
        deviceType: EDeviceType.Classic1s,
        serialNo: '',
        firmwareType: EFirmwareType.Universal,
        firmwareVersion: '1.0.0',
        bootloaderVersion: '1.0.0',
      },
    } as typeof method.device;

    await expect(method.run()).resolves.toEqual(
      expect.objectContaining({
        firmware,
        bootloader: noUpdate,
        ble: noUpdate,
        firmwareUpdatePlan: undefined,
      })
    );
  });
});
