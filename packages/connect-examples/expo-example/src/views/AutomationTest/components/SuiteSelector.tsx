import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { Checkbox, Text, XStack, YStack } from 'tamagui';

import { TEST_SUITE_INFO } from '../../../services/phonePilotMcp/types';
import { toggleValue } from '../utils';
import { PanelActions } from './PanelActions';

import type { AutomationTestConfig, TestSuiteType } from '../../../services/phonePilotMcp/types';

export function SuiteSelector({
  config,
  isRunning,
  setConfig,
}: {
  config: AutomationTestConfig;
  isRunning: boolean;
  setConfig: (
    updater: AutomationTestConfig | ((prev: AutomationTestConfig) => AutomationTestConfig)
  ) => void;
}) {
  const toggleTestSuite = (suiteType: TestSuiteType) => {
    setConfig(prev => ({
      ...prev,
      testSuites: toggleValue(prev.testSuites, suiteType),
    }));
  };

  const suiteTypes = Object.keys(TEST_SUITE_INFO) as TestSuiteType[];

  return (
    <YStack gap="$2">
      <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700">
          执行 Suite
        </Text>
        <PanelActions
          disabled={isRunning}
          onSelectAll={() =>
            setConfig(prev => ({
              ...prev,
              testSuites: Object.keys(TEST_SUITE_INFO) as TestSuiteType[],
            }))
          }
          onClear={() => setConfig(prev => ({ ...prev, testSuites: [] }))}
        />
      </XStack>
      <XStack flexWrap="wrap" gap="$2">
        {suiteTypes.map(suiteType => {
          const checked = config.testSuites.includes(suiteType);
          const info = TEST_SUITE_INFO[suiteType];
          return (
            <XStack
              key={suiteType}
              alignItems="center"
              gap="$2"
              width="48%"
              paddingVertical="$2"
              paddingHorizontal="$2.5"
              borderRadius="$3"
              borderWidth={1}
              borderColor={checked ? '$blue8' : '$gray5'}
              backgroundColor={checked ? '$blue2' : 'transparent'}
              opacity={isRunning ? 0.5 : 1}
              cursor={isRunning ? 'not-allowed' : 'pointer'}
              onPress={isRunning ? undefined : () => toggleTestSuite(suiteType)}
            >
              <Checkbox size="$3" checked={checked} disabled={isRunning} pointerEvents="none">
                <Checkbox.Indicator>
                  <CheckIcon size={14} />
                </Checkbox.Indicator>
              </Checkbox>
              <YStack flex={1} gap="$0.5">
                <Text fontSize={12} fontWeight="600">{info.label}</Text>
                <Text fontSize={10} color="$gray10" numberOfLines={1}>{info.description}</Text>
              </YStack>
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
