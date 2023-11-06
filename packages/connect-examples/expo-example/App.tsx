import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/views/HomeScreen';
import MockScreen from './src/views/MockConnect';
import { getHardwareSDKInstance } from './src/utils/hardwareInstance';

getHardwareSDKInstance();

const Stack = createNativeStackNavigator();
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Mock" component={MockScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
