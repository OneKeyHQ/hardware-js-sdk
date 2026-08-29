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

const STANDARD_SEED_DOMAINS = [DeviceSessionSeedDomain.SeedDomain_Standard];
const CARDANO_SEED_DOMAINS = [
  DeviceSessionSeedDomain.SeedDomain_Standard,
  DeviceSessionSeedDomain.SeedDomain_Cardano,
];

const buildDeviceSessionSeedDomains = (deriveCardano?: boolean): DeviceSessionSeedDomain[] =>
  deriveCardano === true ? CARDANO_SEED_DOMAINS : STANDARD_SEED_DOMAINS;

const deviceSessionHasCardano = (message: { seed_domains?: DeviceSessionSeedDomain[] }) =>
  Array.isArray(message.seed_domains) &&
  message.seed_domains.includes(DeviceSessionSeedDomain.SeedDomain_Cardano);

// AskPassphrase.seed_domains selects which seeds to generate. DeviceSessionGet
// only resumes or reads the current session; firmware rejects unknown Get
// fields, including leftover seed_domains.
const buildDeviceSessionGetRequest = ({
  sessionId,
  expectedPassphraseState,
}: {
  sessionId?: string;
  expectedPassphraseState?: string;
} = {}): DeviceSessionGet => ({
  ...(sessionId ? { session_id: sessionId } : {}),
  ...(expectedPassphraseState ? { btc_test_address: expectedPassphraseState } : {}),
});

const askDevicePassphrase = async (
  device: Device,
  requestPayload: Omit<DeviceSessionAskPassphrase, 'seed_domains'>,
  deriveCardano?: boolean,
  onStatusRefreshed?: () => void
) => {
  await device.commands.typedCall('DeviceSessionAskPassphrase', 'Success', {
    ...requestPayload,
    seed_domains: buildDeviceSessionSeedDomains(deriveCardano),
  });
  await refreshProtocolV2DeviceStatus(device);
  onStatusRefreshed?.();
};

const selectDeviceSession = async (
  device: Device,
  expectedPassphraseState?: string,
  deriveCardano?: boolean,
  onStatusRefreshed?: () => void
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
    onStatusRefreshed?.();
    const attachPinSession = await getDeviceSession(device, buildDeviceSessionGetRequest());
    return Object.assign(attachPinSession, { viaAttachPin: true as const });
  }

  if (hasHostPassphrase) {
    await askDevicePassphrase(
      device,
      {
        passphrase: hostPassphrase,
        on_device: false,
      },
      deriveCardano,
      onStatusRefreshed
    );
    return getDeviceSession(device, buildDeviceSessionGetRequest());
  }

  const passphraseOnDeviceInteraction = device.createProtocolV2UiPhaseMetadata?.(
    'passphrase-on-device',
    'start'
  );
  device.emit(DEVICE.PASSPHRASE_ON_DEVICE, device, {
    ...metadata,
    ...(passphraseOnDeviceInteraction ? { interaction: passphraseOnDeviceInteraction } : {}),
  });
  await askDevicePassphrase(device, { on_device: true }, deriveCardano, onStatusRefreshed);
  return getDeviceSession(device, buildDeviceSessionGetRequest());
};

