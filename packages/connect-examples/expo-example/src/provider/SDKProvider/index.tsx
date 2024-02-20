import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect, useMemo, useState } from 'react';
import { Usb } from '@tamagui/lucide-icons';
import { LowLevelCoreApi } from '@onekeyfe/hd-core/dist/lowLevelInject';
import { Stack, Text } from 'tamagui';
import { getHardwareSDKInstance } from '../../utils/hardwareInstance';
import HardwareSDKContext from '../HardwareSDKContext';

let isSdkInit = false;
export default function USB({ children }: { children: React.ReactNode }) {
  const [sdk, createSDK] = useState<CoreApi>();
  const [lowLevelSDK, createLowLevelSDK] = useState<LowLevelCoreApi>();
  const [useLowLevelApi, setUseLowLevelApi] = useState<boolean>(false);
  const sdkInit = () => {
    getHardwareSDKInstance().then(res => {
      createSDK(res.HardwareSDK);
      createLowLevelSDK(res.HardwareLowLevelSDK);
      setUseLowLevelApi(res.useLowLevelApi);
    });
  };

  useEffect(() => {
    if (!isSdkInit) {
      sdkInit();
    }
    isSdkInit = true;
  }, []);

  const showContent = useMemo(() => {
    if (useLowLevelApi) {
      return lowLevelSDK && sdk;
    }
    return sdk;
  }, [lowLevelSDK, sdk, useLowLevelApi]);

  const contextValue = React.useMemo(
    () => ({
      sdk,
      lowLevelSDK,
      type: 'USB' as const,
    }),
    [sdk, lowLevelSDK]
  );

  return (
    <HardwareSDKContext.Provider value={contextValue}>
      <Stack flex={1}>
        <Stack flexDirection="row" gap="$2" paddingHorizontal="$2">
          <Usb />
          <Text>SDK {showContent ? 'Loading complete' : 'Loading...'}</Text>
        </Stack>
        {children}
      </Stack>
    </HardwareSDKContext.Provider>
  );
}
