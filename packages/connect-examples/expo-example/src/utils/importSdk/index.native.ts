import HardwareSDK from '@onekeyfe/hd-ble-sdk';

import type { TestApi } from '@onekeyfe/hd-core';

export const importSdk = async () => Promise.resolve(HardwareSDK as unknown as TestApi);
