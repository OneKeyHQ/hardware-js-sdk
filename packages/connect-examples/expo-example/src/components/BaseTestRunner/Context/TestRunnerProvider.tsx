import { createContext, useMemo, useState } from 'react';

import type { Features, OnekeyFeatures } from '@onekeyfe/hd-transport';
import type { TestCaseDataWithKey } from '../types';

export type RunnerState = 'running' | 'done' | 'stopped' | 'none';
export type TestRunnerCallbacks = {
  onRunnerStateChange?: (state: RunnerState) => void;
};

export const TestRunnerContext = createContext<{
  runnerState: RunnerState;
  setRunnerState?: React.Dispatch<React.SetStateAction<RunnerState>>;

  runnerTestCaseTitle?: string;
  setRunnerTestCaseTitle?: React.Dispatch<React.SetStateAction<string | undefined>>;

  runningDeviceFeatures?: Features;
  setRunningDeviceFeatures?: React.Dispatch<React.SetStateAction<Features | undefined>>;

  runningOneKeyDeviceFeatures?: OnekeyFeatures;
  setRunningOneKeyDeviceFeatures?: React.Dispatch<React.SetStateAction<OnekeyFeatures | undefined>>;

  timestampBeginTest?: number;
  setTimestampBeginTest?: React.Dispatch<React.SetStateAction<number | undefined>>;

  timestampEndTest?: number;
  setTimestampEndTest?: React.Dispatch<React.SetStateAction<number | undefined>>;

  itemValues: TestCaseDataWithKey[];
  setItemValues?: React.Dispatch<React.SetStateAction<TestCaseDataWithKey[]>>;

  runnerLogs?: string[];
  setRunnerLogs?: React.Dispatch<React.SetStateAction<string[]>>;

  callbacks: TestRunnerCallbacks;
  setCallbacks?: (callbacks: TestRunnerCallbacks) => void;
}>({
  runnerState: 'none',
  itemValues: [],
  callbacks: {},
});

export function TestRunnerProvider({ children }: { children: React.ReactNode }) {
  const [itemValues, setItemValues] = useState<TestCaseDataWithKey[]>([]);
  const [runnerLogs, setRunnerLogs] = useState<string[]>([]);
  const [runnerTestCaseTitle, setRunnerTestCaseTitle] = useState<string>();
  const [runnerState, setRunnerState] = useState<RunnerState>('none');
  const [runningDeviceFeatures, setRunningDeviceFeatures] = useState<Features>();
  const [runningOneKeyDeviceFeatures, setRunningOneKeyDeviceFeatures] = useState<OnekeyFeatures>();
  const [timestampBeginTest, setTimestampBeginTest] = useState<number>();
  const [timestampEndTest, setTimestampEndTest] = useState<number>();
  const [callbacks, setCallbacks] = useState<TestRunnerCallbacks>({});

  const value = useMemo(
    () => ({
      itemValues,
      setItemValues,
      runnerTestCaseTitle,
      setRunnerTestCaseTitle,
      runningDeviceFeatures,
      setRunningDeviceFeatures,
      runningOneKeyDeviceFeatures,
      setRunningOneKeyDeviceFeatures,
      timestampBeginTest,
      setTimestampBeginTest,
      timestampEndTest,
      setTimestampEndTest,
      runnerLogs,
      setRunnerLogs,
      runnerState,
      setRunnerState,
      callbacks,
      setCallbacks,
    }),
    [
      itemValues,
      runnerTestCaseTitle,
      runningDeviceFeatures,
      runningOneKeyDeviceFeatures,
      timestampBeginTest,
      timestampEndTest,
      runnerLogs,
      runnerState,
      callbacks,
    ]
  );

  return <TestRunnerContext.Provider value={value}>{children}</TestRunnerContext.Provider>;
}
