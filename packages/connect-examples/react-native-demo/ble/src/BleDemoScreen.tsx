import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, PermissionsAndroid, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
/* eslint-disable react/style-prop-object */
import { StatusBar } from 'expo-status-bar';
/* eslint-enable react/style-prop-object */

// Use official SDKs and types from @onekeyfe packages.
import HardwareBLESDK from '@onekeyfe/hd-ble-sdk';
import {
  UI_EVENT,
  UI_REQUEST,
  DEVICE_EVENT,
  LOG_EVENT,
  type CoreApi,
  type SearchDevice,
  type Features,
} from '@onekeyfe/hd-core';
import { BleManager as BlePlxManager } from 'react-native-ble-plx';

type LogLine = { ts: string; level: 'info' | 'warn' | 'error' | 'debug'; msg: string };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { marginTop: 16, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18, color: '#4B5563' },
  sectionTitle: { marginTop: 18, fontSize: 15, fontWeight: '600', color: '#111827' },
  card: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  btnDanger: { backgroundColor: '#DC2626' },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  listName: { fontSize: 14, color: '#111827' },
  listHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  metaBlock: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#111827',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }),
  },
  logWrapper: { maxHeight: 280, height: 280, marginTop: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  logScroll: { flex: 1, backgroundColor: '#0B1020' },
  logBlock: {
    padding: 10,
  },
  logLine: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }),
    fontSize: 11,
    lineHeight: 16,
    color: '#E5E7EB',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  overlayBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayText: {
    marginLeft: 8,
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
});

const now = () => new Date().toLocaleTimeString();

