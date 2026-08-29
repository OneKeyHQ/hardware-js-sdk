import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { deviceWalletSessionStore } from '../device/DeviceWalletSessionStore';
import { getProtocolV2WalletSession } from '../protocols/protocol-v2/walletSession';
import { getPassphraseStateWithRefreshDeviceInfo } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';
import { invalidParameter } from './helpers/paramsValidator';
import { OpenWalletSessionMode } from '../types/api/openWalletSession';

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

const wasResumed = (session: unknown) =>
  !!session &&
  typeof session === 'object' &&
  'resumed' in session &&
  (session as { resumed?: unknown }).resumed === true;

const wasWalletStatusRefreshed = (session: unknown) =>
  !!session &&
  typeof session === 'object' &&
  'walletStatusRefreshed' in session &&
  (session as { walletStatusRefreshed?: unknown }).walletStatusRefreshed === true;

const requireHiddenWalletResponse = (session: { passphraseState?: string }) => {
  if (!session.passphraseState) {
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceInitializeFailed,
      'Hidden wallet response is missing passphraseState'
    );
  }
  return {
    passphraseState: session.passphraseState,
  };
};

const normalizeParams = (payload: Record<string, unknown>): OpenWalletSessionParams => {
  if (payload.mode === undefined) {
    throw invalidParameter('Parameter [mode] is required.');
  }
  if (
    payload.mode !== OpenWalletSessionMode.Standard &&
    payload.mode !== OpenWalletSessionMode.SelectHidden &&
    payload.mode !== OpenWalletSessionMode.ResumeHidden
  ) {
    throw invalidParameter(
      'Parameter [mode] must be one of standard, select-hidden, or resume-hidden.'
    );
  }
  if (payload.useEmptyPassphrase !== undefined || payload.initSession !== undefined) {
    throw invalidParameter(
      'Legacy parameters [useEmptyPassphrase] and [initSession] are not supported by openWalletSession.'
    );
  }
  if (
    payload.mode === OpenWalletSessionMode.Standard ||
    payload.mode === OpenWalletSessionMode.SelectHidden
  ) {
    if (payload.deviceId !== undefined || payload.passphraseState !== undefined) {
      throw invalidParameter(
        'Parameters [deviceId] and [passphraseState] are only allowed with mode [resume-hidden].'
      );
    }
    return { mode: payload.mode };
  }
  return {
    mode: OpenWalletSessionMode.ResumeHidden,
    deviceId: requiredString(payload.deviceId, 'deviceId'),
    passphraseState: requiredString(payload.passphraseState, 'passphraseState'),
  };
};

