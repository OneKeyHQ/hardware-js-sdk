import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider } from '@tamagui/core';
import { PortalProvider, Text, Stack } from 'tamagui';
import * as ExpoLinking from 'expo-linking';
import { IntlProvider } from 'react-intl';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ApiPayloadScreen from './src/views/ApiPayloadScreen';
import PassphraseTestScreen from './src/views/PassphraseTestScreen';
import SDKProvider from './src/provider/SDKProvider';
import FirmwareScreen from './src/views/FirmwareScreen';
import AddressTestScreen from './src/views/AddressTestScreen';

import config from './tamagui.config';
import { Routes } from './src/route';

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
        <SDKProvider>
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
        </SDKProvider>
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

// Wrap the app with the IntlProvider
function AppIntlProvider({ children }: { children: React.ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}
const AppIntlProviderMemo = React.memo(AppIntlProvider);
AppIntlProviderMemo.displayName = 'AppIntlProvider';

// Main App
export default function App() {
  return (
    <AppIntlProviderMemo>
      <SafeAreaProvider>
        <TamaguiProviderWrapperMemo>
          <NavigationContentMemo />
        </TamaguiProviderWrapperMemo>
      </SafeAreaProvider>
    </AppIntlProviderMemo>
  );
}
