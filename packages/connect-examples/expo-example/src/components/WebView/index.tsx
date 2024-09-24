import type { ComponentProps, FC } from 'react';
import { useCallback } from 'react';

import InpageProviderWebView from './InpageProviderWebView';

import type { IElectronWebViewEvents, IWebViewOnScroll } from './types';
import type { IJsBridgeReceiveHandler } from '@onekeyfe/cross-inpage-provider-types';
import type { IWebViewWrapperRef } from '@onekeyfe/onekey-cross-webview';
import type {
  WebViewErrorEvent,
  WebViewNavigation,
  WebViewNavigationEvent,
  WebViewOpenWindowEvent,
  WebViewSource,
} from 'react-native-webview/lib/WebViewTypes';
import { Stack } from 'tamagui';
import { webEmbedApiProxy } from '../WebEmbed/ApiProxy';

interface IWebViewProps extends IElectronWebViewEvents {
  id?: string;
  src?: string;
  onSrcChange?: (src: string) => void;
  openUrlInExt?: boolean;
  onWebViewRef?: (ref: IWebViewWrapperRef | null) => void;
  onNavigationStateChange?: (event: WebViewNavigation) => void;
  onShouldStartLoadWithRequest?: (event: WebViewNavigation) => boolean;
  allowpopups?: boolean;
  containerProps?: ComponentProps<typeof Stack>;
  customReceiveHandler?: IJsBridgeReceiveHandler;
  nativeWebviewSource?: WebViewSource | undefined;
  nativeInjectedJavaScriptBeforeContentLoaded?: string;
  isSpinnerLoading?: boolean;
  onContentLoaded?: () => void; // currently works in NativeWebView only
  onOpenWindow?: (event: WebViewOpenWindowEvent) => void;
  androidLayerType?: 'none' | 'software' | 'hardware';
  onLoadStart?: (event: WebViewNavigationEvent) => void;
  onLoad?: (event: WebViewNavigationEvent) => void;
  onLoadEnd?: (event: WebViewNavigationEvent | WebViewErrorEvent) => void;
  onScroll?: IWebViewOnScroll;
  displayProgressBar?: boolean;
  onProgress?: (progress: number) => void;
}

const WebView: FC<IWebViewProps> = ({
  src = '',
  openUrlInExt = false,
  allowpopups = false,
  onWebViewRef = () => { },
  customReceiveHandler,
  containerProps,
  ...rest
}) => {
  const receiveHandler = useCallback<IJsBridgeReceiveHandler>(
    async (payload, hostBridge) => {
      const result = await webEmbedApiProxy.bridgeReceiveHandler(payload);

      // return customReceiveHandler() response not supported yet
      await customReceiveHandler?.(payload, hostBridge);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    },
    [customReceiveHandler],
  );

  return (
    <Stack flex={1} backgroundColor="background-default" {...containerProps}>
      <InpageProviderWebView
        ref={onWebViewRef}
        src={src}
        allowpopups={allowpopups}
        receiveHandler={receiveHandler}
        {...rest}
      />
    </Stack>
  );
};

export default WebView;
