import React from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DeviceProvider } from '../provider/DeviceProvider';
import { TestSingleAddress } from '../testTools/addressTest/TestSingleAddress';
import { TestBatchAddress } from '../testTools/addressTest/TestBatchAddress';
import { TestSinglePubkey } from '../testTools/pubkeyTest/TestSinglePubkey';
import { TestBatchPubkey } from '../testTools/pubkeyTest/TestBatchPubkey';
import {
  batchTestCases as batchAddressTestCases,
  testCases as addressTestCases,
} from '../testTools/addressTest/data';
import {
  batchTestCases as batchPubkeyTestCases,
  testCases as pubkeyTestCases,
} from '../testTools/pubkeyTest/data';
import {
  batchTestCases as batchVariantAddressTestCases,
  testCases as addressVariantTestCases,
} from '../testTools/addressTest/dataVariant';
import {
  batchTestCases as batchVariantPubkeyTestCases,
  testCases as pubkeyVariantTestCases,
} from '../testTools/pubkeyTest/dataVariant';

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
            <TestSingleAddress title="Single Address Test" testCases={addressTestCases} />
          </View>
          <View style={styles.container}>
            <TestBatchAddress title="Batch Address Test" testCases={batchAddressTestCases} />
          </View>
          <View style={styles.container}>
            <TestSinglePubkey title="Single Pubkey Test" testCases={pubkeyTestCases} />
          </View>
          <View style={styles.container}>
            <TestBatchPubkey title="Batch Pubkey Test" testCases={batchPubkeyTestCases} />
          </View>
          <br />
          <br />
          <View style={styles.container}>
            <TestSingleAddress
              title="Single Variant Address Test"
              testCases={addressVariantTestCases}
            />
          </View>
          <View style={styles.container}>
            <TestBatchAddress
              title="Batch Variant Address Test"
              testCases={batchVariantAddressTestCases}
            />
          </View>
          <View style={styles.container}>
            <TestSinglePubkey
              title="Single Variant Pubkey Test"
              testCases={pubkeyVariantTestCases}
            />
          </View>
          <View style={styles.container}>
            <TestBatchPubkey
              title="Batch Variant Pubkey Test"
              testCases={batchVariantPubkeyTestCases}
            />
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
