import { useMemo } from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';

import { TEST_SUITE_INFO } from '../../../services/phonePilotMcp/types';
import { PanelActions } from './PanelActions';
import { SelectableRow } from './SelectableRow';

import type {
  AutomationScenario,
  AutomationScenarioId,
  AutomationTestConfig,
  TestSuiteType,
} from '../../../services/phonePilotMcp/types';

const JIRA_ORDER = ['OK-26053', 'OK-26054', 'OK-5504', 'OK-40090'] as const;

function formatScenarioSuiteSummary(scenario: AutomationScenario): string {
  const labelMap: Record<TestSuiteType, string> = {
    deviceFlow: 'Device Flow',
    sdkAddressBatch: 'Address',
    sdkPubkeyBatch: 'Pubkey',
    passphraseWalletSwitch: 'PP Switch',
    specialPassphrase: 'Special PP',
  };

  return scenario.supportedSuites.map(suiteType => labelMap[suiteType] ?? suiteType).join(' + ');
}

export function ScenarioSelector({
  config,
  isRunning,
  scenarios,
  setConfig,
}: {
  config: AutomationTestConfig;
  isRunning: boolean;
  scenarios: AutomationScenario[];
  setConfig: (
    updater: AutomationTestConfig | ((prev: AutomationTestConfig) => AutomationTestConfig)
  ) => void;
}) {
  const scenariosByJira = useMemo(() => {
    const groupMap = new Map<string, AutomationScenario[]>();
    scenarios.forEach(scenario => {
      const current = groupMap.get(scenario.jiraKey) || [];
      current.push(scenario);
      groupMap.set(scenario.jiraKey, current);
    });

    return JIRA_ORDER.map(jiraKey => ({
      jiraKey,
      scenarios: groupMap.get(jiraKey) || [],
    }));
  }, [scenarios]);

  const toggleScenario = (scenarioId: AutomationScenarioId) => {
    setConfig(prev => ({
      ...prev,
      scenarioIds: prev.scenarioIds.includes(scenarioId)
        ? prev.scenarioIds.filter(id => id !== scenarioId)
        : [...prev.scenarioIds, scenarioId],
    }));
  };

  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700">
          Jira 场景矩阵
        </Text>
        <PanelActions
          disabled={isRunning}
          onSelectAll={() =>
            setConfig(prev => ({
              ...prev,
              scenarioIds: scenarios.map(item => item.id),
            }))
          }
          onClear={() => setConfig(prev => ({ ...prev, scenarioIds: [] }))}
        />
      </XStack>
      {scenariosByJira.map(group => (
        <Card key={group.jiraKey} bordered padding="$3">
          <YStack gap="$2.5">
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
              <YStack>
                <Text fontSize={13} fontWeight="700">
                  {group.jiraKey}
                </Text>
                <Text fontSize={11} color="$gray10">
                  {group.scenarios.length} 个 concrete case
                </Text>
              </YStack>
              <PanelActions
                disabled={isRunning}
                onSelectAll={() =>
                  setConfig(prev => ({
                    ...prev,
                    scenarioIds: Array.from(
                      new Set([...prev.scenarioIds, ...group.scenarios.map(item => item.id)])
                    ),
                  }))
                }
                onClear={() =>
                  setConfig(prev => ({
                    ...prev,
                    scenarioIds: prev.scenarioIds.filter(
                      id => !group.scenarios.some(item => item.id === id)
                    ),
                  }))
                }
              />
            </XStack>
            <YStack gap="$2">
              {group.scenarios.map(scenario => (
                <SelectableRow
                  key={scenario.id}
                  checked={config.scenarioIds.includes(scenario.id)}
                  disabled={isRunning}
                  title={scenario.title}
                  description={`PhonePilot: ${
                    scenario.phonePilotSequenceId
                  } · 校验: ${formatScenarioSuiteSummary(scenario)}`}
                  onToggle={() => toggleScenario(scenario.id)}
                />
              ))}
            </YStack>
          </YStack>
        </Card>
      ))}
    </YStack>
  );
}
