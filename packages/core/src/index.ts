import { inject, InjectApi } from './inject';
import { lowLevelInject, LowLevelInjectApi, LowLevelCoreApi } from './lowLevelInject';
import { topLevelInject } from './topLevelInject';
import { CoreApi } from './types/api';

export type { LowLevelCoreApi, LowLevelInjectApi } from './lowLevelInject';
export type { TopLevelInjectApi } from './topLevelInject';

export { default as Core, init as initCore } from './core';

export * from './constants';
export * from './utils';
export * from './data-manager';
export * from './events';
export * from './types';
export { whitelist, whitelistExtension } from './data/config';

const HardwareSdk = ({
  init,
  call,
  dispose,
  eventEmitter,
  uiResponse,
  cancel,
  updateSettings,
}: InjectApi): CoreApi =>
  inject({
    init,
    call,
    dispose,
    eventEmitter,
    uiResponse,
    cancel,
    updateSettings,
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
  });

const HardwareTopLevelSdk = (): CoreApi => topLevelInject();

export { HardwareTopLevelSdk, HardwareSDKLowLevel };

export default HardwareSdk;
