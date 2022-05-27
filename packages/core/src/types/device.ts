import type { PROTO } from '../constants';
import type { ReleaseInfo } from './firmware'

export type DeviceStatus = 'available' | 'occupied' | 'used';

export type DeviceMode = 'normal' | 'bootloader' | 'initialize' | 'seedless';

export type UnavailableCapability =
    | 'no-capability'
    | 'no-support'
    | 'update-required'
    | 'trezor-connect-outdated';

export type UnavailableCapabilities = { [key: string]: UnavailableCapability };


export type KnownDevice = {
  type: 'acquired';
  id: string | null;
  path: string;
  label: string;
  error?: typeof undefined;
  firmware: DeviceFirmwareStatus;
  firmwareRelease?: ReleaseInfo | null;
  bleFirmware?: DeviceFirmwareStatus;
  bleFirmwareRelease?: ReleaseInfo | null;
  status: DeviceStatus;
  mode: DeviceMode;
  state?: string;
  features: PROTO.Features;
  unavailableCapabilities: UnavailableCapabilities;
};

export type UnknownDevice = {
  type: 'unacquired';
  id?: null;
  path: string;
  label: string;
  error?: typeof undefined;
  features?: typeof undefined;
  firmware?: typeof undefined;
  firmwareRelease?: typeof undefined;
  status?: typeof undefined;
  mode?: typeof undefined;
  state?: typeof undefined;
  unavailableCapabilities?: typeof undefined;
};

export type UnreadableDevice = {
  type: 'unreadable';
  id?: null;
  path: string;
  label: string;
  error: string;
  features?: typeof undefined;
  firmware?: typeof undefined;
  firmwareRelease?: typeof undefined;
  status?: typeof undefined;
  mode?: typeof undefined;
  state?: typeof undefined;
  unavailableCapabilities?: typeof undefined;
};

export type Device = KnownDevice | UnknownDevice | UnreadableDevice;

export type Features = PROTO.Features;

export type DeviceType = 'mini' | 'classic';

export type DeviceFirmwareStatus = 'valid' | 'outdated' | 'required' | 'unknown' | 'none';
