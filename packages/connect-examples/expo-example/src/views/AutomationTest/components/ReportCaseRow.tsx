import React from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';

import { formatDuration, getCaseStatusIcon } from '../utils';

import type { TestCaseResult } from '../../../services/phonePilotMcp/types';

function ReportCaseRowInner({ testCase }: { testCase: TestCaseResult }) {
  return (
    <Card bordered padding="$3" backgroundColor="$gray1">
      <YStack gap="$1.5">
        <XStack justifyContent="space-between" gap="$3">
          <Text flex={1} fontSize={12} fontWeight="600">
            {getCaseStatusIcon(testCase)} {testCase.title}
          </Text>
          <Text fontSize={11} color="$gray10">
            {formatDuration(testCase.duration)}
          </Text>
        </XStack>
        {testCase.method ? (
          <Text fontSize={11} color="$gray10">
            方法: {testCase.method}
          </Text>
        ) : null}
        {testCase.expected ? (
          <Text fontSize={11} color="$gray10">
            期望: {testCase.expected}
          </Text>
        ) : null}
        {testCase.actual ? (
          <Text fontSize={11} color="$gray10">
            实际: {testCase.actual}
          </Text>
        ) : null}
        {testCase.error ? (
          <Text fontSize={11} color="$red10">
            错误: {testCase.error}
          </Text>
        ) : null}
        {testCase.metadata ? (
          <Text fontSize={11} color="$gray10">
            元数据:{' '}
            {Object.entries(testCase.metadata)
              .map(([key, value]) => `${key}=${value}`)
              .join('，')}
          </Text>
        ) : null}
      </YStack>
    </Card>
  );
}

export const ReportCaseRow = React.memo(ReportCaseRowInner);
