import semver from 'semver';
import { isNaN } from 'lodash';
import { EDeviceType, type EFirmwareType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Enum_Capability, type GetPassphraseState } from '@onekeyfe/hd-transport';

import { toHardened } from '../api/helpers/pathUtils';
import { DeviceModelToTypes, DeviceTypeToModels } from '../types';
import DataManager, {
  type IFirmwareField,
  type ProtocolV1MessageSchema,
} from '../data-manager/DataManager';
import { PROTOBUF_MESSAGE_CONFIG } from '../data-manager/MessagesConfig';
import { getDeviceType } from './deviceInfoUtils';
import { getDeviceFirmwareVersion } from './deviceVersionUtils';
import { existCapability } from './capabilitieUtils';
import { getProtocolV2WalletSession } from '../protocols/protocol-v2/walletSession';

import type { Device } from '../device/Device';
import type { Features, IDeviceType, SupportFeatureType } from '../types';

export const getSupportProtocolV1MessageSchema = (
  features: Features | undefined
): { messages: JSON; protocolV1MessageSchema: ProtocolV1MessageSchema } => {
  if (!features)
    return {
      messages: DataManager.messages.v1CurrentSchema,
      protocolV1MessageSchema: 'v1CurrentSchema',
    };

  const currentDeviceVersion = getDeviceFirmwareVersion(features).join('.');
  const deviceType = getDeviceType(features);

  // In bootloader mode the major/minor/patch fields carry the bootloader version, not the
  // firmware version; normalizing them would mis-route to the legacy schema (e.g. 2.x < 3.3.0).
  // The legacy getDeviceFirmwareVersion returned 0.0.0 here and landed on v1CurrentSchema, so
  // force v1CurrentSchema for every bootloader device, including in-place upgrades on
  // Classic1s/Touch/Pro where firmware is still present.
  if (features.bootloaderMode === true) {
    return {
      messages: DataManager.messages.v1CurrentSchema,
      protocolV1MessageSchema: 'v1CurrentSchema',
    };
  }

  const deviceVersionConfigs =
    PROTOBUF_MESSAGE_CONFIG[deviceType] ||
    (DeviceTypeToModels[deviceType] &&
      DeviceTypeToModels[deviceType]
        .map(model => PROTOBUF_MESSAGE_CONFIG[model])
        .find(range => range !== undefined));

  const sortedDeviceVersionConfigs =
    deviceVersionConfigs?.sort((a, b) => semver.compare(b.minVersion, a.minVersion)) ?? [];

  for (const { minVersion, protocolV1MessageSchema } of sortedDeviceVersionConfigs) {
    if (semver.gte(currentDeviceVersion, minVersion)) {
      return {
        messages: DataManager.messages[protocolV1MessageSchema],
        protocolV1MessageSchema,
      };
    }
  }

  return {
    messages: DataManager.messages.v1CurrentSchema,
    protocolV1MessageSchema: 'v1CurrentSchema',
  };
};

export const supportInputPinOnSoftware = (features: Features): SupportFeatureType => {
  if (!features) return { support: false };

  const deviceType = getDeviceType(features);
  if (
    deviceType === EDeviceType.Touch ||
    deviceType === EDeviceType.Pro ||
    deviceType === EDeviceType.Pro2
  ) {
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
    initSession?: boolean;
  }
) => {
  if (device.isProtocolV2()) {
    if (!device.features) {
      return {
        passphraseState: undefined,
        newSession: undefined,
        unlockedAttachPin: undefined,
      };
    }

    return getProtocolV2WalletSession(device, {
      initSession: options?.initSession,
      expectedPassphraseState: options?.expectPassphraseState,
      onlyMainPin: options?.onlyMainPin,
    });
  }

  const { features } = device;
  const locked = features?.unlocked === false;
  const deviceType = device.getCurrentDeviceType();

  if (options?.initSession) {
    device.clearInternalState();
  }

  const { passphraseState, newSession, unlockedAttachPin } = await getPassphraseState(device, {
    ...options,
  });

  const isModeT =
    deviceType === EDeviceType.Touch ||
    deviceType === EDeviceType.Pro ||
    deviceType === EDeviceType.Pro2;

  // 如果可以获取到 passphraseState，但是设备 features 显示设备未开启 passphrase，需要刷新设备状态
  // if passphraseState can be obtained, but the device features show that the device has not enabled passphrase, the device status needs to be refreshed
  const needRefreshWithPassphrase =
    passphraseState && device.getCurrentPassphraseProtection() !== true;
  // 如果 Touch/Pro 在之前是锁定状态，刷新设备状态
  // if Touch/Pro was locked before, refresh the device state
  const needRefreshWithLocked = isModeT && locked;

  if (needRefreshWithLocked || needRefreshWithPassphrase) {
    // refresh device state
    await device.getFeatures();
  }

  // Attach to pin try to fix internal state
  const deviceId = device.getCurrentDeviceId();
  device.updateInternalState(
    device.getCurrentPassphraseProtection() ?? false,
    passphraseState,
    deviceId,
    newSession,
    options?.initSession ? null : device.features?.sessionId
  );

  return {
    passphraseState,
    newSession,
    unlockedAttachPin: unlockedAttachPin ?? device.features?.unlockedAttachPin,
  };
};

// 仅适用于 Protocol V1 的 Pro：Pro2 走独立版本线，不能套用 4.15.0 门槛
const supportProSeriesAttachPinPassphrase = (deviceType: IDeviceType, firmwareVersion: string) =>
  deviceType === EDeviceType.Pro && semver.gte(firmwareVersion, '4.15.0');

export const getPassphraseState = async (
  device: Device,
  options?: {
    expectPassphraseState?: string;
    onlyMainPin?: boolean;
    initSession?: boolean;
  }
): Promise<{
  passphraseState: string | undefined;
  newSession: string | undefined;
  unlockedAttachPin: boolean | undefined;
}> => {
  const { features, commands } = device;

  // 设备尚未建立任何状态时无法判定，保持旧的空返回语义
  if (!features)
    return { passphraseState: undefined, newSession: undefined, unlockedAttachPin: undefined };

  const firmwareVersion = device.getCurrentFirmwareVersionString() ?? '0.0.0';
  const deviceType = device.getCurrentDeviceType();

  if (device.isProtocolV2()) {
    return getProtocolV2WalletSession(device, {
      initSession: options?.initSession,
      expectedPassphraseState: options?.expectPassphraseState,
      onlyMainPin: options?.onlyMainPin,
    });
  }

  const supportAttachPinCapability = existCapability(
    features,
    Enum_Capability.Capability_AttachToPin
  );
  const supportGetPassphraseState =
    supportAttachPinCapability || supportProSeriesAttachPinPassphrase(deviceType, firmwareVersion);

  if (supportGetPassphraseState) {
    const payload: GetPassphraseState = {
      passphrase_state: options?.onlyMainPin ? undefined : options?.expectPassphraseState,
    };

    const { message, type } = await commands.typedCall(
      'GetPassphraseState',
      'PassphraseState',
      payload
    );

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

// supportBatchPublicKey 已迁移为 device-aware 版本：
// 见 api/helpers/batchGetPublickeys.ts 的 supportBatchPublicKeyByDevice

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
  if (deviceType === EDeviceType.Pro2) {
    return 'firmware-v1';
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

  if (deviceType === 'pro2') {
    return ['firmware-v1'];
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

  if (tempFeatures.firmwareVersion && !semver.valid(tempFeatures.firmwareVersion)) {
    tempFeatures.firmwareVersion = fixVersion(tempFeatures.firmwareVersion);
  }

  return tempFeatures;
};
