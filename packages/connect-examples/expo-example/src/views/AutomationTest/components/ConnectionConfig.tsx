import { useAtomValue } from 'jotai';
import { Button, Card, Input, Stack, Text, XStack, YStack } from 'tamagui';

import {
  phonePilotConnectionStateAtom,
  phonePilotHealthAtom,
} from '../../../atoms/automationAtoms';
import { getConnectionColor, getReadyColor, formatReadyLabel } from '../utils';

import type { AutomationTestConfig } from '../../../services/phonePilotMcp/types';

export function ConnectionConfig({
  config,
  setConfig,
  onConnect,
  onDisconnect,
}: {
  config: AutomationTestConfig;
  setConfig: (
    updater: AutomationTestConfig | ((prev: AutomationTestConfig) => AutomationTestConfig)
  ) => void;
  onConnect: () => Promise<boolean>;
  onDisconnect: () => Promise<void>;
}) {
  const connectionState = useAtomValue(phonePilotConnectionStateAtom);
  const health = useAtomValue(phonePilotHealthAtom);
  const isConnected = connectionState === 'connected';

  const statusLabelMap = {
    connected: '已连接',
    connecting: '连接中',
    disconnected: '未连接',
    error: '连接失败',
  } as const;

  return (
    <YStack gap="$3">
      <Text fontSize={14} fontWeight="700">
        PhonePilot 连接
      </Text>
      <YStack gap="$2">
        <Text fontSize={12} color="$gray10">
          MCP 地址
        </Text>
        <Input
          value={config.phonePilotUrl}
          onChangeText={value => setConfig(prev => ({ ...prev, phonePilotUrl: value }))}
          placeholder="http://localhost:3847"
        />
      </YStack>

      <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
        <Text fontSize={13} color={getConnectionColor(connectionState)}>
          当前状态: {statusLabelMap[connectionState]}
        </Text>
        <Button onPress={isConnected ? onDisconnect : onConnect}>
          {isConnected ? '断开连接' : '连接 PhonePilot'}
        </Button>
      </XStack>

      <XStack gap="$3" flexWrap="wrap">
        <XStack alignItems="center" gap="$1.5">
          <Stack
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={getReadyColor(health?.mcpReady)}
          />
          <Text fontSize={12}>MCP: {formatReadyLabel(health?.mcpReady)}</Text>
        </XStack>
        <XStack alignItems="center" gap="$1.5">
          <Stack
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={getReadyColor(health?.ocrReady)}
          />
          <Text fontSize={12}>OCR: {formatReadyLabel(health?.ocrReady)}</Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
