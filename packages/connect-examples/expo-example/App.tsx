import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/views/HomeScreen';
import MockScreen from './src/views/MockConnect';
import { getHardwareSDKInstance } from './src/utils/hardwareInstance';
import PassphraseTestScreen from './src/views/PassphraseTestScreen';
import SDKProvider from './src/provider/SDKProvider';
import AddressTestScreen from './src/views/AddressTestScreen';

getHardwareSDKInstance();

const Stack = createNativeStackNavigator();
export default function App() {
  return (
    <NavigationContainer>
      <SDKProvider>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="PassphraseTest" component={PassphraseTestScreen} />
          <Stack.Screen name="AddressTest" component={AddressTestScreen} />
          <Stack.Screen name="Mock" component={MockScreen} />
        </Stack.Navigator>
      </SDKProvider>
    </NavigationContainer>
  );
}
