import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';

import { formatDuration } from '../utils';
import { ReportCaseRow } from './ReportCaseRow';

import type { TestSuiteResult } from '../../../services/phonePilotMcp/types';

function ReportSuiteNodeInner({
  suite,
  expandAll,
  filter,
}: {
  suite: TestSuiteResult;
  expandAll: boolean;
  filter?: 'all' | 'failed';
}) {
  const autoExpand = suite.status === 'failed';
  const [localExpanded, setLocalExpanded] = useState(autoExpand);
  const prevExpandAllRef = useRef(expandAll);

  useEffect(() => {
    if (prevExpandAllRef.current !== expandAll) {
      prevExpandAllRef.current = expandAll;
      setLocalExpanded(expandAll);
    }
  }, [expandAll]);

  const expanded = localExpanded;

  const filteredResults = useMemo(() => {
    if (filter === 'failed') {
      return suite.results.filter(r => !r.passed && !r.skipped);
    }
    return suite.results;
  }, [suite.results, filter]);

  return (
    <Card bordered padding="$3" backgroundColor="$bgApp">
      <YStack gap="$2">
        <XStack
          justifyContent="space-between"
          alignItems="center"
          gap="$3"
          cursor="pointer"
          onPress={() => setLocalExpanded(prev => !prev)}
        >
          <YStack flex={1} gap="$0.5">
            <Text fontSize={13} fontWeight="700">
              {expanded ? '▾' : '▸'} {suite.suiteName}
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              <Text fontSize={11} color="$green10">通过 {suite.passedTests}</Text>
              <Text fontSize={11} color="$gray10">·</Text>
              <Text fontSize={11} color={suite.failedTests > 0 ? '$red10' : '$gray10'}>失败 {suite.failedTests}</Text>
              <Text fontSize={11} color="$gray10">· 总 {suite.expectedTotalTests ?? suite.totalTests} · 耗时 {formatDuration(suite.duration)}</Text>
            </XStack>
          </YStack>
        </XStack>
        {expanded ? (
          <YStack gap="$2">
            {filteredResults.map(testCase => (
              <ReportCaseRow
                key={`${suite.suiteType}-${testCase.title}`}
                testCase={testCase}
              />
            ))}
          </YStack>
        ) : null}
      </YStack>
    </Card>
  );
}

export const ReportSuiteNode = React.memo(ReportSuiteNodeInner);
