import { Stack, Text, YStack } from 'tamagui';

import { useContext } from 'react';
import { TestRunnerResultView } from './TestRunnerResultView';
import type { TestRunnerResultViewProps } from './TestRunnerResultView';
import { TestRunnerContext, TestRunnerProvider } from './Context/TestRunnerProvider';
import AutoWrapperTextArea from '../ui/AutoWrapperTextArea';

type TestRunnerInfoProps = {
  title: string;
};
function TestRunnerInfoView({ title }: TestRunnerInfoProps) {
  return <Text fontWeight="bold">{title}</Text>;
}

function TestRunnerPrepareDataLogView() {
  const { runnerLogs } = useContext(TestRunnerContext);

  if (runnerLogs === undefined || runnerLogs.length === 0) {
    return null;
  }

  return <AutoWrapperTextArea value={runnerLogs.join('\n')} />;
}

export type TestRunnerViewProps<T> = {
  renderExecuteView: () => React.ReactNode;
} & TestRunnerResultViewProps &
  TestRunnerInfoProps;

export function TestRunnerView<T>({
  title,
  renderExecuteView,
  renderResultView,
}: TestRunnerViewProps<T>) {
  return (
    <TestRunnerProvider>
      <YStack gap="$1">
        <TestRunnerInfoView title={title} />
        {renderExecuteView()}
        <TestRunnerPrepareDataLogView />
        <TestRunnerResultView renderResultView={renderResultView} />
      </YStack>
    </TestRunnerProvider>
  );
}
