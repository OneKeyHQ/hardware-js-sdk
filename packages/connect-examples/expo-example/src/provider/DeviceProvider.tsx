import React, { createContext, useState, useCallback, useContext, useMemo, memo } from 'react';
import { View } from 'react-native';
import type { Device } from '../components/DeviceList';
import { DeviceList } from '../components/DeviceList';

interface DeviceContextState {
  selectedDevice: Device | null;
  setSelectedDevice?: (device: Device | null) => void;
}

const defaultState: DeviceContextState = {
  selectedDevice: null,
};

export const DeviceContext = createContext<DeviceContextState>(defaultState);

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(defaultState.selectedDevice);

  const providerValue = useMemo(
    () => ({
      selectedDevice,
      setSelectedDevice,
    }),
    [selectedDevice, setSelectedDevice]
  );

  const childMemo = useMemo(() => children, [children]);

  return (
    <DeviceContext.Provider value={providerValue}>
      <>
        <DeviceList onSelected={setSelectedDevice} />
        {childMemo}
      </>
    </DeviceContext.Provider>
  );
};
