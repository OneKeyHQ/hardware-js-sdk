import { useAtomValue } from 'jotai';
import { Card, Text, YStack } from 'tamagui';

import { automationProgressAtom } from '../../../atoms/automationAtoms';

export function CurrentScenarioCard() {
  const progress = useAtomValue(automationProgressAtom);

  if (progress.status === 'idle') {
    return null;
  }

  return (
    <Card bordered padding="$3" backgroundColor="$gray1">
      <YStack gap="$1.5">
        <Text fontSize={12} color="$gray10">
          状态: {progress.status}
        </Text>
        <Text fontSize={12} color="$gray10">
          当前场景: {progress.currentScenarioTitle || '—'}
        </Text>
        <Text fontSize={12} color="$gray10">
          当前 suite: {progress.currentTestSuite || '—'}
        </Text>
        <Text fontSize={12} color="$gray10">
          当前 passphrase: {progress.currentPassphrase || '—'}
        </Text>
        {progress.errorMessage ? (
          <Text fontSize={12} color="$red10">
            错误: {progress.errorMessage}
          </Text>
        ) : null}
      </YStack>
    </Card>
  );
}
