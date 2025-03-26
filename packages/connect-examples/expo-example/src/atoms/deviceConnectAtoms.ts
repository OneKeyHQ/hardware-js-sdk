import { atom } from 'jotai';

// Connection type atom: 'bridge' | 'webusb'
export type ConnectionType = 'bridge' | 'webusb';

// Create an atom to store the connection type
export const connectionTypeAtom = atom<ConnectionType>('bridge');
