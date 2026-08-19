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
  PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH,
  PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE,
  parseProtocolV2ResourcePackage,
  parseProtocolV2ResourcePackageHeader,
} from './protocols/protocol-v2/resources';
export type { ProtocolV2ResourcePackageHeader } from './protocols/protocol-v2/resources';
export { prepareFirmwareUpdateV4MemoryHost } from './api/firmware/FirmwareMemoryHost';
export type {
  FirmwareMemoryArtifact,
  FirmwareMemoryArtifactEntry,
  FirmwareUpdateV4MemoryHost,
} from './api/firmware/FirmwareMemoryHost';
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
