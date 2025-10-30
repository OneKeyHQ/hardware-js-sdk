import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { AirGapParsedResult } from '../utils/urParsers';

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  item: {
    marginTop: 6,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  block: {
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
  },
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'Menlo',
    }),
    fontSize: 12,
    color: '#111827',
  },
});

const renderJson = (value: unknown) => (
  <View style={styles.block}>
    <Text selectable style={styles.code}>
      {JSON.stringify(value, null, 2)}
    </Text>
  </View>
);

function renderContent(result: AirGapParsedResult) {
  switch (result.kind) {
    case 'onekey-app-call-device':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App request parameters</Text>
          {renderJson(result.data)}
        </View>
      );

    case 'crypto-hdkey':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HD key information</Text>
          <Text style={styles.item}>{`Chain: ${result.account.chain}`}</Text>
          <Text style={styles.item}>{`Path: ${result.account.path}`}</Text>
          <Text style={styles.item}>{`XFP: ${result.account.xfp}`}</Text>
          <Text
            style={styles.item}
          >{`Extended public key: ${result.account.extendedPublicKey?.slice(0, 16)}...`}</Text>
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Sample addresses (first 3)</Text>
          {result.derivedAddresses.length > 0 ? (
            renderJson(result.derivedAddresses)
          ) : (
            <Text style={styles.item}>Unable to derive addresses from the provided data.</Text>
          )}
        </View>
      );

    case 'crypto-multi-accounts':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device account information</Text>
          <Text style={styles.item}>{`Device: ${result.accounts.device}`}</Text>
          <Text style={styles.item}>{`Device ID: ${result.accounts.deviceId}`}</Text>
          <Text style={styles.item}>{`Firmware version: ${result.accounts.deviceVersion}`}</Text>
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Account list</Text>
          {renderJson(result.accounts.keys)}
        </View>
      );

    case 'eth-sign-request':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EVM signing request</Text>
          <Text style={styles.item}>{`Path: ${result.request.path}`}</Text>
          <Text style={styles.item}>{`XFP: ${result.request.xfp}`}</Text>
          <Text style={styles.item}>{`Data type: ${result.request.dataType}`}</Text>
          {result.request.origin ? (
            <Text style={styles.item}>{`Origin: ${result.request.origin}`}</Text>
          ) : null}
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Signing payload</Text>
          {renderJson(result.request.rawHex)}
        </View>
      );

    case 'eth-signature':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EVM signature result</Text>
          <Text style={styles.item}>{`Address: ${result.signature.address ?? 'Unknown'}`}</Text>
          <Text style={styles.item}>{`Request ID: ${result.signature.requestId ?? 'N/A'}`}</Text>
          <Text style={styles.item}>{`r: ${result.signature.r}`}</Text>
          <Text style={styles.item}>{`s: ${result.signature.s}`}</Text>
          <Text style={styles.item}>{`v: ${result.signature.v}`}</Text>
        </View>
      );

    case 'crypto-psbt':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PSBT Hex</Text>
          {renderJson(result.psbtHex)}
        </View>
      );

    case 'btc-signature':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BTC signature result</Text>
          {renderJson(result.signature)}
        </View>
      );

    case 'sol-signature':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SOL signature result</Text>
          {renderJson(result.signature)}
        </View>
      );

    case 'unknown':
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unknown UR type</Text>
          <Text style={styles.item}>{`UR type: ${result.urType}`}</Text>
          {renderJson(result.rawHex)}
        </View>
      );
    default:
      return null;
  }
}

export const DecodedResultCard = memo(({ result }: { result: AirGapParsedResult }) => (
  <View style={styles.container}>
    <Text style={styles.title}>Decoded result</Text>
    {renderContent(result)}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Raw UR data</Text>
      {renderJson(result.urJson)}
    </View>
  </View>
));
DecodedResultCard.displayName = 'DecodedResultCard';
