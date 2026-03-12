import { Text, XStack, YStack } from 'tamagui';

import { TEST_SUITE_INFO } from '../../../services/phonePilotMcp/types';
import { toggleValue } from '../utils';
import { PanelActions } from './PanelActions';
import { SelectableRow } from './SelectableRow';

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

  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700">
          执行 suite
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
      <YStack gap="$2">
        {(Object.keys(TEST_SUITE_INFO) as TestSuiteType[]).map(suiteType => (
          <SelectableRow
            key={suiteType}
            checked={config.testSuites.includes(suiteType)}
            disabled={isRunning}
            title={TEST_SUITE_INFO[suiteType].label}
            description={TEST_SUITE_INFO[suiteType].description}
            onToggle={() => toggleTestSuite(suiteType)}
          />
        ))}
      </YStack>
    </YStack>
  );
}
