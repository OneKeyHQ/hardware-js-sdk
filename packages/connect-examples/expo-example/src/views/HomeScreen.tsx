import React, { Suspense } from 'react';
import { StyleSheet, Platform, View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const USB = React.lazy(() => import('../env/USB'));
const Bluetooth = React.lazy(() => import('../env/Bluetooth'));

export default function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      {/* @ts-expect-error */}
      <Button title="Mock Screen" onPress={() => navigation.push('Mock')} />
      <Suspense fallback={<Text>Loading...</Text>}>
        {Platform.OS === 'web' ? <USB /> : <Bluetooth />}
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
