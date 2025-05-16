import { atomWithStorage } from 'jotai/utils';

// Connection type atom: 'bridge' | 'webusb'
export type ConnectionType = 'bridge' | 'webusb';

export const connectionTypeAtom = atomWithStorage<ConnectionType>(
  'onekey-connectionType',
  'bridge'
);
