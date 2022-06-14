import type { PROTO } from '../constants';
import { IVersionArray } from './settings';

export type DeviceStatus = 'available' | 'occupied' | 'used';

export type DeviceMode = 'normal' | 'bootloader' | 'initialize' | 'seedless';

export type UnavailableCapability =
  | 'no-capability'
  | 'no-support'
  | 'update-required'
  | 'trezor-connect-outdated';

export type UnavailableCapabilities = { [key: string]: UnavailableCapability };

export type KnownDevice = {
  connectId: string | null;
  uuid: string;
  deviceId: string | null;
  deviceType: IDeviceType;
  path: string;
  label: string;
  name: string;
  error?: typeof undefined;
  mode: DeviceMode;
  features: PROTO.Features;
  unavailableCapabilities: UnavailableCapabilities;
  bleFirmwareVersion: IVersionArray | null;
  firmwareVersion: IVersionArray | null;
};

export type SearchDevice = {
  connectId: string | null;
  uuid: string;
  deviceId: string | null;
  deviceType: IDeviceType;
  name: string;
};

// export type UnknownDevice = {
//   type: 'unacquired';
//   id?: null;
//   path: string;
//   label: string;
//   error?: typeof undefined;
//   features?: typeof undefined;
//   firmware?: typeof undefined;
//   firmwareRelease?: typeof undefined;
//   status?: typeof undefined;
//   mode?: typeof undefined;
//   state?: typeof undefined;
//   unavailableCapabilities?: typeof undefined;
// };

// export type UnreadableDevice = {
//   type: 'unreadable';
//   id?: null;
//   path: string;
//   label: string;
//   error: string;
//   features?: typeof undefined;
//   firmware?: typeof undefined;
//   firmwareRelease?: typeof undefined;
//   status?: typeof undefined;
//   mode?: typeof undefined;
//   state?: typeof undefined;
//   unavailableCapabilities?: typeof undefined;
// };

export type Device = KnownDevice;

export type Features = PROTO.Features;

export type IDeviceType = 'classic' | 'mini' | 'touch' | 'pro';

export type IDeviceFirmwareStatus = 'valid' | 'outdated' | 'required' | 'unknown' | 'none';

export type IDeviceBLEFirmwareStatus = 'valid' | 'outdated' | 'required' | 'unknown' | 'none';

export type ITransportStatus = 'valid' | 'outdated';
