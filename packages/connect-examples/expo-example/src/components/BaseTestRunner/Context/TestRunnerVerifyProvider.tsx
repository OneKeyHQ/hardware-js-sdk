import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { VerifyState } from '../types';

export type ItemVerifyState = { verify: VerifyState; error?: string; ext?: any };

export const itemVerifyStateAtom = atom<{ [key: string]: ItemVerifyState }>({});

const GLOBAL_NONE_STATE: ItemVerifyState = { verify: 'none', error: undefined };
export const selectedItemVerifyStateAtom = (key: string) =>
  selectAtom(itemVerifyStateAtom, states => states[key] || GLOBAL_NONE_STATE);

export const clearItemVerifyStateAtom = atom(null, (get, set) => {
  const currentState = get(itemVerifyStateAtom);
  const newState = Object.keys(currentState).reduce((acc, key) => {
    acc[key] = GLOBAL_NONE_STATE;
    return acc;
  }, {} as { [key: string]: ItemVerifyState });
  set(itemVerifyStateAtom, newState);
});

export const setItemVerifyStateAtom = atom(
  null,
  (get, set, { key, newState }: { key: string; newState: ItemVerifyState }) => {
    set(itemVerifyStateAtom, prev => ({
      ...prev,
      [key]: newState,
    }));
  }
);
