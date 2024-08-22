import React from 'react';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';
import { DeviceProvider } from '../provider/DeviceProvider';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';
import { InitDurationTest } from '../testTools/functionalTesting/initDuration/InitDurationTest';
import { LockDeviceTest } from '../testTools/functionalTesting/lockDevice/LockDeviceTest';
import { InitDeviceTest } from '../testTools/functionalTesting/lockDevice/InitDeviceTest';
import { BootDeviceTest } from '../testTools/functionalTesting/lockDevice/BootloaderDeviceTest';

export default function FunctionalTestingScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <PanelView>
            <InitDurationTest />
          </PanelView>
          <PanelView>
            <LockDeviceTest />
            <InitDeviceTest />
            <BootDeviceTest />
          </PanelView>
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
