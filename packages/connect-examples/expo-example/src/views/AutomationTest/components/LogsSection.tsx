import { useAtomValue } from 'jotai';
import { Text, YStack } from 'tamagui';

import { automationLogsAtom } from '../../../atoms/automationAtoms';
import AutoWrapperTextArea from '../../../components/ui/AutoWrapperTextArea';

export function LogsSection() {
  const logs = useAtomValue(automationLogsAtom);

  return (
    <YStack gap="$2">
      <Text fontSize={14} fontWeight="700">
        运行日志
      </Text>
      <AutoWrapperTextArea
        value={logs.join('\n')}
        editable={false}
        minHeight={120}
        maxHeight={320}
      />
    </YStack>
  );
}
