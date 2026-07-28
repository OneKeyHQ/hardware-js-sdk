import semver from 'semver';

import {
  resolveDeviceBleFirmwareVersion,
  resolveDeviceBoardVersion,
  resolveDeviceBootloaderVersion,
  resolveDeviceFirmwareVersion,
} from './deviceFeaturesCompat';

import type { IVersionArray } from '../types';
import type { DeviceFeaturesInput } from './deviceFeaturesCompat';

const EMPTY_VERSION: IVersionArray = [0, 0, 0];

export const parseDeviceVersion = (version?: string | null): IVersionArray => {
  const parsed = version ? semver.parse(version) : null;
  return parsed ? [parsed.major, parsed.minor, parsed.patch] : [...EMPTY_VERSION];
};

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features?: DeviceFeaturesInput): IVersionArray =>
  parseDeviceVersion(resolveDeviceFirmwareVersion(features));

/**
 * Get Connected Device bootloader version by features
 */
export const getDeviceBootloaderVersion = (features?: DeviceFeaturesInput): IVersionArray =>
  parseDeviceVersion(resolveDeviceBootloaderVersion(features));

/**
 * Get Connected Device boardloader/romloader version by features
 */
export const getDeviceBoardloaderVersion = (features?: DeviceFeaturesInput): IVersionArray =>
  parseDeviceVersion(resolveDeviceBoardVersion(features));

/**
 * Get Connected Device bluetooth firmware version by features
 */
export const getDeviceBLEFirmwareVersion = (features?: DeviceFeaturesInput): IVersionArray =>
  parseDeviceVersion(resolveDeviceBleFirmwareVersion(features));
