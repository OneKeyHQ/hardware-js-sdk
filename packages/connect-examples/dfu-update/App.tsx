import React, { useEffect, useState } from 'react';
import { DFUEmitter, NordicDFU } from 'react-native-nordic-dfu';
import {
  StyleSheet,
  Text,
  View,
  Button,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import BleManager from 'react-native-ble-manager';
import HardwareSDK from '@onekeyfe/hd-ble-sdk';

BleManager.start({ showAlert: false });
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const T_UUID = '41391B3D-4DCE-47B3-7B19-E3171BA96D4B';
// const C_UUID = '8CCA5EE6-8584-95A7-8C3A-6A68F8B6EFC0';
const C_UUID = '10A16F2B-82E3-0752-0D70-5697080800F5';
const C_MAC = 'CB:F9:80:A6:83:18'; // K1883
let isInit = false;
export default function App() {
  const MAC = Platform.OS === 'ios' ? C_UUID : C_MAC;
  const [dfuState, setDfuState] = useState<string>();
  const [uri, setUri] = useState<string>();

  useEffect(() => {
    DFUEmitter.addListener(
      'DFUProgress',
      ({ percent, currentPart, partsTotal, avgSpeed, speed }) => {
        console.log('progress: ', percent);
      }
    );

    DFUEmitter.addListener('DFUStateChanged', ({ state }) => {
      console.log('dfu state change: ', state);
      setDfuState(state);
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      await HardwareSDK.init({ debug: true });
      // BleManager.start({ showAlert: false });

      // await BleManager.refreshCache(MAC);
    };
    init();
    isInit = true;
  }, []);

  const getFeatures = async () => {
    const res = await HardwareSDK.getFeatures(MAC);
    console.log(res);
    refreshCache();
  };

  const search = async () => {
    const a = await HardwareSDK.searchDevices();
    console.log(a);
  };

  const refreshCache = () => {
    BleManager.connect(MAC)
      .then(async () => {
        // Success code
        console.log('Connected');

        try {
          await BleManager.refreshCache(MAC);
          console.log('Refresh cache success');
        } catch (error) {
          console.log(error);
        }
      })
      .catch(error => {
        // Failure code
        console.log(error);
      });
  };

  const handleDFU = async () => {
    try {
      const resp = await NordicDFU.startDFU({
        deviceAddress: MAC,
        filePath: uri ?? '',
        alternativeAdvertisingNameEnabled: false,
      });
      console.log('NordicDFU.startDFU end');
      refreshCache();
    } catch (e) {
      console.log(e);
    }
  };

  const handlePick = async () => {
    if (Platform.OS === 'ios') {
      const url = await DocumentPicker.pick({ type: 'public.archive' });
      setUri(url[0].uri ?? '');
      console.log(url);
    } else if (Platform.OS === 'android') {
      const firmwareFile = await DocumentPicker.pick({
        type: DocumentPicker.types.zip,
      });
      console.log(firmwareFile);
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const destination = RNFS.CachesDirectoryPath + firmwareFile[0].name;
      await RNFS.copyFile(firmwareFile[0].uri, destination);
      setUri(destination);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Dfu Example</Text>
      <Button onPress={getFeatures} title="GetFeatures" />
      <Button onPress={handlePick} title="选择蓝牙固件 .zip" />
      {uri ? <Text>{uri}</Text> : null}
      <Button onPress={handleDFU} title="固件升级" />
      <Button onPress={search} title="搜索" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