export const BleDemoScreen = () => {
  const [sdkReady, setSdkReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<null | 'features' | 'address' | 'sign'>(null);
  const [devices, setDevices] = useState<SearchDevice[]>([]);
  const [selected, setSelected] = useState<SearchDevice | null>(null);
  const [deviceFeatures, setDeviceFeatures] = useState<Features | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const sdkRef = useRef<CoreApi | null>(null);
  const bleRef = useRef<BlePlxManager | null>(null);

  const logsScrollRef = useRef<ScrollView | null>(null);
  const appendLog = useCallback((level: LogLine['level'], msg: any) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    setLogs(prev => {
      const next = [{ ts: now(), level, msg: text }, ...prev].slice(0, 500);
      // scroll to bottom after next paint
      requestAnimationFrame(() => logsScrollRef.current?.scrollToEnd({ animated: true }));
      return next;
    });
  }, []);

  // Ensure platform permissions and BLE powered on
  const ensureBleReady = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        // Android 12+ requires runtime BLUETOOTH_* and (often) location permissions
        const perms: string[] = [];
        // @ts-ignore
        if (Number(Platform.Version) >= 31) {
          // @ts-ignore
          perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
          // @ts-ignore
          perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        }
        perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        const res = await PermissionsAndroid.requestMultiple(perms);
        const allGranted = Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
        if (!allGranted) {
          Alert.alert('Permission required', 'Please grant Bluetooth and Location permissions.');
          return false;
        }
      } else if (Platform.OS === 'ios') {
        // iOS will prompt permission automatically on first BLE usage; here just provide guidance if powered off
      }

      // Check BLE powered on
      const state = await bleRef.current?.state();
      appendLog('info', { bleState: state });
      if (state && state !== 'PoweredOn') {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth and try again.', [
          { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => undefined) },
          { text: 'OK' },
        ]);
        return false;
      }
      return true;
    } catch (e: any) {
      appendLog('error', `ensureBleReady error: ${e?.message || e}`);
      return false;
    }
  }, [appendLog]);

  // Initialize SDK (only once)
  const initSdk = useCallback(async () => {
    if (sdkRef.current || initializing) return;
    try {
      setInitializing(true);
      appendLog('info', 'Initializing @onekeyfe/hd-ble-sdk...');
      sdkRef.current = HardwareBLESDK as unknown as CoreApi;
      await sdkRef.current.init({ debug: true, fetchConfig: true });
      setSdkReady(true);
      appendLog('info', 'SDK initialized.');

      // Prepare BLE manager instance for state checks
      try {
        bleRef.current = new BlePlxManager();
      } catch (err: any) {
        appendLog('error', `Create BlePlxManager failed: ${err?.message || err}`);
        appendLog(
          'warn',
          'This usually means native BLE module is not linked (use expo run:ios/android to build a Dev Client), or @onekeyfe/react-native-ble-utils / react-native-ble-plx not installed.'
        );
      }

      // Register core event listeners: UI, DEVICE, LOG
      sdkRef.current.on(UI_EVENT, async (evt: any) => {
        appendLog('debug', { UI_EVENT: evt });
        // Handle permission prompts from core by ensuring BLE preconditions
        try {
          if (
            evt?.type === UI_REQUEST.BLUETOOTH_PERMISSION ||
            evt?.type === UI_REQUEST.LOCATION_PERMISSION ||
            evt?.type === UI_REQUEST.LOCATION_SERVICE_PERMISSION
          ) {
            await ensureBleReady();
          }
        } catch (_) {}
      });
      sdkRef.current.on(DEVICE_EVENT, (evt: any) => appendLog('debug', { DEVICE_EVENT: evt }));
      sdkRef.current.on(LOG_EVENT, (evt: any) => appendLog('debug', { LOG_EVENT: evt }));
    } catch (e: any) {
      appendLog('error', `SDK init failed: ${e?.message || e}`);
      Alert.alert('Init failed', e?.message || String(e));
    } finally {
      setInitializing(false);
    }
  }, [appendLog, initializing]);

  useEffect(() => {
    // Auto initialize once
    initSdk();
    // Cleanup listeners
    return () => {
      try {
        sdkRef.current?.removeAllListeners?.(UI_EVENT);
        sdkRef.current?.removeAllListeners?.(DEVICE_EVENT);
        sdkRef.current?.removeAllListeners?.(LOG_EVENT);
      } catch {
        // ignore
      }
    };
  }, [initSdk]);

  const onScan = useCallback(async () => {
    if (!sdkRef.current) return;
    try {
      setScanning(true);
      appendLog('info', 'Scanning for BLE devices...');
      const ready = await ensureBleReady();
      if (!ready) {
        appendLog('warn', 'BLE not ready (permissions or state).');
        return;
      }

      // Safety timeout to avoid being stuck in scanning forever
      const timeoutMs = 15000;
      const timer = setTimeout(() => {
        try {
          appendLog('warn', 'Scan timed out. Canceling...');
          sdkRef.current?.cancel();
        } catch (_) {}
      }, timeoutMs);

      const res = await sdkRef.current.searchDevices();
      clearTimeout(timer);
      appendLog('info', { searchDevices: res });
      if (res?.success) {
        setDevices((res.payload as SearchDevice[]) || []);
      } else {
        Alert.alert('Scan failed', res?.payload?.error || 'unknown');
      }
    } catch (e: any) {
      appendLog('error', `Scan error: ${e?.message || e}`);
    } finally {
      setScanning(false);
    }
  }, [appendLog, ensureBleReady]);

  const onGetFeatures = useCallback(async () => {
    if (!sdkRef.current || !selected?.connectId) {
      Alert.alert('Tip', 'Please select a device first');
      return;
    }
    try {
      setBusy('features');
      appendLog('info', `Get features connectId=${selected.connectId}`);
      const res = await sdkRef.current.getFeatures(selected.connectId);
      appendLog('info', { getFeatures: res });
      if (res?.success) setDeviceFeatures(res.payload as Features);
    } catch (e: any) {
      appendLog('error', `Get features error: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  }, [appendLog, selected?.connectId]);

  const onGetAddress = useCallback(async () => {
    if (!sdkRef.current || !selected?.connectId) {
      Alert.alert('Tip', 'Please select a device first');
      return;
    }
    try {
      setBusy('address');
      const params = {
        path: "m/44'/60'/0'/0/0",
        showOnOneKey: false,
      };
      appendLog('info', { evmGetAddress: params });

      // ensure deviceId from features
      let deviceId = deviceFeatures?.device_id as string | undefined;
      if (!deviceId) {
        const f = await sdkRef.current.getFeatures(selected.connectId);
        appendLog('info', { ensureDeviceIdFromFeatures: f });
        if (!f?.success) throw new Error(f?.payload?.error || 'getFeatures failed');
        setDeviceFeatures(f.payload as Features);
        deviceId = (f.payload as any)?.device_id as string | undefined;
      }
      if (!deviceId) throw new Error('device_id not found');

      const res = await (sdkRef.current as any).evmGetAddress(selected.connectId, deviceId, params);
      appendLog('info', { evmGetAddressRes: res });
    } catch (e: any) {
      appendLog('error', `Get address error: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  }, [appendLog, selected?.connectId, deviceFeatures]);

  const onSignMessage = useCallback(async () => {
    if (!sdkRef.current || !selected?.connectId) {
      Alert.alert('Tip', 'Please select a device first');
      return;
    }
    try {
      setBusy('sign');
      const params = {
        path: "m/44'/60'/0'/0/0",
        showOnOneKey: false,
        // hex of "example message"
        messageHex: '0x6578616d706c65206d657373616765',
        chainId: 1,
      };
      appendLog('info', { evmSignMessage: params });

      // ensure deviceId from features
      let deviceId = deviceFeatures?.device_id as string | undefined;
      if (!deviceId) {
        const f = await sdkRef.current.getFeatures(selected.connectId);
        appendLog('info', { ensureDeviceIdFromFeatures: f });
        if (!f?.success) throw new Error(f?.payload?.error || 'getFeatures failed');
        setDeviceFeatures(f.payload as Features);
        deviceId = (f.payload as any)?.device_id as string | undefined;
      }
      if (!deviceId) throw new Error('device_id not found');

      const res = await (sdkRef.current as any).evmSignMessage(selected.connectId, deviceId, params);
      appendLog('info', { evmSignMessageRes: res });
      if (!res?.success) {
        Alert.alert('Sign failed', res?.payload?.error || 'unknown');
      }
    } catch (e: any) {
      appendLog('error', `Sign error: ${e?.message || e}`);
    } finally {
      setBusy(null);
    }
  }, [appendLog, selected?.connectId, deviceFeatures]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const selectedMeta = useMemo(() => {
    if (!selected) return 'Not selected';
    return `${selected.name} · ${selected.connectId || 'n/a'}`;
  }, [selected]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <StatusBar />
      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth (BLE)</Text>
        <Text style={styles.subtitle}>
          Initialize SDK, scan and select a device, then call features, address and signing methods. Logs are printed below.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Initialize</Text>
        <TouchableOpacity style={styles.btn} onPress={initSdk} disabled={sdkReady || initializing}>
          <Text style={styles.btnText}>{sdkReady ? 'Initialized' : initializing ? 'Initializing…' : 'Init SDK'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Scan Devices</Text>
          <TouchableOpacity style={[styles.btn]} onPress={onScan} disabled={!sdkReady || scanning || !!busy}>
            <Text style={styles.btnText}>{scanning ? 'Scanning…' : 'Start Scan'}</Text>
          </TouchableOpacity>
        </View>

        {devices.map((d) => (
          <TouchableOpacity key={`${d.uuid}-${d.connectId}`} style={styles.listItem} onPress={() => setSelected(d)}>
            <Text style={styles.listName}>{d.name || 'Unnamed device'}</Text>
            <Text style={styles.listHint}>connectId: {d.connectId || 'n/a'}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.metaBlock}>
          <Text style={styles.metaText}>Selected: {selectedMeta}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Device Actions</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={onGetFeatures}
          disabled={!sdkReady || !selected || scanning || !!busy}
        >
          <Text style={styles.btnText}>getFeatures</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={onGetAddress}
          disabled={!sdkReady || !selected || scanning || !!busy}
        >
          <Text style={styles.btnText}>evmGetAddress</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={onSignMessage}
          disabled={!sdkReady || !selected || scanning || !!busy}
        >
          <Text style={styles.btnText}>evmSignMessage</Text>
        </TouchableOpacity>

      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={clearLogs}>
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.logWrapper}>
          <ScrollView
            ref={logsScrollRef}
            style={styles.logScroll}
            contentContainerStyle={styles.logBlock}
            onContentSizeChange={() => logsScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {logs.map((l, idx) => (
              <Text key={idx} style={styles.logLine}>{`[${l.ts}] [${l.level}] ${l.msg}`}</Text>
            ))}
          </ScrollView>
        </View>
      </View>
      {(initializing || scanning || !!busy) && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.overlayText}>
              {initializing ? 'Initializing…' : scanning ? 'Scanning…' : 'Working…'}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default BleDemoScreen;
