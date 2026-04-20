export const DEVICE_EVENT = 'DEVICE_EVENT';

/** Events originating from the hardware device. */
export const DEVICE = {
  CONNECT: 'device-connect',
  DISCONNECT: 'device-disconnect',
  CHANGED: 'device-changed',
  ACQUIRE: 'device-acquire',
  RELEASE: 'device-release',
  FEATURES: 'features',
  SUPPORT_FEATURES: 'support_features',
} as const;
