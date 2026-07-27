import React from 'react';
import { Stack } from 'tamagui';
import { useIntl } from 'react-intl';

import { DeviceProvider } from '../provider/DeviceProvider';
import { CommonParamsProvider } from '../provider/CommonParamsProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';
import ChainMethodTest from '../testTools/chainMethodTest';

export default function ChainMethodTestScreen() {
  const intl = useIntl();

  return (
    <PageView>
      <CommonParamsProvider>
        <DeviceProvider>
          <HardwareInputPinDialogProvider>
            <Stack>
              <PanelView title={intl.formatMessage({ id: 'tab__chain_method_test' })}>
                <ChainMethodTest />
              </PanelView>
            </Stack>
          </HardwareInputPinDialogProvider>
        </DeviceProvider>
      </CommonParamsProvider>
    </PageView>
  );
}
