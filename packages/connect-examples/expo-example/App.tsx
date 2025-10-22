import React, { lazy, useEffect, useState } from 'react';
import { LinkingOptions, NavigationContainer, ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider, PortalProvider, Text, Stack, Card, YStack } from 'tamagui';
import { Toast, ToastProvider, ToastViewport, useToastState } from '@tamagui/toast';
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
const AttachToPinTestingScreen = lazy(() => import('./src/views/AttachToPinTestingScreen'));
const SLIP39TestScreen = lazy(() => import('./src/views/SLIP39TestScreen'));
const ChainMethodTestScreen = lazy(() => import('./src/views/ChainMethodTestScreen'));

// React Navigation v6 linking 配置
const linking: LinkingOptions<ParamListBase> = {
  prefixes: [
    // 为不同的部署环境设置 URL 前缀
    'https://hardware-example.onekeytest.com/',
    'https://example.onekeytest.com/',
    'http://localhost:19006/',
    ExpoLinking.createURL('/'),
  ],
  config: {
    initialRouteName: Routes.Payload,
    screens: {
      [Routes.Payload]: 'expo-example/api-payload',
      [Routes.FirmwareUpdateTest]: 'expo-example/firmware-update-test',
      [Routes.PassphraseTest]: 'expo-example/passphrase-test',
      [Routes.AddressTest]: 'expo-example/address-test',
      [Routes.SecurityCheck]: 'expo-example/security-check',
      [Routes.FunctionalTesting]: 'expo-example/functional-testing',
      [Routes.SLIP39Test]: 'expo-example/slip39-test',
      [Routes.ChainMethodTest]: 'expo-example/chain-method-test',
    },
  },
};

// Create a native stack navigator
const StackNavigator = createNativeStackNavigator();
function NavigationContent() {
  // 处理从 404 页面重定向过来的路径
  useEffect(() => {
    // 处理从 404 页面保存的重定向 URL
    const spaRedirectUrl = sessionStorage?.getItem('spa_redirect_url');
    if (spaRedirectUrl) {
      console.log('Restoring SPA route from redirect:', spaRedirectUrl);
      sessionStorage?.removeItem('spa_redirect_url');
      // 使用 window.history.replaceState 替换当前历史记录
      window.history.replaceState(null, '', spaRedirectUrl);
      return;
    }

    // 兼容旧的 redirectPath 处理
    const redirectPath = sessionStorage?.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage?.removeItem('redirectPath');
      window.history.replaceState(null, '', redirectPath);
    }
  }, []);

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
        <StackNavigator.Screen
          name={Routes.AttachToPinTestingScreen}
          component={AttachToPinTestingScreen}
        />
        <StackNavigator.Screen name={Routes.SLIP39Test} component={SLIP39TestScreen} />
        <StackNavigator.Screen name={Routes.ChainMethodTest} component={ChainMethodTestScreen} />
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

function ToastView() {
  const currentToast = useToastState();

  if (!currentToast || currentToast.isHandledNatively) return null;

  return (
    <Toast
      animation="quick"
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, transform: [{ translateY: 100 }] }}
      exitStyle={{ opacity: 0, transform: [{ translateY: 100 }] }}
      transform={[{ translateY: 0 }]}
      opacity={1}
      scale={1}
      viewportName={currentToast.viewportName}
      backgroundColor="$bgApp"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <YStack>
        <Toast.Title>{currentToast.title}</Toast.Title>
        {!!currentToast.message && <Toast.Description>{currentToast.message}</Toast.Description>}
      </YStack>
    </Toast>
  );
}

// 声明全局变量类型
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __COMMIT_SHA__: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const __BUILD_TIME__: string;
}

// Main App
export default function App() {
  return (
    <TamaguiProviderWrapperMemo>
      <SafeAreaProvider>
        {/* <AppSafeAreaContent> */}
        <SDKProvider>
          <AppIntlProvider>
            <ToastProvider burntOptions={{ from: 'bottom' }}>
              <UpdateTip />
              <MediaProvider>
                <NavigationContentMemo />
              </MediaProvider>
              <ToastView />
              <ToastViewport bottom={20} right={20} />
            </ToastProvider>
          </AppIntlProvider>
        </SDKProvider>
        {/* </AppSafeAreaContent> */}
      </SafeAreaProvider>
    </TamaguiProviderWrapperMemo>
  );
}
