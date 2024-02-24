import { Text, YStack } from 'tamagui';

import { TestRunnerResultView } from './TestRunnerResultView';
import type { TestRunnerResultViewProps } from './TestRunnerResultView';
import { TestRunnerProvider } from './Context/TestRunnerProvider';

type TestRunnerInfoProps = {
  title: string;
};
function TestRunnerInfoView({ title }: TestRunnerInfoProps) {
  return <Text fontWeight="bold">{title}</Text>;
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
      <YStack>
        <TestRunnerInfoView title={title} />
        {renderExecuteView()}
        <TestRunnerResultView renderResultView={renderResultView} />
      </YStack>
    </TestRunnerProvider>
  );
}
