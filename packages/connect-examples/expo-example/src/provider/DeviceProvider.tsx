import React, { createContext, useState, useContext, useMemo, memo, useEffect } from 'react';

import { Stack } from 'tamagui';
import type { Device } from '../components/DeviceList';
import { DeviceList } from '../components/DeviceList';

interface DeviceContextState {
  selectedDevice: Device | undefined;
}

const defaultState: DeviceContextState = {
  selectedDevice: undefined,
};

const DeviceContext = createContext<DeviceContextState>(defaultState);

export const useDevice = () => useContext(DeviceContext);

function DeviceProviderContent({ children }: { children: React.ReactNode }) {
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(
    defaultState.selectedDevice
  );

  const providerValue = useMemo(
    () => ({
      selectedDevice,
    }),
    [selectedDevice]
  );

  const childMemo = useMemo(() => children, [children]);

  return (
    <DeviceContext.Provider value={providerValue}>
      <Stack padding="$2">
        <DeviceList onSelected={setSelectedDevice} />
        {childMemo}
      </Stack>
    </DeviceContext.Provider>
  );
}

export const DeviceProvider = memo(DeviceProviderContent);
