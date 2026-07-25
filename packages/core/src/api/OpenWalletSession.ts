import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { deviceWalletSessionStore } from '../device/DeviceWalletSessionStore';
import { getProtocolV2WalletSession } from '../protocols/protocol-v2/walletSession';
import { BaseMethod } from './BaseMethod';
import { invalidParameter } from './helpers/filesystemValidation';

import type {
  OpenWalletSessionParams,
  OpenWalletSessionPayload,
} from '../types/api/openWalletSession';

const requiredString = (value: unknown, name: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw invalidParameter(`Parameter [${name}] must be a non-empty string.`);
  }
  return value.trim();
};

const normalizeParams = (payload: Record<string, unknown>): OpenWalletSessionParams => {
  if (payload.mode === 'standard' || payload.mode === 'select-hidden') {
    return { mode: payload.mode };
  }
  if (payload.mode === 'resume-hidden') {
    return {
      mode: 'resume-hidden',
      deviceId: requiredString(payload.deviceId, 'deviceId'),
      passphraseState: requiredString(payload.passphraseState, 'passphraseState'),
      sessionId: requiredString(payload.sessionId, 'sessionId'),
    };
  }
  throw invalidParameter(
    'Parameter [mode] must be one of standard, select-hidden, or resume-hidden.'
  );
};

export default class OpenWalletSession extends BaseMethod<OpenWalletSessionParams> {
  init() {
    this.requireProtocolV2 = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = normalizeParams(this.payload as unknown as Record<string, unknown>);
  }

  async run(): Promise<OpenWalletSessionPayload> {
    const state = await this.device.getDeviceState({ refreshSections: ['status'] });
    const currentDeviceId = state.identity.deviceId;
    if (!currentDeviceId) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
    }

    if (this.params.mode === 'standard') {
      this.device.passphraseState = undefined;
      const session = await getProtocolV2WalletSession(this.device, {
        onlyMainPin: true,
      });
      return {
        protocol: 'V2',
        walletType: 'standard',
        deviceId: currentDeviceId,
        passphraseState: null,
        sessionId: null,
        resumed: session.resumed,
      };
    }

    if (this.params.mode === 'resume-hidden') {
      if (currentDeviceId !== this.params.deviceId) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
      }
      this.device.passphraseState = this.params.passphraseState;
      deviceWalletSessionStore.set(
        this.params.deviceId,
        this.params.passphraseState,
        this.params.sessionId
      );
      const session = await getProtocolV2WalletSession(this.device, {
        expectedPassphraseState: this.params.passphraseState,
        recoverInvalidSession: false,
      });
      return {
        protocol: 'V2',
        walletType: 'hidden',
        deviceId: currentDeviceId,
        passphraseState: session.passphraseState ?? null,
        sessionId: session.newSession ?? null,
        resumed: session.resumed,
      };
    }

    this.device.passphraseState = undefined;
    const session = await getProtocolV2WalletSession(this.device, {
      initSession: true,
    });
    return {
      protocol: 'V2',
      walletType: 'hidden',
      deviceId: currentDeviceId,
      passphraseState: session.passphraseState ?? null,
      sessionId: session.newSession ?? null,
      resumed: session.resumed,
    };
  }
}
