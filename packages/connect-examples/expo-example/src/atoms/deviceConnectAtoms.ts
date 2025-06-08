import { atomWithStorage } from 'jotai/utils';

// Connection type atom: 'bridge' | 'webusb' | 'emulator' | 'desktop-web-ble'
export type ConnectionType = 'bridge' | 'webusb' | 'emulator' | 'desktop-web-ble';

export const connectionTypeAtom = atomWithStorage<ConnectionType>(
  'onekey-connectionType',
  'bridge'
);
