import type { PROTO } from '../constants';
import { IVersionArray } from './settings';

export type DeviceStatus = 'available' | 'occupied' | 'used';

export enum EOneKeyDeviceMode {
  bootloader = 'bootloader',
  normal = 'normal',
  notInitialized = 'notInitialized',
  backupMode = 'backupMode',
}

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
  deviceType: IDeviceType | null;
  path: string;
  label: string;
  bleName: string | null;
  name: string;
  error?: typeof undefined;
  mode: EOneKeyDeviceMode;
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

export type OnekeyFeatures = PROTO.OnekeyFeatures;

export type IDeviceType = 'unknown' | 'classic' | 'classic1s' | 'mini' | 'touch' | 'pro';

/**
 * model_classic: 'classic' | 'classic1s'
 * model_mini: 'classic' | 'mini'
 * model_touch: 'touch' | 'pro'
 */
export type IDeviceModel = 'model_classic' | 'model_mini' | 'model_touch';

export const DeviceModelToTypes: { [deviceModel in IDeviceModel]: IDeviceType[] } = {
  model_mini: ['classic', 'classic1s', 'mini'],
  model_touch: ['touch', 'pro'],
  model_classic: ['classic', 'classic1s'],
};

export const DeviceTypeToModels: { [deviceType in IDeviceType]: IDeviceModel[] } = {
  classic: ['model_classic', 'model_mini'],
  classic1s: ['model_classic', 'model_mini'],
  mini: ['model_mini'],
  touch: ['model_touch'],
  pro: ['model_touch'],
  unknown: [],
};

export type IDeviceFirmwareStatus = 'valid' | 'outdated' | 'required' | 'unknown' | 'none';

export type IDeviceBLEFirmwareStatus = 'valid' | 'outdated' | 'required' | 'unknown' | 'none';

export type ITransportStatus = 'valid' | 'outdated';

export type IVersionRange = {
  min: string;
  max?: string;
};

export type DeviceFirmwareRange = {
  [deviceType in IDeviceType | IDeviceModel]?: IVersionRange;
};

type FeaturesNarrowing =
  | {
      major_version: 2;
      fw_major: null;
      fw_minor: null;
      fw_patch: null;
      bootloader_mode: true;
      firmware_present: false;
    }
  | {
      major_version: 2;
      fw_major: null;
      fw_minor: null;
      fw_patch: null;
      bootloader_mode: null;
      firmware_present: null;
    }
  | {
      major_version: 2;
      fw_major: 2;
      fw_minor: number;
      fw_patch: number;
      bootloader_mode: true;
      firmware_present: true;
    }
  | {
      major_version: 1;
      fw_major: null;
      fw_minor: null;
      fw_patch: null;
      bootloader_mode: true;
      firmware_present: false;
    }
  | {
      major_version: 1;
      fw_major: null;
      fw_minor: null;
      fw_patch: null;
      bootloader_mode: true;
      firmware_present: true;
    };

export type StrictFeatures = Features & FeaturesNarrowing;

export type SupportFeatureType = { support: boolean; require?: string };

export type SupportFeatures = {
  inputPinOnSoftware: SupportFeatureType;
  modifyHomescreen: SupportFeatureType;
};
