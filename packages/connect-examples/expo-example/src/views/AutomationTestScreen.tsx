/**
 * Automation Test Screen
 *
 * Provides UI for configuring and running automated hardware wallet tests
 * with PhonePilot MCP integration.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Input,
  Image,
  ScrollView,
  Separator,
  Stack,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';

import { useAutomationTest } from '../testTools/automationTest/useAutomationTest';
import {
  getMnemonicsOrganizedByWordCount,
  ALL_PASSPHRASE_VARIANT_IDS,
} from '../testTools/automationTest/mnemonicGroups';
import { PASSPHRASE_VARIANT_INFO } from '../services/phonePilotMcp/types';
import {
  automationConfigAtom,
  automationReportAtom,
  cameraFrameAtom,
  isAutomationRunningAtom,
  isPhonePilotConnectedAtom,
  progressPercentageAtom,
  phonePilotUrlAtom,
} from '../atoms/automationAtoms';

import type { MnemonicGroupId, TestSuiteType, PassphraseVariantId } from '../services/phonePilotMcp/types';

/** Available test suite types */
const TEST_SUITE_OPTIONS: { id: TestSuiteType; label: string }[] = [
  { id: 'address', label: 'Address Test' },
  { id: 'pubkey', label: 'Public Key Test' },
  { id: 'passphrase', label: 'Passphrase Test' },
  { id: 'slip39', label: 'SLIP39 Test' },
  { id: 'security', label: 'Security Check' },
  { id: 'functional', label: 'Functional Test' },
  { id: 'attachToPin', label: 'Attach to PIN' },
  { id: 'chainMethod', label: 'Chain Method' },
];

/** Styled link button */
const LinkButton = styled(Text, {
  fontSize: 12,
  color: '$blue10',
  cursor: 'pointer',
  pressStyle: { opacity: 0.7 },
  hoverStyle: { textDecorationLine: 'underline' },
});

/** Styled table cell for checkbox */
const TableCheckCell = styled(YStack, {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: '$1',
});

