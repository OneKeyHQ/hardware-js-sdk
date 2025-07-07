import { atomWithStorage } from 'jotai/utils';

// Connection type atom: 'bridge' | 'webusb' | 'emulator'
export type ConnectionType = 'bridge' | 'webusb' | 'emulator';

export const connectionTypeAtom = atomWithStorage<ConnectionType>(
  'onekey-connectionType',
  'bridge'
);
