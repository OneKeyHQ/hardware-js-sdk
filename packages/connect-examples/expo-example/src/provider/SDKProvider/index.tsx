import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LowLevelCoreApi } from '@onekeyfe/hd-core/dist/lowLevelInject';
import { getHardwareSDKInstance } from '../../utils/hardwareInstance';
import HardwareSDKContext from '../HardwareSDKContext';
import PlaygroundManager from '../../components/PlaygroundManager';

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
      <View style={styles.container}>
        <Text>This is USB example page, will run on desktop browser. </Text>
        <Text>{showContent ? 'SDK loading complete' : 'SDK loading...'}</Text>
        {children}
        {/* {showContent && <CallMethods />} */}
      </View>
    </HardwareSDKContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
