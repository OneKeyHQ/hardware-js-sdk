import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { toHardened } from '../api/helpers/pathUtils';
import { DeviceCommands } from '../device/DeviceCommands';
import type {
  Features,
  IDeviceModel,
  IDeviceType,
  IVersionArray,
  SupportFeatureType,
} from '../types';
import { DeviceModelToTypes, DeviceTypeToModels } from '../types';
import DataManager, { FirmwareField, MessageVersion } from '../data-manager/DataManager';
import { PROTOBUF_MESSAGE_CONFIG } from '../data-manager/MessagesConfig';
import { Device } from '../device/Device';

export const getDeviceModel = (features?: Features): IDeviceModel => {
  if (!features || typeof features !== 'object') {
    return 'model_mini';
  }

  if (!features.model) {
    return 'model_mini';
  }

  if (features.model === '1') {
    return 'model_mini';
  }
  // model === 'T'
  return 'model_touch';
};

export const getDeviceType = (features?: Features): IDeviceType => {
  if (!features || typeof features !== 'object') {
    return 'classic';
  }

  // classic1s 3.5.0 pro 4.6.0
  switch (features.onekey_device_type) {
    case 'CLASSIC':
      return 'classic';
    case 'CLASSIC1S':
      return 'classic1s';
    case 'MINI':
      return 'mini';
    case 'TOUCH':
      return 'touch';
    case 'PRO':
      return 'pro';
    default:
    // other
  }

  // low version hardware
  if (!features.serial_no) return 'classic';
  const serialNo = features.serial_no;
  const miniFlag = serialNo.slice(0, 2);
  if (miniFlag.toLowerCase() === 'mi') return 'mini';
  if (miniFlag.toLowerCase() === 'tc') return 'touch';
  if (miniFlag.toLowerCase() === 'pr') return 'pro';
  return 'classic';
};

export const getDeviceTypeOnBootloader = (features?: Features): IDeviceType =>
  getDeviceType(features);

export const getDeviceTypeByBleName = (name?: string): IDeviceType | null => {
  if (!name) return 'classic';
  if (name.startsWith('MI')) return 'mini';
  if (name.startsWith('T')) return 'touch';
  if (name.startsWith('P')) return 'pro';
  return 'classic';
};

// @deprecated
export const getDeviceTypeByDeviceId = (deviceId?: string): IDeviceType => {
  if (!deviceId) {
    return 'classic';
  }

  const miniFlag = deviceId.slice(0, 2);
  if (miniFlag.toLowerCase() === 'mi') return 'mini';
  return 'classic';
};

export const getDeviceUUID = (features: Features) => {
  const deviceType = getDeviceType(features);

  if (features?.onekey_serial_no) return features.onekey_serial_no;

  if (deviceType === 'classic') {
    return features.onekey_serial ?? '';
  }
  return features.serial_no ?? '';
};

