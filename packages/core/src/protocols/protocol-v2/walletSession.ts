import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { DEVICE } from '../../events';
import { assertCompleteDeviceSession } from './deviceSession';
import { isDeviceLockedError } from './lockedError';

import type { DeviceSessionGet } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';

const HOST_PASSPHRASE_MAX_BYTES = 50;

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

const negotiateEventlessWalletSession = async (device: Device) => {
  await device.commands.typedCall('ProtocolInfoRequest', 'ProtocolInfo', {
    eventless_wallet_session: true,
  });
};

const getDeviceSession = async (device: Device, request: DeviceSessionGet) => {
  try {
    return await device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);
  } catch (error) {
    if (!isDeviceLockedError(error) || !request.session_id) {
      throw error;
    }
    await device.unlockDevice(DeviceSessionPinType.Main);
    return device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);
  }
};

const askDevicePassphrase = async (device: Device, passphrase?: string) => {
  const request = () =>
    device.commands.typedCall(
      'DeviceSessionAskPassphrase',
      'Success',
      passphrase ? { passphrase, on_device: false } : { on_device: true }
    );
  try {
    await request();
  } catch (error) {
    if (!isDeviceLockedError(error)) {
      throw error;
    }
    await device.unlockDevice(DeviceSessionPinType.Main);
    await request();
  }
  await refreshProtocolV2DeviceStatus(device);
};

const selectDeviceSession = async (device: Device, expectedPassphraseState?: string) => {
  const existsAttachPinUser = device.features?.attachToPinEnabled === true;
  const metadata = {
    source: 'wallet-session-coordinator' as const,
    reason: expectedPassphraseState ? ('session-recovery' as const) : ('open-wallet' as const),
    ...(expectedPassphraseState ? { expectedPassphraseState } : {}),
  };
  const response = await device.commands.promptPassphrase(
    {
      existsAttachPinUser,
      deviceOnly: false,
      ...metadata,
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
    device.emit(DEVICE.ATTACH_PIN_ON_DEVICE, device, metadata);
    await device.unlockDevice(DeviceSessionPinType.AttachToPin);
    return getDeviceSession(device, {});
  }

  if (hasHostPassphrase) {
    await askDevicePassphrase(device, hostPassphrase);
    return getDeviceSession(device, {});
  }

  device.emit(DEVICE.PASSPHRASE_ON_DEVICE, device, metadata);
  await askDevicePassphrase(device);
  return getDeviceSession(device, {});
};

export async function getProtocolV2WalletSession(
  device: Device,
  options?: {
    initSession?: boolean;
    expectedPassphraseState?: string;
    onlyMainPin?: boolean;
    resumeOnly?: boolean;
  }
) {
  if (options?.initSession) {
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

  if (options?.onlyMainPin) {
    expectedPassphraseState = cachedStandardSession?.passphraseState;
    if (cachedStandardSession) {
      try {
        if (device.features?.unlockedAttachPin === true) {
          await device.unlockDevice(DeviceSessionPinType.Main);
        }
        response = await getDeviceSession(device, {
          session_id: cachedStandardSession.sessionId,
        });
        resumed = true;
      } catch (error) {
        device.clearStandardInternalState?.();
        throw error;
      }
    }

    if (!response) {
      await device.unlockDevice(DeviceSessionPinType.Main);
      response = await getDeviceSession(device, {});
    }
  } else if (cachedSessionId && expectedPassphraseState) {
    try {
      response = await getDeviceSession(device, { session_id: cachedSessionId });
      resumed = true;
    } catch (error) {
      device.clearInternalState();
      throw error;
    }
  }

  if (!response) {
    if (options?.resumeOnly) {
      device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.WalletSessionInvalid);
    }
    response = await selectDeviceSession(device, expectedPassphraseState);
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
    if (options?.onlyMainPin) {
      device.clearStandardInternalState?.();
      await device.unlockDevice(DeviceSessionPinType.Main);
      response = await getDeviceSession(device, {});
    } else {
      device.clearInternalState();
      response = await selectDeviceSession(device, expectedPassphraseState);
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
      if (options?.onlyMainPin) {
        device.clearStandardInternalState?.();
      } else {
        device.clearInternalState();
      }
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
    }
  }

  const internalStateArgs = [
    true,
    message.btc_test_address,
    device.getCurrentDeviceId(),
    message.session_id,
    options?.initSession ? null : cachedSessionId ?? null,
  ] as const;
  if (options?.onlyMainPin) {
    device.updateInternalState(...internalStateArgs, 'standard');
  } else {
    device.updateInternalState(...internalStateArgs);
  }

  return {
    passphraseState: message.btc_test_address,
    newSession: message.session_id,
    unlockedAttachPin: device.features?.unlockedAttachPin ?? undefined,
    resumed,
  };
}

export async function restoreProtocolV2WalletSession(
  device: Device,
  expectedPassphraseState: string
) {
  return getProtocolV2WalletSession(device, {
    expectedPassphraseState,
    resumeOnly: true,
  });
}
