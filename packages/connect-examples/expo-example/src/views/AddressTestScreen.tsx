import React from 'react';
import { Button, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AddressTestView from '../components/AddressTest';

export default function AddressTestScreen() {
  const navigation = useNavigation();
  return (
    <ScrollView>
      <View style={styles.container}>
        {/* @ts-expect-error */}
        <Button title="Go Back Home" onPress={() => navigation.replace('Home')} />
        <AddressTestView />
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
    padding: 32,
  },
});
