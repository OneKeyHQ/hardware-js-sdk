import { LoggerNames, getLogger } from '../../utils';
import { isDeviceLockedError } from './lockedError';
import { isProtocolV2InteractionEnabled, resolveProtocolV2DeviceInteraction } from './interaction';
import { restoreProtocolV2WalletSession } from './walletSession';

import type { BaseMethod } from '../../api/BaseMethod';
import type { Device } from '../../device/Device';
import type { ProtocolV2UiInteractionCoordinator } from './uiInteraction';

const Log = getLogger(LoggerNames.Core);

type LifecycleMethod = Pick<
  BaseMethod,
  | 'run'
  | 'unlockPolicy'
  | 'protocolV2Interaction'
  | 'protocolV2InteractionMode'
  | 'params'
  | 'payload'
  | 'useDevicePassphraseState'
> &
  Partial<Pick<BaseMethod, 'validateForDevice'>> & { name?: string };
type UiInteractionCoordinator = Pick<
  ProtocolV2UiInteractionCoordinator,
  'enterMethodInteraction' | 'enterUnlockInteraction' | 'resumeMethodInteraction'
>;

const restoreExpectedWalletSessionAfterUnlock = async (method: LifecycleMethod, device: Device) => {
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

export async function runMethodWithProtocolV2Lifecycle(
  method: LifecycleMethod,
  device: Device,
  uiCoordinator?: UiInteractionCoordinator
) {
  method.validateForDevice?.(device);

  const shouldCoordinateInteraction = isProtocolV2InteractionEnabled(method);
  const shouldUnlockBeforeRun =
    device.isProtocolV2() && method.unlockPolicy !== 'none' && device.features?.unlocked === false;

  if (shouldUnlockBeforeRun) {
    if (shouldCoordinateInteraction) {
      uiCoordinator?.enterUnlockInteraction(method.name);
    }
    await device.unlockDevice();
    Log.debug('Protocol V2 pre-unlock completed', { method: method.name });
    await restoreExpectedWalletSessionAfterUnlock(method, device);
    if (shouldCoordinateInteraction) {
      uiCoordinator?.enterMethodInteraction(resolveProtocolV2DeviceInteraction(method));
    }
    return method.run();
  }

  if (shouldCoordinateInteraction) {
    uiCoordinator?.enterMethodInteraction(resolveProtocolV2DeviceInteraction(method));
  }
  try {
    return await method.run();
  } catch (error) {
    if (
      !device.isProtocolV2() ||
      method.unlockPolicy !== 'retry-on-locked' ||
      !isDeviceLockedError(error)
    ) {
      throw error;
    }

    Log.debug('Protocol V2 unlock retry triggered', { method: method.name });
    if (shouldCoordinateInteraction) {
      uiCoordinator?.enterUnlockInteraction(method.name);
    }
    await device.unlockDevice();
    Log.debug('Protocol V2 unlock completed', { method: method.name });
    await restoreExpectedWalletSessionAfterUnlock(method, device);
    if (shouldCoordinateInteraction) {
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
