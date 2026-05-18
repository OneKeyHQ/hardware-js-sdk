import semver from 'semver';
import { isNaN } from 'lodash';
import { EDeviceType, type EFirmwareType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Enum_Capability } from '@onekeyfe/hd-transport';

import { toHardened } from '../api/helpers/pathUtils';
import { DeviceModelToTypes, DeviceTypeToModels } from '../types';
import DataManager, { type IFirmwareField, type MessageVersion } from '../data-manager/DataManager';
import { PROTOBUF_MESSAGE_CONFIG } from '../data-manager/MessagesConfig';
import { getDeviceType } from './deviceInfoUtils';
import { getDeviceFirmwareVersion } from './deviceVersionUtils';
import { existCapability } from './capabilitieUtils';

import type { Device } from '../device/Device';
import type { DeviceCommands } from '../device/DeviceCommands';
import type { Features, SupportFeatureType } from '../types';

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
  if (deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro) {
    return { support: false };
  }

  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  return { support: semver.gte(currentVersion, '2.3.0'), require: '2.3.0' };
};

export const supportNewPassphrase = (features?: Features): SupportFeatureType => {
  if (!features) return { support: false };

  const deviceType = getDeviceType(features);
  if (
    deviceType === EDeviceType.Touch ||
    deviceType === EDeviceType.Pro ||
    deviceType === EDeviceType.Pro2
  ) {
    return { support: true };
  }

  const currentVersion = getDeviceFirmwareVersion(features).join('.');

  return { support: semver.gte(currentVersion, '2.4.0'), require: '2.4.0' };
};

export const getPassphraseStateWithRefreshDeviceInfo = async (
  device: Device,
  options?: {
    expectPassphraseState?: string;
    onlyMainPin?: boolean;
  }
) => {
  const { features, commands } = device;
  const locked = features?.unlocked === false;
  const deviceType = getDeviceType(features);
  const isPro2 = deviceType === EDeviceType.Pro2;

  const { passphraseState, newSession, unlockedAttachPin } = await getPassphraseState(
    features,
    commands,
    {
      ...options,
    }
  );

  const isModeT = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;

  // 如果可以获取到 passphraseState，但是设备 features 显示设备未开启 passphrase，需要刷新设备状态
  // if passphraseState can be obtained, but the device features show that the device has not enabled passphrase, the device status needs to be refreshed
  const needRefreshWithPassphrase =
    !isPro2 && passphraseState && features?.passphrase_protection !== true;
  // 如果 Touch/Pro 在之前是锁定状态，刷新设备状态
  // if Touch/Pro was locked before, refresh the device state
  const needRefreshWithLocked = isModeT && locked;

  if (needRefreshWithLocked || needRefreshWithPassphrase) {
    // refresh device state
    await device.getFeatures();
  }

  if (isPro2 && device.features && (passphraseState || newSession)) {
    device.features.passphrase_protection = true;
    if (newSession) {
      device.features.session_id = newSession;
    }
  }

  // Attach to pin try to fix internal state
  if (features?.device_id) {
    device.updateInternalState(
      (device.features?.passphrase_protection ?? false) || isPro2,
      passphraseState,
      device.features?.device_id ?? '',
      newSession,
      device.features?.session_id
    );
  }

  return { passphraseState, newSession, unlockedAttachPin };
};

export const getPassphraseState = async (
  features: Features | undefined,
  commands: DeviceCommands,
  options?: {
    expectPassphraseState?: string;
    onlyMainPin?: boolean;
  }
): Promise<{
  passphraseState: string | undefined;
  newSession: string | undefined;
  unlockedAttachPin: boolean | undefined;
}> => {
  if (!features)
    return { passphraseState: undefined, newSession: undefined, unlockedAttachPin: undefined };

  const firmwareVersion = getDeviceFirmwareVersion(features);
  const deviceType = getDeviceType(features);

  const supportAttachPinCapability = existCapability(
    features,
    Enum_Capability.Capability_AttachToPin
  );
  const supportGetPassphraseState =
    supportAttachPinCapability ||
    // Pro2 V2 暂未从 features 暴露 capabilities，先直连该方法用于固件联调。
    deviceType === EDeviceType.Pro2 ||
    (deviceType === EDeviceType.Pro && semver.gte(firmwareVersion.join('.'), '4.15.0'));

  if (supportGetPassphraseState) {
    const { message, type } = await commands.typedCall('GetPassphraseState', 'PassphraseState', {
      passphrase_state: options?.onlyMainPin ? undefined : options?.expectPassphraseState,
    });

    // @ts-expect-error
    if (type === 'CallMethodError') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Get the passphrase state error');
    }

    return {
      passphraseState: message.passphrase_state,
      newSession: message.session_id,
      unlockedAttachPin: message.unlocked_attach_pin,
    };
  }

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

  return {
    passphraseState: message.address,
    newSession: undefined,
    unlockedAttachPin: undefined,
  };
};

