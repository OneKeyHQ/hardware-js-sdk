import { View } from 'react-native';
import { useContext } from 'react';
import { DeviceProvider, useDevice } from '../../provider/DeviceProvider';
import { styles } from './utils';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import TestSessionView from './TestSessionView';
import TestWalletChangeView from './TestWalletChangeView';
import TestMultiWalletChangeView from './TestMultiWalletChangeView';

export default function PassphraseTestScreen() {
  return (
    <View style={styles.container}>
      <DeviceProvider>
        <PassphraseTestView />
      </DeviceProvider>
    </View>
  );
}

function PassphraseTestView() {
  const { sdk: SDK, type } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  return (
    <View style={styles.container}>
      <TestSessionView />
      <TestWalletChangeView />
      <TestMultiWalletChangeView />
    </View>
  );
}
