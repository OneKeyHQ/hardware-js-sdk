import { ERRORS, HardwareErrorCode, createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';

import type { DeviceStateSection } from '../types';
import type { DeviceStateScope, GetDeviceStateParams } from '../types/api/getDeviceState';

const SCOPE_SECTIONS: Record<DeviceStateScope, DeviceStateSection[]> = {
  runtime: ['status'],
  settings: ['status', 'settings'],
  firmware: ['status', 'identity', 'versions', 'verification'],
};

const isLoaderMode = (mode: string) => mode === 'bootloader' || mode === 'romloader';

export default class GetDeviceState extends BaseMethod<
  Required<Pick<GetDeviceStateParams, 'scope'>>
> {
  init() {
    const scope = (this.payload.scope ?? 'runtime') as DeviceStateScope;
    if (!Object.prototype.hasOwnProperty.call(SCOPE_SECTIONS, scope)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Unsupported device state scope: ${String(scope)}`
      );
    }
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.unlockPolicy = 'none';
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = { scope };
  }

  async run() {
    const state = await this.device.getDeviceState({
      refreshSections: SCOPE_SECTIONS[this.params.scope],
    });
    if (
      this.params.scope === 'settings' &&
      this.device.isProtocolV2() &&
      isLoaderMode(state.status.mode)
    ) {
      throw createDeviceNotSupportMethodError(
        `${this.name}:${this.params.scope}`,
        this.device.getCurrentFirmwareType()
      );
    }
    return state;
  }
}
