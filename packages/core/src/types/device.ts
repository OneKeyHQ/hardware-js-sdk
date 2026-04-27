import { EDeviceType } from '@onekeyfe/hd-shared';

import type { IVersionArray } from './settings';
import type { PROTO } from '../constants';
import type { OneKeyDeviceCommType } from '@onekeyfe/hd-transport';

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
  commType: OneKeyDeviceCommType | null;
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

  // debug sdk
  instanceId?: string;
  sdkInstanceId?: string;
  createdAt?: number;
};

export type SearchDevice = {
  connectId: string | null;
  uuid: string;
  deviceId: string | null;
  deviceType: IDeviceType;
  name: string;
  commType: OneKeyDeviceCommType;
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

export type IDeviceType =
  | EDeviceType.Unknown
  | EDeviceType.Classic
  | EDeviceType.Classic1s
  | EDeviceType.ClassicPure
  | EDeviceType.Mini
  | EDeviceType.Touch
  | EDeviceType.Pro
  | EDeviceType.Pro2;

/**
 * model_classic: 'classic' | 'classic1s' | 'classicpure'
 * model_mini: 'classic' | 'classic1s' | 'classicpure' | 'mini'
 * model_touch: 'touch' | 'pro'
 */
export type IDeviceModel = 'model_classic' | 'model_mini' | 'model_touch' | 'model_classic1s';

export const DeviceModelToTypes: { [deviceModel in IDeviceModel]: IDeviceType[] } = {
  model_mini: [
    EDeviceType.Classic,
    EDeviceType.Classic1s,
    EDeviceType.ClassicPure,
    EDeviceType.Mini,
  ],
  model_touch: [EDeviceType.Touch, EDeviceType.Pro],
  model_classic: [EDeviceType.Classic, EDeviceType.Classic1s, EDeviceType.ClassicPure],
  model_classic1s: [EDeviceType.Classic1s, EDeviceType.ClassicPure],
};

export const DeviceTypeToModels: { [deviceType in IDeviceType]: IDeviceModel[] } = {
  [EDeviceType.Classic]: ['model_classic', 'model_mini'],
  [EDeviceType.Classic1s]: ['model_classic', 'model_mini', 'model_classic1s'],
  [EDeviceType.ClassicPure]: ['model_classic', 'model_mini', 'model_classic1s'],
  [EDeviceType.Mini]: ['model_mini'],
  [EDeviceType.Touch]: ['model_touch'],
  [EDeviceType.Pro]: ['model_touch'],
  [EDeviceType.Pro2]: [],
  [EDeviceType.Unknown]: [],
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
