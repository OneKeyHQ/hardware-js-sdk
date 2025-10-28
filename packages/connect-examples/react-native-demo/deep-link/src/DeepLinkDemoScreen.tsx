import React, { useEffect } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
/* eslint-disable react/style-prop-object */
import { StatusBar } from 'expo-status-bar';
/* eslint-enable react/style-prop-object */
import * as ExpoLinking from 'expo-linking';

const SAMPLE_WALLETCONNECT_URI =
  'wc:6b18a69c27df54b4c228e0ff60218ba460a4994aa5775963f6f0ee354b629afe@2?relay-protocol=irn&symKey=99f6e5fa2bda94c704be8d7adbc2643b861ef49dbe09e0af26d3713e219b4355';

export const DeepLinkDemoScreen = () => {
  useEffect(() => {
    const handleDeepLink = (url: string | null) => {
      if (!url || url.startsWith('exp://')) {
        return;
      }

      const parsed = ExpoLinking.parse(url);
      const wcUri = typeof parsed.queryParams?.uri === 'string' ? parsed.queryParams.uri : null;

      if (wcUri) {
        Alert.alert('WalletConnect Request', wcUri);
      }
    };

    const loadInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };
    loadInitialUrl().catch(error => {
      console.warn('[DeepLink] Failed to load initial URL', error);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const openDeepLink = () => {
    const deepLink = `onekey-wallet://wc?uri=${encodeURIComponent(SAMPLE_WALLETCONNECT_URI)}`;
    Linking.openURL(deepLink).catch(error => {
      Alert.alert('Deep Link Error', error.message);
    });
  };

  const openUniversalLink = () => {
    const universalLink = `https://app.onekey.so/wc/connect/wc?uri=${encodeURIComponent(
      SAMPLE_WALLETCONNECT_URI
    )}`;
    Linking.openURL(universalLink).catch(error => {
      Alert.alert('Universal Link Error', error.message);
    });
  };

  const openWalletConnectUri = () => {
    Linking.openURL(SAMPLE_WALLETCONNECT_URI).catch(error => {
      Alert.alert('WalletConnect URI Error', error.message);
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <StatusBar />
      <View style={styles.header}>
        <Text style={styles.title}>Deep Link Playground</Text>
        <Text style={styles.subtitle}>
          Trigger OneKey deep or universal links and review the captured callback payloads.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={openDeepLink}>
        <Text style={styles.buttonLabel}>Open Deep Link</Text>
        <Text style={styles.buttonHint}>onekey-wallet://wc?uri=...</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={openWalletConnectUri}>
        <Text style={styles.buttonLabel}>Open WalletConnect URI</Text>
        <Text style={styles.buttonHint}>wc:xxxxx@2?relay-protocol=...</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={openUniversalLink}>
        <Text style={styles.buttonLabel}>Open Universal Link</Text>
        <Text style={styles.buttonHint}>https://app.onekey.so/wc/connect/wc</Text>
      </TouchableOpacity>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  content: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1f2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#5c6a90',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#d6dcf5',
    marginBottom: 16,
    shadowColor: '#0f2b68',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f2b68',
    marginBottom: 6,
  },
  buttonHint: {
    fontSize: 12,
    color: '#5c6a90',
  },
});
