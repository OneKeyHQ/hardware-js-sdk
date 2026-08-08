import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { getBleFirmwareReleaseInfo } from './firmware/releaseHelper';
import {
  PROTOCOL_V2_BLE_TARGETS,
  getProtocolV2ComponentReleaseInfo,
  loadProtocolV2FirmwareReleaseContext,
  summarizeProtocolV2FirmwareRelease,
  toProtocolV2FirmwareReleaseInfo,
} from './firmware/protocolV2Release';
import { buildProtocolV2FirmwareRelease } from './CheckAllFirmwareRelease';

export default class CheckBLEFirmwareRelease extends BaseMethod {
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
    if (this.device.isProtocolV2()) {
      const { state, firmwareType, release } = await loadProtocolV2FirmwareReleaseContext({
        device: this.device,
        methodName: 'checkBLEFirmwareRelease',
      });
      const plan = summarizeProtocolV2FirmwareRelease(
        buildProtocolV2FirmwareRelease({
          currentVersions: state.versions,
          firmwareType,
          release,
          deviceType: state.identity.deviceType,
        }),
        PROTOCOL_V2_BLE_TARGETS
      );
      return toProtocolV2FirmwareReleaseInfo({
        plan,
        state,
        release: getProtocolV2ComponentReleaseInfo(plan, 'COPROCESSOR'),
      });
    }

    if (this.device.features) {
      const releaseInfo = getBleFirmwareReleaseInfo(this.device.features);
      return releaseInfo;
    }
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'checkBLEFirmwareRelease requires initialized device features'
    );
  }
}
