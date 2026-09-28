import WebUsbTransport from '../src/webusb';

function createUsbDevice() {
  const device = {
    opened: false,
    configuration: { configurationValue: 1 },
    configurations: [],
    open: jest.fn(),
    reset: jest.fn().mockResolvedValue(undefined),
    selectConfiguration: jest.fn().mockResolvedValue(undefined),
    claimInterface: jest.fn().mockResolvedValue(undefined),
    clearHalt: jest.fn().mockResolvedValue(undefined),
  } as unknown as USBDevice & {
    opened: boolean;
    open: jest.Mock;
    reset: jest.Mock;
    selectConfiguration: jest.Mock;
    claimInterface: jest.Mock;
    clearHalt: jest.Mock;
  };

  device.open.mockImplementation(() => {
    device.opened = true;
    return Promise.resolve();
  });

  return device;
}

function createTransport(device: ReturnType<typeof createUsbDevice>) {
  const webusb = new WebUsbTransport() as any;
  webusb.Log = { debug: jest.fn() };
  webusb.findDevice = jest.fn().mockResolvedValue(device);
  webusb.getConnectedDevices = jest.fn().mockResolvedValue([]);
  return webusb;
}

describe('WebUsbTransport Protocol V1 reset policy', () => {
  test('passes expected Protocol V1 into the normal acquire connection', async () => {
    const webusb = new WebUsbTransport() as any;
    const path = 'classic1s-webusb';
    webusb.Log = { debug: jest.fn() };
    webusb.rotateProtocolV2UsbGeneration = jest.fn().mockResolvedValue(undefined);
    webusb.closeOpenDevice = jest.fn().mockResolvedValue(undefined);
    webusb.connect = jest.fn().mockResolvedValue(undefined);
    webusb.detectProtocol = jest.fn().mockResolvedValue('V1');

    await expect(webusb.acquire({ path, expectedProtocol: 'V1' })).resolves.toBe(path);

    expect(webusb.connect).toHaveBeenCalledWith(path, true, {
      expectedProtocol: 'V1',
      reason: 'acquire',
    });
  });

  test('does not USB-reset a normal acquire when Protocol V1 is expected', async () => {
    const device = createUsbDevice();
    const webusb = createTransport(device);
    const path = 'classic1s-webusb';

    await webusb.connectToDevice(path, true, {
      expectedProtocol: 'V1',
      reason: 'acquire',
    });

    expect(device.reset).not.toHaveBeenCalled();
    expect(device.selectConfiguration).toHaveBeenCalledWith(1);
    expect(device.claimInterface).toHaveBeenCalledWith(0);
    expect(device.clearHalt).toHaveBeenCalledWith('in', 1);
    expect(device.clearHalt).toHaveBeenCalledWith('out', 1);
    expect(webusb.Log.debug).toHaveBeenCalledWith(
      '[WebUsbTransport] usb reset skipped',
      expect.objectContaining({
        path,
        expectedProtocol: 'V1',
        skipReason: 'protocol-v1-known',
      })
    );
  });

  test('does not USB-reset when Protocol V1 is already cached', async () => {
    const device = createUsbDevice();
    const webusb = createTransport(device);
    const path = 'classic1s-webusb';
    webusb.deviceProtocol.set(path, 'V1');

    await webusb.connectToDevice(path, true, { reason: 'acquire' });

    expect(device.reset).not.toHaveBeenCalled();
  });

  test('keeps USB reset for expected Protocol V2', async () => {
    const device = createUsbDevice();
    const webusb = createTransport(device);
    const path = 'pro2-webusb';

    await webusb.connectToDevice(path, true, {
      expectedProtocol: 'V2',
      reason: 'acquire',
    });

    expect(device.reset).toHaveBeenCalledTimes(1);
    expect(webusb.Log.debug).toHaveBeenCalledWith(
      '[WebUsbTransport] usb reset completed',
      expect.objectContaining({
        path,
        expectedProtocol: 'V2',
      })
    );
  });

  test('keeps the existing reset behavior while protocol is unknown', async () => {
    const device = createUsbDevice();
    const webusb = createTransport(device);
    const path = 'unknown-webusb';

    await webusb.connectToDevice(path, true, { reason: 'acquire' });

    expect(device.reset).toHaveBeenCalledTimes(1);
  });
});
