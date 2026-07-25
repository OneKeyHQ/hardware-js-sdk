import { EDeviceType, type EFirmwareType } from '@onekeyfe/hd-shared';

import type { IVersionArray } from './settings';
import type { PROTO } from '../constants';
import type {
  OneKeyDeviceCommType,
  ProtocolV2DeviceInfo,
  DeviceStatus as ProtocolV2DeviceStatus,
} from '@onekeyfe/hd-transport';

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
  features?: Features;
  /** Unified SDK device-state snapshot; features remains a legacy projection. */
  state?: DeviceState;
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

export type DeviceFeaturesProtocol = 'V1' | 'V2' | 'unknown';

export type DeviceFeaturesMode =
  | 'normal'
  | 'bootloader'
  | 'romloader'
  | 'notInitialized'
  | 'backupMode'
  | 'unknown';

export type DeviceFeaturesVerify = {
  firmwareBuildId?: string;
  firmwareHash?: string;
  bootloaderBuildId?: string;
  bootloaderHash?: string;
  boardBuildId?: string;
  boardHash?: string;
  bleBuildId?: string;
  bleHash?: string;
  se01BuildId?: string;
  se01Hash?: string;
  se02BuildId?: string;
  se02Hash?: string;
  se03BuildId?: string;
  se03Hash?: string;
  se04BuildId?: string;
  se04Hash?: string;
  se01BootBuildId?: string;
  se01BootHash?: string;
  se02BootBuildId?: string;
  se02BootHash?: string;
  se03BootBuildId?: string;
  se03BootHash?: string;
  se04BootBuildId?: string;
  se04BootHash?: string;
};

export type DeviceFeaturesRaw = {
  protocolV1Features?: PROTO.Features;
  protocolV1OneKeyFeatures?: OnekeyFeatures;
  protocolV2DeviceInfo?: ProtocolV2DeviceInfo;
  protocolV2DeviceStatus?: ProtocolV2DeviceStatus;
};

export type DeviceFeaturesRawPatch = {
  [Key in keyof DeviceFeaturesRaw]?: DeviceFeaturesRaw[Key] | null;
};

export type DeviceStateProtocol = DeviceFeaturesProtocol;
export type DeviceStateMode = DeviceFeaturesMode;
export type DeviceStateSection = 'identity' | 'status' | 'settings' | 'versions' | 'verification';

export type DeviceStateUpdateSource =
  | 'initialize'
  | 'device-info'
  | 'device-status'
  | 'apply-settings'
  | 'change-pin'
  | 'lock'
  | 'unlock'
  | 'passphrase'
  | 'session-clear'
  | 'firmware-update'
  | 'transport-reconnect'
  | 'compatibility';

export type DeviceStateIdentity = {
  deviceType: IDeviceType;
  firmwareType: EFirmwareType;
  model: string | null;
  vendor: string | null;
  deviceId: string | null;
  serialNo: string;
  label: string | null;
  bleName: string | null;
};

export type DeviceStateStatus = {
  mode: DeviceStateMode;
  initialized: boolean | null;
  unlocked: boolean | null;
  firmwarePresent: boolean | null;
  backupRequired: boolean | null;
  noBackup: boolean | null;
  unfinishedBackup: boolean | null;
  recoveryMode: boolean | null;
  passphraseProtection: boolean | null;
  pinProtection: boolean | null;
  attachToPinEnabled: boolean | null;
  unlockedAttachPin: boolean | null;
};

export type DeviceStateSettings = {
  language: string | null;
  bleEnabled: boolean | null;
  sdCardPresent: boolean | null;
  sdProtection: boolean | null;
  wipeCodeProtection: boolean | null;
  passphraseAlwaysOnDevice: boolean | null;
  safetyChecks: string | null;
  autoLockDelayMs: number | null;
  autoShutdownDelayMs: number | null;
  displayRotation: number | null;
  experimentalFeatures: boolean | null;
  wallpaperPath: string | null;
  brightness: number | null;
  animationEnabled: boolean | null;
  tapToWake: boolean | null;
  hapticFeedback: boolean | null;
  deviceNameDisplayEnabled: boolean | null;
  airgapMode: boolean | null;
  fidoEnabled: boolean | null;
  usbLockEnabled: boolean | null;
  randomKeypad: boolean | null;
};

