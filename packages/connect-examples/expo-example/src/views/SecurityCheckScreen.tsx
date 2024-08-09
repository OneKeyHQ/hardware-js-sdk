import React from 'react';
import PageView from '../components/ui/Page';
import { BlindSignatureChainCheck } from '../testTools/securityCheckTest/blindSignature';
import PanelView from '../components/ui/Panel';
import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';

export default function SecurityCheckScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <PanelView>
          <HardwareInputPinDialogProvider>
            <BlindSignatureChainCheck />
          </HardwareInputPinDialogProvider>
        </PanelView>
      </DeviceProvider>
    </PageView>
  );
}
