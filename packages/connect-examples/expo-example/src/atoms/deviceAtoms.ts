import { atom } from 'jotai';
import type { Device } from '../components/DeviceList';

export const selectDeviceAtom = atom<Device | null | undefined>(null);

export const deviceListAtom = atom<Device[]>([]);

export const deviceActionsAtom = atom(
  null,
  (
    get,
    set,
    action: { type: 'select' | 'clear' | 'setList'; payload?: Device | Device[] | undefined | null }
  ) => {
    switch (action.type) {
      case 'select':
        set(selectDeviceAtom, action.payload as Device | null | undefined);
        break;
      case 'clear':
        set(selectDeviceAtom, null);
        break;
      case 'setList':
        set(deviceListAtom, (action.payload as Device[]) || []);
        break;
      default:
        break;
    }
  }
);
