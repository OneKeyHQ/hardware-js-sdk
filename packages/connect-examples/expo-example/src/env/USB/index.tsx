import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { LowLevelCoreApi } from '@onekeyfe/hd-core/dist/lowLevelInject';
import { CallMethods } from '../../components/CallMethods';
import { getHardwareSDKInstance } from '../../utils/hardwareInstance';

let isSdkInit = false;
export default function USB() {
  const [sdk, createSDK] = React.useState<CoreApi>();
  const [lowLevelSDK, createLowLevelSDK] = React.useState<LowLevelCoreApi>();
  const sdkInit = () => {
    getHardwareSDKInstance().then(res => {
      createSDK(res.HardwareSDK);
      createLowLevelSDK(res.HardwareLowLevelSDK);
    });
  };

  useEffect(() => {
    if (!isSdkInit) {
      sdkInit();
    }
    isSdkInit = true;
  }, []);

  return (
    <View>
      <Text>This is USB example page, will run on desktop browser. </Text>
      {lowLevelSDK && sdk && <CallMethods SDK={sdk} HardwareLowLevelSDK={lowLevelSDK} type="USB" />}
    </View>
  );
}
