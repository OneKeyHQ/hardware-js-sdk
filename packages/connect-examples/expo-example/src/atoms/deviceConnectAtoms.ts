import { atom } from 'jotai';

// Connection type atom: 'bridge' | 'webusb' | 'emulator' | 'desktop-web-ble'
export type ConnectionType = 'bridge' | 'webusb' | 'emulator' | 'desktop-web-ble';

// Use plain atom - persistence will be handled manually
export const connectionTypeAtom = atom<ConnectionType>('bridge');
