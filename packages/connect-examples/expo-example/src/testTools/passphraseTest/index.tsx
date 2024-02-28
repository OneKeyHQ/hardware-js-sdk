import { Stack } from 'tamagui';
import { DeviceProvider } from '../../provider/DeviceProvider';

import TestSessionView from './TestSessionCountView';
import { TestSwitchPassphraseWallet } from './TestSwitchPassphraseWallet';

export default function PassphraseTestScreen() {
  return (
    <Stack>
      <DeviceProvider>
        <Stack>
          <TestSessionView />
          <TestSwitchPassphraseWallet />
        </Stack>
      </DeviceProvider>
    </Stack>
  );
}
