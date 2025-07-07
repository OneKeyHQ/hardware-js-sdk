import React from 'react';
import PageView from '../components/ui/Page';

import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import { AttachToPinTestProvider } from '../testTools/attachToPinTest';
import { HardwarePassphraseDialogProvider } from '../provider/HardwarePassphraseProvider';

export default function AttachToPinTestingScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <HardwarePassphraseDialogProvider>
            <AttachToPinTestProvider />
          </HardwarePassphraseDialogProvider>
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
