import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType, DeviceSessionSeedDomain } from '@onekeyfe/hd-transport';

import { DEVICE } from '../../events';
import { assertCompleteDeviceSession } from './deviceSession';

import type { DeviceSessionAskPassphrase, DeviceSessionGet } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';

const HOST_PASSPHRASE_MAX_BYTES = 50;

const isWalletSessionInvalidError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'errorCode' in error &&
  (error as { errorCode?: unknown }).errorCode === HardwareErrorCode.WalletSessionInvalid;

const utf8ByteLength = (value: string): number | undefined => {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) return undefined;
    if (codePoint <= 0x7f) length += 1;
    else if (codePoint <= 0x7ff) length += 2;
    else if (codePoint <= 0xffff) length += 3;
    else length += 4;
  }
  return length;
};

export async function requestProtocolV2DeviceStatus(device: Device) {
  const { message } = await device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
  return message;
}

export async function refreshProtocolV2DeviceStatus(device: Device) {
  const status = await requestProtocolV2DeviceStatus(device);
  return device.updateProtocolV2Status(status);
}

export async function ensureProtocolV2WalletSessionUnlocked(device: Device) {
  if (!device.isProtocolV2() || device.isBootloader?.() || device.isRomloader?.()) {
    return false;
  }

  await refreshProtocolV2DeviceStatus(device);
  if (device.state?.status.unlocked !== false) {
    return false;
  }

  await device.unlockDevice(DeviceSessionPinType.Main, {
    source: 'unlock-coordinator',
    reason: 'device-locked',
    deviceOnly: true,
  });
  return true;
}

const negotiateEventlessWalletSession = async (device: Device) => {
  await device.ensureProtocolV2RuntimeContext();
};

const getDeviceSession = async (device: Device, request: DeviceSessionGet) =>
  device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);

const buildDeviceSessionGetRequest = ({
  sessionId,
  expectedPassphraseState,
  deriveCardano,
}: {
  sessionId?: string;
  expectedPassphraseState?: string;
  deriveCardano?: boolean;
} = {}): DeviceSessionGet => ({
  ...(sessionId ? { session_id: sessionId } : {}),
  ...(expectedPassphraseState ? { btc_test_address: expectedPassphraseState } : {}),
  seed_domains:
    deriveCardano === undefined
      ? []
      : [
          DeviceSessionSeedDomain.SeedDomain_Standard,
          ...(deriveCardano ? [DeviceSessionSeedDomain.SeedDomain_Cardano] : []),
        ],
});

const askDevicePassphrase = async (device: Device, requestPayload: DeviceSessionAskPassphrase) => {
  await device.commands.typedCall('DeviceSessionAskPassphrase', 'Success', requestPayload);
  await refreshProtocolV2DeviceStatus(device);
};

