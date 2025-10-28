import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedQrView } from './components/AnimatedQrView';
import {
  AirGapRequestWorkbench,
  type IConnectedDeviceContext,
  type IRequestWorkbenchResult,
  type RequestType,
} from './components/AirGapRequestWorkbench';
import { AirGapScanner } from './components/AirGapScanner';
import { DecodedResultCard } from './components/DecodedResultCard';
import { parseAirGapUr } from './utils/urParsers';
import { deriveEvmAddressFromPublicKey } from './utils/address';

import { airGapUrUtils } from '../sdk';

import type { AirGapParsedResult } from './utils/urParsers';
import type { AirGapUR } from '../sdk';
import { useFeatureStorage } from '../../src/features/state';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginTop: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  sectionTitle: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  card: {
    marginTop: 16,
  },
  metaCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  metaItem: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginTop: 4,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
    marginBottom: 12,
  },
  metaReset: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
  },
  metaResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
  urRawBlock: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  urRawText: {
    fontSize: 12,
    color: '#111827',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'Menlo',
    }),
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    marginTop: 32,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});

const REQUEST_LABELS: Record<RequestType, string> = {
  getMultiAccounts: 'getMultiAccounts',
  verifyAddress: 'verifyAddress',
  ethSignTransaction: 'ethSignTransaction',
  btcPsbt: 'btcPsbt',
};

function buildConnectedDevice(result: AirGapParsedResult): IConnectedDeviceContext | null {
  if (result.kind === 'crypto-multi-accounts') {
    const keys = result.accounts.keys ?? [];
    const accounts = keys
      .map((key, index) => {
        const { chain } = key;
        const { path } = key;
        const id = `${chain || 'chain'}-${path || index}-${index}`;
        const info = key as unknown as Partial<IConnectedDeviceContext['accounts'][number]>;
        const rawPublicKey = typeof info?.publicKey === 'string' ? info.publicKey : undefined;
        let extendedPublicKey: string | undefined;
        if (typeof info?.extendedPublicKey === 'string') {
          extendedPublicKey = info.extendedPublicKey;
        } else if (typeof (info as { xpub?: string }).xpub === 'string') {
          extendedPublicKey = (info as { xpub?: string }).xpub;
        }

        const derivedAddress =
          key.chain?.toUpperCase() === 'ETH'
            ? deriveEvmAddressFromPublicKey(rawPublicKey) ?? undefined
            : undefined;
        return {
          id,
          chain,
          path,
          note: key.note,
          xfp: key.xfp,
          extendedPublicKey,
          publicKey: typeof info?.publicKey === 'string' ? info.publicKey : undefined,
          address: typeof info?.address === 'string' ? info.address : derivedAddress,
        };
      })
      .filter(account => !!account.path);

    if (!accounts.length) {
      return null;
    }

    return {
      name: result.accounts.device || 'QR Wallet',
      deviceId: result.accounts.deviceId || undefined,
      xfp: result.accounts.masterFingerprint || undefined,
      accounts,
      rawUr: result.urJson,
    };
  }

  if (result.kind === 'crypto-hdkey') {
    const { account } = result;
    const id = `hdkey-${account.path || Date.now()}`;
    const accounts = [
      {
        id,
        chain: account.chain,
        path: account.path,
        note: account.note,
        xfp: account.xfp,
        extendedPublicKey: account.extendedPublicKey,
        publicKey: account.publicKey,
        address:
          (account as unknown as { address?: string }).address ??
          (account.chain?.toUpperCase() === 'ETH'
            ? deriveEvmAddressFromPublicKey(account.publicKey) ?? undefined
            : undefined),
      },
    ];

    return {
      name: account.name || 'HD Key',
      deviceId: undefined,
      xfp: account.xfp,
      accounts,
      rawUr: result.urJson,
    };
  }

  return null;
}

