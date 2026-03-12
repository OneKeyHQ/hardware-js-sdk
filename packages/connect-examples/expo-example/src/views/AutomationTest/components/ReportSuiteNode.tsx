import React, { useEffect, useRef, useState } from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';

import { formatDuration, getStatusColor } from '../utils';
import { ReportCaseRow } from './ReportCaseRow';

import type { TestSuiteResult } from '../../../services/phonePilotMcp/types';

function ReportSuiteNodeInner({
  suite,
  expandAll,
}: {
  suite: TestSuiteResult;
  expandAll: boolean;
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
            <Text fontSize={11} color="$gray10">
              状态: <Text color={getStatusColor(suite.status)}>{suite.status}</Text> · 用例{' '}
              {suite.passedTests}/{suite.totalTests} · 耗时 {formatDuration(suite.duration)}
            </Text>
          </YStack>
        </XStack>
        {expanded ? (
          <YStack gap="$2">
            {suite.results.map(testCase => (
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
