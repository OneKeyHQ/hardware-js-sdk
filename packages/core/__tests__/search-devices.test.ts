import SearchDevices from '../src/api/SearchDevices';

jest.mock('../src/data-manager/TransportManager', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
  },
}));

jest.mock('../src/data-manager', () => ({
  DataManager: {
    getSettings: jest.fn(() => 'webusb'),
    isBleConnect: jest.fn(() => false),
  },
}));

jest.mock('../src/device/DevicePool', () => ({
  DevicePool: {
    getDevices: jest.fn(),
  },
}));

const transportManagerMock: { default: { configure: jest.Mock } } = jest.requireMock(
  '../src/data-manager/TransportManager'
);
const devicePoolMock: { DevicePool: { getDevices: jest.Mock } } = jest.requireMock(
  '../src/device/DevicePool'
);
const dataManagerMock: {
  DataManager: {
    getSettings: jest.Mock;
    isBleConnect: jest.Mock;
  };
} = jest.requireMock('../src/data-manager');
const { configure: mockConfigureTransport } = transportManagerMock.default;
const { getDevices: mockGetDevices } = devicePoolMock.DevicePool;
const { isBleConnect: mockIsBleConnect } = dataManagerMock.DataManager;

describe('SearchDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBleConnect.mockReturnValue(false);
  });

  test('搜索忽略调用方协议并主动探测，单个无响应设备不阻断后续结果', async () => {
    const unresponsiveDescriptor = {
      path: 'stale-usb-device',
      id: 'stale-usb-device',
    } as any;
    const availableDescriptor = {
      path: 'available-usb-device',
      id: 'available-usb-device',
    } as any;
    const availableDeviceInfo = {
      connectId: 'available-usb-device',
      deviceType: 'pro2',
    };
    const availableDevice = {
      toMessageObject: jest.fn(() => availableDeviceInfo),
    } as any;

    mockGetDevices
      .mockRejectedValueOnce(
        new Error(
          'Unable to detect USB protocol: device did not respond to Protocol V1 Initialize or Protocol V2 Ping'
        )
      )
      .mockResolvedValueOnce({
        devices: { 'available-usb-device': availableDevice },
        deviceList: [availableDevice],
      });

    const method = new SearchDevices({
      id: 1,
      payload: {
        method: 'searchDevices',
        connectProtocol: 'V2',
      },
    } as any);
    method.init();
    method.connector = {
      enumerate: jest.fn().mockResolvedValue({
        descriptors: [unresponsiveDescriptor, availableDescriptor],
      }),
    } as any;

    await expect(method.run()).resolves.toEqual([availableDeviceInfo]);
    expect(mockConfigureTransport).toHaveBeenCalledTimes(1);
    expect(mockGetDevices).toHaveBeenNthCalledWith(
      1,
      [unresponsiveDescriptor],
      unresponsiveDescriptor.path,
      {
        connectProtocol: undefined,
        forceProtocolDetection: true,
        refreshRuntimeState: true,
      }
    );
    expect(mockGetDevices).toHaveBeenNthCalledWith(
      2,
      [availableDescriptor],
      availableDescriptor.path,
      {
        connectProtocol: undefined,
        forceProtocolDetection: true,
        refreshRuntimeState: true,
      }
    );
  });

  test.each([
    ['OneKey Pro', 'pro'],
    ['OneKey Pro 2', 'pro2'],
  ])(
    'BLE discovery keeps the %s transport identity separate from device identity',
    async (name, deviceType) => {
      mockIsBleConnect.mockReturnValue(true);

      const descriptor = {
        id: 'ble-peripheral-id',
        path: 'ble-peripheral-id',
        name,
        commType: 'ble',
      };
      const method = new SearchDevices({
        id: 1,
        payload: {
          method: 'searchDevices',
        },
      } as any);
      method.init();
      method.connector = {
        enumerate: jest.fn().mockResolvedValue({
          descriptors: [descriptor],
        }),
      } as any;

      await expect(method.run()).resolves.toEqual([
        {
          ...descriptor,
          connectId: 'ble-peripheral-id',
          serialNo: null,
          uuid: '',
          deviceId: null,
          deviceType,
        },
      ]);
      expect(mockGetDevices).not.toHaveBeenCalled();
    }
  );
});
