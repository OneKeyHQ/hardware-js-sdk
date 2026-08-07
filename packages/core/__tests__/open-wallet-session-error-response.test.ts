import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { initCore } from '../src/core';
import { IFRAME } from '../src/events';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

jest.mock('../src/data-manager/TransportManager', () => ({
  __esModule: true,
  default: {
    configure: jest.fn().mockResolvedValue(undefined),
    getTransport: jest.fn(() => undefined),
  },
}));

describe('openWalletSession error response', () => {
  test('returns a structured invalid-parameter response for an incomplete resume request', async () => {
    const core = initCore();

    const response = await core.handleMessage({
      id: 1,
      event: IFRAME.CALL,
      type: IFRAME.CALL,
      payload: {
        method: 'openWalletSession',
        connectId: 'connect-id',
        mode: 'resume-hidden',
      },
    } as never);

    expect(response).toMatchObject({
      success: false,
      payload: {
        error: 'Missing required parameter: deviceId',
        code: HardwareErrorCode.CallMethodInvalidParameter,
      },
    });
    await core.dispose();
  });
});
