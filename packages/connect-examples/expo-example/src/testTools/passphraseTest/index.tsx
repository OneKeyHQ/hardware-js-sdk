import { Stack } from 'tamagui';
import { DeviceProvider } from '../../provider/DeviceProvider';

import TestSessionView from './TestSessionCountView';
import { TestSwitchPassphraseWallet } from './TestSwitchPassphraseWallet';
import { TestSpecialPassphraseWallet } from './TestSpecialPassphraseWallet';

export default function PassphraseTestScreen() {
  return (
    <Stack>
      <DeviceProvider>
        <Stack>
          <TestSessionView />
          <TestSwitchPassphraseWallet />
          <TestSpecialPassphraseWallet />
        </Stack>
      </DeviceProvider>
    </Stack>
  );
}
