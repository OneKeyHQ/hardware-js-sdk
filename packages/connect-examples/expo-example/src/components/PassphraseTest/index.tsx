import { Stack } from 'tamagui';
import { DeviceProvider } from '../../provider/DeviceProvider';

import TestSessionView from './TestSessionView';
import TestWalletChangeView from './TestWalletChangeView';
import TestMultiWalletChangeView from './TestMultiWalletChangeView';

export default function PassphraseTestScreen() {
  return (
    <Stack>
      <DeviceProvider>
        <Stack>
          <TestSessionView />
          <TestWalletChangeView />
          <TestMultiWalletChangeView />
        </Stack>
      </DeviceProvider>
    </Stack>
  );
}
