import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DEVICE } from '../../events';
import { assertCompleteDeviceSession } from './deviceSession';
import { isDeviceLockedError } from './lockedError';

import type { DeviceSessionOpen } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';

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

const selectDeviceSession = async (device: Device) => {
  const existsAttachPinUser = device.features?.attachToPinEnabled === true;
  const metadata = {
    source: 'wallet-session-coordinator' as const,
    reason: 'open-wallet' as const,
  };
  const response = await device.commands.promptPassphrase(
    { existsAttachPinUser, ...metadata },
    { cancelDeviceOnReject: false }
  );
  const hostPassphrase =
    typeof response.passphrase === 'string' ? response.passphrase.normalize('NFKD') : undefined;
  const selections = [
    !!hostPassphrase,
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
    return openDeviceSession(device, { select: { attach_pin_on_device: {} } });
  }

  if (response.passphraseOnDevice) {
    device.emit(DEVICE.PASSPHRASE_ON_DEVICE, device, metadata);
    return openDeviceSession(device, { select: { passphrase_on_device: {} } });
  }

  return openDeviceSession(device, {
    select: { host_passphrase: { passphrase: hostPassphrase as string } },
  });
};

export async function getProtocolV2WalletSession(
  device: Device,
  options?: {
    initSession?: boolean;
    expectedPassphraseState?: string;
    onlyMainPin?: boolean;
  }
) {
  if (options?.initSession) {
    device.clearInternalState();
  }

  await negotiateEventlessWalletSession(device);

  if (options?.onlyMainPin) {
    device.passphraseState = undefined;
  }
  const expectedPassphraseState = options?.onlyMainPin
    ? undefined
    : options?.expectedPassphraseState ?? device.passphraseState;

  if (device.features?.unlocked === false) {
    await device.unlockDevice();
  }

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
  let resumed = false;

  if (cachedSessionId && expectedPassphraseState) {
    try {
      response = await openDeviceSession(device, { resume: { session_id: cachedSessionId } });
      resumed = true;
    } catch (error) {
      device.clearInternalState();
      throw error;
    }
  }

  if (!response) {
    response = await selectDeviceSession(device);
  }

  const { message } = response;
  try {
    assertCompleteDeviceSession(message);
  } catch (error) {
    device.clearInternalState();
    throw error;
  }
  if (expectedPassphraseState && expectedPassphraseState !== message.btc_test_address) {
    device.clearInternalState();
    throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
  }

  device.updateInternalState(
    true,
    message.btc_test_address,
    device.getCurrentDeviceId(),
    message.session_id,
    options?.initSession ? null : cachedSessionId ?? null
  );

  return {
    passphraseState: message.btc_test_address,
    newSession: message.session_id,
    unlockedAttachPin: device.features?.unlockedAttachPin ?? undefined,
    resumed,
  };
}
