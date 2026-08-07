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

describe('Core 错误输出边界', () => {
  test('连接失败只返回结构化错误，不直接写入 stdout', async () => {
    const stdout = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const core = initCore();

    const response = await core.handleMessage({
      id: 1,
      event: IFRAME.CALL,
      type: IFRAME.CALL,
      payload: {
        method: 'getDeviceState',
        connectId: 'missing-device',
        retryCount: 0,
        pollIntervalTime: 1,
        timeout: 10,
      },
    } as never);

    expect(response).toMatchObject({ success: false });
    expect(stdout).not.toHaveBeenCalled();
    await core.dispose();
  });
});
