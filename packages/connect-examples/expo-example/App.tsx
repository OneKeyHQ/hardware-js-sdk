import React, { lazy, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider, PortalProvider, Text, Stack, Card } from 'tamagui';
import * as ExpoLinking from 'expo-linking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIntl } from 'react-intl';
import SDKProvider from './src/provider/SDKProvider';

import config from './tamagui.config';
import { Routes } from './src/route';
import AppIntlProvider from './src/provider/AppIntlProvider';

import ApiPayloadScreen from './src/views/ApiPayloadScreen';
import { Button } from './src/components/ui/Button';
import { MediaProvider } from './src/provider/MediaProvider';

const PassphraseTestScreen = lazy(() => import('./src/views/PassphraseTestScreen'));
const FirmwareScreen = lazy(() => import('./src/views/FirmwareScreen'));
const AddressTestScreen = lazy(() => import('./src/views/AddressTestScreen'));
const SecurityCheckScreen = lazy(() => import('./src/views/SecurityCheckScreen'));
const FunctionalTestingScreen = lazy(() => import('./src/views/FunctionalTestingScreen'));

// 修复 GitHub Pages 路由问题
const isGitHubPages =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
const webBaseUrl = isGitHubPages ? '/hardware-js-sdk/' : '/';
const prefix = ExpoLinking.createURL(webBaseUrl);

const routeConfig = {};

const linking = {
  prefixes: [prefix],
  routeConfig,
};

// Create a native stack navigator
const StackNavigator = createNativeStackNavigator();
function NavigationContent() {
  return (
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
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
        <StackNavigator.Screen name={Routes.SecurityCheck} component={SecurityCheckScreen} />
        <StackNavigator.Screen
          name={Routes.FunctionalTesting}
          component={FunctionalTestingScreen}
        />
      </StackNavigator.Navigator>
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

function UpdateTip() {
  const [needRestart, setNeedRestart] = useState<boolean>(false);
  const intl = useIntl();

  useEffect(() => {
    // @ts-expect-error
    window.desktopApi?.on('update/downloaded', () => {
      setNeedRestart(true);
    });
  }, [needRestart]);

  if (!needRestart) return undefined;

  return (
    <Card
      elevate
      size="$4"
      bordered
      padding="$6"
      position="absolute"
      right={20}
      top={80}
      zIndex={1000}
      backgroundColor="$bgApp"
    >
      <Text>{intl.formatMessage({ id: 'tip__update_ready' })}</Text>
      <Button
        marginTop="$4"
        variant="destructive"
        onPress={() => {
          // @ts-expect-error
          window.desktopApi?.updateReload();
        }}
      >
        {intl.formatMessage({ id: 'action__update_restart' })}
      </Button>
    </Card>
  );
}

function AppSafeAreaContent({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <Stack
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
      paddingLeft={insets.left}
      paddingRight={insets.right}
      flex={1}
    >
      {children}
    </Stack>
  );
}

// Main App
export default function App() {
  return (
    <TamaguiProviderWrapperMemo>
      <SafeAreaProvider>
        <AppSafeAreaContent>
          <SDKProvider>
            <AppIntlProvider>
              <UpdateTip />
              <MediaProvider>
                <NavigationContentMemo />
              </MediaProvider>
            </AppIntlProvider>
          </SDKProvider>
        </AppSafeAreaContent>
      </SafeAreaProvider>
    </TamaguiProviderWrapperMemo>
  );
}