const selectDeviceSession = async (
  device: Device,
  expectedPassphraseState?: string,
  deriveCardano?: boolean
) => {
  const existsAttachPinUser = device.features?.attachToPinEnabled === true;
  const metadata = {
    source: 'wallet-session-coordinator' as const,
    reason: expectedPassphraseState ? ('session-recovery' as const) : ('open-wallet' as const),
    ...(expectedPassphraseState ? { expectedPassphraseState } : {}),
  };
  const passphraseInteraction = device.createProtocolV2UiPhaseMetadata?.('passphrase', 'start');
  const response = await device.commands.promptPassphrase(
    {
      existsAttachPinUser,
      deviceOnly: false,
      ...metadata,
      ...(passphraseInteraction ? { interaction: passphraseInteraction } : {}),
    },
    { cancelDeviceOnReject: false }
  );
  const hostPassphrase =
    typeof response.passphrase === 'string' ? response.passphrase.normalize('NFKD') : undefined;
  const hasHostPassphrase = typeof hostPassphrase === 'string' && hostPassphrase.length > 0;
  const hostPassphraseByteLength = hasHostPassphrase ? utf8ByteLength(hostPassphrase) : undefined;
  if (
    hasHostPassphrase &&
    (hostPassphrase.includes('\0') ||
      hostPassphraseByteLength === undefined ||
      hostPassphraseByteLength > HOST_PASSPHRASE_MAX_BYTES)
  ) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Host passphrase must contain 1 to ${HOST_PASSPHRASE_MAX_BYTES} valid UTF-8 bytes without NUL.`
    );
  }
  const selections = [
    hasHostPassphrase,
    response.passphraseOnDevice === true,
    response.attachPinOnDevice === true,
  ].filter(Boolean).length;

  if (selections !== 1) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Wallet selection must contain exactly one passphrase access mode.'
    );
  }

  if (response.attachPinOnDevice) {
    if (!existsAttachPinUser) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Attach PIN wallet selection is unavailable on this device.'
      );
    }
    const attachPinInteraction = device.createProtocolV2UiPhaseMetadata?.('pin', 'start');
    device.emit(DEVICE.ATTACH_PIN_ON_DEVICE, device, {
      ...metadata,
      ...(attachPinInteraction ? { interaction: attachPinInteraction } : {}),
    });
    await device.unlockDevice(DeviceSessionPinType.AttachToPin, {
      emitUiEvent: false,
      interaction: attachPinInteraction,
    });
    return getDeviceSession(device, buildDeviceSessionGetRequest({ deriveCardano }));
  }

  if (hasHostPassphrase) {
    await askDevicePassphrase(device, {
      passphrase: hostPassphrase,
      on_device: false,
    });
    return getDeviceSession(device, buildDeviceSessionGetRequest({ deriveCardano }));
  }

  device.emit(DEVICE.PASSPHRASE_ON_DEVICE, device, {
    ...metadata,
    ...(passphraseInteraction ? { interaction: passphraseInteraction } : {}),
  });
  await askDevicePassphrase(device, { on_device: true });
  return getDeviceSession(device, buildDeviceSessionGetRequest({ deriveCardano }));
};

export async function getProtocolV2WalletSession(
  device: Device,
  options?: {
    forceWalletSelection?: boolean;
    /** @deprecated 兼容旧 getPassphraseState；新流程使用 forceWalletSelection。 */
    initSession?: boolean;
    expectedPassphraseState?: string;
    onlyMainPin?: boolean;
    selectMainWalletBeforeRestore?: boolean;
    resumeOnly?: boolean;
    deriveCardano?: boolean;
  }
) {
  const forceWalletSelection =
    options?.forceWalletSelection === true || options?.initSession === true;

  if (forceWalletSelection) {
    if (options.onlyMainPin) {
      device.clearStandardInternalState?.();
    } else {
      device.clearInternalState();
    }
    device.passphraseState = undefined;
  }

  await negotiateEventlessWalletSession(device);

  if (options?.onlyMainPin) {
    device.passphraseState = undefined;
  }
  let expectedPassphraseState = options?.onlyMainPin
    ? undefined
    : options?.expectedPassphraseState ?? device.passphraseState;

  const cachedStandardSession = options?.onlyMainPin
    ? device.getStandardInternalState?.()
    : undefined;
  const cachedSessionId =
    !options?.onlyMainPin && typeof device.getInternalState === 'function'
      ? device.getInternalState()
      : undefined;
  let response;
  let resumed = false;
  let mainPinSelected =
    options?.onlyMainPin === true &&
    device.features?.unlocked === true &&
    device.features?.unlockedAttachPin === false;

  const clearCurrentWalletSession = () => {
    if (options?.onlyMainPin) {
      device.clearStandardInternalState?.();
    } else {
      device.clearInternalState();
    }
  };

  const rejectMismatchedAttachPinWallet = async () => {
    const features = await refreshProtocolV2DeviceStatus(device);
    if (features.unlockedAttachPin !== true) {
      return;
    }

    try {
      await device.lockDevice();
    } catch {
      // Reject the mismatched Attach PIN wallet even when older firmware cannot lock.
    }
    clearCurrentWalletSession();
    throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError);
  };

  const selectMainPin = async (force = false) => {
    if (force || !mainPinSelected) {
      await device.unlockDevice(DeviceSessionPinType.Main, {
        source: 'wallet-session-coordinator',
        reason: expectedPassphraseState ? 'session-recovery' : 'open-wallet',
        deviceOnly: true,
      });
      mainPinSelected = true;
    }
  };

  const selectStandardWallet = async () => {
    // Main PIN authenticates the device; an empty host passphrase selects the standard derivation.
    await selectMainPin();
    if (device.features?.passphraseProtection === true) {
      await askDevicePassphrase(device, {
        passphrase: '',
        on_device: false,
      });
    }
  };

  if (options?.onlyMainPin) {
    expectedPassphraseState = cachedStandardSession?.passphraseState;
    if (cachedStandardSession) {
      try {
        if (options?.selectMainWalletBeforeRestore) {
          await selectMainPin();
        }
        response = await getDeviceSession(
          device,
          buildDeviceSessionGetRequest({
            sessionId: cachedStandardSession.sessionId,
            expectedPassphraseState,
            deriveCardano: options?.deriveCardano,
          })
        );
        resumed = true;
      } catch (error) {
        device.clearStandardInternalState?.();
        if (!isWalletSessionInvalidError(error)) {
          throw error;
        }
        resumed = false;
      }
    }

    if (!response) {
      await selectStandardWallet();
      response = await getDeviceSession(
        device,
        buildDeviceSessionGetRequest({ deriveCardano: options?.deriveCardano })
      );
    }
  } else if (cachedSessionId && expectedPassphraseState) {
    try {
      response = await getDeviceSession(
        device,
        buildDeviceSessionGetRequest({
          sessionId: cachedSessionId,
          expectedPassphraseState,
          deriveCardano: options?.deriveCardano,
        })
      );
      resumed = true;
    } catch (error) {
      device.clearInternalState();
      if (options?.resumeOnly || !isWalletSessionInvalidError(error)) {
        throw error;
      }
      resumed = false;
    }
  } else if (expectedPassphraseState) {
    try {
      response = await getDeviceSession(
        device,
        buildDeviceSessionGetRequest({
          expectedPassphraseState,
          deriveCardano: options?.deriveCardano,
        })
      );
    } catch (error) {
      if (options?.resumeOnly || !isWalletSessionInvalidError(error)) {
        throw error;
      }
    }
  }

  if (!response) {
    if (options?.resumeOnly) {
      device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.WalletSessionInvalid);
    }
    response = await selectDeviceSession(device, expectedPassphraseState, options?.deriveCardano);
  }

  let { message } = response;
  try {
    assertCompleteDeviceSession(message);
  } catch (error) {
    if (options?.onlyMainPin) {
      device.clearStandardInternalState?.();
    } else {
      device.clearInternalState();
    }
    throw error;
  }
  if (expectedPassphraseState && expectedPassphraseState !== message.btc_test_address) {
    resumed = false;
    await rejectMismatchedAttachPinWallet();
    if (options?.resumeOnly) {
      device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.WalletSessionInvalid);
    }
    if (options?.onlyMainPin) {
      device.clearStandardInternalState?.();
      await selectStandardWallet();
      response = await getDeviceSession(
        device,
        buildDeviceSessionGetRequest({ deriveCardano: options?.deriveCardano })
      );
    } else {
      device.clearInternalState();
      response = await selectDeviceSession(device, expectedPassphraseState, options?.deriveCardano);
    }
    message = response.message;
    try {
      assertCompleteDeviceSession(message);
    } catch (error) {
      if (options?.onlyMainPin) {
        device.clearStandardInternalState?.();
      } else {
        device.clearInternalState();
      }
      throw error;
    }
    if (expectedPassphraseState !== message.btc_test_address) {
      await rejectMismatchedAttachPinWallet();
      clearCurrentWalletSession();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
    }
  }

  const internalStateArgs = [
    true,
    message.btc_test_address,
    device.getCurrentDeviceId(),
    message.session_id,
    forceWalletSelection ? null : cachedSessionId ?? null,
  ] as const;
  if (options?.onlyMainPin) {
    device.updateInternalState(...internalStateArgs, 'standard');
  } else {
    device.updateInternalState(...internalStateArgs);
  }

  return {
    passphraseState: message.btc_test_address,
    newSession: message.session_id,
    unlockedAttachPin: mainPinSelected ? false : undefined,
    resumed,
  };
}

export async function restoreProtocolV2WalletSession(
  device: Device,
  expectedPassphraseState: string,
  deriveCardano?: boolean
) {
  return getProtocolV2WalletSession(device, {
    expectedPassphraseState,
    resumeOnly: true,
    deriveCardano,
  });
}
