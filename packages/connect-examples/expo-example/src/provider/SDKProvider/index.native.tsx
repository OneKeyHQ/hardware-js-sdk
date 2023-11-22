import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getHardwareSDKInstance } from '../../utils/hardwareInstance';
import HardwareSDKContext from '../HardwareSDKContext';
import PlaygroundManager from '../../components/PlaygroundManager';

let isSdkInit = false;

const requestLocationPermission = async () => {
  const permissionRequest = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  const granted = permissionRequest === PermissionsAndroid.RESULTS.GRANTED;
  console.log('Location permission granted: ', granted);
  return granted;
};

const requestBluetoothPermission = async () => {
  const permissionRequest = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  const granted = permissionRequest === PermissionsAndroid.RESULTS.GRANTED;
  console.log('Bluetooth permission granted: ', granted);
  return granted;
};
const requestBluetoothScanPermission = async () => {
  const permissionRequest = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
  );
  const granted = permissionRequest === PermissionsAndroid.RESULTS.GRANTED;
  console.log('Bluetooth permission granted: ', granted);
  return granted;
};

export default function Bluetooth({ children }: { children: React.ReactNode }) {
  const [sdk, createSDK] = React.useState<CoreApi>();
  const sdkInit = () => {
    getHardwareSDKInstance().then(res => {
      console.log('Bluetooth SDK init success', res);
      createSDK(res.HardwareSDK);
      // res.on('UI_EVENT', event => {
      //   console.log('example received UI_EVENT: ', event);
      // });
    });
  };

  useEffect(() => {
    (async () => {
      console.log('Bluetooth init');

      if (!isSdkInit) {
        if (Platform.OS === 'android') {
          console.log('Bluetooth android request permission');
          try {
            if (Platform.Version >= 31 && !(await requestBluetoothScanPermission())) return;
          } catch (e) {
            console.log('request permission error:', e);
            return;
          }
        }

        console.log('Bluetooth SDK init');

        sdkInit();
        isSdkInit = true;
      }
    })();
  }, []);

  const contextValue = React.useMemo(
    () => ({
      sdk,
      type: 'Bluetooth' as const,
      lowLevelSDK: undefined,
    }),
    [sdk]
  );

  return (
    <HardwareSDKContext.Provider value={contextValue}>
      <>
        <Text>This is Bluetooth example page, will run on iOS / Android device. </Text>
        <Text>{sdk ? 'SDK loading complete' : 'SDK loading...'}</Text>
        {/* {!!sdk && <CallMethods />} */}
        {children}
      </>
    </HardwareSDKContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
