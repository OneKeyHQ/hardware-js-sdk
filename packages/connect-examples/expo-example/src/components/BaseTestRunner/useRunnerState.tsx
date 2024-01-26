import { useContextSelector } from 'use-context-selector';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import { TestRunnerVerifyContext } from './Context/TestRunnerVerifyProvider';

export function useRunnerState() {
  const setItemValues = useContextSelector(TestRunnerContext, v => v.setItemValues);
  const setItemVerifyState = useContextSelector(TestRunnerVerifyContext, v => v.setItemVerifyState);
  const clearItemVerifyState = useContextSelector(
    TestRunnerVerifyContext,
    v => v.clearItemVerifyState
  );

  return {
    setItemValues,
    setItemVerifyState,
    clearItemVerifyState,
  };
}
