import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { Device } from '../../device/Device';

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

export async function requestProtocolV2DeviceStatus(device: Device) {
  const { message } = await device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
  return message;
}

export async function refreshProtocolV2DeviceStatus(device: Device) {
  const status = await requestProtocolV2DeviceStatus(device);
  return device.updateProtocolV2Status(status);
}

export async function getProtocolV2WalletSession(
  device: Device,
  options?: { initSession?: boolean; expectedPassphraseState?: string }
) {
  if (device.features?.unlocked === false) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device is locked');
  }

  if (options?.initSession) {
    device.clearInternalState();
  }

  const cachedSessionId =
    typeof device.getInternalState === 'function' ? device.getInternalState() : undefined;

  try {
    const requestDeviceSession = (sessionId?: string) =>
      device.commands.typedCall(
        'DeviceSessionGet',
        'DeviceSession',
        sessionId ? { session_id: sessionId } : {}
      );

    const { message } = await requestDeviceSession(cachedSessionId).catch(async error => {
      if (!cachedSessionId || !isProtocolV2InvalidSessionError(error)) {
        throw error;
      }
      device.clearInternalState();
      return requestDeviceSession();
    });

    if (
      options?.expectedPassphraseState &&
      options.expectedPassphraseState !== message.btc_test_address
    ) {
      device.clearInternalState();
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError);
    }

    if (message.btc_test_address && device.getCurrentPassphraseProtection() !== true) {
      await refreshProtocolV2DeviceStatus(device);
    }

    device.updateInternalState(
      (device.getCurrentPassphraseProtection() ?? false) || Boolean(message.btc_test_address),
      message.btc_test_address,
      device.getCurrentDeviceId(),
      message.session_id,
      options?.initSession ? null : device.features?.sessionId
    );

    return {
      passphraseState: message.btc_test_address,
      newSession: message.session_id,
      unlockedAttachPin: device.features?.unlockedAttachPin ?? undefined,
    };
  } catch (error) {
    if (isProtocolV2InvalidSessionError(error)) {
      device.clearInternalState();
    }
    throw error;
  }
}
