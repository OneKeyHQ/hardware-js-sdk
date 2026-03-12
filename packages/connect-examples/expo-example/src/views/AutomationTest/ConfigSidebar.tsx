import { useAtom, useAtomValue } from 'jotai';
import { ScrollView, Separator, YStack } from 'tamagui';

import { automationConfigAtom, isAutomationRunningAtom } from '../../atoms/automationAtoms';
import { ScenarioSelector } from './components/ScenarioSelector';
import { SuiteSelector } from './components/SuiteSelector';
import { PassphraseSelector } from './components/PassphraseSelector';
import { RunnerBehaviorConfig } from './components/RunnerBehaviorConfig';
import { ConnectionConfig } from './components/ConnectionConfig';

import type { AutomationScenario } from '../../services/phonePilotMcp/types';

export function ConfigSidebar({
  scenarios,
  onConnect,
  onDisconnect,
}: {
  scenarios: AutomationScenario[];
  onConnect: () => Promise<boolean>;
  onDisconnect: () => Promise<void>;
}) {
  const [config, setConfig] = useAtom(automationConfigAtom);
  const isRunning = useAtomValue(isAutomationRunningAtom);

  return (
    <ScrollView
      flex={1}
      maxWidth="35%"
      minWidth={320}
      borderLeftWidth={1}
      borderColor="$gray5"
    >
      <YStack padding="$4" gap="$4">
        <ConnectionConfig
          config={config}
          setConfig={setConfig}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
        <Separator />
        <ScenarioSelector
          config={config}
          isRunning={isRunning}
          scenarios={scenarios}
          setConfig={setConfig}
        />
        <Separator />
        <SuiteSelector config={config} isRunning={isRunning} setConfig={setConfig} />
        <Separator />
        <PassphraseSelector config={config} isRunning={isRunning} setConfig={setConfig} />
        <Separator />
        <RunnerBehaviorConfig config={config} isRunning={isRunning} setConfig={setConfig} />
      </YStack>
    </ScrollView>
  );
}
