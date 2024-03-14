import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import { Button } from '../ui/Button';

export default function TestRunnerOptionButtons({
  onStop: stop,
  onStart: start,
}: {
  onStop: () => void;
  onStart: () => void;
}) {
  const runnerInfo = useContext(TestRunnerContext);
  const intl = useIntl();

  return (
    <>
      {runnerInfo.runnerDone !== false ? (
        <Button variant="primary" onPress={start}>
          {intl.formatMessage({ id: 'action__start_test' })}
        </Button>
      ) : null}
      {runnerInfo.runnerDone === false ? (
        <Button variant="destructive" onPress={stop}>
          {intl.formatMessage({ id: 'action__stop_test' })}
        </Button>
      ) : null}
    </>
  );
}
