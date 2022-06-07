import { StyleSheet, Platform, View, Text } from 'react-native';
import USB from './src/env/USB';
import Bluetooth from './src/env/Bluetooth';

export default function App() {
  return <View style={styles.container}>{Platform.OS === 'web' ? <USB /> : <Bluetooth />}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  },
});
