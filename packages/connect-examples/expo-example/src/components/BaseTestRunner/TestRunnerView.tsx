import { Stack, Text, YStack } from 'tamagui';

import { useContext } from 'react';
import { TestRunnerResultView } from './TestRunnerResultView';
import type { TestRunnerResultViewProps } from './TestRunnerResultView';
import { TestRunnerContext, TestRunnerProvider } from './Context/TestRunnerProvider';
import AutoWrapperTextArea from '../ui/AutoWrapperTextArea';
import { createTestRunnerAtoms } from './Context/TestRunnerVerifyProvider';

// 自定义状态管理器类型
type CustomStateManager = ReturnType<typeof createTestRunnerAtoms>;

function TestRunnerPrepareDataLogView() {
  const { runnerLogs } = useContext(TestRunnerContext);

  if (runnerLogs === undefined || runnerLogs.length === 0) {
    return null;
  }

  return <AutoWrapperTextArea value={runnerLogs.join('\n')} />;
}

export type TestRunnerViewProps<T> = {
  title?: string;
  renderExecuteView: () => React.ReactNode;
  isShowLogDetail?: boolean;
  stateManager?: CustomStateManager;
} & TestRunnerResultViewProps;

export function TestRunnerView<T>({
  title,
  renderExecuteView,
  renderResultView,
  isShowLogDetail = true,
  stateManager,
}: TestRunnerViewProps<T>) {
  return (
    <TestRunnerProvider>
      <YStack gap="$1">
        {title && (
          <Text fontSize={18} fontWeight="bold" paddingBottom="$3" color="$gray12">
            {title}
          </Text>
        )}
        {renderExecuteView()}
        {isShowLogDetail && <TestRunnerPrepareDataLogView />}
        <TestRunnerResultView renderResultView={renderResultView} stateManager={stateManager} />
      </YStack>
    </TestRunnerProvider>
  );
}
