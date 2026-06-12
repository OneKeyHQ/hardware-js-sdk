import semver from 'semver';

import { UI_REQUEST } from '../constants/ui-request';
import { fixVersion } from '../utils/deviceFeaturesUtils';
import { PROTOCOL_V2_DEVICE_INFO_REQUEST } from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import { BaseMethod } from './BaseMethod';

import type { OnekeyFeatures } from '../types';

const ONEKEY_FEATURE_KEYS: Array<keyof OnekeyFeatures> = [
  'onekey_device_type',
  'onekey_board_version',
  'onekey_boot_version',
  'onekey_firmware_version',
  'onekey_board_hash',
  'onekey_boot_hash',
  'onekey_firmware_hash',
  'onekey_board_build_id',
  'onekey_boot_build_id',
  'onekey_firmware_build_id',
  'onekey_serial_no',
  'onekey_ble_name',
  'onekey_ble_version',
  'onekey_ble_build_id',
  'onekey_ble_hash',
  'onekey_se_type',
  'onekey_se01_state',
  'onekey_se02_state',
  'onekey_se03_state',
  'onekey_se04_state',
  'onekey_se01_version',
  'onekey_se02_version',
  'onekey_se03_version',
  'onekey_se04_version',
  'onekey_se01_hash',
  'onekey_se02_hash',
  'onekey_se03_hash',
  'onekey_se04_hash',
  'onekey_se01_build_id',
  'onekey_se02_build_id',
  'onekey_se03_build_id',
  'onekey_se04_build_id',
  'onekey_se01_boot_version',
  'onekey_se02_boot_version',
  'onekey_se03_boot_version',
  'onekey_se04_boot_version',
  'onekey_se01_boot_hash',
  'onekey_se02_boot_hash',
  'onekey_se03_boot_hash',
  'onekey_se04_boot_hash',
  'onekey_se01_boot_build_id',
  'onekey_se02_boot_build_id',
  'onekey_se03_boot_build_id',
  'onekey_se04_boot_build_id',
];

function normalizeOnekeyFirmwareVersion(message: OnekeyFeatures) {
  if (message.onekey_firmware_version && !semver.valid(message.onekey_firmware_version)) {
    message.onekey_firmware_version = fixVersion(message.onekey_firmware_version);
  }
}

function pickOnekeyFeatures(features?: OnekeyFeatures | null): OnekeyFeatures {
  const message: OnekeyFeatures = {};
  if (!features) return message;

  for (const key of ONEKEY_FEATURE_KEYS) {
    const value = features[key];
    if (value !== undefined && value !== null) {
      (message as Record<string, unknown>)[key] = value;
    }
  }

  normalizeOnekeyFirmwareVersion(message);
  return message;
}

export default class GetOnekeyFeatures extends BaseMethod {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (this.device.isProtocolV2()) {
      // V2 没有 OnekeyGetFeatures 消息：
      // 取完整 DevGetDeviceInfo（含 SE/hash/build_id）后写入 features 兼容视图。
      const deviceInfo = await requestProtocolV2DeviceInfo({
        commands: this.device.commands,
        request: PROTOCOL_V2_DEVICE_INFO_REQUEST,
      });
      const features = this.device.updateProtocolV2Features(deviceInfo);
      return pickOnekeyFeatures(features as OnekeyFeatures);
    }

    const { message } = await this.device.commands.typedCall('OnekeyGetFeatures', 'OnekeyFeatures');
    normalizeOnekeyFirmwareVersion(message);
    return Promise.resolve(message);
  }
}
