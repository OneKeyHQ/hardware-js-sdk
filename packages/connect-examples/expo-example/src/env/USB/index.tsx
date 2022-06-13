import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { CallMethods } from '../../components/CallMethods';

let isSdkInit = false;

export default function USB({ SDK }: { SDK: CoreApi }) {
  const sdkInit = () => {
    const settings = {
      debug: true,
      connectSrc: 'https://localhost:8088/',
    };
    SDK.init(settings);
  };

  useEffect(() => {
    if (!isSdkInit) {
      sdkInit();
    }
    isSdkInit = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      <Text>This is USB example page, will run on desktop browser. </Text>
      <CallMethods SDK={SDK} />
    </View>
  );
}
