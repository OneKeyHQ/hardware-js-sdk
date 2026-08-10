import type { BaseMethod } from '../api/BaseMethod';

type CoreMethodDescriptor = Pick<BaseMethod, 'name' | 'payload'>;

/**
 * TEMPORARY COMPATIBILITY: Legacy ProtocolInfo is accepted only by the
 * firmware recovery entry points used before and during Protocol V2 updates.
 */
export const isLegacyProtocolV2FirmwareRecoveryMethod = (method?: CoreMethodDescriptor): boolean =>
  method?.name === 'firmwareUpdateV4' ||
  method?.name === 'checkAllFirmwareRelease' ||
  (method?.name === 'getDeviceState' && method.payload.scope === 'firmware');
