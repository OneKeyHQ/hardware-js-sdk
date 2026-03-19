import { useAtomValue } from 'jotai';
import { Button, Input, Stack, Text, XStack, YStack } from 'tamagui';

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
    connecting: '连接中...',
    disconnected: '未连接',
    error: '连接失败',
  } as const;

  return (
    <YStack gap="$2">
      {/* URL + connect button on one row */}
      <XStack alignItems="center" gap="$2">
        <Text fontSize={12} color="$gray10" minWidth={60}>MCP 地址</Text>
        <Input
          flex={1}
          size="$3"
          height={34}
          value={config.phonePilotUrl}
          onChangeText={value => setConfig(prev => ({ ...prev, phonePilotUrl: value }))}
          placeholder="http://localhost:3847"
        />
        <Button
          size="$3"
          height={34}
          borderRadius="$2"
          paddingHorizontal="$3"
          backgroundColor={isConnected ? '$red9' : '$blue9'}
          color="white"
          hoverStyle={{ opacity: 0.8, backgroundColor: isConnected ? '$red9' : '$blue9' }}
          pressStyle={{ opacity: 0.7, backgroundColor: isConnected ? '$red9' : '$blue9' }}
          cursor="pointer"
          onPress={isConnected ? onDisconnect : onConnect}
        >
          {isConnected ? '断开' : '连接'}
        </Button>
      </XStack>

      {/* Status + health on one row */}
      <XStack alignItems="center" gap="$3" flexWrap="wrap">
        <XStack alignItems="center" gap="$1.5">
          <Stack
            width={7}
            height={7}
            borderRadius={4}
            backgroundColor={getConnectionColor(connectionState)}
          />
          <Text fontSize={12} color={getConnectionColor(connectionState)}>
            {statusLabelMap[connectionState]}
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$1.5">
          <Stack width={7} height={7} borderRadius={4} backgroundColor={getReadyColor(health?.mcpReady)} />
          <Text fontSize={11} color="$gray10">MCP: {formatReadyLabel(health?.mcpReady)}</Text>
        </XStack>
        <XStack alignItems="center" gap="$1.5">
          <Stack width={7} height={7} borderRadius={4} backgroundColor={getReadyColor(health?.ocrReady)} />
          <Text fontSize={11} color="$gray10">OCR: {formatReadyLabel(health?.ocrReady)}</Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
