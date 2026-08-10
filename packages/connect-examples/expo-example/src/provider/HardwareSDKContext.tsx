import { createContext } from 'react';

import type { CoreApi } from '@onekeyfe/hd-core';
import type { LowLevelCoreApi } from '@onekeyfe/hd-core/dist/lowLevelInject';
import type { ConnectionType } from '../utils/hardwareInstance';

export default createContext<{
  type: 'Bluetooth' | 'USB';
  sdk: CoreApi | undefined;
  lowLevelSDK: LowLevelCoreApi | undefined;
  connectionType?: ConnectionType;
}>({
  sdk: undefined,
  type: 'USB',
  lowLevelSDK: undefined,
});
