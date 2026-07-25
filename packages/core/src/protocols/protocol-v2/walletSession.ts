import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DEVICE, type PassphraseRequestPayload } from '../../events';
import { isDeviceLockedError } from './lockedError';

import type { DeviceSessionOpen } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';
import type { PassphrasePromptResponse } from '../../device/DeviceCommands';

const getErrorText = (error: unknown) => {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return [record.code, record.errorCode, record.message, record.reason]
      .filter(value => value !== undefined && value !== null)
      .join(' ');
  }
  return String(error ?? '');
};

export const isProtocolV2InvalidSessionError = (error: unknown) =>
  getErrorText(error).toLowerCase().includes('failure_invalidsession');

const normalizeHostPassphrase = (passphrase: string | undefined) => {
  const normalized = (passphrase ?? '').normalize('NFKD');
  if (!normalized || normalized.includes('\0') || normalized.length > 50) {
    throw ERRORS.TypedError(
      HardwareErrorCode.CallMethodInvalidParameter,
      'Invalid hidden wallet passphrase.'
    );
  }
  return normalized;
};

export async function requestProtocolV2DeviceStatus(device: Device) {
  const { message } = await device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
  return message;
}

export async function refreshProtocolV2DeviceStatus(device: Device) {
  const status = await requestProtocolV2DeviceStatus(device);
  return device.updateProtocolV2Status(status);
}

const openDeviceSession = async (device: Device, request: DeviceSessionOpen) => {
  try {
    return await device.commands.typedCall('DeviceSessionOpen', 'DeviceSession', request);
  } catch (error) {
    if (!isDeviceLockedError(error)) {
      throw error;
    }
    await device.unlockDevice();
    return device.commands.typedCall('DeviceSessionOpen', 'DeviceSession', request);
  }
};

const createHiddenWalletRequest = (
  response: PassphrasePromptResponse
): {
  request: DeviceSessionOpen;
  deviceEvent?: typeof DEVICE.PASSPHRASE_ON_DEVICE | typeof DEVICE.ATTACH_PIN_ON_DEVICE;
} => {
  if (response.attachPinOnDevice) {
    return {
      request: {
        select: {
          attach_pin_on_device: {},
        },
      },
      deviceEvent: DEVICE.ATTACH_PIN_ON_DEVICE,
    };
  }

  if (response.passphraseOnDevice) {
    return {
      request: {
        select: {
          passphrase_on_device: {},
        },
      },
      deviceEvent: DEVICE.PASSPHRASE_ON_DEVICE,
    };
  }

  return {
    request: {
      select: {
        host_passphrase: { passphrase: normalizeHostPassphrase(response.passphrase) },
      },
    },
  };
};

const openSelectedHiddenWallet = async (
  device: Device,
  promptPayload: PassphraseRequestPayload
) => {
  const response = await device.commands.promptPassphrase(promptPayload, {
    cancelDeviceOnReject: false,
  });
  const { request, deviceEvent } = createHiddenWalletRequest(response);

  if (deviceEvent) {
    device.emit(deviceEvent, device, promptPayload);
  }

  return openDeviceSession(device, request);
};

export async function getProtocolV2WalletSession(
  device: Device,
  options?: {
    initSession?: boolean;
    expectedPassphraseState?: string;
    onlyMainPin?: boolean;
    recoverInvalidSession?: boolean;
  }
) {
  if (options?.initSession) {
    device.clearInternalState();
  }

  const expectedPassphraseState = options?.expectedPassphraseState ?? device.passphraseState;

  try {
    // Unlock with PIN first. Update only the confirmed unlocked field instead of
    // polling DeviceStatus implicitly to complete the snapshot.
    if (device.features?.unlocked === false) {
      await device.unlockDevice();
    }

    // A standard wallet needs no DeviceSession. After unlock confirms passphrase is
    // disabled, do not create or forward a hidden-wallet passphraseState.
    if (options?.onlyMainPin || device.getCurrentPassphraseProtection() === false) {
      return {
        passphraseState: undefined,
        newSession: undefined,
        unlockedAttachPin: device.features?.unlockedAttachPin ?? false,
        resumed: false,
      };
    }

    const cachedSessionId =
      typeof device.getInternalState === 'function' ? device.getInternalState() : undefined;
    let response;
    let recoveryFailed = false;
    let resumed = false;

    if (cachedSessionId && expectedPassphraseState) {
      try {
        response = await openDeviceSession(device, {
          resume: { session_id: cachedSessionId },
        });
        resumed = true;
      } catch (error) {
        if (!isProtocolV2InvalidSessionError(error)) {
          throw error;
        }
        device.clearInternalState();
        if (options?.recoverInvalidSession === false) {
          throw error;
        }
        recoveryFailed = true;
      }
    }

    if (!response) {
      const promptPayload: PassphraseRequestPayload = {
        source: 'wallet-session-coordinator',
        reason: recoveryFailed ? 'session-recovery' : 'open-wallet',
        expectedPassphraseState,
        existsAttachPinUser: device.features?.attachToPinEnabled === true,
      };
      response = await openSelectedHiddenWallet(device, promptPayload);
    }

    const { message } = response;
    if (expectedPassphraseState && expectedPassphraseState !== message.btc_test_address) {
      device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
    }

    device.updateInternalState(
      true,
      message.btc_test_address,
      device.getCurrentDeviceId(),
      message.session_id,
      options?.initSession ? null : device.features?.sessionId ?? null
    );

    return {
      passphraseState: message.btc_test_address,
      newSession: message.session_id,
      unlockedAttachPin: device.features?.unlockedAttachPin ?? undefined,
      resumed,
    };
  } catch (error) {
    if (isProtocolV2InvalidSessionError(error)) {
      device.clearInternalState();
    }
    throw error;
  }
}
