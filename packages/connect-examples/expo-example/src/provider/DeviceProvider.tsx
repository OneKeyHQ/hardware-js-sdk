import React, { createContext, useState, useCallback, useContext, useMemo, memo } from 'react';
import { View } from 'react-native';
import type { Device } from '../components/DeviceList';
import { DeviceList } from '../components/DeviceList';

interface DeviceContextState {
  selectedDevice: Device | null;
}

const defaultState: DeviceContextState = {
  selectedDevice: null,
};

const DeviceContext = createContext<DeviceContextState>(defaultState);

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(defaultState.selectedDevice);

  const providerValue = useMemo(
    () => ({
      selectedDevice,
    }),
    [selectedDevice]
  );

  const childMemo = useMemo(() => children, [children]);

  return (
    <DeviceContext.Provider value={providerValue}>
      <View>
        <DeviceList onSelected={setSelectedDevice} />
        {childMemo}
      </View>
    </DeviceContext.Provider>
  );
};
