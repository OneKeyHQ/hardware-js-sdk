import React, { useEffect, useState } from 'react';
import { DFUEmitter } from 'react-native-nordic-dfu';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Platform } from 'react-native';
import { DocumentPicker } from 'react-native-document-picker';

export default function App() {
  const [dfuState, setDfuState] = useState();

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

  const handlePick = async () => {
    if (Platform.OS === 'ios') {
      const url = await DocumentPicker.pick({ type: 'public.archive' });
      setUri(url[0].uri);
    } else if (Platform.OS === 'android') {
      const firmwareFile = await DocumentPicker.pick({
        type: DocumentPicker.types.zip,
      });
      const destination = RNFS.CachesDirectoryPath + firmwareFile[0].name;

      await RNFS.copyFile(firmwareFile[0].uri, destination);
      setUri(destination);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Dfu Example</Text>
      <Button mt="2" onPress={handlePick}>
        选择蓝牙固件 .zip
      </Button>
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
