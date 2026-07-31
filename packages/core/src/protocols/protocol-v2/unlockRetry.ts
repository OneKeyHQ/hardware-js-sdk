import { LoggerNames, getLogger } from '../../utils';
import { isDeviceLockedError } from './lockedError';
import { isProtocolV2UiEnabled, resolveProtocolV2UiInteraction } from './uiInteraction';
import { refreshProtocolV2DeviceStatus, restoreProtocolV2WalletSession } from './walletSession';

import type { BaseMethod } from '../../api/BaseMethod';
import type { Device } from '../../device/Device';
import type { ProtocolV2UiInteractionCoordinator } from './uiInteraction';

const Log = getLogger(LoggerNames.Core);

type RunnableMethod = Pick<
  BaseMethod,
  | 'run'
  | 'unlockPolicy'
  | 'protocolV2UiInteraction'
  | 'protocolV2UiMode'
  | 'params'
  | 'payload'
  | 'useDevicePassphraseState'
> & { name?: string };
type UiInteractionCoordinator = Pick<
  ProtocolV2UiInteractionCoordinator,
  'enterMethodInteraction' | 'enterUnlockInteraction' | 'resumeMethodInteraction'
>;

const restoreExpectedWalletSessionAfterUnlock = async (method: RunnableMethod, device: Device) => {
  const expectedPassphraseState = method.payload?.useEmptyPassphrase
    ? undefined
    : method.payload?.passphraseState ?? device.passphraseState;
  if (
    !method.useDevicePassphraseState ||
    typeof expectedPassphraseState !== 'string' ||
    expectedPassphraseState.length === 0
  ) {
    return;
  }

  await restoreProtocolV2WalletSession(device, expectedPassphraseState);
  Log.debug('Protocol V2 wallet session restored after unlock', { method: method.name });
};

export async function runMethodWithUnlockRetry(
  method: RunnableMethod,
  device: Device,
  uiCoordinator?: UiInteractionCoordinator
) {
  const shouldEmitUi = isProtocolV2UiEnabled(method);
  const isProtocolV2 = device.isProtocolV2();
  const requiresFreshStatus =
    isProtocolV2 &&
    method.unlockPolicy === 'unlock-before-run' &&
    !device.isBootloader?.() &&
    !device.isRomloader?.();

  if (requiresFreshStatus) {
    await refreshProtocolV2DeviceStatus(device);
  }

  const shouldUnlockBeforeRun =
    isProtocolV2 &&
    method.unlockPolicy !== 'none' &&
    !device.isBootloader?.() &&
    !device.isRomloader?.() &&
    device.features?.unlocked === false;

  if (shouldUnlockBeforeRun) {
    if (shouldEmitUi) {
      uiCoordinator?.enterUnlockInteraction(method.name);
    }
    await device.unlockDevice();
    Log.debug('Protocol V2 pre-unlock completed', { method: method.name });
    await restoreExpectedWalletSessionAfterUnlock(method, device);
    if (shouldEmitUi) {
      uiCoordinator?.enterMethodInteraction(resolveProtocolV2UiInteraction(method));
    }
    return method.run();
  }

  if (shouldEmitUi) {
    uiCoordinator?.enterMethodInteraction(resolveProtocolV2UiInteraction(method));
  }
  try {
    return await method.run();
  } catch (error) {
    if (!isProtocolV2 || method.unlockPolicy !== 'retry-on-locked' || !isDeviceLockedError(error)) {
      throw error;
    }

    Log.debug('Protocol V2 unlock retry triggered', { method: method.name });
    if (shouldEmitUi) {
      uiCoordinator?.enterUnlockInteraction(method.name);
    }
    await device.unlockDevice();
    Log.debug('Protocol V2 unlock completed', { method: method.name });
    await restoreExpectedWalletSessionAfterUnlock(method, device);
    if (shouldEmitUi) {
      uiCoordinator?.resumeMethodInteraction();
    }
    try {
      const response = await method.run();
      Log.debug('Protocol V2 method retry completed', { method: method.name, success: true });
      return response;
    } catch (retryError) {
      Log.debug('Protocol V2 method retry completed', { method: method.name, success: false });
      throw retryError;
    }
  }
}
