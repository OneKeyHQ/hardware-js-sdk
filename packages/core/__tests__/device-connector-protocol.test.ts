import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { createProtocolV2LinkDisabledError } from '@onekeyfe/hd-transport';

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
    getActiveCommType: jest.fn(() => undefined),
  },
}));

jest.mock('../src/device/DevicePool', () => ({
  DevicePool: {
    setConnector: jest.fn(),
    reportDeviceChange: jest.fn(),
    devicesCache: {},
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

    await expect(connector.acquire('classic-id', undefined, undefined, 'V2')).rejects.toMatchObject(
      {
        errorCode: HardwareErrorCode.TransportProtocolMismatch,
        params: { expectedProtocol: 'V2', detectedProtocol: 'V1' },
      }
    );
  });

  it('preserves the Protocol V2 USB-priority failure as public BLE error 723', async () => {
    transportManagerMock.default.getTransport.mockReturnValue({
      acquire: jest
        .fn()
        .mockRejectedValue(
          createProtocolV2LinkDisabledError('Failure_ProcessError', 'link disabled')
        ),
      getProtocolType: jest.fn(() => undefined),
    });
    const connector = new DeviceConnector();

    await expect(connector.acquire('pro2-id', undefined, undefined, 'V2')).rejects.toMatchObject({
      errorCode: HardwareErrorCode.BleUnavailableWhileUsbConnected,
      params: {
        failureCode: 'Failure_ProcessError',
        firmwareMessage: 'link disabled',
      },
    });
  });

  it('decides uuid-vs-path from descriptor commType and passes both for combined unknown commType', async () => {
    const dataManagerMock = jest.requireMock('../src/data-manager');
    const acquire = jest.fn().mockResolvedValue('SN_PRO2_USB');
    const enumerate = jest.fn().mockResolvedValue([
      { id: 'SN_PRO2_USB', path: 'SN_PRO2_USB', commType: 'usb', protocolType: 'V2' },
      { id: 'BLE_MAC_1', path: 'BLE_MAC_1', commType: 'ble', protocolType: 'V2' },
    ]);
    transportManagerMock.default.getTransport.mockReturnValue({
      enumerate,
      acquire,
      getProtocolType: jest.fn(() => 'V2'),
    });

    dataManagerMock.DataManager.getSettings.mockReturnValue('react-native-combined');
    dataManagerMock.DataManager.getActiveCommType.mockReturnValue(undefined);
    dataManagerMock.DataManager.isBleConnect.mockReturnValue(false);

    const connector = new DeviceConnector();

    // 1. Explicit commType='ble' overrides unknown/usb activeCommType
    acquire.mockResolvedValueOnce({ uuid: 'BLE_MAC_1', protocolType: 'V2' });
    await connector.acquire(
      'BLE_MAC_1',
      undefined,
      true,
      'V2',
      undefined,
      undefined,
      undefined,
      'ble'
    );
    expect(acquire).toHaveBeenLastCalledWith(
      expect.objectContaining({ uuid: 'BLE_MAC_1', expectedProtocol: 'V2' })
    );
    expect(acquire.mock.calls[0][0]).not.toHaveProperty('path');

    // 2. Explicit commType='usb' overrides ble activeCommType
    dataManagerMock.DataManager.getActiveCommType.mockReturnValue('ble');
    dataManagerMock.DataManager.isBleConnect.mockReturnValue(true);
    acquire.mockResolvedValueOnce('SN_PRO2_USB');
    await connector.acquire(
      'SN_PRO2_USB',
      null,
      undefined,
      'V2',
      undefined,
      undefined,
      undefined,
      'usb'
    );
    expect(acquire).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: 'SN_PRO2_USB', expectedProtocol: 'V2' })
    );
    expect(acquire.mock.calls[1][0]).not.toHaveProperty('uuid');

    // 3. Looked up from connector.upcoming after enumerate when commType arg is omitted
    await connector.enumerate();
    acquire.mockResolvedValueOnce('SN_PRO2_USB');
    await connector.acquire('SN_PRO2_USB', null, undefined, 'V2');
    expect(acquire).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: 'SN_PRO2_USB', expectedProtocol: 'V2' })
    );
    expect(acquire.mock.calls[2][0]).not.toHaveProperty('uuid');

    // 4. Combined + missing commType + unknown activeCommType routes with both path and uuid
    dataManagerMock.DataManager.getActiveCommType.mockReturnValue(undefined);
    dataManagerMock.DataManager.isBleConnect.mockReturnValue(false);
    acquire.mockResolvedValueOnce('SN_UNKNOWN_USB');
    await connector.acquire('SN_UNKNOWN_USB', null, undefined, 'V2');
    expect(acquire).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: 'SN_UNKNOWN_USB',
        uuid: 'SN_UNKNOWN_USB',
        expectedProtocol: 'V2',
      })
    );
  });
});
