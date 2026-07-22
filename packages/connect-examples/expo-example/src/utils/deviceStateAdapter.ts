import type { DeviceState } from '@onekeyfe/hd-core';
import type { Device } from '../components/DeviceList';

export function applyDeviceStateToExampleDevice(device: Device, state: DeviceState): Device {
  return {
    ...device,
    name: state.identity.bleName || state.identity.label || device.name,
    ...(state.identity.deviceType ? { deviceType: state.identity.deviceType } : {}),
    deviceState: state,
  };
}
