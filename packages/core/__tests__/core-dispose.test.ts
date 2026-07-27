import Core, { initConnector } from '../src/core';
import TransportManager from '../src/data-manager/TransportManager';
import { DevicePool } from '../src/device/DevicePool';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0-test'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0-test/',
}));

describe('Core.dispose', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('幂等停止 Connector 和 Transport，并重置共享设备状态', async () => {
    const connector = initConnector();
    const connectorStop = jest.spyOn(connector, 'stop');
    const transportStop = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(TransportManager, 'getTransport').mockReturnValue({ stop: transportStop } as never);
    const resetDevicePool = jest.spyOn(DevicePool, 'resetState');
    const core = new Core();

    const firstDispose = core.dispose();
    expect(connectorStop).toHaveBeenCalledTimes(1);
    expect(transportStop).toHaveBeenCalledTimes(1);
    expect(resetDevicePool).toHaveBeenCalledTimes(1);

    await firstDispose;
    await core.dispose();
    expect(connectorStop).toHaveBeenCalledTimes(1);
    expect(transportStop).toHaveBeenCalledTimes(1);
    expect(resetDevicePool).toHaveBeenCalledTimes(1);
  });
});
