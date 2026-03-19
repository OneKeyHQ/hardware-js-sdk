import { Input, Text, XStack, YStack } from 'tamagui';

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

      {/* Device preparation mode — compact pill selector */}
      <YStack gap="$1.5">
        <Text fontSize={12} color="$gray10">设备准备模式</Text>
        <XStack flexWrap="wrap" gap="$2">
          {ALL_DEVICE_PREPARATION_MODES.map((mode: DevicePreparationMode) => {
            const info = DEVICE_PREPARATION_MODE_INFO[mode];
            const checked = config.devicePreparationMode === mode;
            return (
              <XStack
                key={mode}
                paddingHorizontal="$3"
                paddingVertical="$1.5"
                borderRadius="$10"
                borderWidth={1}
                borderColor={checked ? '$blue8' : '$gray5'}
                backgroundColor={checked ? '$blue3' : '$gray2'}
                opacity={isRunning ? 0.5 : 1}
                cursor={isRunning ? 'not-allowed' : 'pointer'}
                onPress={
                  isRunning
                    ? undefined
                    : () => setConfig(prev => ({ ...prev, devicePreparationMode: mode }))
                }
              >
                <Text fontSize={12} fontWeight={checked ? '700' : '400'} color={checked ? '$blue11' : '$gray11'}>
                  {info.label}
                </Text>
              </XStack>
            );
          })}
        </XStack>
        <Text fontSize={11} color="$gray9">
          {DEVICE_PREPARATION_MODE_INFO[config.devicePreparationMode].description}
        </Text>
      </YStack>

      {/* Stop on first error — compact toggle row */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$2"
        paddingVertical="$1.5"
        borderRadius="$3"
        borderWidth={1}
        borderColor={config.stopOnFirstError ? '$orange7' : '$gray5'}
        backgroundColor={config.stopOnFirstError ? '$orange2' : '$gray1'}
        opacity={isRunning ? 0.5 : 1}
        cursor={isRunning ? 'not-allowed' : 'pointer'}
        onPress={
          isRunning
            ? undefined
            : () => setConfig(prev => ({ ...prev, stopOnFirstError: !prev.stopOnFirstError }))
        }
      >
        <YStack flex={1} gap="$0.5">
          <Text fontSize={12} fontWeight="600">首错即停</Text>
          <Text fontSize={11} color="$gray10">任一 suite 失败后停止后续场景</Text>
        </YStack>
        <Text fontSize={12} color={config.stopOnFirstError ? '$orange11' : '$gray9'}>
          {config.stopOnFirstError ? '开' : '关'}
        </Text>
      </XStack>

      {/* Numeric inputs — two columns */}
      <XStack gap="$3">
        <YStack flex={1} gap="$1">
          <Text fontSize={12} color="$gray10">重试次数</Text>
          <Input
            size="$3"
            height={34}
            value={String(config.retryCount)}
            keyboardType="numeric"
            onChangeText={value => {
              const cleaned = value.replace(/[^0-9]/g, '');
              setConfig(prev => ({ ...prev, retryCount: cleaned === '' ? 0 : parseInt(cleaned, 10) }));
            }}
            onBlur={() =>
              setConfig(prev => ({ ...prev, retryCount: Math.max(1, prev.retryCount) }))
            }
            disabled={isRunning}
          />
        </YStack>
        <YStack flex={1} gap="$1">
          <Text fontSize={12} color="$gray10">场景间隔 (ms)</Text>
          <Input
            size="$3"
            height={34}
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
      </XStack>
    </YStack>
  );
}
