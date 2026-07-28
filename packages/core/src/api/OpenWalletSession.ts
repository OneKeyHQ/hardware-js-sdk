import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { deviceWalletSessionStore } from '../device/DeviceWalletSessionStore';
import { getProtocolV2WalletSession } from '../protocols/protocol-v2/walletSession';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';
import { invalidParameter } from './helpers/paramsValidator';

import type {
  OpenWalletSessionParams,
  OpenWalletSessionPayload,
} from '../types/api/openWalletSession';

const requiredString = (value: unknown, name: string) => {
  if (value === undefined || value === null) {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw invalidParameter(`Parameter [${name}] must be a non-empty string.`);
  }
  return value.trim();
};

const optionalBoolean = (value: unknown, name: string) => {
  if (value !== undefined && typeof value !== 'boolean') {
    throw invalidParameter(`Parameter [${name}] must be a boolean.`);
  }
  return value;
};

const wasResumed = (session: unknown) =>
  !!session &&
  typeof session === 'object' &&
  'resumed' in session &&
  (session as { resumed?: unknown }).resumed === true;

const forwardSessionId = (session: { newSession?: string }) =>
  session.newSession ? { sessionId: session.newSession } : {};

const requireHiddenWalletResponse = (session: {
  passphraseState?: string;
  newSession?: string;
}) => {
  if (!session.passphraseState) {
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceInitializeFailed,
      'Hidden wallet response is missing passphraseState'
    );
  }
  return {
    passphraseState: session.passphraseState,
    ...forwardSessionId(session),
  };
};

type NormalizedOpenWalletSessionParams = OpenWalletSessionParams & {
  legacySessionToClear?: {
    deviceId?: string;
    passphraseState: string;
  };
};

const normalizeParams = (payload: Record<string, unknown>): NormalizedOpenWalletSessionParams => {
  if (payload.mode !== undefined) {
    if (
      payload.mode !== 'standard' &&
      payload.mode !== 'select-hidden' &&
      payload.mode !== 'resume-hidden'
    ) {
      throw invalidParameter(
        'Parameter [mode] must be one of standard, select-hidden, or resume-hidden.'
      );
    }
    if (payload.useEmptyPassphrase !== undefined || payload.initSession !== undefined) {
      throw invalidParameter(
        'Parameters [useEmptyPassphrase] and [initSession] cannot be used with [mode].'
      );
    }
    if (payload.mode === 'standard' || payload.mode === 'select-hidden') {
      if (payload.deviceId !== undefined || payload.passphraseState !== undefined) {
        throw invalidParameter(
          'Parameters [deviceId] and [passphraseState] are only allowed with mode [resume-hidden].'
        );
      }
      return { mode: payload.mode };
    }
    return {
      mode: 'resume-hidden',
      deviceId: requiredString(payload.deviceId, 'deviceId'),
      passphraseState: requiredString(payload.passphraseState, 'passphraseState'),
    };
  }

  const useEmptyPassphrase = optionalBoolean(payload.useEmptyPassphrase, 'useEmptyPassphrase');
  const initSession = optionalBoolean(payload.initSession, 'initSession');
  if (useEmptyPassphrase === true) {
    return { mode: 'standard' };
  }
  if (initSession === true) {
    const deviceId =
      payload.deviceId === undefined ? undefined : requiredString(payload.deviceId, 'deviceId');
    const passphraseState =
      payload.passphraseState === undefined
        ? undefined
        : requiredString(payload.passphraseState, 'passphraseState');
    return {
      mode: 'select-hidden',
      ...(passphraseState
        ? {
            legacySessionToClear: {
              deviceId,
              passphraseState,
            },
          }
        : {}),
    };
  }

  const hasWalletBinding = payload.deviceId !== undefined || payload.passphraseState !== undefined;
  if (!hasWalletBinding) {
    return { mode: 'select-hidden' };
  }
  return {
    mode: 'resume-hidden',
    deviceId: requiredString(payload.deviceId, 'deviceId'),
    passphraseState: requiredString(payload.passphraseState, 'passphraseState'),
  };
};

