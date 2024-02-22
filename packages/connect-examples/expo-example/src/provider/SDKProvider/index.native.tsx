import { CoreApi } from '@onekeyfe/hd-core';
import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Stack } from 'tamagui';
import { BluetoothSearching } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { getHardwareSDKInstance } from '../../utils/hardwareInstance';
import HardwareSDKContext from '../HardwareSDKContext';

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
  const intl = useIntl();
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
      <Stack flex={1}>
        <Stack flexDirection="row" backgroundColor="$bgApp" gap="$2" paddingHorizontal="$2">
          <BluetoothSearching size={20} />
          <Text>
            {sdk
              ? intl.formatMessage({ id: 'tip__sdk_load_complete' })
              : intl.formatMessage({ id: 'tip__sdk_loading' })}
          </Text>
        </Stack>
        {children}
      </Stack>
    </HardwareSDKContext.Provider>
  );
}
