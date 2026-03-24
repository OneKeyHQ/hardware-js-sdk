import React from 'react';
import { Stack, XStack } from 'tamagui';

function ProgressBarInner({ percentage }: { percentage: number }) {
  return (
    <XStack height={6} borderRadius={3} backgroundColor="$gray4" overflow="hidden" flex={1}>
      <Stack
        height="100%"
        borderRadius={3}
        backgroundColor={percentage >= 100 ? '$green9' : '$blue9'}
        width={`${Math.min(100, Math.max(0, percentage))}%`}
      />
    </XStack>
  );
}

export const ProgressBar = React.memo(ProgressBarInner);
