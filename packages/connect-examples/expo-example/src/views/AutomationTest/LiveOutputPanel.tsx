import { ScrollView, YStack } from 'tamagui';

import { CurrentScenarioCard } from './components/CurrentScenarioCard';
import { ReportTree } from './components/ReportTree';
import { LogsSection } from './components/LogsSection';

export function LiveOutputPanel() {
  return (
    <ScrollView flex={1}>
      <YStack padding="$4" gap="$4">
        <CurrentScenarioCard />
        <ReportTree />
        <LogsSection />
      </YStack>
    </ScrollView>
  );
}
