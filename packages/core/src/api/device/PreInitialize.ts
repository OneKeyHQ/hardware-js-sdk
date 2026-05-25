import { BaseMethod } from '../BaseMethod';
import { LoggerNames, getLogger } from '../../utils';

import type { InitOptions } from '../../device/Device';

// Core prefix (@onekey/hd-core) so the host app's LOG_EVENT bridge forwards
// this into the collected hardware log scope (like [PRE-INIT][HIT]/[MISS]).
const Log = getLogger(LoggerNames.Core);

const parseInitOptions = (payload?: {
  initSession?: boolean;
  passphraseState?: string;
  deviceId?: string;
  deriveCardano?: boolean;
}): InitOptions => ({
  initSession: payload?.initSession,
  passphraseState: payload?.passphraseState,
  deviceId: payload?.deviceId,
  deriveCardano: payload?.deriveCardano,
});

export default class PreInitialize extends BaseMethod {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    // Fire-and-forget warm-up signal (core dedups + hangs up for the next call)
    this.isPreWarmSignal = true;
  }

  async run() {
    try {
      await this.device.preInitialize(parseInitOptions(this.payload));
      if (this.device.hasDeviceAcquire()) {
        await this.device.release();
      }
      return true;
    } catch {
      this.device.clearPreInitialized();
      Log.debug('[PRE-INIT][FAILED]');
      return false;
    }
  }
}
