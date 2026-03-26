import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { Checkbox, Text, XStack, YStack } from 'tamagui';

import { TEST_SUITE_INFO } from '../../../services/phonePilotMcp/types';
import { toggleValue } from '../utils';

import type { AutomationTestConfig, TestSuiteType } from '../../../services/phonePilotMcp/types';

export function StandaloneSuiteSelector({
  config,
  isRunning,
  setConfig,
  suiteType,
}: {
  config: AutomationTestConfig;
  isRunning: boolean;
  setConfig: (
    updater: AutomationTestConfig | ((prev: AutomationTestConfig) => AutomationTestConfig)
  ) => void;
  suiteType: Extract<TestSuiteType, 'securityCheck' | 'chainMethodBatch'>;
}) {
  const checked = config.testSuites.includes(suiteType);
  const info = TEST_SUITE_INFO[suiteType];

  return (
    <YStack
      gap="$1.5"
      padding="$2.5"
      borderWidth={1}
      borderColor={checked ? '$blue8' : '$gray5'}
      borderRadius="$4"
      backgroundColor={checked ? '$blue1' : 'transparent'}
    >
      <XStack
        alignItems="center"
        gap="$2.5"
        opacity={isRunning ? 0.5 : 1}
        cursor={isRunning ? 'not-allowed' : 'pointer'}
        onPress={
          isRunning
            ? undefined
            : () =>
                setConfig(prev => ({
                  ...prev,
                  testSuites: toggleValue(prev.testSuites, suiteType),
                }))
        }
      >
        <Checkbox
          size="$3"
          checked={checked}
          disabled={isRunning}
          pointerEvents="none"
          borderWidth={1.5}
          borderRadius="$2"
          borderColor={checked ? '$blue8' : '$gray7'}
          backgroundColor={checked ? '$blue3' : 'transparent'}
          width={18}
          height={18}
          minWidth={18}
        >
          <Checkbox.Indicator>
            <CheckIcon size={12} />
          </Checkbox.Indicator>
        </Checkbox>
        <YStack flex={1} gap="$0.5">
          <Text fontSize={13} fontWeight="700">
            {info.label}
          </Text>
          <Text fontSize={11} color="$gray10">
            {info.description}
          </Text>
        </YStack>
      </XStack>
      <Text fontSize={11} color="$gray10" paddingLeft="$6">
        独立模块，固定使用专属助记词，不参与 Jira 场景矩阵和 Passphrase 变体组合。
      </Text>
    </YStack>
  );
}