export const getDeviceLabel = (features: Features) => {
  const deviceType = getDeviceType(features);
  // '' empty string or string
  if (typeof features.label === 'string') {
    return features.label;
  }
  return `My OneKey ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
};

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];

  if (semver.valid(features.onekey_firmware_version)) {
    return features.onekey_firmware_version?.split('.') as unknown as IVersionArray;
  }
  if (semver.valid(features.onekey_version)) {
    return features.onekey_version?.split('.') as unknown as IVersionArray;
  }
  return [
    features.major_version ?? '0',
    features.minor_version ?? '0',
    features.patch_version ?? '0',
  ];
};

/**
 * Get Connected Device bluetooth firmware version by features
 */
export const getDeviceBLEFirmwareVersion = (features: Features): IVersionArray | null => {
  if (!features.ble_ver) {
    return null;
  }
  if (!semver.valid(features.ble_ver)) {
    return null;
  }
  return features.ble_ver.split('.') as unknown as IVersionArray;
};

export const getDeviceBootloaderVersion = (features: Features): IVersionArray => {
  // classic1s 3.5.0 pro 4.6.0
  if (semver.valid(features.onekey_boot_version)) {
    return features.onekey_boot_version?.split('.') as unknown as IVersionArray;
  }
  if (!features.bootloader_version) {
    if (features.bootloader_mode) {
      return [features.major_version, features.minor_version, features.patch_version];
    }
    return [0, 0, 0];
  }
  if (semver.valid(features.bootloader_version)) {
    return features.bootloader_version?.split('.') as unknown as IVersionArray;
  }
  return [0, 0, 0];
};

export const getSupportMessageVersion = (
  features: Features | undefined
): { messages: JSON; messageVersion: MessageVersion } => {
  if (!features)
    return {
      messages: DataManager.messages.latest,
      messageVersion: 'latest',
    };

  const currentDeviceVersion = getDeviceFirmwareVersion(features).join('.');
  const deviceType = getDeviceType(features);

  const deviceVersionConfigs =
    PROTOBUF_MESSAGE_CONFIG[deviceType] ||
    (DeviceTypeToModels[deviceType] &&
      DeviceTypeToModels[deviceType]
        .map(model => PROTOBUF_MESSAGE_CONFIG[model])
        .find(range => range !== undefined));

  const sortedDeviceVersionConfigs =
    deviceVersionConfigs?.sort((a, b) => semver.compare(b.minVersion, a.minVersion)) ?? [];

  for (const { minVersion, messageVersion } of sortedDeviceVersionConfigs) {
    if (semver.gte(currentDeviceVersion, minVersion)) {
      return {
        messages: DataManager.messages[messageVersion],
        messageVersion,
      };
    }
  }

  return {
    messages: DataManager.messages.latest,
    messageVersion: 'latest',
  };
};

export const supportInputPinOnSoftware = (features: Features): SupportFeatureType => {
  if (!features) return { support: false };

  const deviceType = getDeviceType(features);
  if (deviceType === 'touch' || deviceType === 'pro') {
    return { support: false };
  }

  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  return { support: semver.gte(currentVersion, '2.3.0'), require: '2.3.0' };
};

export const supportNewPassphrase = (features?: Features): SupportFeatureType => {
  if (!features) return { support: false };

  const deviceType = getDeviceType(features);
  if (deviceType === 'touch' || deviceType === 'pro') {
    return { support: true };
  }

  const currentVersion = getDeviceFirmwareVersion(features).join('.');

  return { support: semver.gte(currentVersion, '2.4.0'), require: '2.4.0' };
};

export const getPassphraseStateWithRefreshDeviceInfo = async (device: Device) => {
  const { features, commands } = device;
  const locked = features?.unlocked === false;
  const passphraseState = await getPassphraseState(features, commands);
  const isModeT = getDeviceType(features) === 'touch' || getDeviceType(features) === 'pro';

  // if Touch/Pro was locked before, refresh the device state
  if (isModeT && locked) {
    await device.getFeatures();
  }

  return passphraseState;
};

export const getPassphraseState = async (
  features: Features | undefined,
  commands: DeviceCommands
) => {
  if (!features) return false;
  const { message, type } = await commands.typedCall('GetAddress', 'Address', {
    address_n: [toHardened(44), toHardened(1), toHardened(0), 0, 0],
    coin_name: 'Testnet',
    script_type: 'SPENDADDRESS',
    show_display: false,
  });

  // @ts-expect-error
  if (type === 'CallMethodError') {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Get the passphrase state error');
  }

  return message.address;
};

export const supportBatchPublicKey = (features?: Features): boolean => {
  if (!features) return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');

  const deviceType = getDeviceType(features);
  if (deviceType === 'touch' || deviceType === 'pro') {
    return semver.gte(currentVersion, '3.1.0');
  }

  return semver.gte(currentVersion, '2.6.0');
};

export const supportModifyHomescreen = (features?: Features): SupportFeatureType => {
  if (!features) return { support: false };
  const currentVersion = getDeviceFirmwareVersion(features).join('.');

  const deviceType = getDeviceType(features);
  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    return { support: true };
  }

  return { support: semver.gte(currentVersion, '3.4.0') };
};

/**
 *  Since 3.5.0, Touch uses the firmware-v3 field to get firmware release info
 */
export const getFirmwareUpdateField = ({
  features,
  updateType,
  targetVersion,
}: {
  features: Features;
  updateType: 'firmware' | 'ble';
  targetVersion?: string;
}): 'ble' | FirmwareField => {
  const deviceType = getDeviceType(features);
  const deviceFirmwareVersion = getDeviceFirmwareVersion(features);
  if (updateType === 'ble') {
    return 'ble';
  }

  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    return 'firmware-v5';
  }

  if (deviceType === 'touch') {
    if (targetVersion) {
      if (semver.eq(targetVersion, '4.0.0')) return 'firmware-v2';
      if (semver.gt(targetVersion, '4.0.0')) return 'firmware-v5';
    }

    if (semver.lt(deviceFirmwareVersion.join('.'), '3.4.0')) return 'firmware';

    return 'firmware-v5';
  }
  if (deviceType === 'pro') {
    return 'firmware-v5';
  }
  return 'firmware';
};
