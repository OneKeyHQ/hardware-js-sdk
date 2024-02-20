import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider } from '@tamagui/core';
import { PortalProvider, Text } from 'tamagui';
import * as ExpoLinking from 'expo-linking';
import ApiPayloadScreen from './src/views/ApiPayloadScreen';
import MockScreen from './src/views/MockConnect';
import PassphraseTestScreen from './src/views/PassphraseTestScreen';
import SDKProvider from './src/provider/SDKProvider';
import AddressTestScreen from './src/views/AddressTestScreen';

import config from './tamagui.config';
import { Routes } from './src/route';

const prefix = ExpoLinking.createURL('/');

const routeConfig = {};

const linking = {
  prefixes: [prefix],
  routeConfig,
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <TamaguiProvider config={config}>
      <PortalProvider>
        <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
          <SDKProvider>
            <Stack.Navigator
              initialRouteName={Routes.Payload}
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name={Routes.Payload} component={ApiPayloadScreen} />
              <Stack.Screen name={Routes.FirmwareUpdateTest} component={PassphraseTestScreen} />
              <Stack.Screen name={Routes.PassphraseTest} component={PassphraseTestScreen} />
              <Stack.Screen name={Routes.AddressTest} component={AddressTestScreen} />
              <Stack.Screen name={Routes.Mock} component={MockScreen} />
            </Stack.Navigator>
          </SDKProvider>
        </NavigationContainer>
      </PortalProvider>
    </TamaguiProvider>
  );
}
