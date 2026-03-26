import { useMemo } from 'react';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';

import securityCheckData from '../../../testTools/securityCheckTest/blindSignature/data';
import { convertTestData } from '../../../testTools/securityCheckTest/blindSignature/utils';
import { chainTestData } from '../../../testTools/chainMethodTest/data';

interface SingleSecurityCheckCaseInput {
  id: string;
  title: string;
  method: string;
  params: Record<string, unknown>;
  expectedResult: boolean;
  confirmCount: number;
  slideCount: number;
}

interface SingleChainMethodCaseInput {
  id: string;
  title: string;
  method: string;
  params: Record<string, unknown>;
  confirmCount: number;
  slideCount: number;
}

function ActionBadge({ label, value }: { label: string; value: string }) {
  return (
    <XStack
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$6"
      borderWidth={1}
      borderColor="$gray5"
      backgroundColor="$gray2"
    >
      <Text fontSize={11} color="$gray11">
        {label}: {value}
      </Text>
    </XStack>
  );
}

function CaseActionRow({
  title,
  subtitle,
  confirmCount,
  slideCount,
  disabled,
  onPress,
}: {
  title: string;
  subtitle: string;
  confirmCount: number;
  slideCount: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      size="$2"
      theme="gray"
      disabled={disabled}
      height="auto"
      minHeight={74}
      justifyContent="flex-start"
      alignItems="stretch"
      paddingVertical="$2.5"
      paddingHorizontal="$3"
      borderWidth={1}
      borderColor="$gray5"
      backgroundColor="$gray1"
      pressStyle={{
        backgroundColor: '$gray2',
        borderColor: '$gray7',
      }}
      onPress={onPress}
    >
      <YStack flex={1} gap="$2">
        <Text fontSize={13} fontWeight="600" numberOfLines={2}>
          {title}
        </Text>
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <ActionBadge label="confirm" value={`x${confirmCount}`} />
          <ActionBadge label="slide" value={`x${slideCount}`} />
          <Text fontSize={11} color="$gray10" numberOfLines={1}>
            {subtitle}
          </Text>
        </XStack>
      </YStack>
    </Button>
  );
}

export function SingleCasePanel({
  isRunning,
  onRunSecurityCheckCase,
  onRunChainMethodCase,
}: {
  isRunning: boolean;
  onRunSecurityCheckCase: (testCase: SingleSecurityCheckCaseInput) => Promise<void>;
  onRunChainMethodCase: (testCase: SingleChainMethodCaseInput) => Promise<void>;
}) {
  const securityCases = useMemo<SingleSecurityCheckCaseInput[]>(
    () =>
      convertTestData(securityCheckData).data.map(item => ({
        id: item.id,
        title: item.title,
        method: item.method,
        params: item.params as Record<string, unknown>,
        expectedResult: item.expect,
        confirmCount: item.expect ? item.confirmCount ?? 1 : 0,
        slideCount: item.expect && !item.noSlide ? 1 : 0,
      })),
    []
  );

  const chainCases = useMemo<SingleChainMethodCaseInput[]>(
    () =>
      chainTestData.flatMap(chain =>
        chain.data.flatMap(entry =>
          (entry.presupposes ?? []).map((presuppose, index) => ({
            id: `${chain.symbol}-${entry.method}-${index}`,
            title: `${chain.symbol} / ${entry.method} / ${presuppose.title}`,
            method: entry.method,
            params: presuppose.value as Record<string, unknown>,
            confirmCount: entry.confirmCount ?? 0,
            slideCount: entry.confirmCount && !entry.noSlide ? 1 : 0,
          }))
        )
      ),
    []
  );

  return (
    <YStack gap="$3" padding="$2.5" borderWidth={1} borderColor="$gray4" borderRadius="$4">
      <Text fontSize={15} fontWeight="700">
        单项 SDK 测试
      </Text>
      <Text fontSize={11} color="$gray10">
        临时入口。这里会走 AutomationTest 当前这套 SDK + PhonePilot 链路，单独触发一个用例。
      </Text>
      <Text fontSize={11} color="$gray10">
        Security Check 首次执行会先做一次设备预处理: confirm x1, slide x0。后续同一连接复用，不重复
        触发。
      </Text>

      <YStack gap="$2" padding="$2.5" borderWidth={1} borderColor="$gray5" borderRadius="$4">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize={13} fontWeight="700">
            Security Check
          </Text>
          <Text fontSize={11} color="$gray10">
            {securityCases.length} cases
          </Text>
        </XStack>
        <ScrollView maxHeight={260} showsVerticalScrollIndicator>
          <YStack gap="$1.5">
            {securityCases.map(testCase => (
              <CaseActionRow
                key={testCase.id}
                disabled={isRunning}
                title={testCase.title}
                subtitle={testCase.expectedResult ? 'expect success' : 'expect failure'}
                confirmCount={testCase.confirmCount}
                slideCount={testCase.slideCount}
                onPress={() => onRunSecurityCheckCase(testCase)}
              />
            ))}
          </YStack>
        </ScrollView>
      </YStack>

      <YStack gap="$2" padding="$2.5" borderWidth={1} borderColor="$gray5" borderRadius="$4">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize={13} fontWeight="700">
            ChainMethodBatch
          </Text>
          <Text fontSize={11} color="$gray10">
            {chainCases.length} cases
          </Text>
        </XStack>
        <ScrollView maxHeight={260} showsVerticalScrollIndicator>
          <YStack gap="$1.5">
            {chainCases.map(testCase => (
              <CaseActionRow
                key={testCase.id}
                disabled={isRunning}
                title={testCase.title}
                subtitle={testCase.method}
                confirmCount={testCase.confirmCount}
                slideCount={testCase.slideCount}
                onPress={() => onRunChainMethodCase(testCase)}
              />
            ))}
          </YStack>
        </ScrollView>
      </YStack>
    </YStack>
  );
}
