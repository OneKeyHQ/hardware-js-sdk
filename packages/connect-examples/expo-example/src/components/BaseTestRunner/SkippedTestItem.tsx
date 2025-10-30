import { Text, XStack } from 'tamagui';

export type SkippedTestItemProps = {
  title: string;
  reason?: string;
};

/**
 * 共享的跳过测试项UI组件
 * 用于显示被跳过的测试用例
 */
export function SkippedTestItem({ title, reason }: SkippedTestItemProps) {
  return (
    <XStack flexDirection="column" padding="$2" backgroundColor="$orange1" borderRadius="$2">
      <Text fontSize={14} color="$orange11">
        {title} - 已跳过
      </Text>
      <Text fontSize={12} color="$orange9">
        {reason || '设备不支持'}
      </Text>
    </XStack>
  );
}
