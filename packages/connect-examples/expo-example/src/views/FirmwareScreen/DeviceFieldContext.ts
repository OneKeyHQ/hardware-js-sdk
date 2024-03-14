// create context save feature onekeyFeature

// Path: packages/connect-examples/expo-example/src/views/FirmwareScreen/DeviceFieldContext.ts
// Compare this snippet from packages/connect-examples/expo-example/src/views/FirmwareScreen/DeviceField.tsx:

import { createContext, useContext } from 'react';
import type { Features, OnekeyFeatures } from '@onekeyfe/hd-core';

export const DeviceFieldContext = createContext<{
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
}>({
  features: undefined,
  onekeyFeatures: undefined,
});

export function useDeviceFieldContext() {
  return useContext(DeviceFieldContext);
}
