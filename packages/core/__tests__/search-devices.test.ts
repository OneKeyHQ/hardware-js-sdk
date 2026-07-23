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
const { configure: mockConfigureTransport } = transportManagerMock.default;
const { getDevices: mockGetDevices } = devicePoolMock.DevicePool;

describe('SearchDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('单个 USB 描述符无响应时跳过该设备并继续搜索', async () => {
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
      { connectProtocol: undefined, refreshRuntimeState: true }
    );
    expect(mockGetDevices).toHaveBeenNthCalledWith(
      2,
      [availableDescriptor],
      availableDescriptor.path,
      { connectProtocol: undefined, refreshRuntimeState: true }
    );
  });
});