export default class OpenWalletSession extends BaseMethod<OpenWalletSessionParams> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'unlock-before-run';
    this.skipForceUpdateCheck = true;
    this.params = normalizeParams(this.payload as unknown as Record<string, unknown>);
    this.protocolV2PreUnlockPinType =
      this.params.mode === OpenWalletSessionMode.SelectHidden
        ? DeviceSessionPinType.Any
        : DeviceSessionPinType.Main;
    this.payload.useEmptyPassphrase = this.params.mode === OpenWalletSessionMode.Standard;
  }

  async run(): Promise<OpenWalletSessionPayload> {
    const isProtocolV2 = this.device.isProtocolV2();
    const reusePreflightStatus =
      isProtocolV2 && this.protocolV2UnlockContext?.preflightStatusRefreshed === true;
    let state = reusePreflightStatus
      ? await this.device.getDeviceState()
      : await this.device.getDeviceState({ refreshSections: ['status'] });
    let currentDeviceId = state.identity.deviceId;
    const hasAuthoritativeProtocolV2WalletStatus = (candidate: typeof state) =>
      candidate.status.unlocked === true &&
      typeof candidate.status.passphraseProtection === 'boolean' &&
      typeof candidate.status.unlockedAttachPin === 'boolean';
    const requireAuthoritativeProtocolV2WalletStatus = (candidate: typeof state) => {
      if (!hasAuthoritativeProtocolV2WalletStatus(candidate)) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
      }
      return candidate;
    };
    const requireDeviceId = () => {
      if (!currentDeviceId) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed);
      }
      return currentDeviceId;
    };
    const refreshProtocolV2DeviceState = async () => {
      state = await this.device.getDeviceState({ refreshSections: ['status'] });
      currentDeviceId = state.identity.deviceId;
      return state;
    };
    const resolveProtocolV2DeviceStateAfterSession = async (session: unknown) => {
      if (!wasWalletStatusRefreshed(session)) {
        return refreshProtocolV2DeviceState();
      }
      state = await this.device.getDeviceState();
      currentDeviceId = state.identity.deviceId;
      return state;
    };
    const ensureProtocolV2WalletStatus = async () => {
      if (isProtocolV2 && !hasAuthoritativeProtocolV2WalletStatus(state)) {
        await this.device.unlockDevice(
          this.protocolV2PreUnlockPinType ?? DeviceSessionPinType.Main,
          {
            source: 'unlock-coordinator',
            reason: 'device-locked',
            deviceOnly: true,
            method: 'openWalletSession',
          }
        );
        requireAuthoritativeProtocolV2WalletStatus(await refreshProtocolV2DeviceState());
      }
      return state;
    };

    const protocol = isProtocolV2 ? 'V2' : 'V1';

    if (this.params.mode === OpenWalletSessionMode.Standard) {
      this.device.passphraseState = undefined;
      const session = isProtocolV2
        ? await getProtocolV2WalletSession(this.device, {
            onlyMainPin: true,
            selectMainWalletBeforeRestore:
              !hasAuthoritativeProtocolV2WalletStatus(state) ||
              state.status.unlockedAttachPin === true,
            mainPinSelected: this.protocolV2UnlockContext?.preflightMainPinSelected,
          })
        : await getPassphraseStateWithRefreshDeviceInfo(this.device, {
            onlyMainPin: true,
            initSession: this.payload.initSession,
          });
      const refreshedState = isProtocolV2
        ? requireAuthoritativeProtocolV2WalletStatus(
            await resolveProtocolV2DeviceStateAfterSession(session)
          )
        : state;
      const deviceId = requireDeviceId();
      if (
        session.unlockedAttachPin ||
        (isProtocolV2 && refreshedState.status.unlockedAttachPin === true)
      ) {
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
        resumed: wasResumed(session),
      };
    }

    if (this.params.mode === OpenWalletSessionMode.ResumeHidden) {
      if (isProtocolV2) {
        await ensureProtocolV2WalletStatus();
        const refreshedDeviceId = requireDeviceId();
        if (refreshedDeviceId !== this.params.deviceId) {
          deviceWalletSessionStore.delete(this.params.deviceId, this.params.passphraseState);
          throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
        }
      } else if (requireDeviceId() !== this.params.deviceId) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
      }
      this.device.passphraseState = this.params.passphraseState;
      const cachedSessionId = deviceWalletSessionStore.get(
        this.params.deviceId,
        this.params.passphraseState
      );
      if (!cachedSessionId && !isProtocolV2) {
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
      const deviceId = requireDeviceId();
      if (session.passphraseState !== this.params.passphraseState) {
        this.device.clearInternalState();
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
      }
      return {
        protocol,
        walletType: 'hidden',
        deviceId,
        ...requireHiddenWalletResponse(session),
        resumed: wasResumed(session) || (!isProtocolV2 && session.newSession === cachedSessionId),
      };
    }

    this.device.passphraseState = undefined;
    const walletStatus = await ensureProtocolV2WalletStatus();
    if (isProtocolV2 && walletStatus.status.passphraseProtection !== true) {
      this.device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotOpenedPassphrase);
    }
    if (isProtocolV2 && walletStatus.status.unlockedAttachPin === true) {
      try {
        await this.device.lockDevice();
      } catch {
        // Reject the Attach PIN context even when an older device cannot be locked.
      }
      this.device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError);
    }
    const session = isProtocolV2
      ? await getProtocolV2WalletSession(this.device, {
          forceWalletSelection: true,
        })
      : await getPassphraseStateWithRefreshDeviceInfo(this.device, { initSession: true });
    const refreshedState = isProtocolV2
      ? requireAuthoritativeProtocolV2WalletStatus(
          await resolveProtocolV2DeviceStateAfterSession(session)
        )
      : state;
    const deviceId = requireDeviceId();
    if (isProtocolV2 && refreshedState.status.passphraseProtection !== true) {
      this.device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotOpenedPassphrase);
    }
    const responseBase = {
      protocol,
      deviceId,
      resumed: wasResumed(session),
    } as const;
    return !isProtocolV2 && this.device.getCurrentPassphraseProtection() === false
      ? {
          ...responseBase,
          walletType: 'standard',
          passphraseState: null,
        }
      : {
          ...responseBase,
          walletType: 'hidden',
          ...requireHiddenWalletResponse(session),
        };
  }
}
