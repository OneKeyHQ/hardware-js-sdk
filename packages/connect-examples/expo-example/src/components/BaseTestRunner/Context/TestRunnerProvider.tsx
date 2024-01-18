import { useMemo, useState } from 'react';
import { createContext } from 'use-context-selector';
import type { TestCase, TestCaseDataWithKey } from '../types';

type TestCaseInfo = Omit<TestCase<any>, 'data'>;

export const TestRunnerContext = createContext<{
  itemValues: TestCaseDataWithKey[];
  setItemValues?: React.Dispatch<React.SetStateAction<TestCaseDataWithKey[]>>;
}>({
  itemValues: [],
});

export function TestRunnerProvider({ children }: { children: React.ReactNode }) {
  const [itemValues, setItemValues] = useState<TestCaseDataWithKey[]>([]);
  const [caseInfo, setCaseInfo] = useState<TestCaseInfo>();

  const value = useMemo(
    () => ({
      itemValues,
      setItemValues,
      caseInfo,
      setCaseInfo,
    }),
    [caseInfo, itemValues]
  );

  return <TestRunnerContext.Provider value={value}>{children}</TestRunnerContext.Provider>;
}
