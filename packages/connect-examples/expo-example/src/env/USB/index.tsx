import HardwareWebSdk from '@onekeyfe/hd-web-sdk';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { CallMethods } from '../../components/CallMethods';

let isSdkInit = false;

export default function USB() {
  const sdkInit = () => {
    const settings = {
      debug: true,
      connectSrc: 'https://localhost:8088/',
    };
    HardwareWebSdk.init(settings);
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
      <CallMethods SDK={HardwareWebSdk} type="USB" />
    </View>
  );
}
