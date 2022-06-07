import React, { Suspense } from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';

const USB = React.lazy(() => import('./src/env/USB'));
const Bluetooth = React.lazy(() => import('./src/env/Bluetooth'));

export default function App() {
  return (
    <View style={styles.container}>
      <Suspense fallback={<Text>Loading...</Text>}>
        {Platform.OS === 'web' ? (
          <USB />
        ) : (
          <View>
            <USB />
          </View>
        )}
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
