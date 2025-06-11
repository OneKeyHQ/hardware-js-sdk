import { atom } from 'jotai';

// Connection type atom: 'bridge' | 'webusb' | 'emulator'
export type ConnectionType = 'bridge' | 'webusb' | 'emulator';

// Create an atom to store the connection type
export const connectionTypeAtom = atom<ConnectionType>('bridge');
