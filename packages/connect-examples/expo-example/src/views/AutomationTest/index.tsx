import { XStack } from 'tamagui';

import PageView from '../../components/ui/Page';
import { DeviceProvider } from '../../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../../provider/HardwareInputPinProvider';
import { useAutomationTest } from '../../testTools/automationTest/useAutomationTest';
import { StickyHeaderBar } from './StickyHeaderBar';
import { LiveOutputPanel } from './LiveOutputPanel';
import { ConfigSidebar } from './ConfigSidebar';

function AutomationTestContent() {
  const automation = useAutomationTest();

  return (
    <PageView scrollable={false}>
      <StickyHeaderBar
        onStart={automation.startAutomation}
        onStartDebug={automation.startDebugAutomation}
        onStop={automation.stopAutomation}
      />
      <XStack flex={1}>
        <LiveOutputPanel />
        <ConfigSidebar
          scenarios={automation.scenarios}
          onConnect={automation.connectPhonePilot}
          onDisconnect={automation.disconnectPhonePilot}
        />
      </XStack>
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
