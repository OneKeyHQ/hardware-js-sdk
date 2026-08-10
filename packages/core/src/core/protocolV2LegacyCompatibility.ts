import type { BaseMethod } from '../api/BaseMethod';

type CoreMethodDescriptor = Pick<BaseMethod, 'name' | 'payload'>;

const FACTORY_PROVISIONING_METHODS = new Set<string>([
  'deviceReadFactoryInfo',
  'deviceProvisionFactoryInfo',
  'deviceReadFactoryCertificate',
  'deviceWriteFactoryCertificate',
  'deviceSignFactoryChallenge',
]);

const isBootloaderReboot = (method: CoreMethodDescriptor) => {
  if (method.name !== 'deviceReboot') return false;
  const rebootType = method.payload.reboot_type ?? method.payload.rebootType;
  return (
    rebootType === 'bootloader' ||
    rebootType === 'Bootloader' ||
    rebootType === 2 ||
    rebootType === '2'
  );
};

/**
 * TEMPORARY COMPATIBILITY: Legacy ProtocolInfo is accepted only by the
 * firmware recovery and factory provisioning entry points that support old builds.
 */
export const isLegacyProtocolV2CompatibilityMethod = (method?: CoreMethodDescriptor): boolean =>
  method?.name === 'firmwareUpdateV4' ||
  method?.name === 'checkAllFirmwareRelease' ||
  (method?.name === 'getDeviceState' && method.payload.scope === 'firmware') ||
  (method ? isBootloaderReboot(method) : false) ||
  (method ? FACTORY_PROVISIONING_METHODS.has(method.name) : false);
