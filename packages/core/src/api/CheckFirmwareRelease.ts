import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getFirmwareReleaseInfo } from './firmware/releaseHelper';
import {
  PROTOCOL_V2_MAIN_FIRMWARE_TARGETS,
  loadProtocolV2FirmwareReleaseContext,
  summarizeProtocolV2FirmwareRelease,
  toProtocolV2FirmwareReleaseInfo,
} from './firmware/protocolV2Release';
import { buildProtocolV2FirmwareRelease } from './CheckAllFirmwareRelease';

import type { CheckFirmwareReleaseParams } from '../types/api/checkFirmwareRelease';

export default class CheckFirmwareRelease extends BaseMethod {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

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
    const payload = this.payload as CheckFirmwareReleaseParams;

    if (this.device.isProtocolV2()) {
      const { state, firmwareType, release } = await loadProtocolV2FirmwareReleaseContext({
        device: this.device,
        firmwareType: payload.firmwareType,
        methodName: 'checkFirmwareRelease',
      });
      const plan = summarizeProtocolV2FirmwareRelease(
        buildProtocolV2FirmwareRelease({
          currentVersions: state.versions,
          firmwareType,
          release,
          deviceType: state.identity.deviceType,
        }),
        PROTOCOL_V2_MAIN_FIRMWARE_TARGETS
      );
      return toProtocolV2FirmwareReleaseInfo({ plan, state, release });
    }

    if (!this.device.features) return null;

    const deviceFirmwareType = this.device.getCurrentFirmwareType();
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    const releaseInfo = getFirmwareReleaseInfo(this.device.features, firmwareType);
    return releaseInfo;
  }
}
