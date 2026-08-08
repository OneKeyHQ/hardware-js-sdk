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
export * from './types';
export { whitelist, whitelistExtension } from './data/config';
export { executeCallback, cleanupCallback };
export { preloadSessionCache } from './device/Device';
export { projectFeatures as projectDeviceStateFeatures } from './device/DeviceStateProjector';
export { getMethodSupportedProtocols } from './api/utils';
export {
  parseProtocolV2ResourceManifest,
  prepareProtocolV2ResourceFiles,
  resolveProtocolV2ResourceManifestFileUrl,
  selectProtocolV2ResourceManifestFiles,
} from './protocols/protocol-v2/resources';
export {
  getFirmwareUpdateHostBindingGeneration,
  registerFirmwareUpdateHostBinding,
  unregisterFirmwareUpdateHostBinding,
} from './api/firmware/FirmwareHostBinding';

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
