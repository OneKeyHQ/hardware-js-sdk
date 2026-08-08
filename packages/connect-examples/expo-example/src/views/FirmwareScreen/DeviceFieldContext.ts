// create context save feature onekeyFeature

// Path: packages/connect-examples/expo-example/src/views/FirmwareScreen/DeviceFieldContext.ts
// Compare this snippet from packages/connect-examples/expo-example/src/views/FirmwareScreen/DeviceField.tsx:

import { createContext, useContext } from 'react';

import type { DeviceState, Features, OnekeyFeatures } from '@onekeyfe/hd-core';

export const DeviceFieldContext = createContext<{
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
  deviceState?: DeviceState;
}>({
  features: undefined,
  onekeyFeatures: undefined,
  deviceState: undefined,
});

export function useDeviceFieldContext() {
  return useContext(DeviceFieldContext);
}
