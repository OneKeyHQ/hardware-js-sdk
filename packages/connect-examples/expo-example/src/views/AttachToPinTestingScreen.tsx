import React from 'react';
import PageView from '../components/ui/Page';

import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import { AttachToPinTestProvider } from '../testTools/attachToPinTest';

export default function AttachToPinTestingScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <AttachToPinTestProvider />
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