export const supportBatchPublicKey = (
  features?: Features,
  options?: {
    includeNode?: boolean;
  }
): boolean => {
  if (!features) return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');

  const deviceType = getDeviceType(features);
  // btc batch get public key
  if (!!options?.includeNode && deviceType === EDeviceType.Pro) {
    return semver.gte(currentVersion, '4.14.0');
  }
  if (!!options?.includeNode && deviceType === EDeviceType.Touch) {
    return semver.gte(currentVersion, '4.11.0');
  }
  if (!!options?.includeNode && DeviceModelToTypes.model_classic1s.includes(deviceType)) {
    return semver.gte(currentVersion, '3.12.0');
  }
  if (!!options?.includeNode && DeviceModelToTypes.model_mini.includes(deviceType)) {
    return semver.gte(currentVersion, '3.10.0');
  }
  if (options?.includeNode) {
    return false;
  }

  // support batch get public key
  if (deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro) {
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

export const getLatestFirmwareField = (firmwareType?: EFirmwareType): IFirmwareField => {
  if (firmwareType === 'bitcoinonly') {
    return `firmware-btc-v8`;
  }
  return `firmware-v8`;
};

/**
 *  Since 3.5.0, Touch uses the firmware-v3 field to get firmware release info
 */
export const getFirmwareUpdateField = ({
  features,
  updateType,
  targetVersion,
  firmwareType,
}: {
  features: Features;
  updateType: 'firmware' | 'ble';
  targetVersion?: string;
  firmwareType: EFirmwareType;
}): 'ble' | IFirmwareField => {
  const deviceType = getDeviceType(features);
  const deviceFirmwareVersion = getDeviceFirmwareVersion(features);
  if (updateType === 'ble') {
    return 'ble';
  }
  const latestFirmwareField = getLatestFirmwareField(firmwareType);

  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    return latestFirmwareField;
  }

  if (deviceType === EDeviceType.Touch) {
    if (targetVersion) {
      if (semver.eq(targetVersion, '4.0.0')) return 'firmware-v2';
      if (semver.gt(targetVersion, '4.0.0')) return latestFirmwareField;
    }

    if (semver.lt(deviceFirmwareVersion.join('.'), '3.4.0')) return 'firmware';

    return latestFirmwareField;
  }
  if (deviceType === EDeviceType.Pro) {
    return latestFirmwareField;
  }
  return 'firmware';
};
/**
 * Returns the optional firmware version
 * Used in firmware web update
 * https://firmware.onekey.so/
 */
export const getFirmwareUpdateFieldArray = (
  features: Features,
  updateType: 'firmware' | 'ble' | 'bootloader'
): ('ble' | IFirmwareField)[] => {
  const deviceType = getDeviceType(features);
  if (updateType === 'ble') {
    return ['ble'];
  }

  if (
    deviceType === 'classic' ||
    deviceType === 'classic1s' ||
    deviceType === 'mini' ||
    deviceType === 'classicpure'
  ) {
    return ['firmware-v8'];
  }

  if (deviceType === 'touch') {
    const currentVersion = getDeviceFirmwareVersion(features).join('.');
    if (semver.gt(currentVersion, '4.0.0')) {
      return ['firmware-v8', 'firmware'];
    }
    if (semver.gte(currentVersion, '4.0.0')) {
      return ['firmware-v2', 'firmware'];
    }
    if (!currentVersion || semver.lt(currentVersion, '3.0.0')) {
      return ['firmware-v8', 'firmware-v2', 'firmware'];
    }
    return ['firmware'];
  }

  if (deviceType === 'pro') {
    return ['firmware-v8'];
  }

  return ['firmware'];
};

export function fixVersion(version: string) {
  let parts = version.split('.');

  while (parts.length < 3) {
    parts.push('0');
  }
  parts = parts.map(part => (isNaN(parseInt(part, 10)) ? '0' : part));

  return parts.join('.');
}

export const fixFeaturesFirmwareVersion = (features: Features): Features => {
  // 修复 Touch、Pro 设备 bootloader 低于 2.5.2 版本时，返回的 features 中没有 firmware_version 错误的问题
  // fix Touch、Pro device when bootloader version is lower than 2.5.2, the features returned do not have firmware_version error
  const tempFeatures = { ...features };

  if (tempFeatures.onekey_firmware_version && !semver.valid(tempFeatures.onekey_firmware_version)) {
    tempFeatures.onekey_firmware_version = fixVersion(tempFeatures.onekey_firmware_version);
  }

  if (tempFeatures.onekey_version && !semver.valid(tempFeatures.onekey_version)) {
    tempFeatures.onekey_version = fixVersion(tempFeatures.onekey_version);
  }

  return tempFeatures;
};
