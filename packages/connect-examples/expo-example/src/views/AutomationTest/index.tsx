import { useAtom, useAtomValue } from 'jotai';
import { Button, Separator, Stack, Text, XStack, YStack } from 'tamagui';

import PageView from '../../components/ui/Page';
import PanelView from '../../components/ui/Panel';
import { DeviceProvider } from '../../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../../provider/HardwareInputPinProvider';
import { useAutomationTest } from '../../testTools/automationTest/useAutomationTest';
import {
  automationConfigAtom,
  automationProgressAtom,
  canStartAutomationAtom,
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
import { CurrentScenarioCard } from './components/CurrentScenarioCard';
import { ReportTree } from './components/ReportTree';
import { LogsSection } from './components/LogsSection';

function AutomationTestContent() {
  const automation = useAutomationTest();
  const [config, setConfig] = useAtom(automationConfigAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);
  const connectionState = useAtomValue(phonePilotConnectionStateAtom);
  const canStart = useAtomValue(canStartAutomationAtom);
  const progress = useAtomValue(automationProgressAtom);
  const progressPercentage = useAtomValue(progressPercentageAtom);

  return (
    <PageView>
      <Stack gap="$2" padding="$2">
        {/* Panel 1: Connection & Control */}
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
                size="$2"
                onPress={automation.startAutomation}
                disabled={!canStart || isRunning}
              >
                开始
              </Button>
              <Button
                size="$2"
                theme="gray"
                onPress={automation.startDebugAutomation}
                disabled={!canStart || isRunning}
              >
                仅校验
              </Button>
              <Button
                size="$2"
                theme="gray"
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
        </PanelView>

        {/* Panel 2: Test Configuration */}
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

        {/* Panel 3: Current Progress */}
        <CurrentScenarioCard />

        {/* Panel 4: Report */}
        <PanelView title="测试报告">
          <ReportTree />
        </PanelView>

        {/* Panel 5: Logs */}
        <PanelView title="运行日志">
          <LogsSection />
        </PanelView>
      </Stack>
    </PageView>
  );
}

export default function AutomationTestScreen() {
  return (
    <DeviceProvider>
      <HardwareInputPinDialogProvider>
        <AutomationTestContent />
      </HardwareInputPinDialogProvider>
    </DeviceProvider>
  );
}
