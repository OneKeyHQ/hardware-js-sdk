import HardwareWebSdk from '@onekeyfe/hd-web-sdk';
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { CallMethods } from '../../components/CallMethods';
import { DeviceList } from '../../components/DeviceList';
import type { Device } from '../../components/DeviceList';

let isSdkInit = false;

export default function USB() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

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
      <CallMethods
        SDK={HardwareWebSdk}
        selectedDevice={selectedDevice}
        setDevices={devices => setDevices(devices)}
      />
      <DeviceList data={devices} onSelected={device => setSelectedDevice(device)} />
    </View>
  );
}
