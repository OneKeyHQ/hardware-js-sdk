import { CoreApi } from '@onekeyfe/hd-core';
import { useState, useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { LowLevelCoreApi } from '@onekeyfe/hd-core/dist/lowLevelInject';
import { CallMethods } from '../../components/CallMethods';
import { getHardwareSDKInstance } from '../../utils/hardwareInstance';

let isSdkInit = false;
export default function USB() {
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

  return (
    <View>
      <Text>This is USB example page, will run on desktop browser. </Text>
      {showContent && <CallMethods SDK={sdk} HardwareLowLevelSDK={lowLevelSDK} type="USB" />}
    </View>
  );
}
