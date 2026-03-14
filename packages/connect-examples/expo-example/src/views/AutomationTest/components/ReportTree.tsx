import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { Text, YStack } from 'tamagui';

import {
  effectiveReportAtom,
  reportExpandAllAtom,
  reportFilterAtom,
} from '../../../atoms/automationAtoms';
import { formatDuration } from '../utils';
import { ReportSummaryBar } from './ReportSummaryBar';
import { ReportScenarioNode } from './ReportScenarioNode';

export function ReportTree() {
  const report = useAtomValue(effectiveReportAtom);
  const filter = useAtomValue(reportFilterAtom);
  const expandAll = useAtomValue(reportExpandAllAtom);

  const filteredScenarios = useMemo(() => {
    if (!report) {
      return [];
    }
    if (filter === 'failed') {
      return report.scenarioResults.filter(s => s.status === 'failed');
    }
    return report.scenarioResults;
  }, [report, filter]);

  if (!report) {
    return (
      <Text fontSize={12} color="$gray10">
        还没有执行结果。
      </Text>
    );
  }

  return (
    <YStack gap="$3">
      <ReportSummaryBar report={report} />
      <Text fontSize={12} color="$gray10">
        总耗时: {formatDuration(report.duration)}
      </Text>
      <YStack gap="$3">
        {filteredScenarios.map(scenario => (
          <ReportScenarioNode
            key={scenario.scenarioId}
            scenario={scenario}
            expandAll={expandAll}
          />
        ))}
      </YStack>
    </YStack>
  );
}
