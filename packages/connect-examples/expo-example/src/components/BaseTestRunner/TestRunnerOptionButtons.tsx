import React, { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useAtomValue } from 'jotai';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import { Button } from '../ui/Button';
import { getFailedTasksAtom } from './Context/TestRunnerVerifyProvider';

function ReportFailedTasks<T>({ onRetryFailed }: { onRetryFailed?: () => void }) {
  const failedTasks = useAtomValue(getFailedTasksAtom);
  const { runnerState } = useContext(TestRunnerContext);

  if (
    onRetryFailed &&
    failedTasks?.length &&
    (runnerState === 'done' || runnerState === 'stopped')
  ) {
    return (
      <Button variant="destructive" onPress={onRetryFailed}>
        重试失败任务
      </Button>
    );
  }

  return null;
}

export default function TestRunnerOptionButtons({
  onStop: stop,
  onStart: start,
  onRetryFailed,
  disabled,
}: {
  onStop: () => void;
  onStart: () => void;
  onRetryFailed?: () => void;
  disabled?: boolean;
}) {
  const runnerInfo = useContext(TestRunnerContext);
  const intl = useIntl();

  return (
    <>
      {runnerInfo.runnerState !== 'running' ? (
        <Button variant="primary" onPress={start} disabled={disabled}>
          {intl.formatMessage({ id: 'action__start_test' })}
        </Button>
      ) : null}
      <ReportFailedTasks onRetryFailed={onRetryFailed} />
      {runnerInfo.runnerState === 'running' ? (
        <Button variant="destructive" onPress={stop} disabled={disabled}>
          {intl.formatMessage({ id: 'action__stop_test' })}
        </Button>
      ) : null}
    </>
  );
}
