import { cleanupCallback, executeCallback, inject } from './inject';
import { lowLevelInject } from './lowLevelInject';
import { topLevelInject } from './topLevelInject';

import type { LowLevelCoreApi, LowLevelInjectApi } from './lowLevelInject';
import type { InjectApi } from './inject';
import type { CoreApi } from './types/api';

export type { LowLevelCoreApi, LowLevelInjectApi } from './lowLevelInject';
export type { TopLevelInjectApi } from './topLevelInject';

export { default as Core, init as initCore, switchTransport } from './core';

export * from './constants';
export * from './utils';
export * from './data-manager';
export * from './events';
export * from './firmware-update';
export * from './types';
export { whitelist, whitelistExtension } from './data/config';
export { executeCallback, cleanupCallback };
export { preloadSessionCache } from './device/Device';

const HardwareSdk = ({
  init,
  call,
  dispose,
  eventEmitter,
  uiResponse,
  cancel,
  cancelOperation,
  updateSettings,
  switchTransport,
}: InjectApi): CoreApi =>
  inject({
    init,
    call,
    dispose,
    eventEmitter,
    uiResponse,
    cancel,
    cancelOperation,
    updateSettings,
    switchTransport,
  });

const HardwareSDKLowLevel = ({
  init,
  call,
  dispose,
  eventEmitter,
  addHardwareGlobalEventListener,
  uiResponse,
  cancel,
  cancelOperation,
  updateSettings,
  switchTransport,
}: LowLevelInjectApi): LowLevelCoreApi =>
  lowLevelInject({
    init,
    call,
    dispose,
    eventEmitter,
    addHardwareGlobalEventListener,
    uiResponse,
    cancel,
    cancelOperation,
    updateSettings,
    switchTransport,
  });

const HardwareTopLevelSdk = (): CoreApi => topLevelInject();

export { HardwareTopLevelSdk, HardwareSDKLowLevel };

export default HardwareSdk;
