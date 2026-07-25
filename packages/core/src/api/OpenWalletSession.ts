import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { deviceWalletSessionStore } from '../device/DeviceWalletSessionStore';
import { getProtocolV2WalletSession } from '../protocols/protocol-v2/walletSession';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
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

const wasResumed = (session: unknown) =>
  !!session &&
  typeof session === 'object' &&
  'resumed' in session &&
  (session as { resumed?: unknown }).resumed === true;

const normalizeParams = (payload: Record<string, unknown>): OpenWalletSessionParams => {
  if (payload.useEmptyPassphrase === true) {
    return { mode: 'standard' };
  }
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
  const hasWalletBinding =
    payload.deviceId !== undefined ||
    payload.passphraseState !== undefined ||
    payload.sessionId !== undefined;
  if (payload.mode === undefined && !hasWalletBinding) {
    return { mode: 'select-hidden' };
  }
  if (payload.mode === undefined && hasWalletBinding) {
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
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = normalizeParams(this.payload as unknown as Record<string, unknown>);
    this.payload.useEmptyPassphrase = this.params.mode === 'standard';
  }

  async run(): Promise<OpenWalletSessionPayload> {
    const state = await this.device.getDeviceState({ refreshSections: ['status'] });
    const currentDeviceId = state.identity.deviceId;
    if (!currentDeviceId) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
    }

    const protocol = this.device.isProtocolV2() ? 'V2' : 'V1';

    if (this.params.mode === 'standard') {
      this.device.passphraseState = undefined;
      const session = this.device.isProtocolV2()
        ? await getProtocolV2WalletSession(this.device, { onlyMainPin: true })
        : await getPassphraseStateWithRefreshDeviceInfo(this.device, {
            onlyMainPin: true,
            initSession: this.payload.initSession,
          });
      if (session.unlockedAttachPin) {
        try {
          await this.device.lockDevice();
        } catch {
          // The wallet context is rejected even when an older device cannot be locked.
        }
        this.device.clearInternalState();
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError);
      }
      return {
        protocol,
        walletType: 'standard',
        deviceId: currentDeviceId,
        passphraseState: null,
        sessionId: session.newSession ?? null,
        resumed: wasResumed(session),
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
      if (!this.device.isProtocolV2()) {
        await this.device.initialize({
          deviceId: this.params.deviceId,
          passphraseState: this.params.passphraseState,
        });
      }
      const session = this.device.isProtocolV2()
        ? await getProtocolV2WalletSession(this.device, {
            expectedPassphraseState: this.params.passphraseState,
            recoverInvalidSession: false,
          })
        : await getPassphraseStateWithRefreshDeviceInfo(this.device, {
            expectPassphraseState: this.params.passphraseState,
          });
      return {
        protocol,
        walletType: 'hidden',
        deviceId: currentDeviceId,
        passphraseState: session.passphraseState ?? null,
        sessionId: session.newSession ?? null,
        resumed: wasResumed(session) || session.newSession === this.params.sessionId,
      };
    }

    this.device.passphraseState = undefined;
    const session = this.device.isProtocolV2()
      ? await getProtocolV2WalletSession(this.device, { initSession: true })
      : await getPassphraseStateWithRefreshDeviceInfo(this.device, { initSession: true });
    return {
      protocol,
      walletType: 'hidden',
      deviceId: currentDeviceId,
      passphraseState: session.passphraseState ?? null,
      sessionId: session.newSession ?? null,
      resumed: wasResumed(session),
    };
  }
}
