import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';



import type { IJsBridgeReceiveHandler } from '@onekeyfe/cross-inpage-provider-types';
import type { IWebViewWrapperRef } from '@onekeyfe/onekey-cross-webview';
import { View } from 'tamagui';
import { Platform } from 'react-native';
import WebView from '../WebView';
import { webEmbedApiProxy } from './ApiProxy';

// /onboarding/auto_typing
export function WebViewWebEmbed({
    isSingleton,
    customReceiveHandler,
}: {
    isSingleton?: boolean;
    customReceiveHandler?: IJsBridgeReceiveHandler;
}) {
    const webviewRef = useRef<IWebViewWrapperRef | null>(null);
    const onWebViewRef = useCallback(($ref: IWebViewWrapperRef | null) => {
        webviewRef.current = $ref;
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
            return;
        }
        const jsBridge = webviewRef?.current?.jsBridge;
        if (!jsBridge) {
            return;
        }
        jsBridge.globalOnMessageEnabled = true;
        webEmbedApiProxy.connectWebEmbedBridge(jsBridge);
    }, [webviewRef]);

    const remoteUrl = useMemo(() => {
        if (process.env.NODE_ENV !== 'production') {
            return 'https://onekey.so/onboarding/auto_typing';
        }
        return undefined;
    }, []);

    const nativeWebviewSource = useMemo(() => {
        if (remoteUrl) {
            return undefined;
        }
        // Android
        if (Platform.OS === 'android') {
            return {
                uri: 'file:///android_asset/web-embed/index.html',
            };
        }
        // iOS
        if (Platform.OS === 'ios') {
            return {
                uri: 'web-embed/index.html',
            };
        }
        return undefined;
    }, [remoteUrl]);

    const webview = useMemo(
        () => (
            <WebView
                // *** use remote url
                src={remoteUrl || ''}
                // *** use web-embed local html file
                nativeWebviewSource={nativeWebviewSource}
                onWebViewRef={onWebViewRef}
                customReceiveHandler={customReceiveHandler}
            />
        ),
        [customReceiveHandler, nativeWebviewSource, onWebViewRef, remoteUrl],
    );

    const debugViewSize = useMemo(() => {
        return { width: 0, height: 0, borderWidth: 0 };
    }, []);

    if (!isSingleton) {
        return webview;
    }

    return (
        <View
            width={debugViewSize.width}
            height={debugViewSize.height}
            borderWidth={debugViewSize.borderWidth}
            left="5%"
            position="absolute"
            backgroundColor="$background"
            borderColor="$border"
        >
            {webview}
        </View>
    );
}

function WebViewWebEmbedSingletonView() {
    return <WebViewWebEmbed isSingleton />;
}

export const WebViewWebEmbedSingleton = memo(WebViewWebEmbedSingletonView);
