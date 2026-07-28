import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { DEVICE } from '../../events';
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

const negotiateEventlessWalletSession = async (device: Device) => {
  await device.commands.typedCall('ProtocolInfoRequest', 'ProtocolInfo', {
    eventless_wallet_session: true,
  });
};

const getDeviceSession = async (device: Device, request: DeviceSessionGet) => {
  try {
    return await device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);
  } catch (error) {
    if (!isDeviceLockedError(error)) {
      throw error;
    }
    await device.unlockDevice(DeviceSessionPinType.Main);
    return device.commands.typedCall('DeviceSessionGet', 'DeviceSession', request);
  }
};

const askDevicePassphrase = async (device: Device) => {
  const request = () =>
    device.commands.typedCall(
      'DeviceSessionAskPassphrase',
      'Success',
      {},
      {
        timeoutMs: 120_000,
      }
    );
  try {
    return await request();
  } catch (error) {
    if (!isDeviceLockedError(error)) {
      throw error;
    }
    await device.unlockDevice(DeviceSessionPinType.Main);
    return request();
  }
};

const selectDeviceSession = async (device: Device) => {
  const existsAttachPinUser = device.features?.attachToPinEnabled === true;
  const metadata = {
    source: 'wallet-session-coordinator' as const,
    reason: 'open-wallet' as const,
  };
  const response = await device.commands.promptPassphrase(
    { existsAttachPinUser, deviceOnly: true, ...metadata },
    { cancelDeviceOnReject: false }
  );
  const hasHostPassphrase =
    typeof response.passphrase === 'string' && response.passphrase.length > 0;
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

  // Protocol V2 no longer accepts host-provided passphrase text. A legacy host
  // response is treated only as the user's choice to continue on the device.
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
  }
) {
  if (options?.initSession) {
    device.clearInternalState();
    device.passphraseState = undefined;
  }

  await negotiateEventlessWalletSession(device);

  if (options?.onlyMainPin) {
    device.passphraseState = undefined;
  }
  const expectedPassphraseState = options?.onlyMainPin
    ? undefined
    : options?.expectedPassphraseState ?? device.passphraseState;

  if (device.features?.unlocked === false) {
    await device.unlockDevice(DeviceSessionPinType.Main);
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
      response = await getDeviceSession(device, { session_id: cachedSessionId });
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
