import { useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Button, Stack, TextArea, YStack } from 'tamagui';

import { automationLogsAtom } from '../../../atoms/automationAtoms';

export function LogsSection() {
  const logs = useAtomValue(automationLogsAtom);
  const textAreaRef = useRef<any>(null);

  const scrollToTop = () => {
    if (textAreaRef.current) {
      textAreaRef.current.scrollTop = 0;
    }
  };

  return (
    <YStack gap="$2">
      <Stack position="relative">
        <TextArea
          ref={textAreaRef}
          value={logs.join('\n')}
          editable={false}
          height={650}
          fontSize={12}
          lineHeight={16}
          fontFamily="$mono"
        />
        <Button
          size="$2"
          theme="gray"
          position="absolute"
          bottom="$2"
          right="$2"
          onPress={scrollToTop}
          opacity={0.85}
        >
          ↑ 顶部
        </Button>
      </Stack>
    </YStack>
  );
}
