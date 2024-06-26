import React from 'react';
import PageView from '../components/ui/Page';
import { BlindSignatureChainCheck } from '../testTools/securityCheckTest/blindSignature';
import PanelView from '../components/ui/Panel';
import { DeviceProvider } from '../provider/DeviceProvider';

export default function SecurityCheckScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <PanelView>
          <BlindSignatureChainCheck />
        </PanelView>
      </DeviceProvider>
    </PageView>
  );
}