export async function getProtocolV2WalletSession(
  device: Device,
  options?: {
    forceWalletSelection?: boolean;
    /** @deprecated 兼容旧 getPassphraseState；新流程使用 forceWalletSelection。 */
    initSession?: boolean;
    expectedPassphraseState?: string;
    onlyMainPin?: boolean;
    /** 业务安全校验遇到 Attach PIN 上下文时直接拒绝，不主动切换钱包。 */
    rejectAttachPinForMainWallet?: boolean;
    selectMainWalletBeforeRestore?: boolean;
    resumeOnly?: boolean;
    deriveCardano?: boolean;
    /** Read the wallet already selected by Attach PIN without reopening wallet selection. */
    readCurrentAttachPinSession?: boolean;
    /** The current call already selected the Main PIN during its unlock preflight. */
    mainPinSelected?: boolean;
  }
) {
  const forceWalletSelection =
    options?.forceWalletSelection === true || options?.initSession === true;
  const readCurrentAttachPinSession = options?.readCurrentAttachPinSession === true;
  const sessionIsAttachPinWallet = (session?: { viaAttachPin?: boolean }) =>
    readCurrentAttachPinSession ||
    session?.viaAttachPin === true ||
    device.features?.unlockedAttachPin === true;

  if (forceWalletSelection) {
    if (options.onlyMainPin) {
      device.clearStandardInternalState?.();
    } else {
      device.clearInternalState();
    }
    device.passphraseState = undefined;
  }

  await negotiateEventlessWalletSession(device);

  if (options?.onlyMainPin || readCurrentAttachPinSession) {
    device.passphraseState = undefined;
  }
  let expectedPassphraseState =
    options?.onlyMainPin || readCurrentAttachPinSession
      ? undefined
      : options?.expectedPassphraseState ?? device.passphraseState;

  const cachedStandardSession = options?.onlyMainPin
    ? device.getStandardInternalState?.()
    : undefined;
  const cachedSessionId =
    !options?.onlyMainPin &&
    !readCurrentAttachPinSession &&
    typeof device.getInternalState === 'function'
      ? device.getInternalState()
      : undefined;
  let response;
  let resumed = false;
  let walletStatusRefreshed = false;
  const markWalletStatusRefreshed = () => {
    walletStatusRefreshed = true;
  };
  let mainPinAuthenticated =
    options?.mainPinSelected === true ||
    (options?.onlyMainPin === true &&
      device.features?.unlocked === true &&
      device.features?.unlockedAttachPin === false);
  let standardWalletSelected = options?.mainPinSelected === true;

  const clearCurrentWalletSession = () => {
    if (options?.onlyMainPin) {
      device.clearStandardInternalState?.();
    } else {
      device.clearInternalState();
    }
  };

  const rejectMismatchedAttachPinWallet = async () => {
    const features = await refreshProtocolV2DeviceStatus(device);
    markWalletStatusRefreshed();
    if (features.unlockedAttachPin !== true) {
      return;
    }

    try {
      await device.lockDevice();
    } catch {
      // Reject the mismatched Attach PIN wallet even when older firmware cannot lock.
    }
    if (options?.rejectAttachPinForMainWallet) {
      device.clearStandardInternalState?.();
      device.clearInternalState();
    } else {
      clearCurrentWalletSession();
    }
    throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError);
  };

  if (options?.onlyMainPin && options.rejectAttachPinForMainWallet) {
    await rejectMismatchedAttachPinWallet();
  }

  const selectMainPin = async (force = false) => {
    if (force || !mainPinAuthenticated) {
      await device.unlockDevice(DeviceSessionPinType.Main, {
        source: 'wallet-session-coordinator',
        reason: expectedPassphraseState ? 'session-recovery' : 'open-wallet',
        deviceOnly: true,
      });
      markWalletStatusRefreshed();
      mainPinAuthenticated = true;
      standardWalletSelected = true;
    }
  };

  const selectStandardWallet = async () => {
    if (device.features?.passphraseProtection === true) {
      // Main PIN authenticates the device; an empty host passphrase selects the standard derivation.
      await selectMainPin();
      await askDevicePassphrase(
        device,
        {
          passphrase: '',
          on_device: false,
        },
        options?.deriveCardano,
        markWalletStatusRefreshed
      );
      standardWalletSelected = true;
    } else if (!standardWalletSelected) {
      // Without passphrase protection there is no empty-passphrase selector.
      // Main PIN selection is the only authoritative switch back to the standard wallet.
      await selectMainPin(true);
    }
  };

  if (readCurrentAttachPinSession) {
    const status = await requestProtocolV2DeviceStatus(device);
    device.updateProtocolV2Status(status);
    markWalletStatusRefreshed();
    if (
      status.unlocked !== true ||
      status.passphrase_enabled !== true ||
      status.unlocked_by_attach_to_pin !== true
    ) {
      device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError);
    }
    response = await getDeviceSession(device, buildDeviceSessionGetRequest());
  } else if (options?.onlyMainPin) {
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
      response = await getDeviceSession(device, buildDeviceSessionGetRequest());
    }
  } else if (cachedSessionId && expectedPassphraseState) {
    try {
      response = await getDeviceSession(
        device,
        buildDeviceSessionGetRequest({
          sessionId: cachedSessionId,
          expectedPassphraseState,
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
    response = await selectDeviceSession(
      device,
      expectedPassphraseState,
      options?.deriveCardano,
      markWalletStatusRefreshed
    );
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
      response = await getDeviceSession(device, buildDeviceSessionGetRequest());
    } else {
      device.clearInternalState();
      response = await selectDeviceSession(
        device,
        expectedPassphraseState,
        options?.deriveCardano,
        markWalletStatusRefreshed
      );
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

  // DeviceSession.seed_domains reports what the SE already generated. Get
  // cannot add Cardano, so a passphrase wallet must Ask again. Attach PIN
  // has no passphrase; never send DeviceSessionAskPassphrase for it.
  if (options?.deriveCardano === true && !deviceSessionHasCardano(message)) {
    if (options?.resumeOnly || sessionIsAttachPinWallet(response)) {
      clearCurrentWalletSession();
      throw ERRORS.TypedError(HardwareErrorCode.WalletSessionInvalid);
    }
    resumed = false;
    if (options?.onlyMainPin) {
      await selectStandardWallet();
      response = await getDeviceSession(device, buildDeviceSessionGetRequest());
    } else {
      response = await selectDeviceSession(
        device,
        expectedPassphraseState,
        true,
        markWalletStatusRefreshed
      );
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

  let unlockedAttachPin: boolean | undefined;
  if (readCurrentAttachPinSession) {
    unlockedAttachPin = true;
  } else if (mainPinAuthenticated) {
    unlockedAttachPin = false;
  }

  return {
    passphraseState: message.btc_test_address,
    newSession: message.session_id,
    unlockedAttachPin,
    resumed,
    walletStatusRefreshed,
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