export default class OpenWalletSession extends BaseMethod<NormalizedOpenWalletSessionParams> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = normalizeParams(this.payload as unknown as Record<string, unknown>);
    this.payload.useEmptyPassphrase = this.params.mode === 'standard';
  }

  async run(): Promise<OpenWalletSessionPayload> {
    const isProtocolV2 = this.device.isProtocolV2();
    const state = await this.device.getDeviceState({ refreshSections: ['status'] });
    let currentDeviceId = state.identity.deviceId;
    const { legacySessionToClear } = this.params;
    const requireDeviceId = () => {
      if (!currentDeviceId) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
      }
      return currentDeviceId;
    };
    const clearLegacySession = () => {
      const deviceId = requireDeviceId();
      if (
        legacySessionToClear &&
        (!legacySessionToClear.deviceId || legacySessionToClear.deviceId === deviceId)
      ) {
        deviceWalletSessionStore.delete(deviceId, legacySessionToClear.passphraseState);
      }
    };
    const refreshProtocolV2DeviceId = async () => {
      const refreshedState = await this.device.getDeviceState({ refreshSections: ['status'] });
      currentDeviceId = refreshedState.identity.deviceId;
      clearLegacySession();
      return requireDeviceId();
    };

    if (!isProtocolV2) {
      clearLegacySession();
    }

    const protocol = isProtocolV2 ? 'V2' : 'V1';

    if (this.params.mode === 'standard') {
      this.device.passphraseState = undefined;
      const session = isProtocolV2
        ? await getProtocolV2WalletSession(this.device, { onlyMainPin: true })
        : await getPassphraseStateWithRefreshDeviceInfo(this.device, {
            onlyMainPin: true,
            initSession: this.payload.initSession,
          });
      const deviceId = isProtocolV2 ? await refreshProtocolV2DeviceId() : requireDeviceId();
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
        deviceId,
        passphraseState: null,
        ...forwardSessionId(session),
        resumed: wasResumed(session),
      };
    }

    if (this.params.mode === 'resume-hidden') {
      if (!isProtocolV2 && requireDeviceId() !== this.params.deviceId) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
      }
      this.device.passphraseState = this.params.passphraseState;
      const cachedSessionId = deviceWalletSessionStore.get(
        this.params.deviceId,
        this.params.passphraseState
      );
      if (!cachedSessionId) {
        throw ERRORS.TypedError(HardwareErrorCode.WalletSessionInvalid);
      }
      if (!isProtocolV2) {
        await this.device.initialize({
          deviceId: this.params.deviceId,
          passphraseState: this.params.passphraseState,
        });
      }
      const session = isProtocolV2
        ? await getProtocolV2WalletSession(this.device, {
            expectedPassphraseState: this.params.passphraseState,
          })
        : await getPassphraseStateWithRefreshDeviceInfo(this.device, {
            expectPassphraseState: this.params.passphraseState,
          });
      const deviceId = isProtocolV2 ? await refreshProtocolV2DeviceId() : requireDeviceId();
      if (deviceId !== this.params.deviceId) {
        this.device.clearInternalState();
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
      }
      if (!session.passphraseState) {
        this.device.clearInternalState();
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
      }
      return {
        protocol,
        walletType: 'hidden',
        deviceId,
        ...requireHiddenWalletResponse(session),
        resumed: wasResumed(session) || session.newSession === cachedSessionId,
      };
    }

    this.device.passphraseState = undefined;
    const session = isProtocolV2
      ? await getProtocolV2WalletSession(this.device, { initSession: true })
      : await getPassphraseStateWithRefreshDeviceInfo(this.device, { initSession: true });
    const deviceId = isProtocolV2 ? await refreshProtocolV2DeviceId() : requireDeviceId();
    const responseBase = {
      protocol,
      deviceId,
      resumed: wasResumed(session),
    } as const;
    return this.device.getCurrentPassphraseProtection() === false
      ? {
          ...responseBase,
          walletType: 'standard',
          passphraseState: null,
          ...forwardSessionId(session),
        }
      : {
          ...responseBase,
          walletType: 'hidden',
          ...requireHiddenWalletResponse(session),
        };
  }
}
