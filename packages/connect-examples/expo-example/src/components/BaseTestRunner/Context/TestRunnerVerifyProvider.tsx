import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';

import type { TestCaseDataWithKey, VerifyState } from '../types';

export type ItemVerifyState<TExt = unknown> = { verify: VerifyState; error?: string; ext?: TExt };

// Create factory functions for isolated test instances
export function createTestRunnerAtoms<TCaseData = any, TExt = unknown>(instanceId: string) {
  const itemVerifyStateAtom = atom<{ [key: string]: ItemVerifyState<TExt> }>({});

  const GLOBAL_NONE_STATE: ItemVerifyState<TExt> = { verify: 'none', error: undefined };
  const selectedItemVerifyStateAtom = (key: string) =>
    selectAtom(itemVerifyStateAtom, states => states[key] || GLOBAL_NONE_STATE);

  const clearItemVerifyStateAtom = atom(null, (get, set) => {
    const currentState = get(itemVerifyStateAtom);
    const newState = Object.keys(currentState).reduce((acc, key) => {
      acc[key] = GLOBAL_NONE_STATE;
      return acc;
    }, {} as { [key: string]: ItemVerifyState<TExt> });
    set(itemVerifyStateAtom, newState);
  });

  const setItemVerifyStateAtom = atom(
    null,
    (get, set, { key, newState }: { key: string; newState: ItemVerifyState<TExt> }) => {
      set(itemVerifyStateAtom, prev => ({
        ...prev,
        [key]: newState,
      }));
    }
  );

  // 失败任务
  const failedTasksAtom = atom<TestCaseDataWithKey<TCaseData>[]>([]);
  const setFailedTasksAtom = atom(
    null,
    (get, set, failedTasks: TestCaseDataWithKey<TCaseData>[]) => {
      set(failedTasksAtom, failedTasks);
    }
  );

  const getFailedTasksAtom = atom(get => get(failedTasksAtom));

  return {
    itemVerifyStateAtom,
    selectedItemVerifyStateAtom,
    clearItemVerifyStateAtom,
    setItemVerifyStateAtom,
    failedTasksAtom,
    setFailedTasksAtom,
    getFailedTasksAtom,
  };
}

// Default global atoms for backward compatibility
export const itemVerifyStateAtom = atom<{ [key: string]: ItemVerifyState<unknown> }>({});

const GLOBAL_NONE_STATE: ItemVerifyState<unknown> = { verify: 'none', error: undefined };
export const selectedItemVerifyStateAtom = (key: string) =>
  selectAtom(itemVerifyStateAtom, states => states[key] || GLOBAL_NONE_STATE);

export const clearItemVerifyStateAtom = atom(null, (get, set) => {
  const currentState = get(itemVerifyStateAtom);
  const newState = Object.keys(currentState).reduce((acc, key) => {
    acc[key] = GLOBAL_NONE_STATE;
    return acc;
  }, {} as { [key: string]: ItemVerifyState<unknown> });
  set(itemVerifyStateAtom, newState);
});

export const setItemVerifyStateAtom = atom(
  null,
  (get, set, { key, newState }: { key: string; newState: ItemVerifyState<unknown> }) => {
    set(itemVerifyStateAtom, prev => ({
      ...prev,
      [key]: newState,
    }));
  }
);

// 失败任务
const failedTasksAtom = atom<TestCaseDataWithKey[]>([]);
export const setFailedTasksAtom = atom(null, (get, set, failedTasks: TestCaseDataWithKey[]) => {
  set(failedTasksAtom, failedTasks);
});

export const getFailedTasksAtom = atom(get => get(failedTasksAtom));
