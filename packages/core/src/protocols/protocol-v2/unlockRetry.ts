import { LoggerNames, getLogger } from '../../utils';
import { isDeviceLockedError } from './lockedError';
import { isProtocolV2UiEnabled } from './uiInteraction';

import type { BaseMethod } from '../../api/BaseMethod';
import type { Device } from '../../device/Device';
import type { ProtocolV2UiInteractionCoordinator } from './uiInteraction';

const Log = getLogger(LoggerNames.Core);

type RunnableMethod = Pick<
  BaseMethod,
  'run' | 'unlockPolicy' | 'protocolV2UiInteraction' | 'protocolV2UiMode'
> & { name?: string };
type UnlockableDevice = Pick<Device, 'isProtocolV2' | 'unlockDevice'>;
type UiInteractionCoordinator = Pick<
  ProtocolV2UiInteractionCoordinator,
  'enterMethodInteraction' | 'enterUnlockInteraction' | 'resumeMethodInteraction'
>;

export async function runMethodWithUnlockRetry(
  method: RunnableMethod,
  device: UnlockableDevice,
  uiCoordinator?: UiInteractionCoordinator
) {
  const shouldEmitUi = isProtocolV2UiEnabled(method);
  if (shouldEmitUi) {
    uiCoordinator?.enterMethodInteraction(method.protocolV2UiInteraction);
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
    if (shouldEmitUi) {
      uiCoordinator?.enterUnlockInteraction(method.name);
    }
    await device.unlockDevice();
    Log.debug('Protocol V2 unlock completed', { method: method.name });
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
