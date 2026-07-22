import { ERRORS, HardwareErrorCode, createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

import type { DeviceStateSection } from '../types';
import type { RefreshDeviceStateParams } from '../types/api/refreshDeviceState';

const REFRESH_SCOPE_SECTIONS: Record<RefreshDeviceStateParams['scope'], DeviceStateSection[]> = {
  basic: ['identity', 'versions'],
  firmware: ['identity', 'versions', 'verification'],
  settings: ['settings'],
  runtime: ['status'],
};

export default class RefreshDeviceState extends BaseMethod<RefreshDeviceStateParams> {
  init() {
    const scope = this.payload.scope as RefreshDeviceStateParams['scope'];
    if (!Object.prototype.hasOwnProperty.call(REFRESH_SCOPE_SECTIONS, scope)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Unsupported device state refresh scope: ${String(scope)}`
      );
    }
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      scope,
    };
  }

  async run() {
    const requiresNormalMode = this.params.scope === 'runtime' || this.params.scope === 'settings';
    if (requiresNormalMode && !this.device.state) {
      await this.device.getDeviceState();
    }
    if (requiresNormalMode && this.device.state?.status.mode !== 'normal') {
      throw createDeviceNotSupportMethodError(
        `${this.name}:${this.params.scope}`,
        this.device.getCurrentFirmwareType()
      );
    }
    return this.device.getDeviceState({
      refreshSections: REFRESH_SCOPE_SECTIONS[this.params.scope],
    });
  }
}
