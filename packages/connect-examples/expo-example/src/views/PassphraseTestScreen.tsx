import React from 'react';
import PassphraseTestView from '../testTools/passphraseTest';
import PageView from '../components/ui/Page';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';

export default function PassphraseTestScreen() {
  return (
    <PageView>
      <HardwareInputPinDialogProvider>
        <PassphraseTestView />
      </HardwareInputPinDialogProvider>
    </PageView>
  );
}
