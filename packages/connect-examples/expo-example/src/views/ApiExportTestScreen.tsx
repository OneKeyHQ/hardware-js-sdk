import React from 'react';
import TestApiExport from '../testTools/apiExportTest/TestApiExport';
import { DeviceProvider } from '../provider/DeviceProvider';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';

export default function ApiExportTestScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <PanelView>
          <TestApiExport />
        </PanelView>
      </DeviceProvider>
    </PageView>
  );
}