export const AirGapDemoScreen = () => {
  const [connectedDevice, setConnectedDevice, clearConnectedDevice] =
    useFeatureStorage<IConnectedDeviceContext | null>('air-gap', 'connectedDevice', null);
  const [deviceParsedResult, setDeviceParsedResult] = useState<AirGapParsedResult | null>(null);
  const [requestResult, setRequestResult] = useState<IRequestWorkbenchResult | null>(null);
  const [responseParsedResult, setResponseParsedResult] = useState<
    AirGapParsedResult | string | null
  >(null);
  const [plainTextResponseUr, setPlainTextResponseUr] = useState<AirGapUR | null>(null);
  const [scannerPurpose, setScannerPurpose] = useState<'device' | 'response' | null>(null);
  const [lastRequestType, setLastRequestType, clearLastRequestType] =
    useFeatureStorage<RequestType | null>('air-gap', 'lastRequestType', null);
  const [lastResponseAt, setLastResponseAt, clearLastResponseAt] = useFeatureStorage<string | null>(
    'air-gap',
    'lastResponseAt',
    null
  );
  const isVerifyAddressRequest = requestResult?.requestType === 'verifyAddress';

  const forgetDevice = useCallback(() => {
    clearConnectedDevice();
    setDeviceParsedResult(null);
    setRequestResult(null);
    setResponseParsedResult(null);
    setPlainTextResponseUr(null);
    clearLastRequestType();
    clearLastResponseAt();
  }, [
    clearConnectedDevice,
    clearLastRequestType,
    clearLastResponseAt,
    setDeviceParsedResult,
    setRequestResult,
    setResponseParsedResult,
  ]);

  const encodedState = useMemo(() => {
    if (!requestResult) {
      return null;
    }
    const qrcode = airGapUrUtils.urToQrcode(requestResult.ur);
    return {
      parts: qrcode.allParts,
      single: qrcode.single,
      urJson: requestResult.urJson,
    };
  }, [requestResult]);

  const plainTextResponseQrData = useMemo(() => {
    if (!plainTextResponseUr) {
      return null;
    }
    try {
      return airGapUrUtils.urToQrcode(plainTextResponseUr);
    } catch (error) {
      console.warn('Failed to produce QR for plain-text response', error);
      return null;
    }
  }, [plainTextResponseUr]);

  const plainTextAddress = useMemo(() => {
    if (typeof responseParsedResult !== 'string') {
      return '';
    }
    return responseParsedResult.trim();
  }, [responseParsedResult]);

  const plainTextAddressGrouped = useMemo(() => {
    if (!plainTextAddress.length) {
      return '';
    }
    return plainTextAddress.replace(/(.{4})/g, '$1 ').trim();
  }, [plainTextAddress]);

  const lastRequestLabel = useMemo(() => {
    if (!lastRequestType) {
      return 'None';
    }
    return REQUEST_LABELS[lastRequestType] ?? lastRequestType;
  }, [lastRequestType]);

  const lastResponseLabel = useMemo(() => {
    if (!lastResponseAt) {
      return 'None';
    }
    try {
      return new Date(lastResponseAt).toLocaleString();
    } catch (error) {
      return lastResponseAt;
    }
  }, [lastResponseAt]);

  const handleScanDecoded = (ur: AirGapUR) => {
    if (ur.type.toLowerCase() === 'plain-text') {
      const text = ur.cbor.toString('utf8');
      if (scannerPurpose === 'device') {
        Alert.alert('Unsupported Payload', 'The exported data is not a valid account bundle.');
        return;
      }
      setPlainTextResponseUr(ur);
      setResponseParsedResult(text);
      setLastResponseAt(new Date().toISOString());
      return;
    }

    setPlainTextResponseUr(null);
    const parsed = parseAirGapUr(ur);

    if (scannerPurpose === 'device') {
      const device = buildConnectedDevice(parsed);
      if (!device) {
        Alert.alert(
          'Scan Failed',
          'Make sure the hardware wallet is showing the “Export Accounts” QR code and try again.'
        );
        return;
      }
      setConnectedDevice(device);
      setDeviceParsedResult(parsed);
      setRequestResult(null);
      setResponseParsedResult(null);
      setPlainTextResponseUr(null);
      clearLastRequestType();
      clearLastResponseAt();
      return;
    }

    if (scannerPurpose === 'response') {
      setResponseParsedResult(parsed);
      setPlainTextResponseUr(null);
      setLastResponseAt(new Date().toISOString());
    }
  };

  const closeScanner = () => setScannerPurpose(null);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Air-Gap Workflow Demo</Text>
          <Text style={styles.subtitle}>
            Recreate the OneKey offline QR loop: import accounts, emit a request, then confirm the
            hardware response.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Step 1 - Connect Your Hardware Wallet</Text>
        <Text style={styles.helperText}>
          On your hardware device choose “Export Accounts” (or a similar option) to display an
          animated QR code. Tap the button below to scan it and import the device information.
        </Text>
        <Pressable style={styles.button} onPress={() => setScannerPurpose('device')}>
          <Text style={styles.buttonText}>Scan Hardware Account QR</Text>
        </Pressable>
        {connectedDevice ? (
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Connected Device</Text>
            <Text style={styles.metaItem}>{`Name: ${connectedDevice.name}`}</Text>
            <Text style={styles.metaItem}>{`Device ID: ${connectedDevice.deviceId || 'N/A'}`}</Text>
            <Text style={styles.metaItem}>{`Master Fingerprint (XFP): ${
              connectedDevice.xfp || 'N/A'
            }`}</Text>
            <Text style={[styles.metaTitle, { marginTop: 12 }]}>Imported Accounts</Text>
            {connectedDevice.accounts.map(account => (
              <Text key={account.id} style={styles.metaItem}>
                {(account.chain || 'UNKNOWN').toUpperCase()} - {account.path || 'Path unavailable'}
                {account.address ? `\nAddress preview: ${account.address}` : ''}
              </Text>
            ))}
            {deviceParsedResult ? (
              <View style={{ marginTop: 16 }}>
                <DecodedResultCard result={deviceParsedResult} />
              </View>
            ) : null}
            <View style={styles.metaDivider} />
            <Text style={styles.metaItem}>{`Last request type: ${lastRequestLabel}`}</Text>
            <Text style={styles.metaItem}>{`Last response: ${lastResponseLabel}`}</Text>
            <Pressable style={styles.metaReset} onPress={forgetDevice}>
              <Text style={styles.metaResetText}>Forget cached device</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Step 2 - Generate App Request QR</Text>
        <Text style={styles.helperText}>
          Once the device is connected you can pick an operation below (sync accounts, verify an
          address, request a signature, etc.). The resulting QR code will be shown for the hardware
          wallet to scan.
        </Text>
        <View style={styles.card}>
          <AirGapRequestWorkbench
            device={connectedDevice}
            onGenerated={result => {
              setRequestResult(result);
              setResponseParsedResult(null);
              setPlainTextResponseUr(null);
              setLastRequestType(result.requestType);
              clearLastResponseAt();
            }}
          />
        </View>
        {requestResult && encodedState ? (
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>App Request QR Code</Text>
            <AnimatedQrView
              title="Present this QR code to the hardware wallet"
              parts={encodedState.parts}
              fallbackValue={encodedState.single}
            />
            <Text style={[styles.metaTitle, { marginTop: 16 }]}>Request Summary</Text>
            {Object.entries(requestResult.summary).map(([key, value]) => (
              <Text key={key} style={styles.metaItem}>{`${key}: ${value}`}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Step 3 - Scan Hardware Response</Text>
        <Text style={styles.helperText}>
          After the hardware wallet finishes processing it will display a response. Tap below to
          scan and parse the result (for Verify Address the device prints the plain address; for
          signing flows it returns UR data).
        </Text>
        <Pressable
          style={[styles.button, !requestResult && styles.buttonDisabled]}
          onPress={() => {
            if (!requestResult) {
              Alert.alert(
                'Notice',
                'Generate a request QR and complete the operation on the hardware wallet first.'
              );
              return;
            }
            setScannerPurpose('response');
          }}
        >
          <Text style={styles.buttonText}>Scan Hardware Response</Text>
        </Pressable>
        {responseParsedResult ? (
          <View style={[styles.card, { marginBottom: 24 }]}>
            {typeof responseParsedResult === 'string' ? (
              <View style={styles.metaCard}>
                <Text style={styles.metaTitle}>Hardware Response (Verify Address)</Text>
                {plainTextResponseQrData ? (
                  <AnimatedQrView
                    title="QR exported by the hardware wallet"
                    parts={plainTextResponseQrData.allParts}
                    fallbackValue={plainTextResponseQrData.single}
                  />
                ) : null}
                <Text style={styles.metaItem}>Confirmed address:</Text>
                <Text
                  style={[
                    styles.metaItem,
                    {
                      fontFamily: Platform.select({
                        ios: 'Menlo',
                        android: 'monospace',
                        default: 'Menlo',
                      }),
                    },
                  ]}
                >
                  {plainTextAddressGrouped || 'N/A'}
                </Text>
                {requestResult?.requestType === 'verifyAddress' ? (
                  <>
                    {typeof requestResult.summary.chain === 'string' ? (
                      <Text style={styles.metaItem}>{`Chain: ${requestResult.summary.chain}`}</Text>
                    ) : null}
                    {typeof requestResult.summary.path === 'string' ? (
                      <Text style={styles.metaItem}>{`Path: ${requestResult.summary.path}`}</Text>
                    ) : null}
                    {typeof requestResult.summary.address === 'string' ? (
                      <Text
                        style={styles.metaItem}
                      >{`Expected address: ${requestResult.summary.address}`}</Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : (
              <DecodedResultCard result={responseParsedResult} />
            )}
          </View>
        ) : null}
      </ScrollView>

      <AirGapScanner
        visible={scannerPurpose !== null}
        onClose={closeScanner}
        onDecoded={ur => {
          handleScanDecoded(ur);
          closeScanner();
        }}
      />
    </View>
  );
};
