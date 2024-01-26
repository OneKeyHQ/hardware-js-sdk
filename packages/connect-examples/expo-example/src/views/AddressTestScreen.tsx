import React from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DeviceProvider } from '../provider/DeviceProvider';
import { TestSingleAddress } from '../testTools/addressTest/TestSingleAddress';
import { TestBatchAddress } from '../testTools/addressTest/TestBatchAddress';
import { TestSinglePubkey } from '../testTools/pubkeyTest/TestSinglePubkey';
import { TestBatchPubkey } from '../testTools/pubkeyTest/TestBatchPubkey';

export default function AddressTestScreen() {
  const navigation = useNavigation();
  return (
    <ScrollView>
      <View style={styles.container}>
        {/* @ts-expect-error */}
        <Button title="Go Back Home" onPress={() => navigation.replace('Home')} />
        {/* <View style={styles.container}> */}
        <DeviceProvider>
          <View style={styles.container}>
            <TestSingleAddress />
          </View>
          <View style={styles.container}>
            <TestBatchAddress />
          </View>
          <View style={styles.container}>
            <TestSinglePubkey />
          </View>
          <View style={styles.container}>
            <TestBatchPubkey />
          </View>
        </DeviceProvider>
      </View>
      {/* </View> */}
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
    padding: 12,
  },
});
