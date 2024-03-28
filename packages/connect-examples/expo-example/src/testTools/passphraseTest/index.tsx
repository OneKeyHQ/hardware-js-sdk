import { Stack } from 'tamagui';
import { DeviceProvider } from '../../provider/DeviceProvider';

import TestSessionCountView from './TestSessionCountView';
import { TestSwitchPassphraseWallet } from './TestSwitchPassphraseWallet';
import { TestSpecialPassphraseWallet } from './TestSpecialPassphraseWallet';

export default function PassphraseTestScreen() {
  return (
    <Stack>
      <DeviceProvider>
        <Stack>
          <TestSessionCountView />
          <TestSwitchPassphraseWallet />
          <TestSpecialPassphraseWallet />
        </Stack>
      </DeviceProvider>
    </Stack>
  );
}
