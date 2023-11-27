import { View } from 'react-native';
import { DeviceProvider } from '../../provider/DeviceProvider';
import { styles } from './utils';
import TestSessionView from './TestSessionView';
import TestWalletChangeView from './TestWalletChangeView';
import TestMultiWalletChangeView from './TestMultiWalletChangeView';

export default function PassphraseTestScreen() {
  return (
    <View style={styles.container}>
      <DeviceProvider>
        <View style={styles.container}>
          <TestSessionView />
          <TestWalletChangeView />
          <TestMultiWalletChangeView />
        </View>
      </DeviceProvider>
    </View>
  );
}
