import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { CallMethods } from '../../components/CallMethods';
import { getHardwareSDKInstance } from '../../utils/hardwareInstance';

let isSdkInit = false;
export default function USB() {
  const [sdk, createSDK] = React.useState<CoreApi>();
  const sdkInit = () => {
    getHardwareSDKInstance().then(res => {
      createSDK(res);
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
      {sdk && <CallMethods SDK={sdk} type="USB" />}
    </View>
  );
}
