import { createContext } from 'react';

import type { CoreApi } from '@onekeyfe/hd-core';
import type { LowLevelCoreApi } from '@onekeyfe/hd-core/dist/lowLevelInject';

export default createContext<{
  type: 'Bluetooth' | 'USB';
  sdk: CoreApi | undefined;
  lowLevelSDK: LowLevelCoreApi | undefined;
}>({
  sdk: undefined,
  type: 'USB',
  lowLevelSDK: undefined,
});
