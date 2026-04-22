export const DEVICE_EVENT = 'DEVICE_EVENT';

/** Events originating from the hardware device. */
export const DEVICE = {
  CONNECT: 'device-connect',
  DISCONNECT: 'device-disconnect',
  CHANGED: 'device-changed',
} as const;
