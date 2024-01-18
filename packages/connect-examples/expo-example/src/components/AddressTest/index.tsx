import { View } from 'react-native';
import { DeviceProvider } from '../../provider/DeviceProvider';
import { styles } from '../PassphraseTest/utils';
import { TestSingleAddress } from '../../testTools/addressTest/TestSingleAddress';
import { TestBatchAddress } from '../../testTools/addressTest/TestBatchAddress';
import { TestSinglePubkey } from '../../testTools/pubkeyTest/TestSinglePubkey';
import { TestBatchPubkey } from '../../testTools/pubkeyTest/TestBatchPubkey';

export default function AddressTestView() {
  return (
    <View style={styles.container}>
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
  );
}
