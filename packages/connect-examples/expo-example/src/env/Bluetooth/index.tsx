import HardwareBleSdk from '@onekeyfe/hd-ble-sdk';
import React, { useEffect, useState } from 'react';
import { View, Text, Platform, PermissionsAndroid } from 'react-native';

import { CallMethods } from '../../components/CallMethods';
import { DeviceList } from '../../components/DeviceList';
import type { Device } from '../../components/DeviceList';

let isSdkInit = false;

export default function Bluetooth() {
  console.log(HardwareBleSdk);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const sdkInit = () => {
    const settings = {
      debug: true,
    };
    HardwareBleSdk.init(settings);
  };

  useEffect(() => {
    if (!isSdkInit) {
      sdkInit();

      if (Platform.OS === 'android' && Platform.Version >= 23) {
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then(
          result => {
            if (result) {
              console.log('Permission is OK');
            } else {
              PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then(
                result => {
                  if (result) {
                    console.log('User accept');
                  } else {
                    console.log('User refuse');
                  }
                }
              );
            }
          }
        );
      }
    }
    isSdkInit = true;
  }, []);

  return (
    <View>
      <Text>This is Bluetooth example page, will run on iOS / Android device. </Text>
      <CallMethods
        SDK={HardwareBleSdk}
        selectedDevice={selectedDevice}
        setDevices={devices => setDevices(devices)}
      />
      <DeviceList data={devices} onSelected={device => setSelectedDevice(device)} />
    </View>
  );
}
