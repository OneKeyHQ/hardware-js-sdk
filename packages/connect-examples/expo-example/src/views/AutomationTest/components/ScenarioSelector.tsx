import { useMemo, useState } from 'react';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { Checkbox, Text, XStack, YStack } from 'tamagui';

import { PanelActions } from './PanelActions';

import type {
  AutomationScenario,
  AutomationScenarioId,
  AutomationTestConfig,
} from '../../../services/phonePilotMcp/types';

const JIRA_ORDER = ['OK-26053', 'OK-26054', 'OK-5504', 'OK-40090'] as const;

const JIRA_LABELS: Record<string, string> = {
  'OK-26053': '创建 BIP39 钱包',
  'OK-26054': '导入 BIP39 钱包',
  'OK-5504': '创建 SLIP39 钱包',
  'OK-40090': '导入 SLIP39 钱包',
};

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  const toggleGroup = (jiraKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(jiraKey)) {
        next.delete(jiraKey);
      } else {
        next.add(jiraKey);
      }
      return next;
    });
  };

  return (
    <YStack gap="$2">
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
      {scenariosByJira.map(group => {
        const isExpanded = expandedGroups.has(group.jiraKey);
        const selectedCount = group.scenarios.filter(s => config.scenarioIds.includes(s.id)).length;

        return (
          <YStack key={group.jiraKey} gap="$1">
            <XStack
              alignItems="center"
              gap="$2"
              paddingVertical="$1.5"
              paddingHorizontal="$2"
              cursor="pointer"
              hoverStyle={{ backgroundColor: '$gray3' }}
              borderRadius="$2"
              onPress={() => toggleGroup(group.jiraKey)}
            >
              <Text fontSize={12} color="$gray10" width={14}>
                {isExpanded ? '▾' : '▸'}
              </Text>
              <Text fontSize={13} fontWeight="700">
                {JIRA_LABELS[group.jiraKey] || group.jiraKey}
              </Text>
              <Text fontSize={11} color="$gray10">
                ({selectedCount}/{group.scenarios.length})
              </Text>
              <XStack flex={1} />
              <XStack
                gap="$1"
                onPress={e => {
                  e.stopPropagation();
                }}
              >
                <Text
                  fontSize={11}
                  color={isRunning ? '$gray8' : '$blue10'}
                  cursor={isRunning ? 'not-allowed' : 'pointer'}
                  onPress={() => {
                    if (isRunning) return;
                    setConfig(prev => ({
                      ...prev,
                      scenarioIds: Array.from(
                        new Set([...prev.scenarioIds, ...group.scenarios.map(item => item.id)])
                      ),
                    }));
                  }}
                >
                  全选
                </Text>
                <Text fontSize={11} color="$gray8">
                  |
                </Text>
                <Text
                  fontSize={11}
                  color={isRunning ? '$gray8' : '$blue10'}
                  cursor={isRunning ? 'not-allowed' : 'pointer'}
                  onPress={() => {
                    if (isRunning) return;
                    setConfig(prev => ({
                      ...prev,
                      scenarioIds: prev.scenarioIds.filter(
                        id => !group.scenarios.some(item => item.id === id)
                      ),
                    }));
                  }}
                >
                  清空
                </Text>
              </XStack>
            </XStack>
            {isExpanded && (
              <YStack gap="$1.5" paddingLeft="$2">
                {group.scenarios.map(scenario => {
                  const checked = config.scenarioIds.includes(scenario.id);
                  return (
                    <XStack
                      key={scenario.id}
                      alignItems="center"
                      gap="$2"
                      paddingVertical="$1.5"
                      paddingHorizontal="$2"
                      borderRadius="$3"
                      borderWidth={1}
                      borderColor={checked ? '$blue8' : '$gray5'}
                      backgroundColor={checked ? '$blue2' : 'transparent'}
                      opacity={isRunning ? 0.5 : 1}
                      cursor={isRunning ? 'not-allowed' : 'pointer'}
                      onPress={isRunning ? undefined : () => toggleScenario(scenario.id)}
                    >
                      <Checkbox
                        size="$2"
                        checked={checked}
                        disabled={isRunning}
                        pointerEvents="none"
                        borderWidth={1.5}
                        borderRadius="$1"
                        borderColor={checked ? '$blue8' : '$gray7'}
                        backgroundColor={checked ? '$blue3' : 'transparent'}
                        width={16}
                        height={16}
                        minWidth={16}
                      >
                        <Checkbox.Indicator>
                          <CheckIcon size={11} />
                        </Checkbox.Indicator>
                      </Checkbox>
                      <Text fontSize={12} flex={1}>
                        {scenario.title}
                      </Text>
                    </XStack>
                  );
                })}
              </YStack>
            )}
          </YStack>
        );
      })}
    </YStack>
  );
}
