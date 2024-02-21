import { Stack, Text } from 'tamagui';

interface MessageBoxProps {
  message: string;
}

export function MessageBox({ message }: MessageBoxProps) {
  return (
    <Stack padding="$2" backgroundColor="$bgCaution" alignItems="center">
      <Text>{message}</Text>
    </Stack>
  );
}
