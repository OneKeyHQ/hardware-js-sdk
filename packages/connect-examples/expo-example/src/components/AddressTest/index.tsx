import { View } from 'react-native';
import { DeviceProvider } from '../../provider/DeviceProvider';
import TestAddressView from './TestAddress';
import { styles } from '../PassphraseTest/utils';

export default function AddressTestView() {
  return (
    <View style={styles.container}>
      <DeviceProvider>
        <View style={styles.container}>
          <TestAddressView />
        </View>
      </DeviceProvider>
    </View>
  );
}
