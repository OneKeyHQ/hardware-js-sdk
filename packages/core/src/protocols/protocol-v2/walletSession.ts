import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { assertCompleteDeviceSession } from './deviceSession';
import { isDeviceLockedError } from './lockedError';

import type { DeviceSessionGet } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';

export async function requestProtocolV2DeviceStatus(device: Device) {
  const { message } = await device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
  return message;
}

export async function refreshProtocolV2DeviceStatus(device: Device) {
  const status = await requestProtocolV2DeviceStatus(device);
  return device.updateProtocolV2Status(status);
}

const getDeviceSession = async (device: Device, request: DeviceSessionGet) => {
  try {
    return await device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);
  } catch (error) {
    if (!isDeviceLockedError(error)) {
      throw error;
    }
    await device.unlockDevice();
    return device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);
  }
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

  const expectedPassphraseState = options?.expectedPassphraseState ?? device.passphraseState;

  // Unlock with PIN first. DeviceSessionGet operates on the wallet selected by
  // the device unlock flow; Protocol V2 does not accept a host passphrase here.
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
  let resumed = false;

  if (cachedSessionId && expectedPassphraseState) {
    try {
      response = await getDeviceSession(device, { session_id: cachedSessionId });
      resumed = true;
    } catch (error) {
      device.clearInternalState();
      throw error;
    }
  }

  if (!response) {
    response = await getDeviceSession(device, {});
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
