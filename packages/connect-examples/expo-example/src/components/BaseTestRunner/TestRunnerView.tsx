import { Stack, Text, YStack } from 'tamagui';
import { useContext } from 'react';

import { TestRunnerResultView } from './TestRunnerResultView';
import { TestRunnerContext, TestRunnerProvider } from './Context/TestRunnerProvider';
import AutoWrapperTextArea from '../ui/AutoWrapperTextArea';

import type { createTestRunnerAtoms } from './Context/TestRunnerVerifyProvider';
import type { TestRunnerResultViewProps } from './TestRunnerResultView';

// 自定义状态管理器类型
type CustomStateManager = ReturnType<typeof createTestRunnerAtoms>;

function TestRunnerPrepareDataLogView() {
  const { runnerLogs } = useContext(TestRunnerContext);

  if (runnerLogs === undefined || runnerLogs.length === 0) {
    return null;
  }

  return <AutoWrapperTextArea value={runnerLogs.join('\n')} />;
}

export type TestRunnerViewProps<T, TExt = unknown> = {
  title?: string;
  renderExecuteView: () => React.ReactNode;
  isShowLogDetail?: boolean;
  stateManager?: CustomStateManager;
} & TestRunnerResultViewProps<T, TExt>;

export function TestRunnerView<T, TExt = unknown>({
  title,
  renderExecuteView,
  renderResultView,
  isShowLogDetail = true,
  stateManager,
}: TestRunnerViewProps<T, TExt>) {
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
