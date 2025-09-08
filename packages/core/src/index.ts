import { inject, InjectApi, executeCallback, cleanupCallback } from './inject';
import { lowLevelInject, LowLevelInjectApi, LowLevelCoreApi } from './lowLevelInject';
import { topLevelInject } from './topLevelInject';
import { CoreApi } from './types/api';

export type { LowLevelCoreApi, LowLevelInjectApi } from './lowLevelInject';
export type { TopLevelInjectApi } from './topLevelInject';

export { default as Core, init as initCore, switchTransport } from './core';

export * from './constants';
export * from './utils';
export * from './data-manager';
export * from './events';
export * from './types';
export { whitelist, whitelistExtension } from './data/config';
export { executeCallback, cleanupCallback };

const HardwareSdk = ({
  init,
  call,
  dispose,
  eventEmitter,
  uiResponse,
  cancel,
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
    updateSettings,
    switchTransport,
  });

const HardwareTopLevelSdk = (): CoreApi => topLevelInject();

export { HardwareTopLevelSdk, HardwareSDKLowLevel };

export default HardwareSdk;
