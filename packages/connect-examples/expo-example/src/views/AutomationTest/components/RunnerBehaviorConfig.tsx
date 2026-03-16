import { Input, Label, Text, YStack } from 'tamagui';

import { SelectableRow } from './SelectableRow';

import {
  ALL_DEVICE_PREPARATION_MODES,
  DEVICE_PREPARATION_MODE_INFO,
} from '../../../services/phonePilotMcp/types';

import type { AutomationTestConfig, DevicePreparationMode } from '../../../services/phonePilotMcp/types';

export function RunnerBehaviorConfig({
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
  return (
    <YStack gap="$3">
      <Text fontSize={14} fontWeight="700">
        Runner 行为
      </Text>
      <YStack gap="$2">
        <Label>设备准备模式</Label>
        {ALL_DEVICE_PREPARATION_MODES.map((mode: DevicePreparationMode) => {
          const info = DEVICE_PREPARATION_MODE_INFO[mode];
          return (
            <SelectableRow
              key={mode}
              checked={config.devicePreparationMode === mode}
              disabled={isRunning}
              title={info.label}
              description={info.description}
              onToggle={() =>
                setConfig(prev => ({
                  ...prev,
                  devicePreparationMode: mode,
                }))
              }
            />
          );
        })}
      </YStack>
      <SelectableRow
        checked={config.stopOnFirstError}
        disabled={isRunning}
        title="首错即停"
        description="启用后，任一 suite 失败将跳过当前场景剩余 suite 并停止后续场景。关闭则继续执行所有场景。"
        onToggle={() =>
          setConfig(prev => ({
            ...prev,
            stopOnFirstError: !prev.stopOnFirstError,
          }))
        }
      />
      <YStack gap="$2">
        <Label>重试次数</Label>
        <Input
          value={String(config.retryCount)}
          keyboardType="numeric"
          onChangeText={value => {
            const cleaned = value.replace(/[^0-9]/g, '');
            setConfig(prev => ({
              ...prev,
              retryCount: cleaned === '' ? 0 : parseInt(cleaned, 10),
            }));
          }}
          onBlur={() =>
            setConfig(prev => ({
              ...prev,
              retryCount: Math.max(1, prev.retryCount),
            }))
          }
          disabled={isRunning}
        />
      </YStack>
      <YStack gap="$2">
        <Label>场景间隔（毫秒）</Label>
        <Input
          value={String(config.delayBetweenTests)}
          keyboardType="numeric"
          onChangeText={value => {
            const cleaned = value.replace(/[^0-9]/g, '');
            setConfig(prev => ({
              ...prev,
              delayBetweenTests: cleaned === '' ? 0 : parseInt(cleaned, 10),
            }));
          }}
          disabled={isRunning}
        />
      </YStack>
    </YStack>
  );
}
