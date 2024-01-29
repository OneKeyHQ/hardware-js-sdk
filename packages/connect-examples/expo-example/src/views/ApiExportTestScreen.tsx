import React from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PassphraseTestView from '../components/PassphraseTest';
import TestApiExport from '../testTools/apiExportTest/TestApiExport';
import { DeviceProvider } from '../provider/DeviceProvider';

export default function ApiExportTestScreen() {
  const navigation = useNavigation();
  return (
    <ScrollView>
      <View style={styles.container}>
        {/* @ts-expect-error */}
        <Button title="Go Back Home" onPress={() => navigation.replace('Home')} />
        <DeviceProvider>
          <TestApiExport />
        </DeviceProvider>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    display: 'flex',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
