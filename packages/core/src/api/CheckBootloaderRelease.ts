import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getBootloaderReleaseInfo } from './firmware/releaseHelper';
import {
  PROTOCOL_V2_BOOTLOADER_TARGETS,
  getProtocolV2ComponentReleaseInfo,
  loadProtocolV2FirmwareReleaseContext,
  summarizeProtocolV2FirmwareRelease,
  toProtocolV2FirmwareReleaseInfo,
} from './firmware/protocolV2Release';
import { buildProtocolV2FirmwareRelease } from './CheckAllFirmwareRelease';

import type { CheckBootloaderReleaseParams } from '../types/api/checkBootloaderRelease';

export default class CheckBootloaderRelease extends BaseMethod {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (!this.device.features) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'checkBootloaderRelease requires initialized device features'
      );
    }
    const { features } = this.device;
    const payload = this.payload as CheckBootloaderReleaseParams;

    if (this.device.isProtocolV2()) {
      const { state, firmwareType, release } = await loadProtocolV2FirmwareReleaseContext({
        device: this.device,
        firmwareType: payload.firmwareType,
        methodName: 'checkBootloaderRelease',
      });
      const plan = summarizeProtocolV2FirmwareRelease(
        buildProtocolV2FirmwareRelease({
          currentVersions: state.versions,
          firmwareType,
          release,
          deviceType: state.identity.deviceType,
        }),
        PROTOCOL_V2_BOOTLOADER_TARGETS
      );
      return toProtocolV2FirmwareReleaseInfo({
        plan,
        state,
        release: getProtocolV2ComponentReleaseInfo(plan, 'BOOTLOADER'),
      });
    }

    const deviceFirmwareType = this.device.getCurrentFirmwareType();
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    const releaseInfo = getBootloaderReleaseInfo({
      features,
      willUpdateFirmwareVersion: payload.willUpdateFirmwareVersion,
      firmwareType,
    });
    return Promise.resolve(releaseInfo);
  }
}
