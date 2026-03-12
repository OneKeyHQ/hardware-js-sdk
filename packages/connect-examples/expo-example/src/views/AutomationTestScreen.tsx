import React, { useMemo } from 'react';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { useAtom, useAtomValue } from 'jotai';
import {
  Button,
  Card,
  Checkbox,
  Image,
  Input,
  Label,
  Separator,
  Stack,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import {
  automationConfigAtom,
  automationLogsAtom,
  automationReportAtom,
  cameraFrameAtom,
  canStartAutomationAtom,
  isAutomationRunningAtom,
  phonePilotConnectionStateAtom,
  phonePilotHealthAtom,
  progressPercentageAtom,
} from '../atoms/automationAtoms';
import AutoWrapperTextArea from '../components/ui/AutoWrapperTextArea';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';
import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import {
  ALL_PASSPHRASE_VARIANT_IDS,
  PASSPHRASE_VARIANT_INFO,
  TEST_SUITE_INFO,
} from '../services/phonePilotMcp/types';
import { useAutomationTest } from '../testTools/automationTest/useAutomationTest';

import type {
  AutomationScenario,
  AutomationScenarioId,
  AutomationTestConfig,
  ConnectionState,
  HealthCheckResponse,
  PassphraseVariantId,
  ScenarioReportResult,
  TestCaseResult,
  TestProgress,
  TestReport,
  TestSuiteResult,
  TestSuiteType,
} from '../services/phonePilotMcp/types';

const JIRA_ORDER = ['OK-26053', 'OK-26054', 'OK-5504', 'OK-40090'] as const;

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusColor(status: 'passed' | 'failed' | 'skipped' | 'idle' | 'running'): string {
  if (status === 'passed') {
    return '$green10';
  }
  if (status === 'failed') {
    return '$red10';
  }
  if (status === 'skipped') {
    return '$gray10';
  }
  return '$blue10';
}

function getConnectionColor(connectionState: ConnectionState): string {
  if (connectionState === 'connected') {
    return getStatusColor('passed');
  }
  if (connectionState === 'error') {
    return getStatusColor('failed');
  }
  return getStatusColor('running');
}

function getReadyColor(ready: boolean | null | undefined): string {
  if (ready === true) {
    return getStatusColor('passed');
  }
  if (ready === false) {
    return getStatusColor('failed');
  }
  return getStatusColor('running');
}

function formatReadyLabel(ready: boolean | null | undefined): string {
  if (ready === true) {
    return 'ready';
  }
  if (ready === false) {
    return 'not ready';
  }
  return '未检测';
}

function getCaseStatusIcon(testCase: TestCaseResult): string {
  if (testCase.skipped) {
    return '⏭️';
  }
  if (testCase.passed) {
    return '✅';
  }
  return '❌';
}

function getFrameUri(frame?: string | null): string | null {
  if (!frame) {
    return null;
  }
  return frame.startsWith('data:') ? frame : `data:image/png;base64,${frame}`;
}

function formatScenarioSuiteSummary(scenario: AutomationScenario): string {
  const labelMap: Record<TestSuiteType, string> = {
    deviceFlow: 'Device Flow',
    sdkAddressBatch: 'Address',
    sdkPubkeyBatch: 'Pubkey',
  };

  return scenario.supportedSuites.map(suiteType => labelMap[suiteType]).join(' + ');
}

function SelectableRow({
  checked,
  disabled,
  title,
  description,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description?: string;
  onToggle: () => void;
}) {
  return (
    <XStack
      alignItems="flex-start"
      gap="$3"
      padding="$3"
      borderRadius="$3"
      borderWidth={1}
      borderColor={checked ? '$blue8' : '$gray5'}
      backgroundColor={checked ? '$blue2' : '$gray1'}
      opacity={disabled ? 0.5 : 1}
      onPress={disabled ? undefined : onToggle}
      cursor={disabled ? 'not-allowed' : 'pointer'}
    >
      <Checkbox checked={checked} disabled={disabled}>
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>
      <YStack flex={1} gap="$1">
        <Text fontSize={13} fontWeight="600">
          {title}
        </Text>
        {description ? (
          <Text fontSize={12} color="$gray10">
            {description}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}

function PanelActions({
  disabled,
  onSelectAll,
  onClear,
}: {
  disabled?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <XStack gap="$2">
      <Button size="$2" onPress={onSelectAll} disabled={disabled}>
        全选
      </Button>
      <Button size="$2" theme="gray" onPress={onClear} disabled={disabled}>
        清空
      </Button>
    </XStack>
  );
}

function ReportCase({ testCase }: { testCase: TestCaseResult }) {
  return (
    <Card bordered padding="$3" backgroundColor="$gray1">
      <YStack gap="$1.5">
        <XStack justifyContent="space-between" gap="$3">
          <Text flex={1} fontSize={12} fontWeight="600">
            {getCaseStatusIcon(testCase)} {testCase.title}
          </Text>
          <Text fontSize={11} color="$gray10">
            {formatDuration(testCase.duration)}
          </Text>
        </XStack>
        {testCase.method ? (
          <Text fontSize={11} color="$gray10">
            方法: {testCase.method}
          </Text>
        ) : null}
        {testCase.expected ? (
          <Text fontSize={11} color="$gray10">
            期望: {testCase.expected}
          </Text>
        ) : null}
        {testCase.actual ? (
          <Text fontSize={11} color="$gray10">
            实际: {testCase.actual}
          </Text>
        ) : null}
        {testCase.error ? (
          <Text fontSize={11} color="$red10">
            错误: {testCase.error}
          </Text>
        ) : null}
        {testCase.metadata ? (
          <Text fontSize={11} color="$gray10">
            元数据:{' '}
            {Object.entries(testCase.metadata)
              .map(([key, value]) => `${key}=${value}`)
              .join('，')}
          </Text>
        ) : null}
      </YStack>
    </Card>
  );
}

function ReportSuite({ suite }: { suite: TestSuiteResult }) {
  return (
    <Card bordered padding="$3" backgroundColor="$bgApp">
      <YStack gap="$2">
        <YStack gap="$0.5">
          <Text fontSize={13} fontWeight="700">
            {suite.suiteName}
          </Text>
          <Text fontSize={11} color="$gray10">
            状态: <Text color={getStatusColor(suite.status)}>{suite.status}</Text> · 用例{' '}
            {suite.passedTests}/{suite.totalTests} · 耗时 {formatDuration(suite.duration)}
          </Text>
        </YStack>
        <YStack gap="$2">
          {suite.results.map(testCase => (
            <ReportCase key={`${suite.suiteType}-${testCase.title}`} testCase={testCase} />
          ))}
        </YStack>
      </YStack>
    </Card>
  );
}

function ReportScenario({ scenario }: { scenario: ScenarioReportResult }) {
  return (
    <Card bordered padding="$3" backgroundColor="$gray2">
      <YStack gap="$2.5">
        <YStack gap="$1">
          <XStack justifyContent="space-between" gap="$3">
            <Text flex={1} fontSize={14} fontWeight="700">
              {scenario.scenarioTitle}
            </Text>
            <Text fontSize={12} color={getStatusColor(scenario.status)}>
              {scenario.status}
            </Text>
          </XStack>
          <Text fontSize={11} color="$gray10">
            {scenario.jiraKey} · {scenario.flowType} · {scenario.walletType} · {scenario.caseLabel}{' '}
            · 耗时 {formatDuration(scenario.duration)}
          </Text>
        </YStack>
        <YStack gap="$2">
          {scenario.suiteResults.map(suite => (
            <ReportSuite key={`${scenario.scenarioId}-${suite.suiteType}`} suite={suite} />
          ))}
        </YStack>
      </YStack>
    </Card>
  );
}

function ConnectionPanel({
  connectionState,
  health,
  frameUri,
  onCaptureFrame,
  onConnect,
  onDisconnect,
  phonePilotUrl,
  setPhonePilotUrl,
}: {
  connectionState: ConnectionState;
  health: HealthCheckResponse | null;
  frameUri: string | null;
  onCaptureFrame: () => Promise<string | null>;
  onConnect: () => Promise<boolean>;
  onDisconnect: () => Promise<void>;
  phonePilotUrl: string;
  setPhonePilotUrl: (value: string) => void;
}) {
  const isConnected = connectionState === 'connected';
  const statusLabelMap: Record<ConnectionState, string> = {
    connected: '已连接',
    connecting: '连接中',
    disconnected: '未连接',
    error: '连接失败',
  };

  return (
    <PanelView title="PhonePilot 连接">
      <YStack gap="$3">
        <YStack gap="$2">
          <Text fontSize={12} color="$gray10">
            MCP 地址
          </Text>
          <Input
            value={phonePilotUrl}
            onChangeText={setPhonePilotUrl}
            placeholder="http://localhost:3847"
          />
        </YStack>

        <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
          <Text fontSize={13} color={getConnectionColor(connectionState)}>
            当前状态: {statusLabelMap[connectionState]}
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            <Button onPress={isConnected ? onDisconnect : onConnect}>
              {isConnected ? '断开连接' : '连接 PhonePilot'}
            </Button>
            <Button theme="gray" onPress={onCaptureFrame} disabled={!isConnected}>
              获取截图
            </Button>
          </XStack>
        </XStack>

        <Card bordered padding="$3" backgroundColor="$gray1">
          <YStack gap="$1.5">
            <Text fontSize={12} color={getReadyColor(health?.mcpReady)}>
              MCP: {formatReadyLabel(health?.mcpReady)}
            </Text>
            <Text fontSize={12} color={getReadyColor(health?.ocrReady)}>
              OCR: {formatReadyLabel(health?.ocrReady)}
            </Text>
            {health?.message ? (
              <Text fontSize={11} color="$gray10">
                健康信息: {health.message}
              </Text>
            ) : null}
            {health?.ocr?.pythonBin ? (
              <Text fontSize={11} color="$gray10">
                Python: {health.ocr.pythonBin}
                {health.ocr.pythonVersion ? ` (${health.ocr.pythonVersion})` : ''}
              </Text>
            ) : null}
            {health?.sequenceIds?.length ? (
              <Text fontSize={11} color="$gray10">
                Sequences: {health.sequenceIds.length}
              </Text>
            ) : null}
          </YStack>
        </Card>

        {frameUri ? (
          <YStack gap="$2">
            <Text fontSize={12} color="$gray10">
              最近一帧
            </Text>
            <Image
              source={{ uri: frameUri }}
              width={360}
              height={240}
              resizeMode="contain"
              borderRadius="$3"
              borderWidth={1}
              borderColor="$gray5"
            />
          </YStack>
        ) : null}
      </YStack>
    </PanelView>
  );
}

function ConfigurationPanel({
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
      const currentScenarios = groupMap.get(scenario.jiraKey) || [];
      currentScenarios.push(scenario);
      groupMap.set(scenario.jiraKey, currentScenarios);
    });

    return JIRA_ORDER.map(jiraKey => ({
      jiraKey,
      scenarios: groupMap.get(jiraKey) || [],
    }));
  }, [scenarios]);

  const selectedScenarioObjects = useMemo(
    () => scenarios.filter(item => config.scenarioIds.includes(item.id)),
    [config.scenarioIds, scenarios]
  );

  const estimatedSuiteCount = useMemo(
    () =>
      selectedScenarioObjects.reduce(
        (count, scenario) =>
          count +
          scenario.supportedSuites.filter(suiteType => config.testSuites.includes(suiteType))
            .length,
        0
      ),
    [config.testSuites, selectedScenarioObjects]
  );

  const toggleScenario = (scenarioId: AutomationScenarioId) => {
    setConfig(prev => ({
      ...prev,
      scenarioIds: toggleValue(prev.scenarioIds, scenarioId),
    }));
  };

  const toggleTestSuite = (suiteType: TestSuiteType) => {
    setConfig(prev => ({
      ...prev,
      testSuites: toggleValue(prev.testSuites, suiteType),
    }));
  };

  const togglePassphraseVariant = (variantId: PassphraseVariantId) => {
    setConfig(prev => ({
      ...prev,
      passphraseVariants: toggleValue(prev.passphraseVariants, variantId),
    }));
  };

  return (
    <PanelView title="场景与执行配置">
      <YStack gap="$4">
        <Card bordered padding="$3" backgroundColor="$gray1">
          <Text fontSize={12} color="$gray10">
            已选场景 {config.scenarioIds.length} 个 · 已选 suite {config.testSuites.length} 个 ·
            预计执行 {estimatedSuiteCount} 个 suite
          </Text>
        </Card>

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

        <Separator />

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

        <Separator />

        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
            <Text fontSize={14} fontWeight="700">
              隐藏钱包密码短语变体
            </Text>
            <PanelActions
              disabled={isRunning}
              onSelectAll={() =>
                setConfig(prev => ({
                  ...prev,
                  passphraseVariants: [...ALL_PASSPHRASE_VARIANT_IDS],
                }))
              }
              onClear={() => setConfig(prev => ({ ...prev, passphraseVariants: [] }))}
            />
          </XStack>
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={12} color="$gray10">
              当前自动化报告会展示 literal。SLIP39 约定：`passphrase_1 = 12345`，`passphrase_2 =
              onekey`。
            </Text>
          </Card>
          <YStack gap="$2">
            {ALL_PASSPHRASE_VARIANT_IDS.map(variantId => (
              <SelectableRow
                key={variantId}
                checked={config.passphraseVariants.includes(variantId)}
                disabled={isRunning}
                title={PASSPHRASE_VARIANT_INFO[variantId].label}
                description={PASSPHRASE_VARIANT_INFO[variantId].description}
                onToggle={() => togglePassphraseVariant(variantId)}
              />
            ))}
          </YStack>
        </YStack>
        <Separator />

        <YStack gap="$3">
          <Text fontSize={14} fontWeight="700">
            Runner 行为
          </Text>
          <SelectableRow
            checked={config.stopOnFirstError}
            disabled={isRunning}
            title="首错即停"
            description="默认按 suite 粒度继续执行；启用后任一场景失败即停止后续场景。"
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
              onChangeText={value =>
                setConfig(prev => ({
                  ...prev,
                  retryCount: Number(value) || 1,
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
              onChangeText={value =>
                setConfig(prev => ({
                  ...prev,
                  delayBetweenTests: Number(value) || 0,
                }))
              }
              disabled={isRunning}
            />
          </YStack>
        </YStack>
      </YStack>
    </PanelView>
  );
}

function ProgressPanel({
  canStart,
  isRunning,
  onStart,
  onStartDebug,
  onStop,
  progress,
  progressPercentage,
}: {
  canStart: boolean;
  isRunning: boolean;
  onStart: () => Promise<void>;
  onStartDebug: () => Promise<void>;
  onStop: () => Promise<void>;
  progress: TestProgress;
  progressPercentage: number;
}) {
  return (
    <PanelView title="执行进度">
      <YStack gap="$3">
        <XStack gap="$3" flexWrap="wrap">
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700">
              {progressPercentage}%
            </Text>
            <Text fontSize={11} color="$gray10">
              Suite 进度
            </Text>
          </Card>
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700">
              {progress.completedScenarios}/{progress.totalScenarios}
            </Text>
            <Text fontSize={11} color="$gray10">
              场景进度
            </Text>
          </Card>
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700">
              {progress.completedSuites}/{progress.totalSuites}
            </Text>
            <Text fontSize={11} color="$gray10">
              Suite 计数
            </Text>
          </Card>
        </XStack>

        <Card bordered padding="$3" backgroundColor="$gray1">
          <YStack gap="$1.5">
            <Text fontSize={12} color="$gray10">
              状态: {progress.status}
            </Text>
            <Text fontSize={12} color="$gray10">
              当前场景: {progress.currentScenarioTitle || '—'}
            </Text>
            <Text fontSize={12} color="$gray10">
              当前 suite: {progress.currentTestSuite || '—'}
            </Text>
            <Text fontSize={12} color="$gray10">
              当前 passphrase: {progress.currentPassphrase || '—'}
            </Text>
            {progress.errorMessage ? (
              <Text fontSize={12} color="$red10">
                错误: {progress.errorMessage}
              </Text>
            ) : null}
          </YStack>
        </Card>

        <XStack gap="$2" flexWrap="wrap">
          <Button onPress={onStart} disabled={!canStart || isRunning}>
            开始执行
          </Button>
          <Button theme="gray" onPress={onStartDebug} disabled={!canStart || isRunning}>
            跳过设备流程，仅跑校验
          </Button>
          <Button theme="gray" onPress={onStop} disabled={!isRunning}>
            停止执行
          </Button>
        </XStack>
      </YStack>
    </PanelView>
  );
}

function LogsPanel({ logs }: { logs: string[] }) {
  return (
    <PanelView title="运行日志">
      <AutoWrapperTextArea value={logs.join('\n')} editable={false} minHeight={240} />
    </PanelView>
  );
}

function ResultsPanel({ report }: { report: TestReport | null }) {
  if (!report) {
    return (
      <PanelView title="测试报告">
        <Text fontSize={12} color="$gray10">
          还没有执行结果。
        </Text>
      </PanelView>
    );
  }

  return (
    <PanelView title="测试报告">
      <YStack gap="$3">
        <XStack gap="$3" flexWrap="wrap">
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700">
              {report.totalScenarios}
            </Text>
            <Text fontSize={11} color="$gray10">
              总场景
            </Text>
          </Card>
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700" color="$green10">
              {report.passedScenarios}
            </Text>
            <Text fontSize={11} color="$gray10">
              通过
            </Text>
          </Card>
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700" color="$red10">
              {report.failedScenarios}
            </Text>
            <Text fontSize={11} color="$gray10">
              失败
            </Text>
          </Card>
          <Card bordered padding="$3" backgroundColor="$gray1">
            <Text fontSize={22} fontWeight="700" color="$gray10">
              {report.skippedScenarios}
            </Text>
            <Text fontSize={11} color="$gray10">
              跳过
            </Text>
          </Card>
        </XStack>

        <Text fontSize={12} color="$gray10">
          总耗时: {formatDuration(report.duration)}
        </Text>

        <YStack gap="$3">
          {report.scenarioResults.map(scenario => (
            <ReportScenario key={scenario.scenarioId} scenario={scenario} />
          ))}
        </YStack>
      </YStack>
    </PanelView>
  );
}

function AutomationTestScreenContent() {
  const [config, setConfig] = useAtom(automationConfigAtom);
  const cameraFrame = useAtomValue(cameraFrameAtom);
  const canStart = useAtomValue(canStartAutomationAtom);
  const connectionState = useAtomValue(phonePilotConnectionStateAtom);
  const phonePilotHealth = useAtomValue(phonePilotHealthAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);
  const logs = useAtomValue(automationLogsAtom);
  const progressPercentage = useAtomValue(progressPercentageAtom);
  const report = useAtomValue(automationReportAtom);

  const automation = useAutomationTest();

  return (
    <Stack padding="$4" gap="$4">
      <ConnectionPanel
        connectionState={connectionState}
        health={phonePilotHealth}
        frameUri={getFrameUri(cameraFrame)}
        onCaptureFrame={automation.captureFrame}
        onConnect={automation.connectPhonePilot}
        onDisconnect={automation.disconnectPhonePilot}
        phonePilotUrl={config.phonePilotUrl}
        setPhonePilotUrl={value => setConfig(prev => ({ ...prev, phonePilotUrl: value }))}
      />

      <ConfigurationPanel
        config={config}
        isRunning={isRunning}
        scenarios={automation.scenarios}
        setConfig={setConfig}
      />

      <ProgressPanel
        canStart={canStart}
        isRunning={isRunning}
        onStart={automation.startAutomation}
        onStartDebug={automation.startDebugAutomation}
        onStop={automation.stopAutomation}
        progress={automation.progress}
        progressPercentage={progressPercentage}
      />

      <LogsPanel logs={logs} />
      <ResultsPanel report={report} />
    </Stack>
  );
}

export default function AutomationTestScreen() {
  return (
    <PageView scrollable>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <AutomationTestScreenContent />
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
