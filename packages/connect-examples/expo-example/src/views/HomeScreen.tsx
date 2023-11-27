import React from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PlaygroundManager from '../components/PlaygroundManager';

export default function HomeScreen() {
  const navigation = useNavigation();
  return (
    <ScrollView>
      <View style={styles.container}>
        {/* @ts-expect-error */}
        <Button title="Mock Screen" onPress={() => navigation.push('Mock')} />
        <Button
          title="Passphrase Test Screen"
          // @ts-expect-error
          onPress={() => navigation.navigate('PassphraseTest')}
        />
        <Button
          title="AddressTest Test Screen"
          // @ts-expect-error
          onPress={() => navigation.navigate('AddressTest')}
        />

        <PlaygroundManager />
      </View>
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
    padding: 16,
    gap: 8,
  },
});
