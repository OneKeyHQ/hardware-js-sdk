import { useAtomValue } from 'jotai';
import { Button, Stack, Text, XStack } from 'tamagui';

import {
  automationProgressAtom,
  canStartAutomationAtom,
  isAutomationRunningAtom,
  phonePilotConnectionStateAtom,
  progressPercentageAtom,
} from '../../atoms/automationAtoms';
import { getConnectionColor } from './utils';
import { ProgressBar } from './components/ProgressBar';

export function StickyHeaderBar({
  onStart,
  onStartDebug,
  onStop,
}: {
  onStart: () => Promise<void>;
  onStartDebug: () => Promise<void>;
  onStop: () => Promise<void>;
}) {
  const connectionState = useAtomValue(phonePilotConnectionStateAtom);
  const canStart = useAtomValue(canStartAutomationAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);
  const progress = useAtomValue(automationProgressAtom);
  const progressPercentage = useAtomValue(progressPercentageAtom);

  return (
    <XStack
      alignItems="center"
      gap="$3"
      paddingHorizontal="$4"
      paddingVertical="$2"
      borderBottomWidth={1}
      borderColor="$gray5"
      backgroundColor="$bgApp"
    >
      <Stack
        width={10}
        height={10}
        borderRadius={5}
        backgroundColor={getConnectionColor(connectionState)}
      />

      <XStack gap="$2">
        <Button size="$2" onPress={onStart} disabled={!canStart || isRunning}>
          开始
        </Button>
        <Button size="$2" theme="gray" onPress={onStartDebug} disabled={!canStart || isRunning}>
          仅校验
        </Button>
        <Button size="$2" theme="gray" onPress={onStop} disabled={!isRunning}>
          停止
        </Button>
      </XStack>

      <XStack flex={1} alignItems="center" gap="$2">
        <ProgressBar percentage={progressPercentage} />
        <Text fontSize={12} color="$gray10" minWidth={40} textAlign="right">
          {progressPercentage}%
        </Text>
      </XStack>

      <XStack gap="$3">
        <Text fontSize={12} color="$gray10">
          场景 {progress.completedScenarios}/{progress.totalScenarios}
        </Text>
        <Text fontSize={12} color="$gray10">
          Suite {progress.completedSuites}/{progress.totalSuites}
        </Text>
      </XStack>
    </XStack>
  );
}
