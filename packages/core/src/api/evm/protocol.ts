import TransportManager from '../../data-manager/TransportManager';

import type { Device } from '../../device/Device';

export const shouldUseLegacyV1EvmMessages = (device: Pick<Device, 'isProtocolV2'>): boolean =>
  !device.isProtocolV2() && TransportManager.getProtocolV1MessageSchema() === 'v1LegacySchema';
