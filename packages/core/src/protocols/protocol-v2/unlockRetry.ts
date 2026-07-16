import { LoggerNames, getLogger } from '../../utils';
import { isDeviceLockedError } from './lockedError';

import type { BaseMethod } from '../../api/BaseMethod';
import type { Device } from '../../device/Device';

const Log = getLogger(LoggerNames.Core);

type RunnableMethod = Pick<BaseMethod, 'run' | 'unlockPolicy'> & { name?: string };
type UnlockableDevice = Pick<Device, 'isProtocolV2' | 'unlockDevice'>;

export async function runMethodWithUnlockRetry(method: RunnableMethod, device: UnlockableDevice) {
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
    await device.unlockDevice();
    Log.debug('Protocol V2 unlock completed', { method: method.name });
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
