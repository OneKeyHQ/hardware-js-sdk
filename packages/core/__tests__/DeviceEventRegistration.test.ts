import { DEVICE } from '../src/events';
import { registerHardwareUiEventListeners } from '../src/core/deviceEventRegistration';

const handlers = {
  pin: jest.fn(),
  button: jest.fn(),
  passphrase: jest.fn(),
  passphraseOnDevice: jest.fn(),
};

const createDevice = (protocolV2: boolean) => ({
  isProtocolV2: jest.fn(() => protocolV2),
  on: jest.fn(),
});

describe('hardware UI event registration', () => {
  test('does not register hardware-originated UI events for Protocol V2 devices', () => {
    const device = createDevice(true);

    expect(registerHardwareUiEventListeners(device as any, handlers)).toBe(false);
    expect(device.on).not.toHaveBeenCalled();
  });

  test('keeps the existing interactive event listeners for Protocol V1 devices', () => {
    const device = createDevice(false);

    expect(registerHardwareUiEventListeners(device as any, handlers)).toBe(true);
    expect(device.on.mock.calls.map(([type]) => type)).toEqual([
      DEVICE.PIN,
      DEVICE.BUTTON,
      DEVICE.PASSPHRASE,
      DEVICE.PASSPHRASE_ON_DEVICE,
    ]);
  });
});
