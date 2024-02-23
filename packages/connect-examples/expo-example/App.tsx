import React, { lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider } from '@tamagui/core';
import { PortalProvider, Text, Stack } from 'tamagui';
import * as ExpoLinking from 'expo-linking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import SDKProvider from './src/provider/SDKProvider';

import config from './tamagui.config';
import { Routes } from './src/route';
import AppIntlProvider from './src/provider/AppIntlProvider';

const ApiPayloadScreen = lazy(() => import('./src/views/ApiPayloadScreen'));
const PassphraseTestScreen = lazy(() => import('./src/views/PassphraseTestScreen'));
const FirmwareScreen = lazy(() => import('./src/views/FirmwareScreen'));
const AddressTestScreen = lazy(() => import('./src/views/AddressTestScreen'));

const prefix = ExpoLinking.createURL('/');

const routeConfig = {};

const linking = {
  prefixes: [prefix],
  routeConfig,
};

// Create a native stack navigator
const StackNavigator = createNativeStackNavigator();
function NavigationContent() {
  const insets = useSafeAreaInsets();
  return (
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
      <Stack
        paddingTop={insets.top}
        paddingBottom={insets.bottom}
        paddingLeft={insets.left}
        paddingRight={insets.right}
        flex={1}
      >
        <StackNavigator.Navigator
          initialRouteName={Routes.Payload}
          screenOptions={{
            headerShown: false,
          }}
        >
          <StackNavigator.Screen name={Routes.Payload} component={ApiPayloadScreen} />
          <StackNavigator.Screen name={Routes.FirmwareUpdateTest} component={FirmwareScreen} />
          <StackNavigator.Screen name={Routes.PassphraseTest} component={PassphraseTestScreen} />
          <StackNavigator.Screen name={Routes.AddressTest} component={AddressTestScreen} />
        </StackNavigator.Navigator>
      </Stack>
    </NavigationContainer>
  );
}
const NavigationContentMemo = React.memo(NavigationContent);
NavigationContentMemo.displayName = 'NavigationContent';

// Wrap the app with the TamaguiProvider
function TamaguiProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <TamaguiProvider config={config}>
      <PortalProvider>{children}</PortalProvider>
    </TamaguiProvider>
  );
}
const TamaguiProviderWrapperMemo = React.memo(TamaguiProviderWrapper);
TamaguiProviderWrapperMemo.displayName = 'TamaguiProviderWrapper';

// Main App
export default function App() {
  return (
    <TamaguiProviderWrapperMemo>
      <SafeAreaProvider>
        <SDKProvider>
          <AppIntlProvider>
            <NavigationContentMemo />
          </AppIntlProvider>
        </SDKProvider>
      </SafeAreaProvider>
    </TamaguiProviderWrapperMemo>
  );
}
