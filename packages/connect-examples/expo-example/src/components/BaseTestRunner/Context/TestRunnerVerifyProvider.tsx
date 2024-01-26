import { useCallback, useMemo, useState } from 'react';
import { createContext } from 'use-context-selector';
import { VerifyState } from '../types';

export const TestRunnerVerifyContext = createContext<{
  setItemVerifyState: (key: string, newState: { verify: VerifyState; error?: string }) => void;
  itemVerifyState: { [key: string]: { verify: VerifyState; error?: string } };
  clearItemVerifyState: () => void;
}>({
  setItemVerifyState: () => {},
  itemVerifyState: {},
  clearItemVerifyState: () => {},
});

export function TestRunnerVerifyProvider({ children }: { children: React.ReactNode }) {
  const [itemVerifyState, setItemVerifyStateInternal] = useState<{
    [key: string]: { verify: VerifyState; error?: string };
  }>({});

  const setItemVerifyState = useCallback(
    (key: string, newState: { verify: VerifyState; error?: string }) => {
      setItemVerifyStateInternal(prevState => ({
        ...prevState,
        [key]: newState,
      }));
    },
    []
  );

  const clearItemVerifyState = useCallback(() => {
    setItemVerifyStateInternal({});
  }, []);

  const value = useMemo(
    () => ({
      setItemVerifyState,
      clearItemVerifyState,
      itemVerifyState,
    }),
    [clearItemVerifyState, itemVerifyState, setItemVerifyState]
  );

  return (
    <TestRunnerVerifyContext.Provider value={value}>{children}</TestRunnerVerifyContext.Provider>
  );
}
