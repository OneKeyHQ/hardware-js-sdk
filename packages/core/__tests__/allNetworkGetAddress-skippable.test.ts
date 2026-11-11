import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { handleSkippableHardwareError } from '../src/api/allnetwork/AllNetworkGetAddressBase';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

// Breaks the api/index -> AllNetworkGetAddress import cycle, as the tracing test does.
jest.mock('../src/api/utils', () => ({
  findMethod: jest.fn(),
}));

const device = {
  getCurrentMethodVersionRange: jest.fn(() => undefined),
  getCurrentFirmwareVersionString: jest.fn(() => '1.0.0'),
  getCurrentFirmwareType: jest.fn(() => 'universal'),
} as any;
const method = { name: 'zcashGetAddress', getVersionRange: () => ({}) } as any;

describe('all-network chains the firmware lacks', () => {
  test.each([
    'Failure_UnexpectedMessage,Unknown message',
    'Failure_UnknownMessage,Unknown message',
    // Pro 2's wording for a message type it has no handler for.
    'Failure_ProcessError,Handler not found: No handler for type: 12400',
  ])('skips the chain on %s', message => {
    const error = handleSkippableHardwareError(new Error(message), device, method);
    expect(error?.errorCode).toBe(HardwareErrorCode.DeviceNotSupportMethod);
  });

  test.each([HardwareErrorCode.ForbiddenKeyPath, HardwareErrorCode.DeviceNotSupportPath])(
    'skips the chain when the device refuses its path (%s)',
    errorCode => {
      const error = handleSkippableHardwareError(ERRORS.TypedError(errorCode), device, method);
      expect(error?.errorCode).toBe(errorCode);
    }
  );

  test('still fails the request on any other device error', () => {
    const error = handleSkippableHardwareError(
      new Error('Failure_ProcessError,Cancelled'),
      device,
      method
    );
    expect(error).toBeUndefined();
  });
});