export default function AutomationTestScreen() {
  return (
    <PageView scrollable>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <Stack padding="$4" gap="$4">
            {/* Connection Panel */}
            <ConnectionPanel />

            {/* Configuration Panel */}
            <ConfigurationPanel />

            {/* Progress Panel */}
            <ProgressPanel />

            {/* Logs Panel */}
            <LogsPanel />

            {/* Results Panel */}
            <ResultsPanel />
          </Stack>
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}

/**
 * PhonePilot Connection Panel
 */
function ConnectionPanel() {
  const {
    connectionState,
    connectPhonePilot,
    disconnectPhonePilot,
    captureFrame,
  } = useAutomationTest();

  const serverUrl = useAtomValue(phonePilotUrlAtom);
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const isError = connectionState === 'error';

  return (
    <PanelView title="PhonePilot Connection">
      <XStack alignItems="center" justifyContent="space-between">
        {/* Left: Status */}
        <XStack alignItems="center" gap="$3">
          <YStack
            width={12}
            height={12}
            borderRadius={6}
            backgroundColor={
              isConnected ? '$green9' : isError ? '$red9' : isConnecting ? '$orange9' : '$gray6'
            }
          />
          <YStack>
            <Text
              fontSize={14}
              fontWeight="600"
              color={
                isConnected ? '$green11' : isError ? '$red11' : isConnecting ? '$orange11' : '$gray11'
              }
            >
              {isConnected
                ? 'Connected'
                : isError
                ? 'Failed'
                : isConnecting
                ? 'Connecting...'
                : 'Disconnected'}
            </Text>
            <Text fontSize={12} color="$gray9">
              {serverUrl}
            </Text>
          </YStack>
        </XStack>

        {/* Right: Actions */}
        <XStack gap="$3" alignItems="center">
          {!isConnected ? (
            <XStack
              backgroundColor={isConnecting ? '$gray4' : '$blue9'}
              paddingHorizontal="$4"
              paddingVertical="$2"
              borderRadius="$2"
              pressStyle={{ opacity: 0.8, scale: 0.98 }}
              onPress={isConnecting ? undefined : connectPhonePilot}
              cursor={isConnecting ? 'default' : 'pointer'}
              opacity={isConnecting ? 0.7 : 1}
            >
              <Text fontSize={13} fontWeight="600" color="white">
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Text>
            </XStack>
          ) : (
            <Text
              fontSize={13}
              color="$red10"
              pressStyle={{ opacity: 0.7 }}
              onPress={disconnectPhonePilot}
              cursor="pointer"
            >
              Disconnect
            </Text>
          )}
        </XStack>
      </XStack>
    </PanelView>
  );
}

/**
 * Test Configuration Panel
 */
function ConfigurationPanel() {
  const [config, setConfig] = useAtom(automationConfigAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);

  const mnemonicsByWordCount = useMemo(() => getMnemonicsOrganizedByWordCount(), []);
  const standardMnemonics = useMemo(
    () => mnemonicsByWordCount.filter((m) => m.type === 'standard'),
    [mnemonicsByWordCount]
  );
  const slip39Mnemonics = useMemo(
    () => mnemonicsByWordCount.filter((m) => m.type === 'slip39'),
    [mnemonicsByWordCount]
  );

  const allTestSuites = useMemo(() => TEST_SUITE_OPTIONS.map((s) => s.id), []);
  const allMnemonicIds = useMemo(
    () => mnemonicsByWordCount.flatMap((m) => m.groups.map((g) => g.id)),
    [mnemonicsByWordCount]
  );

  // Toggle functions
  const toggleMnemonicGroup = useCallback(
    (groupId: MnemonicGroupId) => {
      const newGroups = config.mnemonicGroups.includes(groupId)
        ? config.mnemonicGroups.filter((g) => g !== groupId)
        : [...config.mnemonicGroups, groupId];
      setConfig({ ...config, mnemonicGroups: newGroups });
    },
    [config, setConfig]
  );

  const togglePassphraseVariant = useCallback(
    (variantId: PassphraseVariantId) => {
      const newVariants = config.passphraseVariants.includes(variantId)
        ? config.passphraseVariants.filter((v) => v !== variantId)
        : [...config.passphraseVariants, variantId];
      setConfig({ ...config, passphraseVariants: newVariants });
    },
    [config, setConfig]
  );

  const toggleTestSuite = useCallback(
    (suiteId: TestSuiteType) => {
      const newSuites = config.testSuites.includes(suiteId)
        ? config.testSuites.filter((s) => s !== suiteId)
        : [...config.testSuites, suiteId];
      setConfig({ ...config, testSuites: newSuites });
    },
    [config, setConfig]
  );

  // Batch select functions
  const selectAllMnemonics = useCallback(() => {
    setConfig({ ...config, mnemonicGroups: allMnemonicIds });
  }, [config, setConfig, allMnemonicIds]);

  const clearMnemonics = useCallback(() => {
    setConfig({ ...config, mnemonicGroups: [] });
  }, [config, setConfig]);

  const selectAllPassphraseVariants = useCallback(() => {
    setConfig({ ...config, passphraseVariants: [...ALL_PASSPHRASE_VARIANT_IDS] });
  }, [config, setConfig]);

  const clearPassphraseVariants = useCallback(() => {
    setConfig({ ...config, passphraseVariants: [] });
  }, [config, setConfig]);

  const selectAllTestSuites = useCallback(() => {
    setConfig({ ...config, testSuites: allTestSuites });
  }, [config, setConfig, allTestSuites]);

  const clearTestSuites = useCallback(() => {
    setConfig({ ...config, testSuites: [] });
  }, [config, setConfig]);

  return (
    <PanelView title="Test Configuration">
      <YStack gap="$4">
        {/* 1. Mnemonic Selection */}
        <YStack>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <YStack>
              <XStack alignItems="center" gap="$2">
                <YStack
                  width={20}
                  height={20}
                  borderRadius={10}
                  backgroundColor="$green9"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={11} color="white" fontWeight="bold">
                    1
                  </Text>
                </YStack>
                <Text fontWeight="bold" fontSize={14}>
                  Mnemonic Selection
                </Text>
              </XStack>
              <Text fontSize={11} color="$gray9" marginLeft={28}>
                Requires device reset when switching
              </Text>
            </YStack>
            <XStack gap="$2">
              <LinkButton onPress={selectAllMnemonics} disabled={isRunning}>
                Select All
              </LinkButton>
              <Text color="$gray6">|</Text>
              <LinkButton onPress={clearMnemonics} disabled={isRunning}>
                Clear
              </LinkButton>
            </XStack>
          </XStack>

          {/* Standard Mnemonics Table */}
          <Text fontSize={12} color="$gray10" fontWeight="500" marginBottom="$2">
            Standard Mnemonics
          </Text>
          <YStack
            backgroundColor="$gray1"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$gray5"
            overflow="hidden"
            marginBottom="$3"
          >
            {/* Header */}
            <XStack backgroundColor="$gray3" paddingVertical="$2" paddingHorizontal="$3">
              <Text fontSize={12} fontWeight="600" color="$gray11" width={55}>
                Share
              </Text>
              {standardMnemonics.map((m) => (
                <Text
                  key={m.wordCount}
                  fontSize={12}
                  fontWeight="600"
                  color="$gray11"
                  flex={1}
                  textAlign="center"
                >
                  {m.label}
                </Text>
              ))}
            </XStack>
            {/* Rows */}
            {['one', 'two', 'three'].map((shareLabel, rowIndex) => (
              <XStack
                key={shareLabel}
                paddingVertical="$2"
                paddingHorizontal="$3"
                borderTopWidth={1}
                borderColor="$gray4"
                backgroundColor={rowIndex % 2 === 1 ? '$gray2' : undefined}
              >
                <Text fontSize={12} width={55} color="$gray10">
                  {shareLabel}
                </Text>
                {standardMnemonics.map((m) => {
                  const group = m.groups.find((g) => g.shareLabel === shareLabel);
                  if (!group) return <TableCheckCell key={m.wordCount} />;
                  const isSelected = config.mnemonicGroups.includes(group.id);
                  return (
                    <TableCheckCell
                      key={m.wordCount}
                      onPress={() => !isRunning && toggleMnemonicGroup(group.id)}
                      cursor={isRunning ? 'not-allowed' : 'pointer'}
                    >
                      <YStack
                        width={24}
                        height={24}
                        borderRadius={6}
                        borderWidth={2}
                        borderColor={isSelected ? '$green8' : '$gray6'}
                        backgroundColor={isSelected ? '$green9' : '$gray1'}
                        alignItems="center"
                        justifyContent="center"
                        opacity={isRunning ? 0.5 : 1}
                      >
                        {isSelected && (
                          <Text fontSize={14} color="white" fontWeight="bold">
                            ✓
                          </Text>
                        )}
                      </YStack>
                    </TableCheckCell>
                  );
                })}
              </XStack>
            ))}
          </YStack>

          {/* SLIP39 Mnemonics Table */}
          <Text fontSize={12} color="$gray10" fontWeight="500" marginBottom="$2">
            SLIP39 Mnemonics
          </Text>
          <YStack
            backgroundColor="$gray1"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$gray5"
            overflow="hidden"
          >
            {/* Header */}
            <XStack backgroundColor="$gray3" paddingVertical="$2" paddingHorizontal="$3">
              <Text fontSize={12} fontWeight="600" color="$gray11" width={55}>
                Share
              </Text>
              {slip39Mnemonics.map((m) => (
                <Text
                  key={m.wordCount}
                  fontSize={12}
                  fontWeight="600"
                  color="$gray11"
                  flex={1}
                  textAlign="center"
                >
                  {m.label}
                </Text>
              ))}
            </XStack>
            {/* Rows */}
            {['one', 'two', 'three'].map((shareLabel, rowIndex) => (
              <XStack
                key={shareLabel}
                paddingVertical="$2"
                paddingHorizontal="$3"
                borderTopWidth={1}
                borderColor="$gray4"
                backgroundColor={rowIndex % 2 === 1 ? '$gray2' : undefined}
              >
                <Text fontSize={12} width={55} color="$gray10">
                  {shareLabel}
                </Text>
                {slip39Mnemonics.map((m) => {
                  const group = m.groups.find((g) => g.shareLabel === shareLabel);
                  if (!group) {
                    return (
                      <TableCheckCell key={m.wordCount}>
                        <Text color="$gray6">—</Text>
                      </TableCheckCell>
                    );
                  }
                  const isSelected = config.mnemonicGroups.includes(group.id);
                  return (
                    <TableCheckCell
                      key={m.wordCount}
                      onPress={() => !isRunning && toggleMnemonicGroup(group.id)}
                      cursor={isRunning ? 'not-allowed' : 'pointer'}
                    >
                      <YStack
                        width={24}
                        height={24}
                        borderRadius={6}
                        borderWidth={2}
                        borderColor={isSelected ? '$purple8' : '$gray6'}
                        backgroundColor={isSelected ? '$purple9' : '$gray1'}
                        alignItems="center"
                        justifyContent="center"
                        opacity={isRunning ? 0.5 : 1}
                      >
                        {isSelected && (
                          <Text fontSize={14} color="white" fontWeight="bold">
                            ✓
                          </Text>
                        )}
                      </YStack>
                    </TableCheckCell>
                  );
                })}
              </XStack>
            ))}
          </YStack>
        </YStack>

        <Separator borderColor="$gray4" />

        {/* 2. Passphrase Variants */}
        <YStack>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <YStack>
              <XStack alignItems="center" gap="$2">
                <YStack
                  width={20}
                  height={20}
                  borderRadius={10}
                  backgroundColor="$orange9"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={11} color="white" fontWeight="bold">
                    2
                  </Text>
                </YStack>
                <Text fontWeight="bold" fontSize={14}>
                  Passphrase Variants
                </Text>
              </XStack>
              <Text fontSize={11} color="$gray9" marginLeft={28}>
                No device reset needed between variants
              </Text>
            </YStack>
            <XStack gap="$2">
              <LinkButton onPress={selectAllPassphraseVariants} disabled={isRunning}>
                Select All
              </LinkButton>
              <Text color="$gray6">|</Text>
              <LinkButton onPress={clearPassphraseVariants} disabled={isRunning}>
                Clear
              </LinkButton>
            </XStack>
          </XStack>

          <XStack flexWrap="wrap" gap="$3">
            {ALL_PASSPHRASE_VARIANT_IDS.map((variantId) => {
              const info = PASSPHRASE_VARIANT_INFO[variantId];
              const isSelected = config.passphraseVariants.includes(variantId);
              return (
                <XStack
                  key={variantId}
                  alignItems="center"
                  gap="$3"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  backgroundColor={isSelected ? '$orange2' : '$gray2'}
                  borderRadius="$3"
                  borderWidth={2}
                  borderColor={isSelected ? '$orange7' : '$gray5'}
                  pressStyle={{ scale: 0.98, opacity: 0.9 }}
                  onPress={() => !isRunning && togglePassphraseVariant(variantId)}
                  opacity={isRunning ? 0.5 : 1}
                  cursor={isRunning ? 'not-allowed' : 'pointer'}
                  minWidth={140}
                >
                  <YStack
                    width={20}
                    height={20}
                    borderRadius={4}
                    borderWidth={2}
                    borderColor={isSelected ? '$orange8' : '$gray6'}
                    backgroundColor={isSelected ? '$orange9' : '$gray1'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isSelected && (
                      <Text fontSize={12} color="white" fontWeight="bold">
                        ✓
                      </Text>
                    )}
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={13} fontWeight="600" color={isSelected ? '$orange11' : '$gray11'}>
                      {info.label}
                    </Text>
                    <Text fontSize={10} color="$gray9">
                      {info.description}
                    </Text>
                  </YStack>
                </XStack>
              );
            })}
          </XStack>
        </YStack>

        <Separator borderColor="$gray4" />

        {/* 3. Test Types */}
        <YStack>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <XStack alignItems="center" gap="$2">
              <YStack
                width={20}
                height={20}
                borderRadius={10}
                backgroundColor="$blue9"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={11} color="white" fontWeight="bold">
                  3
                </Text>
              </YStack>
              <Text fontWeight="bold" fontSize={14}>
                Test Types
              </Text>
            </XStack>
            <XStack gap="$2">
              <LinkButton onPress={selectAllTestSuites} disabled={isRunning}>
                Select All
              </LinkButton>
              <Text color="$gray6">|</Text>
              <LinkButton onPress={clearTestSuites} disabled={isRunning}>
                Clear
              </LinkButton>
            </XStack>
          </XStack>

          <XStack flexWrap="wrap" gap="$2">
            {TEST_SUITE_OPTIONS.map((suite) => {
              const isSelected = config.testSuites.includes(suite.id);
              return (
                <XStack
                  key={suite.id}
                  alignItems="center"
                  gap="$2"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  backgroundColor={isSelected ? '$blue2' : '$gray2'}
                  borderRadius="$3"
                  borderWidth={2}
                  borderColor={isSelected ? '$blue7' : '$gray5'}
                  pressStyle={{ scale: 0.98, opacity: 0.9 }}
                  onPress={() => !isRunning && toggleTestSuite(suite.id)}
                  opacity={isRunning ? 0.5 : 1}
                  cursor={isRunning ? 'not-allowed' : 'pointer'}
                >
                  <YStack
                    width={18}
                    height={18}
                    borderRadius={4}
                    borderWidth={2}
                    borderColor={isSelected ? '$blue8' : '$gray6'}
                    backgroundColor={isSelected ? '$blue9' : '$gray1'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {isSelected && (
                      <Text fontSize={11} color="white" fontWeight="bold">
                        ✓
                      </Text>
                    )}
                  </YStack>
                  <Text fontSize={12} fontWeight="500" color={isSelected ? '$blue11' : '$gray11'}>
                    {suite.label}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </YStack>
      </YStack>
    </PanelView>
  );
}

/**
 * Progress Panel
 */
function ProgressPanel() {
  const { progress, startAutomation, stopAutomation } = useAutomationTest();
  const isConnected = useAtomValue(isPhonePilotConnectedAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);
  const progressPercent = useAtomValue(progressPercentageAtom);
  const config = useAtomValue(automationConfigAtom);

  const canStart =
    isConnected &&
    !isRunning &&
    config.mnemonicGroups.length > 0 &&
    config.passphraseVariants.length > 0 &&
    config.testSuites.length > 0;

  return (
    <PanelView title="Test Execution">
      <YStack gap="$3">
        {/* Configuration Summary */}
        {!isRunning && (
          <XStack
            backgroundColor="$gray2"
            padding="$3"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$gray4"
            gap="$4"
            justifyContent="space-around"
          >
            <YStack alignItems="center" gap="$1">
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="$green3"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={18} fontWeight="bold" color="$green10">
                  {config.mnemonicGroups.length}
                </Text>
              </YStack>
              <Text fontSize={11} color="$gray9">
                Mnemonics
              </Text>
            </YStack>
            <YStack alignItems="center" gap="$1">
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="$orange3"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={18} fontWeight="bold" color="$orange10">
                  {config.passphraseVariants.length}
                </Text>
              </YStack>
              <Text fontSize={11} color="$gray9">
                Passphrases
              </Text>
            </YStack>
            <YStack alignItems="center" gap="$1">
              <YStack
                width={40}
                height={40}
                borderRadius={20}
                backgroundColor="$blue3"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={18} fontWeight="bold" color="$blue10">
                  {config.testSuites.length}
                </Text>
              </YStack>
              <Text fontSize={11} color="$gray9">
                Test Types
              </Text>
            </YStack>
          </XStack>
        )}

        {/* Status and Controls */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1">
            <XStack alignItems="center" gap="$2">
              <YStack
                width={10}
                height={10}
                borderRadius={5}
                backgroundColor={
                  progress.status === 'running'
                    ? '$blue9'
                    : progress.status === 'done'
                    ? '$green9'
                    : progress.status === 'error'
                    ? '$red9'
                    : '$gray7'
                }
              />
              <Text fontSize={14} fontWeight="600">
                {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </Text>
            </XStack>
            {progress.currentMnemonicGroup && (
              <Text fontSize={12} color="$gray9" marginLeft={18}>
                {progress.currentMnemonicGroup}
                {progress.currentPassphrase && ` → ${progress.currentPassphrase}`}
              </Text>
            )}
          </YStack>

          <XStack gap="$3">
            <Button
              size="$4"
              backgroundColor={canStart ? '$green9' : '$gray5'}
              color={canStart ? 'white' : '$gray9'}
              borderRadius="$3"
              paddingHorizontal="$5"
              onPress={startAutomation}
              disabled={!canStart}
              pressStyle={{ backgroundColor: '$green10' }}
              fontWeight="600"
            >
              ▶ Start
            </Button>
            <Button
              size="$4"
              backgroundColor={isRunning ? '$red9' : '$gray5'}
              color={isRunning ? 'white' : '$gray9'}
              borderRadius="$3"
              paddingHorizontal="$5"
              onPress={stopAutomation}
              disabled={!isRunning}
              pressStyle={{ backgroundColor: '$red10' }}
              fontWeight="600"
            >
              ■ Stop
            </Button>
          </XStack>
        </XStack>

        {/* Progress bar */}
        {isRunning && (
          <YStack gap="$2">
            <YStack
              height={8}
              backgroundColor="$gray4"
              borderRadius={4}
              overflow="hidden"
            >
              <YStack
                height="100%"
                width={`${progressPercent}%`}
                backgroundColor="$blue9"
                borderRadius={4}
              />
            </YStack>
            <Text fontSize={12} color="$gray10" textAlign="center">
              {progress.completedMnemonicGroups}/{progress.totalMnemonicGroups} mnemonic
              groups completed ({progressPercent}%)
            </Text>
          </YStack>
        )}
      </YStack>
    </PanelView>
  );
}

/**
 * Logs Panel
 */
function LogsPanel() {
  const { logs } = useAutomationTest();

  return (
    <PanelView title="Logs">
      <ScrollView
        height={200}
        backgroundColor="$gray2"
        borderRadius="$2"
        padding="$2"
      >
        <YStack gap="$1">
          {logs.length === 0 ? (
            <Text fontSize={12} color="$gray9">
              No logs yet
            </Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} fontSize={11} fontFamily="$mono" color="$gray11">
                {log}
              </Text>
            ))
          )}
        </YStack>
      </ScrollView>
    </PanelView>
  );
}

/**
 * Results Panel
 */
function ResultsPanel() {
  const report = useAtomValue(automationReportAtom);
  const [expandedSuite, setExpandedSuite] = React.useState<number | null>(null);

  if (!report) {
    return null;
  }

  return (
    <PanelView title="Test Results">
      <YStack gap="$3">
        {/* Summary */}
        <Card padding="$3" backgroundColor="$gray3">
          <XStack justifyContent="space-around">
            <YStack alignItems="center">
              <Text fontSize={24} fontWeight="bold" color="$green10">
                {report.passedTests}
              </Text>
              <Text fontSize={12} color="$gray9">
                Passed
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize={24} fontWeight="bold" color="$red10">
                {report.failedTests}
              </Text>
              <Text fontSize={12} color="$gray9">
                Failed
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize={24} fontWeight="bold" color="$gray10">
                {report.skippedTests}
              </Text>
              <Text fontSize={12} color="$gray9">
                Skipped
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize={24} fontWeight="bold">
                {report.totalTests}
              </Text>
              <Text fontSize={12} color="$gray9">
                Total
              </Text>
            </YStack>
          </XStack>
        </Card>

        {/* Duration */}
        <Text fontSize={12} color="$gray9" textAlign="center">
          Duration: {Math.round(report.duration / 1000)}s
        </Text>

        {/* Suite details */}
        <YStack gap="$2">
          <Text fontWeight="bold">Suite Results</Text>
          {report.suiteResults.map((suite, index) => (
            <Card key={index} padding="$0" backgroundColor="$gray2" overflow="hidden">
              {/* Suite header */}
              <XStack
                paddingHorizontal="$3"
                paddingVertical="$2.5"
                justifyContent="space-between"
                alignItems="center"
                pressStyle={{ backgroundColor: '$gray3' }}
                onPress={() => setExpandedSuite(expandedSuite === index ? null : index)}
                cursor="pointer"
              >
                <XStack alignItems="center" gap="$2" flex={1}>
                  <Text fontSize={13} fontWeight="600">
                    {expandedSuite === index ? '▼' : '▶'}
                  </Text>
                  <Text fontSize={12} flex={1}>{suite.suiteName}</Text>
                </XStack>
                <XStack gap="$3" alignItems="center">
                  <Text fontSize={12} color={suite.failedTests > 0 ? '$red10' : '$green10'} fontWeight="600">
                    {suite.passedTests}/{suite.totalTests}
                  </Text>
                  <Text fontSize={11} color="$gray9">
                    {Math.round(suite.duration / 1000)}s
                  </Text>
                </XStack>
              </XStack>

              {/* Test case details - expanded */}
              {expandedSuite === index && suite.results && suite.results.length > 0 && (
                <YStack backgroundColor="$gray1" borderTopWidth={1} borderColor="$gray4">
                  {suite.results.map((testCase, testIndex) => (
                    <YStack
                      key={testIndex}
                      paddingHorizontal="$4"
                      paddingVertical="$2"
                      borderBottomWidth={testIndex < suite.results.length - 1 ? 1 : 0}
                      borderColor="$gray3"
                    >
                      <XStack alignItems="center" gap="$2" marginBottom="$1">
                        <Text fontSize={16}>
                          {testCase.passed ? '✅' : '❌'}
                        </Text>
                        <Text fontSize={11} fontWeight="600" flex={1}>
                          {testCase.testName || testCase.method}
                        </Text>
                        <Text fontSize={10} color="$gray8">
                          {testCase.duration}ms
                        </Text>
                      </XStack>

                      {/* Test details */}
                      <YStack paddingLeft="$6" gap="$1">
                        <XStack gap="$2">
                          <Text fontSize={10} color="$gray9" minWidth={60}>Method:</Text>
                          <Text fontSize={10} color="$gray11" fontFamily="$mono">{testCase.method}</Text>
                        </XStack>
                        <XStack gap="$2">
                          <Text fontSize={10} color="$gray9" minWidth={60}>Expected:</Text>
                          <Text fontSize={10} color="$gray11" flex={1} numberOfLines={2}>
                            {testCase.expected}
                          </Text>
                        </XStack>
                        <XStack gap="$2">
                          <Text fontSize={10} color="$gray9" minWidth={60}>Actual:</Text>
                          <Text
                            fontSize={10}
                            color={testCase.passed ? '$green11' : '$red11'}
                            flex={1}
                            numberOfLines={2}
                            fontFamily="$mono"
                          >
                            {testCase.actual || '(empty)'}
                          </Text>
                        </XStack>
                        {testCase.error && (
                          <XStack gap="$2">
                            <Text fontSize={10} color="$gray9" minWidth={60}>Error:</Text>
                            <Text
                              fontSize={10}
                              color="$red10"
                              flex={1}
                              numberOfLines={3}
                              fontFamily="$mono"
                            >
                              {testCase.error}
                            </Text>
                          </XStack>
                        )}
                      </YStack>
                    </YStack>
                  ))}
                </YStack>
              )}
            </Card>
          ))}
        </YStack>
      </YStack>
    </PanelView>
  );
}
