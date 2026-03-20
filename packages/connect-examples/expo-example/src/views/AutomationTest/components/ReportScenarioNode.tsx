import React, { useEffect, useRef, useState } from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';

import { formatDuration, getStatusColor } from '../utils';
import { ReportSuiteNode } from './ReportSuiteNode';

import type { ScenarioReportResult } from '../../../services/phonePilotMcp/types';

function ReportScenarioNodeInner({
  scenario,
  expandAll,
  filter,
}: {
  scenario: ScenarioReportResult;
  expandAll: boolean;
  filter?: 'all' | 'failed';
}) {
  const autoExpand = scenario.status === 'failed';
  const [localExpanded, setLocalExpanded] = useState(autoExpand);
  const prevExpandAllRef = useRef(expandAll);

  useEffect(() => {
    if (prevExpandAllRef.current !== expandAll) {
      prevExpandAllRef.current = expandAll;
      setLocalExpanded(expandAll);
    }
  }, [expandAll]);

  const expanded = localExpanded;

  return (
    <Card bordered padding="$3" backgroundColor="$gray2">
      <YStack gap="$2.5">
        <XStack
          justifyContent="space-between"
          alignItems="center"
          gap="$3"
          cursor="pointer"
          onPress={() => setLocalExpanded(prev => !prev)}
        >
          <YStack flex={1} gap="$1">
            <Text fontSize={14} fontWeight="700">
              {expanded ? '▾' : '▸'} {scenario.scenarioTitle}
            </Text>
            <Text fontSize={11} color="$gray10">
              {scenario.jiraKey} · {scenario.flowType} · {scenario.walletType} ·{' '}
              {scenario.caseLabel} · 耗时 {formatDuration(scenario.duration)}
            </Text>
          </YStack>
          <Text fontSize={12} color={getStatusColor(scenario.status)}>
            {scenario.status}
          </Text>
        </XStack>
        {expanded ? (
          <YStack gap="$2">
            {scenario.suiteResults
              .filter(suite =>
                filter === 'failed' ? suite.results.some(r => !r.passed && !r.skipped) : true
              )
              .map(suite => (
                <ReportSuiteNode
                  key={`${scenario.scenarioId}-${suite.suiteType}`}
                  suite={suite}
                  expandAll={expandAll}
                  filter={filter}
                />
              ))}
          </YStack>
        ) : null}
      </YStack>
    </Card>
  );
}

export const ReportScenarioNode = React.memo(ReportScenarioNodeInner);
