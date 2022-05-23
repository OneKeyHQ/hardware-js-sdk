import type { PROTO } from '../constants';

export type Features = PROTO.Features;

export type DeviceType = 'mini' | 'classic';

export type DeviceFirmwareStatus = 'valid' | 'outdated' | 'required' | 'unknown' | 'none';
