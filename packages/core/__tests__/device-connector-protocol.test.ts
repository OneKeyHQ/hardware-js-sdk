import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import DeviceConnector from '../src/device/DeviceConnector';

jest.mock('../src/data-manager/TransportManager', () => ({
  __esModule: true,
  default: {
    load: jest.fn(),
    getTransport: jest.fn(),
  },
}));

jest.mock('../src/data-manager', () => ({
  DataManager: {
    getSettings: jest.fn(() => 'desktop-web-ble'),
    isBleConnect: jest.fn(() => true),
  },
}));

jest.mock('../src/device/DevicePool', () => ({
  DevicePool: {
    setConnector: jest.fn(),
  },
}));

const transportManagerMock: {
  default: {
    getTransport: jest.Mock;
  };
} = jest.requireMock('../src/data-manager/TransportManager');

describe('DeviceConnector protocol validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports an explicit transport error when connector initialization ran too early', async () => {
    transportManagerMock.default.getTransport.mockReturnValue(undefined);
    const connector = new DeviceConnector();

    await expect(connector.enumerate()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.TransportNotConfigured,
    });
  });

  it('uses the actively probed protocol returned by acquire when the cache was cleared', async () => {
    const acquire = jest.fn().mockResolvedValue({
      id: 'pro2-id',
      path: 'pro2-id',
      protocolType: 'V2',
    });
    transportManagerMock.default.getTransport.mockReturnValue({
      acquire,
      getProtocolType: jest.fn(() => undefined),
    });
    const connector = new DeviceConnector();

    await expect(connector.acquire('pro2-id', undefined, undefined, 'V2')).resolves.toEqual(
      expect.objectContaining({ protocolType: 'V2' })
    );
    expect(acquire).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'pro2-id', expectedProtocol: 'V2' })
    );
  });

  it('still rejects a real mismatch reported by the active protocol probe', async () => {
    transportManagerMock.default.getTransport.mockReturnValue({
      acquire: jest.fn().mockResolvedValue({
        id: 'classic-id',
        path: 'classic-id',
        protocolType: 'V1',
      }),
      getProtocolType: jest.fn(() => 'V1'),
    });
    const connector = new DeviceConnector();

    await expect(connector.acquire('classic-id', undefined, undefined, 'V2')).rejects.toThrow(
      'Device protocol mismatch: expected V2, detected V1'
    );
  });
});
