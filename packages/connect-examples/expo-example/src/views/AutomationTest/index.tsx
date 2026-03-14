import { useCallback, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button, ScrollView, Separator, Stack, Text, XStack, YStack } from 'tamagui';

import PageView from '../../components/ui/Page';
import PanelView from '../../components/ui/Panel';
import { DeviceProvider } from '../../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../../provider/HardwareInputPinProvider';
import { useAutomationTest } from '../../testTools/automationTest/useAutomationTest';
import {
  automationConfigAtom,
  automationProgressAtom,
  canStartAutomationAtom,
  effectiveReportAtom,
  isAutomationRunningAtom,
  phonePilotConnectionStateAtom,
  progressPercentageAtom,
} from '../../atoms/automationAtoms';
import { getConnectionColor } from './utils';
import { ProgressBar } from './components/ProgressBar';
import { ConnectionConfig } from './components/ConnectionConfig';
import { ScenarioSelector } from './components/ScenarioSelector';
import { SuiteSelector } from './components/SuiteSelector';
import { PassphraseSelector } from './components/PassphraseSelector';
import { RunnerBehaviorConfig } from './components/RunnerBehaviorConfig';
import { ReportTree } from './components/ReportTree';
import { LogsSection } from './components/LogsSection';
import { TabSelector } from './components/TabSelector';

const REPORT_TABS = [
  { id: 'report', label: '测试报告' },
  { id: 'logs', label: '运行日志' },
];

function AutomationTestContent() {
  const automation = useAutomationTest();
  const [config, setConfig] = useAtom(automationConfigAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);
  const connectionState = useAtomValue(phonePilotConnectionStateAtom);
  const canStart = useAtomValue(canStartAutomationAtom);
  const progress = useAtomValue(automationProgressAtom);
  const progressPercentage = useAtomValue(progressPercentageAtom);
  const report = useAtomValue(effectiveReportAtom);
  const [activeTab, setActiveTab] = useState('report');

  const handleExportReport = useCallback(() => {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <Stack>
      {/* Control Bar */}
      <PanelView title="自动化测试控制">
        <ConnectionConfig
          config={config}
          setConfig={setConfig}
          onConnect={automation.connectPhonePilot}
          onDisconnect={automation.disconnectPhonePilot}
        />
        <Separator marginVertical="$2" />
        <XStack alignItems="center" gap="$3" flexWrap="wrap">
          <Stack
            width={10}
            height={10}
            borderRadius={5}
            backgroundColor={getConnectionColor(connectionState)}
          />
          <XStack gap="$2">
            <Button
              size="$4"
              theme="green"
              onPress={automation.startAutomation}
              disabled={!canStart || isRunning}
            >
              开始
            </Button>
            <Button
              size="$4"
              theme="blue"
              onPress={automation.startDebugAutomation}
              disabled={!canStart || isRunning}
            >
              仅校验
            </Button>
            <Button
              size="$4"
              theme="red"
              onPress={automation.stopAutomation}
              disabled={!isRunning}
            >
              停止
            </Button>
          </XStack>
          <XStack flex={1} alignItems="center" gap="$2" minWidth={200}>
            <ProgressBar percentage={progressPercentage} />
            <Text fontSize={12} color="$gray10" minWidth={40} textAlign="right">
              {progressPercentage}%
            </Text>
          </XStack>
          <XStack gap="$3">
            <Text fontSize={12} color="$gray10">
              场景 {progress.completedScenarios}/{progress.totalScenarios}
            </Text>
            <Text fontSize={12} color="$gray10">
              Suite {progress.completedSuites}/{progress.totalSuites}
            </Text>
          </XStack>
        </XStack>
        {/* Inline current scenario info */}
        {progress.status !== 'idle' && (
          <XStack gap="$4" marginTop="$2" flexWrap="wrap">
            <Text fontSize={12} color="$gray10">
              状态: {progress.status}
            </Text>
            <Text fontSize={12} color="$gray10">
              场景: {progress.currentScenarioTitle || '—'}
            </Text>
            <Text fontSize={12} color="$gray10">
              Suite: {progress.currentTestSuite || '—'}
            </Text>
            <Text fontSize={12} color="$gray10">
              Passphrase: {progress.currentPassphrase || '—'}
            </Text>
            {progress.errorMessage ? (
              <Text fontSize={12} color="$red10">
                错误: {progress.errorMessage}
              </Text>
            ) : null}
          </XStack>
        )}
      </PanelView>

      {/* Two-column layout: config left, report+logs right */}
      <XStack gap="$3">
        {/* Left: Config (35%) */}
        <YStack width="35%" minWidth={280}>
          <PanelView title="测试配置">
            <ScenarioSelector
              config={config}
              isRunning={isRunning}
              scenarios={automation.scenarios}
              setConfig={setConfig}
            />
            <Separator marginVertical="$2" />
            <SuiteSelector config={config} isRunning={isRunning} setConfig={setConfig} />
            <Separator marginVertical="$2" />
            <PassphraseSelector config={config} isRunning={isRunning} setConfig={setConfig} />
            <Separator marginVertical="$2" />
            <RunnerBehaviorConfig config={config} isRunning={isRunning} setConfig={setConfig} />
          </PanelView>
        </YStack>

        {/* Right: Report + Logs (65%) */}
        <YStack flex={1}>
          <PanelView>
            <XStack justifyContent="space-between" alignItems="center">
              <TabSelector tabs={REPORT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
              {report && (
                <Button size="$2" theme="gray" onPress={handleExportReport}>
                  导出 JSON
                </Button>
              )}
            </XStack>
            <ScrollView height={600} marginTop="$3" showsVerticalScrollIndicator>
              {activeTab === 'report' ? <ReportTree /> : <LogsSection />}
            </ScrollView>
          </PanelView>
        </YStack>
      </XStack>
    </Stack>
  );
}

export default function AutomationTestScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <AutomationTestContent />
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
