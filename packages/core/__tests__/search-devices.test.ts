import SearchDevices from '../src/api/SearchDevices';

jest.mock('../src/data-manager/TransportManager', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    ensureInitialized: jest.fn(),
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
    getDeviceByPath: jest.fn(),
  },
}));

const transportManagerMock: {
  default: { configure: jest.Mock; ensureInitialized: jest.Mock };
} = jest.requireMock('../src/data-manager/TransportManager');
const devicePoolMock: {
  DevicePool: { getDevices: jest.Mock; getDeviceByPath: jest.Mock };
} = jest.requireMock('../src/device/DevicePool');
const dataManagerMock: {
  DataManager: {
    getSettings: jest.Mock;
    isBleConnect: jest.Mock;
  };
} = jest.requireMock('../src/data-manager');
const { configure: mockConfigureTransport, ensureInitialized: mockEnsureInitialized } =
  transportManagerMock.default;
const { getDevices: mockGetDevices, getDeviceByPath: mockGetDeviceByPath } =
  devicePoolMock.DevicePool;
const { isBleConnect: mockIsBleConnect } = dataManagerMock.DataManager;

describe('SearchDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBleConnect.mockReturnValue(false);
    dataManagerMock.DataManager.getSettings.mockReturnValue('webusb');
  });

  test.each(['webusb', 'desktop-webusb'])(
    '%s discovery leaves active V1/V2 requests and their schemas untouched',
    async env => {
      dataManagerMock.DataManager.getSettings.mockReturnValue(env);
      const devices = ['V1', 'V2'].map(protocol => ({
        features: { protocol },
        toMessageObject: () => ({ connectId: `serial-${protocol}` }),
      }));
      mockGetDeviceByPath.mockImplementation(
        (path: string) => devices[['usb-V1', 'usb-V2'].indexOf(path)]
      );
      const extraDevice = {
        toMessageObject: () => ({ connectId: 'not-initialized' }),
      };
      mockGetDevices.mockResolvedValue({
        devices: { 'not-initialized': extraDevice },
        deviceList: [extraDevice],
      });
      const method = new SearchDevices({
        id: 1,
        payload: { method: 'searchDevices' },
      } as never);
      method.init();
      method.context = {
        requestQueue: {
          getRequestTasksId: () => [2],
          getRequestTasksIdByConnectId: (connectId: string) =>
            connectId === 'usb-V1' || connectId === 'usb-V2' ? [2] : [],
        },
      } as never;
      method.connector = {
        enumerate: jest.fn().mockResolvedValue({
          descriptors: [
            { path: 'usb-V1', commType: 'webusb' },
            { path: 'usb-V2', commType: 'webusb' },
            { path: 'not-initialized', commType: 'webusb' },
          ],
        }),
      } as never;

      await expect(method.run()).resolves.toEqual([
        { connectId: 'serial-V1' },
        { connectId: 'serial-V2' },
        { connectId: 'not-initialized' },
      ]);
      expect(mockGetDevices).toHaveBeenCalledTimes(1);
      expect(mockGetDevices).toHaveBeenCalledWith(
        [{ path: 'not-initialized', commType: 'webusb' }],
        'not-initialized',
        {
          connectProtocol: undefined,
          forceProtocolDetection: true,
          refreshRuntimeState: true,
        }
      );
      expect(mockConfigureTransport).not.toHaveBeenCalled();
    }
  );

  const BOOTLOADER_PATH = '00000000000000000000000000000000';

  const runOwnedSearch = (
    path: string,
    ownerDevice?: unknown,
    usbHandles: unknown[] = [{ vendorId: 0x1209, productId: 0x4f4c }]
  ) => {
    const method = new SearchDevices({
      id: 1,
      payload: { method: 'searchDevices' },
    } as never);
    method.init();
    method.context = {
      requestQueue: {
        getRequestTasksId: () => [2],
        getRequestTasksIdByConnectId: (connectId: string) => (connectId === path ? [2] : []),
        getTask: (requestId: number) =>
          requestId === 2 ? { method: { device: ownerDevice } } : undefined,
      },
    } as never;
    method.connector = {
      enumerate: jest.fn().mockResolvedValue({
        descriptors: usbHandles.map(device => ({ path, device, commType: 'webusb' })),
      }),
    } as never;
    return method.run();
  };

  const createOwnerDevice = (path: string, usbHandle: unknown, serialNo: string) => ({
    mainId: path,
    features: { serial_no: serialNo },
    originalDescriptor: { path, device: usbHandle },
    toMessageObject: () => ({ connectId: serialNo, serialNo, uuid: serialNo }),
  });

  test.each(['serial-V2', 'usb-1209-4f4c-onekey', BOOTLOADER_PATH])(
    'owned WebUSB cache miss on %s reports the path without inventing an identity or probing',
    async path => {
      mockGetDeviceByPath.mockReturnValue(undefined);

      await expect(runOwnedSearch(path)).resolves.toEqual([
        {
          connectId: path,
          uuid: '',
          serialNo: null,
          deviceId: null,
          deviceType: 'unknown',
          name: path,
          commType: 'webusb',
        },
      ]);
      expect(mockGetDevices).not.toHaveBeenCalled();
      expect(mockConfigureTransport).not.toHaveBeenCalled();
    }
  );

  test('owned WebUSB cache miss reports the owning request device identity', async () => {
    mockGetDeviceByPath.mockReturnValue(undefined);
    const usbHandle = { vendorId: 0x1209, productId: 0x4f4c };
    const ownerDevice = createOwnerDevice(BOOTLOADER_PATH, usbHandle, 'PRO2SERIAL');

    await expect(runOwnedSearch(BOOTLOADER_PATH, ownerDevice, [usbHandle])).resolves.toEqual([
      { connectId: 'PRO2SERIAL', serialNo: 'PRO2SERIAL', uuid: 'PRO2SERIAL' },
    ]);
    expect(mockGetDevices).not.toHaveBeenCalled();
  });

  test('owned WebUSB cache miss ignores an owning request device bound to another path', async () => {
    mockGetDeviceByPath.mockReturnValue(undefined);
    const usbHandle = { vendorId: 0x1209, productId: 0x4f4c };
    const ownerDevice = createOwnerDevice('other-path', usbHandle, 'OTHERSERIAL');

    await expect(runOwnedSearch('usb-1209-4f4c-onekey', ownerDevice, [usbHandle])).resolves.toEqual(
      [expect.objectContaining({ connectId: 'usb-1209-4f4c-onekey', uuid: '', serialNo: null })]
    );
  });

  test('a second device on the shared bootloader path does not take the owner identity', async () => {
    mockGetDeviceByPath.mockReturnValue(undefined);
    const ownerHandle = { vendorId: 0x1209, productId: 0x4f4c };
    const otherHandle = { vendorId: 0x1209, productId: 0x4f4c };
    const ownerDevice = createOwnerDevice(BOOTLOADER_PATH, ownerHandle, 'MINISERIAL');

    await expect(
      runOwnedSearch(BOOTLOADER_PATH, ownerDevice, [ownerHandle, otherHandle])
    ).resolves.toEqual([
      { connectId: 'MINISERIAL', serialNo: 'MINISERIAL', uuid: 'MINISERIAL' },
      expect.objectContaining({ connectId: BOOTLOADER_PATH, uuid: '', serialNo: null }),
    ]);
  });

  test('a device swapped onto the bound bootloader path does not take the owner identity', async () => {
    mockGetDeviceByPath.mockReturnValue(undefined);
    const ownerDevice = createOwnerDevice(
      BOOTLOADER_PATH,
      { vendorId: 0x1209, productId: 0x4f4c },
      'MINISERIAL'
    );

    await expect(
      runOwnedSearch(BOOTLOADER_PATH, ownerDevice, [{ vendorId: 0x1209, productId: 0x4f4c }])
    ).resolves.toEqual([
      expect.objectContaining({ connectId: BOOTLOADER_PATH, uuid: '', serialNo: null }),
    ]);
  });

  test('searchDevices resolves empty when WebUSB bring-up is unavailable', async () => {
    mockEnsureInitialized.mockRejectedValueOnce(
      new Error('WebUSB is not supported by current browsers')
    );
    const method = new SearchDevices({
      id: 1,
      payload: { method: 'searchDevices' },
    } as never);
    method.init();
    method.connector = {
      enumerate: jest.fn().mockResolvedValue({ descriptors: [] }),
    } as never;

    await expect(method.run()).resolves.toEqual([]);
    expect(mockEnsureInitialized).toHaveBeenCalled();
    expect(mockConfigureTransport).toHaveBeenCalledTimes(1);
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

  test('Protocol V2 probe-only search performs one strict wire probe without initialization', async () => {
    const descriptor = {
      path: 'pro2-webusb',
      session: null,
      name: 'OneKey Pro 2',
      commType: 'webusb',
    };
    const acquire = jest.fn().mockResolvedValue(descriptor.path);
    const release = jest.fn().mockResolvedValue(undefined);
    const method = new SearchDevices({
      id: 1,
      payload: {
        method: 'searchDevices',
        connectProtocol: 'V2',
        protocolProbeOnly: true,
        protocolProbeTimeoutMs: 200,
      },
    } as any);
    method.init();
    method.connector = {
      enumerate: jest.fn().mockResolvedValue({ descriptors: [descriptor] }),
      acquire,
      release,
    } as any;

    await expect(method.run()).resolves.toEqual([
      {
        connectId: descriptor.path,
        uuid: '',
        serialNo: null,
        deviceId: null,
        deviceType: 'unknown',
        name: descriptor.name,
        commType: descriptor.commType,
        connectProtocol: 'V2',
      },
    ]);
    expect(acquire).toHaveBeenCalledWith(
      descriptor.path,
      descriptor.session,
      undefined,
      'V2',
      undefined,
      true,
      undefined,
      200
    );
    expect(release).toHaveBeenCalledWith(descriptor.path, false);
    expect(mockGetDevices).not.toHaveBeenCalled();
  });

  test.each([
    ['OneKey Pro', 'pro'],
    ['OneKey Pro 2', 'pro2'],
    ['Neo A1B2', 'neo'],
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

  test.each([
    ['Pro2 A1B2 - Find My', undefined, 'Pro 2 A1B2'],
    ['Pro2 5E9D - Finde My', undefined, 'Pro 2 5E9D'],
    ['Pro2 22D8FindMy', undefined, 'Pro 2 22D8'],
    ['Pro 2 A1B2 - Find My', undefined, 'Pro 2 A1B2'],
    [undefined, 'OneKey Pro 2 A1B2 - Find My', 'OneKey Pro 2 A1B2'],
  ])(
    'BLE discovery normalizes the Find My display name from name=%s localName=%s',
    async (name, localName, expectedName) => {
      mockIsBleConnect.mockReturnValue(true);

      const method = new SearchDevices({
        id: 1,
        payload: { method: 'searchDevices' },
      } as any);
      method.init();
      method.connector = {
        enumerate: jest.fn().mockResolvedValue({
          descriptors: [
            {
              id: 'ble-peripheral-id',
              path: 'ble-peripheral-id',
              name,
              localName,
              commType: 'ble',
            },
          ],
        }),
      } as any;

      await expect(method.run()).resolves.toEqual([
        expect.objectContaining({
          connectId: 'ble-peripheral-id',
          name: expectedName,
          deviceType: 'pro2',
        }),
      ]);
    }
  );
});
