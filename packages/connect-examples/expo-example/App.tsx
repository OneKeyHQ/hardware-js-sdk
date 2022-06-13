import { CoreApi } from '@onekeyfe/hd-core';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { getOneKeySDK } from './sdk-provider';
import USB from './src/env/USB';
import Bluetooth from './src/env/Bluetooth';

export default function App() {
  const [SDK, setSDK] = useState<CoreApi | null>(null);

  useEffect(() => {
    getOneKeySDK().then(lib => setSDK(lib));
  });

  if (!SDK) return null;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? <USB SDK={SDK} /> : <Bluetooth SDK={SDK} />}
      <Text>Hello World</Text>
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
