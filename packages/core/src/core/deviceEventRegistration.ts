import { DEVICE } from '../events';

import type { Device, DeviceEvents } from '../device/Device';

export type HardwareUiEventHandlers = {
  pin: (...event: DeviceEvents[typeof DEVICE.PIN]) => void;
  button: (...event: DeviceEvents[typeof DEVICE.BUTTON]) => void;
  passphrase: (...event: DeviceEvents[typeof DEVICE.PASSPHRASE]) => void;
  passphraseOnDevice: (...event: DeviceEvents[typeof DEVICE.PASSPHRASE_ON_DEVICE]) => void;
};

export function registerHardwareUiEventListeners(
  device: Pick<Device, 'on'>,
  handlers: HardwareUiEventHandlers
) {
  device.on(DEVICE.PIN, handlers.pin);
  device.on(DEVICE.BUTTON, handlers.button);
  device.on(DEVICE.PASSPHRASE, handlers.passphrase);
  device.on(DEVICE.PASSPHRASE_ON_DEVICE, handlers.passphraseOnDevice);
  return true;
}
