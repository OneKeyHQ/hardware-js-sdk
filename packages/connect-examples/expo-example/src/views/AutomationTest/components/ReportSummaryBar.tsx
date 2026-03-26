import { useAtom } from 'jotai';
import { Button, Text, XStack } from 'tamagui';

import { reportExpandAllAtom, reportFilterAtom } from '../../../atoms/automationAtoms';

import type { TestReport } from '../../../services/phonePilotMcp/types';

export function ReportSummaryBar({ report }: { report: TestReport }) {
  const [filter, setFilter] = useAtom(reportFilterAtom);
  const [expandAll, setExpandAll] = useAtom(reportExpandAllAtom);

  return (
    <XStack alignItems="center" gap="$3" flexWrap="wrap" justifyContent="space-between">
      <XStack alignItems="center" gap="$3" flexWrap="wrap">
        <Text fontSize={12} color="$gray10">
          总 {report.totalScenarios}
        </Text>
        <Text fontSize={12} color="$green10">
          通过 {report.passedScenarios}
        </Text>
        <Text fontSize={12} color="$red10">
          失败 {report.failedScenarios}
        </Text>
        <Text fontSize={12} color="$gray10">
          跳过 {report.skippedScenarios}
        </Text>
      </XStack>
      <XStack
        alignItems="center"
        gap="$2"
        flexWrap="wrap"
        justifyContent="flex-end"
        marginLeft="auto"
      >
        <Button
          size="$3"
          height={34}
          minWidth={108}
          justifyContent="center"
          theme={filter === 'failed' ? 'red' : 'gray'}
          borderRadius="$2"
          paddingHorizontal="$3"
          borderWidth={1}
          borderColor={filter === 'failed' ? '$red7' : '$gray5'}
          backgroundColor={filter === 'failed' ? '$red3' : '$gray2'}
          onPress={() => setFilter(prev => (prev === 'failed' ? 'all' : 'failed'))}
        >
          {filter === 'failed' ? '显示全部' : '仅看失败'}
        </Button>
        <Button
          size="$3"
          height={34}
          minWidth={108}
          justifyContent="center"
          theme="gray"
          borderRadius="$2"
          paddingHorizontal="$3"
          borderWidth={1}
          borderColor="$gray5"
          backgroundColor="$gray2"
          onPress={() => setExpandAll(prev => !prev)}
        >
          {expandAll ? '全部折叠' : '全部展开'}
        </Button>
      </XStack>
    </XStack>
  );
}
