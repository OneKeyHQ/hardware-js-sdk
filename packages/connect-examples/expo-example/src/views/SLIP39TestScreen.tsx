import React from 'react';
import { Stack } from 'tamagui';
import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';

// Import all SLIP39 test components
import { SLIP39AddressValidation } from '../testTools/slip39Test/SLIP39AddressValidation';
import { SLIP39BatchTest } from '../testTools/slip39Test/SLIP39BatchTest';

export default function SLIP39TestScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <Stack gap="$4">
            {/* 上半部分 - 统一验证 */}
            <PanelView>
              <SLIP39AddressValidation />
            </PanelView>

            {/* 下半部分 - 批量测试 */}
            <PanelView>
              <SLIP39BatchTest />
            </PanelView>
          </Stack>
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
