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

  const downloadJson = useCallback((data: unknown, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportReport = useCallback(() => {
    if (!report) return;
    downloadJson(
      report,
      `automation-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    );
  }, [report, downloadJson]);

  const handleExportFailures = useCallback(() => {
    if (!report) return;
    const failures: Array<{
      scenario: string;
      suite: string;
      method?: string;
      title: string;
      expected?: string;
      actual?: string;
      error?: string;
      passphrase?: string;
    }> = [];
    for (const scenario of report.scenarioResults) {
      for (const suite of scenario.suiteResults) {
        for (const r of suite.results) {
          if (!r.passed && !r.skipped) {
            failures.push({
              scenario: scenario.scenarioTitle,
              suite: suite.suiteName,
              method: r.method,
              title: r.title,
              expected: r.expected,
              actual: r.actual,
              error: r.error,
              passphrase: r.metadata?.passphrase,
            });
          }
        }
      }
    }
    downloadJson(
      { totalFailures: failures.length, failures },
      `automation-failures-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    );
  }, [report, downloadJson]);

  return (
    <Stack>
      {/* Control Bar */}
      <PanelView title="自动化测试控制">
        <XStack gap="$4" alignItems="flex-start" flexWrap="wrap">
          {/* Left: connection config */}
          <YStack flex={1} minWidth={260}>
            <ConnectionConfig
              config={config}
              setConfig={setConfig}
              onConnect={automation.connectPhonePilot}
              onDisconnect={automation.disconnectPhonePilot}
            />
          </YStack>
          {/* Right: run controls + progress */}
          <YStack flex={1} minWidth={260} gap="$2">
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Button
                size="$3"
                height={34}
                borderRadius="$2"
                paddingHorizontal="$3"
                backgroundColor={(!canStart || isRunning) ? '$gray5' : '$green9'}
                color={(!canStart || isRunning) ? '$gray10' : 'white'}
                hoverStyle={(!canStart || isRunning) ? {} : { opacity: 0.8 }}
                cursor={(!canStart || isRunning) ? 'not-allowed' : 'pointer'}
                onPress={automation.startAutomation}
                disabled={!canStart || isRunning}
                opacity={(!canStart || isRunning) ? 0.6 : 1}
              >
                开始
              </Button>
              <Button
                size="$3"
                height={34}
                borderRadius="$2"
                paddingHorizontal="$3"
                backgroundColor={!isRunning ? '$gray5' : '$red9'}
                color={!isRunning ? '$gray10' : 'white'}
                hoverStyle={!isRunning ? {} : { opacity: 0.8 }}
                cursor={!isRunning ? 'not-allowed' : 'pointer'}
                onPress={automation.stopAutomation}
                disabled={!isRunning}
                opacity={!isRunning ? 0.6 : 1}
              >
                停止
              </Button>
              <XStack flex={1} alignItems="center" gap="$2" minWidth={200}>
                <ProgressBar percentage={progressPercentage} />
                <Text fontSize={12} color="$gray10" minWidth={28} textAlign="right">
                  {progressPercentage}%
                </Text>
                <Text fontSize={12} color="$gray10">
                  场景 {progress.completedScenarios}/{progress.totalScenarios}
                </Text>
                <Text fontSize={12} color="$gray10">
                  用例 {progress.completedTests}/{progress.totalTests}
                </Text>
              </XStack>
            </XStack>
            {progress.status !== 'idle' && (
              <XStack gap="$3" flexWrap="wrap">
                <Text fontSize={12} color="$gray10">状态: {progress.status}</Text>
                <Text fontSize={12} color="$gray10">{progress.currentScenarioTitle || '—'}</Text>
                {progress.currentPassphrase ? (
                  <Text fontSize={12} color="$gray10">PP: {progress.currentPassphrase}</Text>
                ) : null}
                {progress.errorMessage ? (
                  <Text fontSize={12} color="$red10">错误: {progress.errorMessage}</Text>
                ) : null}
              </XStack>
            )}
          </YStack>
        </XStack>
      </PanelView>

      {/* Two-column layout: config left, report+logs right */}
      <XStack gap="$3" alignItems="flex-start">
        {/* Left: Config (35%) */}
        <YStack width="35%" minWidth={280}>
          <PanelView title="测试配置">
            <ScrollView maxHeight="80vh" showsVerticalScrollIndicator>
              <YStack gap="$0">
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
              </YStack>
            </ScrollView>
          </PanelView>
        </YStack>

        {/* Right: Report + Logs (65%) */}
        <YStack flex={1}>
          <PanelView>
            <XStack justifyContent="space-between" alignItems="center">
              <TabSelector tabs={REPORT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
              {report && (
                <XStack gap="$2">
                  <Button size="$2" theme="gray" onPress={handleExportReport}>
                    导出 JSON
                  </Button>
                  <Button size="$2" theme="red" onPress={handleExportFailures}>
                    导出失败用例
                  </Button>
                </XStack>
              )}
            </XStack>
            <ScrollView maxHeight="80vh" marginTop="$3" showsVerticalScrollIndicator>
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