export type DeviceStateVersions = {
  firmware: string | null;
  bootloader: string | null;
  board: string | null;
  ble: string | null;
  /** @deprecated Kept for legacy consumers; new code should read se01. */
  se?: string | null;
  se01?: string | null;
  se02?: string | null;
  se03?: string | null;
  se04?: string | null;
  se01Boot?: string | null;
  se02Boot?: string | null;
  se03Boot?: string | null;
  se04Boot?: string | null;
};

export type DeviceState = {
  schemaVersion: 1;
  revision: number;
  updatedAt: number;
  protocol: DeviceStateProtocol;
  /** Device-message protocol version, independent of the SDK V1/V2 protocol family. */
  protocolVersion: number | null;
  identity: DeviceStateIdentity;
  status: DeviceStateStatus;
  settings: DeviceStateSettings;
  versions: DeviceStateVersions;
  capabilities: Array<number | string>;
  verification?: Partial<DeviceFeaturesVerify>;
};

export type DeviceStatePatch = {
  protocol?: DeviceStateProtocol;
  protocolVersion?: number | null;
  identity?: Partial<DeviceStateIdentity>;
  status?: Partial<DeviceStateStatus>;
  settings?: Partial<DeviceStateSettings>;
  versions?: Partial<DeviceStateVersions>;
  capabilities?: Array<number | string>;
  verification?: DeviceFeaturesVerify;
  raw?: DeviceFeaturesRawPatch;
};

export type DeviceStateEvent = {
  connectId: string | null;
  state: DeviceState;
  revision: number;
  source: DeviceStateUpdateSource;
  changedKeys: string[];
};

export type NormalizedFeatures = {
  protocol: DeviceFeaturesProtocol;
  protocolVersion?: number | null;
  deviceType: IDeviceType;
  firmwareType: EFirmwareType;
  model: string | null;
  vendor: string | null;
  deviceId: string | null;
  serialNo: string;
  label: string | null;
  bleName: string | null;
  capabilities: Array<number | string>;
  mode: DeviceFeaturesMode;
  initialized: boolean | null;
  bootloaderMode: boolean | null;
  unlocked: boolean | null;
  firmwarePresent: boolean | null;
  passphraseProtection: boolean | null;
  pinProtection: boolean | null;
  backupRequired: boolean | null;
  noBackup: boolean | null;
  unfinishedBackup: boolean | null;
  recoveryMode: boolean | null;
  language: string | null;
  bleEnabled: boolean | null;
  sdCardPresent: boolean | null;
  sdProtection: boolean | null;
  wipeCodeProtection: boolean | null;
  passphraseAlwaysOnDevice: boolean | null;
  attachToPinEnabled?: boolean | null;
  safetyChecks: string | null;
  autoLockDelayMs: number | null;
  autoShutdownDelayMs: number | null;
  displayRotation: number | null;
  experimentalFeatures: boolean | null;
  wallpaperPath: string | null;
  brightness: number | null;
  animationEnabled: boolean | null;
  tapToWake: boolean | null;
  hapticFeedback: boolean | null;
  deviceNameDisplayEnabled: boolean | null;
  airgapMode: boolean | null;
  fidoEnabled: boolean | null;
  usbLockEnabled: boolean | null;
  randomKeypad: boolean | null;
  firmwareVersion: string | null;
  bootloaderVersion: string | null;
  boardVersion: string | null;
  bleVersion: string | null;
  se01Version?: string | null;
  se02Version?: string | null;
  se03Version?: string | null;
  se04Version?: string | null;
  se01BootVersion?: string | null;
  se02BootVersion?: string | null;
  se03BootVersion?: string | null;
  se04BootVersion?: string | null;
  seVersion?: string | null;
  verify?: DeviceFeaturesVerify;
  sessionId: string | null;
  passphraseState?: string;
  unlockedAttachPin?: boolean;
  raw?: DeviceFeaturesRaw;
};

export type Features = NormalizedFeatures &
  Partial<Omit<PROTO.Features, keyof NormalizedFeatures>> &
  Partial<Omit<PROTO.OnekeyFeatures, keyof NormalizedFeatures | keyof PROTO.Features>>;

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
  unsupported?: boolean;
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
