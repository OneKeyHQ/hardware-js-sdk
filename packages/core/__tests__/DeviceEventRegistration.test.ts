import { DEVICE } from '../src/events';
import { registerHardwareUiEventListeners } from '../src/core/deviceEventRegistration';

const handlers = {
  pin: jest.fn(),
  pinOnDevice: jest.fn(),
  pinOnDeviceComplete: jest.fn(),
  button: jest.fn(),
  passphrase: jest.fn(),
  passphraseOnDevice: jest.fn(),
  attachPinOnDevice: jest.fn(),
};

const createDevice = (protocolV2: boolean) => ({
  isProtocolV2: jest.fn(() => protocolV2),
  on: jest.fn(),
});

describe('hardware UI event registration', () => {
  test('keeps all interactive UI events for Protocol V2 devices during compatibility mode', () => {
    const device = createDevice(true);

    expect(registerHardwareUiEventListeners(device as any, handlers)).toBe(true);
    expect(device.on.mock.calls.map(([type]) => type)).toEqual([
      DEVICE.PIN,
      DEVICE.PIN_ON_DEVICE,
      DEVICE.PIN_ON_DEVICE_COMPLETE,
      DEVICE.BUTTON,
      DEVICE.PASSPHRASE,
      DEVICE.PASSPHRASE_ON_DEVICE,
      DEVICE.ATTACH_PIN_ON_DEVICE,
    ]);
  });

  test('keeps the existing interactive event listeners for Protocol V1 devices', () => {
    const device = createDevice(false);

    expect(registerHardwareUiEventListeners(device as any, handlers)).toBe(true);
    expect(device.on.mock.calls.map(([type]) => type)).toEqual([
      DEVICE.PIN,
      DEVICE.PIN_ON_DEVICE,
      DEVICE.PIN_ON_DEVICE_COMPLETE,
      DEVICE.BUTTON,
      DEVICE.PASSPHRASE,
      DEVICE.PASSPHRASE_ON_DEVICE,
      DEVICE.ATTACH_PIN_ON_DEVICE,
    ]);
  });
});
