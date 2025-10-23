import { atom } from 'jotai';

export type ConnectionType = 'bridge' | 'webusb' | 'emulator' | 'desktop-web-ble';

// Use plain atom - persistence will be handled manually
export const connectionTypeAtom = atom<ConnectionType>('bridge');
