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
import { StandaloneSuiteSelector } from './components/StandaloneSuiteSelector';
import { PassphraseSelector } from './components/PassphraseSelector';
import { RunnerBehaviorConfig } from './components/RunnerBehaviorConfig';
import { SingleCasePanel } from './components/SingleCasePanel';
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
            <XStack alignItems="center" gap="$2" flexWrap="wrap" minHeight={34}>
              <Button
                size="$3"
                theme="green"
                height={34}
                borderRadius="$2"
                paddingHorizontal="$3"
                onPress={automation.startAutomation}
                disabled={!canStart || isRunning}
              >
                开始
              </Button>
              <Button
                size="$3"
                theme="red"
                height={34}
                borderRadius="$2"
                paddingHorizontal="$3"
                onPress={automation.stopAutomation}
                disabled={!isRunning}
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
                <Text fontSize={12} color="$gray10">
                  状态: {progress.status}
                </Text>
                <Text fontSize={12} color="$gray10">
                  {progress.currentScenarioTitle || '—'}
                </Text>
                {progress.currentPassphrase ? (
                  <Text fontSize={12} color="$gray10">
                    PP: {progress.currentPassphrase}
                  </Text>
                ) : null}
                {progress.errorMessage ? (
                  <Text fontSize={12} color="$red10">
                    错误: {progress.errorMessage}
                  </Text>
                ) : null}
              </XStack>
            )}
          </YStack>
        </XStack>
      </PanelView>

      {/* Two-column layout: config left, report+logs right */}
      <XStack gap="$3" alignItems="stretch">
        {/* Left: Config (35%) */}
        <YStack width="35%" minWidth={280}>
          <PanelView title="测试配置">
            <ScrollView height={680} showsVerticalScrollIndicator>
              <YStack gap="$3">
                <YStack
                  gap="$2.5"
                  padding="$2.5"
                  borderWidth={1}
                  borderColor="$gray4"
                  borderRadius="$4"
                >
                  <Text fontSize={15} fontWeight="700">
                    地址 / 公钥校验模块
                  </Text>
                  <ScenarioSelector
                    config={config}
                    isRunning={isRunning}
                    scenarios={automation.scenarios}
                    setConfig={setConfig}
                  />
                  <Separator marginVertical="$1" />
                  <SuiteSelector config={config} isRunning={isRunning} setConfig={setConfig} />
                  <Separator marginVertical="$1" />
                  <PassphraseSelector config={config} isRunning={isRunning} setConfig={setConfig} />
                </YStack>
                <StandaloneSuiteSelector
                  config={config}
                  isRunning={isRunning}
                  setConfig={setConfig}
                  suiteType="securityCheck"
                />
                <StandaloneSuiteSelector
                  config={config}
                  isRunning={isRunning}
                  setConfig={setConfig}
                  suiteType="chainMethodBatch"
                />
                <Separator marginVertical="$1" />
                <RunnerBehaviorConfig config={config} isRunning={isRunning} setConfig={setConfig} />
                <Separator marginVertical="$1" />
                <SingleCasePanel
                  isRunning={isRunning}
                  onRunSecurityCheckCase={automation.runSingleSecurityCheckCase}
                  onRunChainMethodCase={automation.runSingleChainMethodCase}
                />
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
                  <Button
                    size="$3"
                    theme="gray"
                    height={34}
                    borderRadius="$2"
                    paddingHorizontal="$3"
                    onPress={handleExportReport}
                  >
                    导出 JSON
                  </Button>
                  <Button
                    size="$3"
                    theme="red"
                    height={34}
                    borderRadius="$2"
                    paddingHorizontal="$3"
                    onPress={handleExportFailures}
                  >
                    导出失败用例
                  </Button>
                </XStack>
              )}
            </XStack>
            <ScrollView height={680} marginTop="$3" showsVerticalScrollIndicator>
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
