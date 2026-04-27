import { atom } from 'jotai';

export type ConnectionType =
  | 'bridge'
  | 'webusb'
  | 'emulator'
  | 'desktop-web-ble'
  | 'desktop-web-ble-pro2';

// Use plain atom - persistence will be handled manually
export const connectionTypeAtom = atom<ConnectionType>('bridge');
