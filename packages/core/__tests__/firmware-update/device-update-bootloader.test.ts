import { EDeviceType, EFirmwareType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import DeviceUpdateBootloader from '../../src/api/device/DeviceUpdateBootloader';
import {
  registerFirmwareUpdateHostBinding,
  unregisterFirmwareUpdateHostBinding,
} from '../../src/api/firmware/FirmwareHostBinding';

jest.mock('../../src/api/firmware/FirmwareUpdatePreparedPlan', () => ({
  assertFirmwareUpdatePreparedPlanBinding: jest.fn(),
  assertFirmwareUpdatePreparedPlanDeviceIdentity: jest.fn(),
}));

jest.mock('../../src/data-manager', () => ({
  DataManager: {
    getSettings: jest.fn(),
    isBleConnect: jest.fn(),
  },
}));

jest.mock('../../src/device/DevicePool', () => ({
  DevicePool: {},
}));

const artifact = {
  artifactRef: `fw:${'a'.repeat(64)}`,
  size: 4,
  sha256: 'a'.repeat(64),
};

const createMethod = () => {
  const closeError = new Error('artifact reader close failed');
  const close = jest.fn().mockRejectedValue(closeError);
  const artifactReader = {
    open: jest.fn().mockResolvedValue({ readerId: 'reader-1', size: artifact.size }),
    read: jest.fn(),
    close,
  };
  const hostBindingGeneration = registerFirmwareUpdateHostBinding({
    artifactReader,
    preparedPlanDigest: 'a'.repeat(64),
  });
  const method = new DeviceUpdateBootloader({
    id: 1,
    payload: {
      method: 'deviceUpdateBootloader',
      artifact,
      hostBindingGeneration,
      preparedPlan: {},
    },
  });
  (method as any).device = {
    features: {
      deviceType: EDeviceType.Touch,
      serialNo: 'touch-device-id',
    },
    getCurrentDeviceType: () => EDeviceType.Touch,
    getCurrentFirmwareType: () => EFirmwareType.Universal,
  };
  return { close, closeError, method };
};

describe('DeviceUpdateBootloader artifact source cleanup', () => {
  afterEach(() => {
    unregisterFirmwareUpdateHostBinding();
    jest.restoreAllMocks();
  });

  test('does not replace a successful update result when source close fails', async () => {
    const { close, method } = createMethod();
    jest.spyOn(method, 'updateTouchBootloader').mockResolvedValue(true);

    await expect(method.run()).resolves.toBe(true);

    expect(close).toHaveBeenCalledWith({ readerId: 'reader-1' });
  });

  test('does not replace the original hardware error when source close fails', async () => {
    const { close, method } = createMethod();
    const hardwareError = ERRORS.TypedError(
      HardwareErrorCode.FirmwareError,
      'original bootloader hardware error'
    );
    jest.spyOn(method, 'updateTouchBootloader').mockRejectedValue(hardwareError);

    await expect(method.run()).rejects.toBe(hardwareError);

    expect(close).toHaveBeenCalledWith({ readerId: 'reader-1' });
  });
});
