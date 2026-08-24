import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
/* eslint-disable react/style-prop-object */
import { StatusBar } from 'expo-status-bar';
/* eslint-enable react/style-prop-object */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEVICE, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';

import { createHwkAdapter } from './connectorFactory';
import { HWK_BRAND_LABELS, type HwkAdapter, type HwkBrand } from './types';

import type { BtcAddress, DeviceInfo, EvmAddress, Response } from '@onekeyfe/hwk-adapter-core';
import type { TrezorAdapter } from '@onekeyfe/hwk-trezor-adapter';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type LogLine = {
  seq: number;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  msg: string;
};
type DebugLogEntry = {
  level?: LogLine['level'];
  scope: string;
  event: string;
  data?: Record<string, unknown>;
};
type BusyState = null | 'scan' | 'connect' | 'features' | 'address' | 'disconnect' | 'attestation';
type ThpPairingPrompt = {
  connectId: string;
  availableMethods: number[];
  selectedMethod: number;
  nfcData?: string;
  tag: string;
};
type PinPrompt = {
  connectId?: string;
  type?: string;
  pin: string;
};
type SelectableDeviceSource = 'scan' | 'handshake' | 'direct';
type AuthorizedDevice = DeviceInfo & {
  authorizedAt: number;
  updatedAt: number;
};

const EVM_TEST_PATH = "m/44'/60'/0'/0/0";
const BTC_TEST_PATH = "m/84'/0'/0'/0/0";
const VERBOSE_TREZOR_LOGS = false;
const REMEMBERED_TREZOR_DEVICE_KEY = 'hwk-trezor-demo.rememberedDevice';
const AUTHORIZED_TREZOR_DEVICES_KEY = 'hwk-trezor-demo.authorizedDevices';
const THP_CREDENTIALS_KEY = 'hwk-trezor-demo.thpCredentials';
const DEFAULT_TREZOR_BLE_CONNECT_ID = '62:79:4D:55:37:8F';

const COMPACT_DEBUG_EVENTS = new Set([
  'device-connect',
  'device-disconnect',
  'ble.write.start',
  'ble.write.chunk',
  'ble.write.done',
  'ble.read.wait',
  'ble.read.resolve',
  'ble.read.fromQueue',
  'ble.notify.data',
  'thp.call.request',
  'thp.call.wire',
  'thp.loop',
  'thp.call.response',
]);

const shouldShowDebugLog = (entry: DebugLogEntry) => {
  if (VERBOSE_TREZOR_LOGS) return true;
  if ((entry.level ?? 'debug') !== 'debug') return true;
  return COMPACT_DEBUG_EVENTS.has(entry.event);
};

const responseError = (response: Response<unknown>) =>
  response.success ? undefined : response.payload?.error ?? 'unknown error';

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return String(error);
};

const createRememberedDevice = (connectId: string): DeviceInfo => ({
  vendor: 'trezor',
  model: 'T3W1',
  firmwareVersion: '',
  deviceId: connectId,
  connectId,
  label: 'Trezor Safe 7',
  connectionType: 'ble',
  capabilities: { persistentDeviceIdentity: false },
});

const normalizeConnectId = (value: string) => value.trim();

const normalizeDevice = (device: DeviceInfo): DeviceInfo => {
  const connectId = normalizeConnectId(device.connectId);
  return {
    ...device,
    connectId,
    deviceId: normalizeConnectId(device.deviceId || connectId),
  };
};

const busyLabelMap: Record<Exclude<BusyState, null>, string> = {
  scan: 'Scanning...',
  connect: 'Connecting...',
  features: 'Getting features...',
  address: 'Getting address...',
  disconnect: 'Disconnecting...',
  attestation: 'Verifying device...',
};

const upsertDevice = (devices: DeviceInfo[], device: DeviceInfo) => {
  const existingIndex = devices.findIndex(item => item.connectId === device.connectId);
  if (existingIndex < 0) return [device, ...devices];

  const next = [...devices];
  next[existingIndex] = { ...next[existingIndex], ...device };
  return next;
};

export const HwkScreen = () => {
  const [brand, setBrand] = useState<HwkBrand>('trezor');
  const adapterRef = useRef<HwkAdapter | null>(null);
  /**
   * Live array of saved THP pairing credentials. Threaded into the connector
   * at construction; we push fresh creds in on DEVICE.TREZOR_THP_CREDENTIALS_CHANGED
   * so the next THP handshake hits the autoconnect path without restarting
   * the demo. Persisted to AsyncStorage on every change.
   */
  const thpCredentialsRef = useRef<Record<string, unknown>[]>([]);
  /** Web-only: WebUSB/WebHID picker, must be invoked from a click handler. */
  const requestDeviceRef = useRef<(() => Promise<void>) | undefined>(undefined);
  /** Mirrors `requestDeviceRef.current` so render can react to it. */
  const [hasRequestDevice, setHasRequestDevice] = useState(false);
  const logsScrollRef = useRef<ScrollView | null>(null);
  const logsStickToBottomRef = useRef(true);
  const logsRef = useRef<LogLine[]>([]);
  const logSeqRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<BusyState>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selected, setSelected] = useState<DeviceInfo | null>(null);
  const [selectedSource, setSelectedSource] = useState<SelectableDeviceSource | null>(null);
  const [authorizedDevices, setAuthorizedDevices] = useState<AuthorizedDevice[]>([]);
  const [rememberedDevice, setRememberedDevice] = useState<DeviceInfo | null>(null);
  const [directConnectId, setDirectConnectId] = useState(DEFAULT_TREZOR_BLE_CONNECT_ID);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, unknown> | null>(null);
  const [btcAddress, setBtcAddress] = useState<BtcAddress | null>(null);
  const [address, setAddress] = useState<EvmAddress | null>(null);
  const [pairingPrompt, setPairingPrompt] = useState<ThpPairingPrompt | null>(null);
  const [pinPrompt, setPinPrompt] = useState<PinPrompt | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const appendLog = useCallback((level: LogLine['level'], msg: unknown) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    const line = { seq: logSeqRef.current + 1, ts: new Date().toISOString(), level, msg: text };
    logSeqRef.current = line.seq;
    const consoleArgs = [`[HWK-TREZOR][${line.ts}][${level}]`, text];
    if (level === 'error') {
      console.error(...consoleArgs);
    } else if (level === 'warn') {
      console.warn(...consoleArgs);
    } else {
      console.log(...consoleArgs);
    }
    setLogs(prev => {
      const next = [...prev, line].sort((a, b) => a.seq - b.seq).slice(-1000);
      logsRef.current = next;
      return next;
    });
  }, []);

  const handleLogsScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    logsStickToBottomRef.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
  }, []);

  const handleLogsContentSizeChange = useCallback(() => {
    if (!logsStickToBottomRef.current) return;
    requestAnimationFrame(() => logsScrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const debugLogger = useCallback(
    (entry: DebugLogEntry) => {
      if (!shouldShowDebugLog(entry)) return;
      appendLog(entry.level ?? 'debug', {
        scope: entry.scope,
        event: entry.event,
        data: entry.data,
      });
    },
    [appendLog]
  );

  // Hydrate THP pairing credentials cache from AsyncStorage. Best-effort:
  // if it loses the race vs the user's first Init click, the first session
  // just runs full pairing — only the second connect onwards needs creds.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THP_CREDENTIALS_KEY)
      .then(raw => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            thpCredentialsRef.current.push(...parsed);
            appendLog('info', {
              event: 'thp.credentials.hydrated',
              count: parsed.length,
            });
          }
        } catch (error) {
          appendLog('warn', { event: 'thp.credentials.hydrateFailed', error: String(error) });
        }
      })
      .catch(error =>
        appendLog('warn', { event: 'thp.credentials.hydrateFailed', error: String(error) })
      );
    return () => {
      cancelled = true;
    };
  }, [appendLog]);

  useEffect(() => {
    const errorUtils = (
      globalThis as unknown as {
        ErrorUtils?: {
          getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
          setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
        };
      }
    ).ErrorUtils;
    const previousHandler = errorUtils?.getGlobalHandler?.();
    if (!errorUtils?.setGlobalHandler) return undefined;

    errorUtils.setGlobalHandler((error, isFatal) => {
      appendLog('error', { globalError: formatError(error), isFatal });
      previousHandler?.(error, isFatal);
    });

    return () => {
      if (previousHandler) {
        errorUtils.setGlobalHandler?.(previousHandler);
      }
    };
  }, [appendLog]);

  const initAdapter = useCallback(() => {
    if (adapterRef.current) return;

    const bundle = createHwkAdapter(brand, {
      debugLogger,
      thpKnownCredentials: thpCredentialsRef.current,
    });
    const { adapter } = bundle;
    requestDeviceRef.current = bundle.requestDevice;
    setHasRequestDevice(!!bundle.requestDevice);
    adapter.on('device-connect', event =>
      debugLogger({
        level: 'debug',
        scope: 'trezor-demo',
        event: 'device-connect',
        data: { payload: event.payload },
      })
    );
    adapter.on('device-disconnect', event =>
      debugLogger({
        level: 'debug',
        scope: 'trezor-demo',
        event: 'device-disconnect',
        data: { payload: event.payload },
      })
    );
    adapter.on(DEVICE.TREZOR_THP_CREDENTIALS_CHANGED, event => {
      const incoming = event.payload.credentials ?? [];
      // Push only credentials we don't already have. The protocol matches by
      // `credential` (the device-issued blob), so use that as the dedup key.
      let added = 0;
      for (const cred of incoming) {
        const { credential } = cred as { credential?: string };
        if (!credential) continue;
        const exists = thpCredentialsRef.current.some(
          existing => (existing as { credential?: string }).credential === credential
        );
        if (!exists) {
          thpCredentialsRef.current.push(cred);
          added += 1;
        }
      }
      if (added === 0) return;
      appendLog('info', {
        event: 'thp.credentials.persist',
        deviceId: event.payload.deviceId,
        added,
        total: thpCredentialsRef.current.length,
      });
      AsyncStorage.setItem(THP_CREDENTIALS_KEY, JSON.stringify(thpCredentialsRef.current)).catch(
        error => appendLog('warn', { event: 'thp.credentials.persistFailed', error: String(error) })
      );
    });
    adapter.on('ui-event', event =>
      debugLogger({ level: 'debug', scope: 'trezor-demo', event: 'ui-event', data: { event } })
    );
    adapter.on(UI_REQUEST.REQUEST_TREZOR_THP_PAIRING, event => {
      appendLog('info', { thpPairingRequest: event.payload });
      setPairingPrompt({ ...event.payload, tag: '' });
    });
    adapter.on(UI_REQUEST.REQUEST_PIN, event => {
      appendLog('info', { pinRequest: event.payload });
      const payload = event.payload as { connectId?: string; type?: string };
      setPinPrompt({
        connectId: payload.connectId,
        type: payload.type,
        pin: '',
      });
    });
    adapter.on(UI_REQUEST.REQUEST_BUTTON, event => {
      const payload = event.payload as { connectId?: string; code?: string };
      appendLog('info', { buttonRequest: payload });
      // ButtonRequest_PinEntry is the SDK's signal that the device is
      // THP-locked and waiting for the user to type their PIN on the device
      // screen. The SDK has already kicked off a `tryToUnlock=1` handshake;
      // we just need to surface a prompt and let the user fall back via the
      // device or by cancelling the chain method.
      if (payload.code !== 'ButtonRequest_PinEntry') return;
      Alert.alert(
        'Unlock your Trezor',
        'Please enter your PIN on the Trezor device. The SDK will continue once the device is unlocked.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              const id = payload.connectId;
              if (!id) return;
              adapter.cancel(id);
              adapter.disconnectDevice(id).catch(() => undefined);
            },
          },
          { text: 'OK' },
        ]
      );
    });
    adapterRef.current = adapter;
    setReady(true);
    appendLog('info', 'HWK Trezor BLE adapter initialized.');
  }, [appendLog, brand, debugLogger]);

  const selectDevice = useCallback((device: DeviceInfo, source: SelectableDeviceSource) => {
    const normalizedDevice = normalizeDevice(device);
    setSelected(normalizedDevice);
    setSelectedSource(source);
    setDirectConnectId(normalizedDevice.connectId);
  }, []);

  const rememberDevice = useCallback(
    async (device: DeviceInfo) => {
      const normalizedDevice = normalizeDevice(device);
      const now = Date.now();
      const existingDevice = authorizedDevices.find(
        item => item.connectId === normalizedDevice.connectId
      );
      const authorizedDevice: AuthorizedDevice = {
        ...normalizedDevice,
        authorizedAt: existingDevice?.authorizedAt ?? now,
        updatedAt: now,
      };
      const nextAuthorizedDevices = [
        authorizedDevice,
        ...authorizedDevices.filter(item => item.connectId !== normalizedDevice.connectId),
      ];

      setAuthorizedDevices(nextAuthorizedDevices);
      setRememberedDevice(normalizedDevice);
      setDirectConnectId(normalizedDevice.connectId);

      try {
        await AsyncStorage.setItem(
          AUTHORIZED_TREZOR_DEVICES_KEY,
          JSON.stringify(nextAuthorizedDevices)
        );
        await AsyncStorage.setItem(REMEMBERED_TREZOR_DEVICE_KEY, JSON.stringify(normalizedDevice));
        appendLog('info', {
          step: 'authorizeDevice.done',
          connectId: normalizedDevice.connectId,
          count: nextAuthorizedDevices.length,
        });
      } catch (error) {
        appendLog('warn', { step: 'authorizeDevice.error', error: formatError(error) });
      }
    },
    [appendLog, authorizedDevices]
  );

  useEffect(() => {
    let cancelled = false;

    const loadRememberedDevice = async () => {
      try {
        const [storedAuthorized, storedLegacy] = await Promise.all([
          AsyncStorage.getItem(AUTHORIZED_TREZOR_DEVICES_KEY),
          AsyncStorage.getItem(REMEMBERED_TREZOR_DEVICE_KEY),
        ]);
        const parsedAuthorized = storedAuthorized ? JSON.parse(storedAuthorized) : [];
        const parsedLegacy = storedLegacy ? JSON.parse(storedLegacy) : null;
        const now = Date.now();
        const authorizedFromStorage: AuthorizedDevice[] = Array.isArray(parsedAuthorized)
          ? parsedAuthorized
              .filter(item => typeof item?.connectId === 'string')
              .map(item => ({
                ...normalizeDevice({ ...createRememberedDevice(item.connectId), ...item }),
                authorizedAt: typeof item.authorizedAt === 'number' ? item.authorizedAt : now,
                updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
              }))
          : [];
        const legacyConnectId =
          typeof parsedLegacy?.connectId === 'string'
            ? normalizeConnectId(parsedLegacy.connectId)
            : '';
        const legacyDevice = legacyConnectId
          ? normalizeDevice({
              ...createRememberedDevice(legacyConnectId),
              ...parsedLegacy,
              connectId: legacyConnectId,
            })
          : null;
        const authorizedDevicesFromMigration =
          legacyDevice &&
          !authorizedFromStorage.some(item => item.connectId === legacyDevice.connectId)
            ? [
                {
                  ...legacyDevice,
                  authorizedAt: now,
                  updatedAt: now,
                },
                ...authorizedFromStorage,
              ]
            : authorizedFromStorage;
        const firstDevice = authorizedDevicesFromMigration[0] ?? legacyDevice;

        if (cancelled) return;
        setAuthorizedDevices(authorizedDevicesFromMigration);
        setRememberedDevice(firstDevice ? normalizeDevice(firstDevice) : null);
        setDirectConnectId(firstDevice?.connectId ?? DEFAULT_TREZOR_BLE_CONNECT_ID);
        if (
          legacyDevice &&
          authorizedDevicesFromMigration.length !== authorizedFromStorage.length
        ) {
          await AsyncStorage.setItem(
            AUTHORIZED_TREZOR_DEVICES_KEY,
            JSON.stringify(authorizedDevicesFromMigration)
          );
        }
        appendLog('info', {
          step: 'authorizedDevices.loaded',
          count: authorizedDevicesFromMigration.length,
          defaultConnectId: firstDevice?.connectId ?? DEFAULT_TREZOR_BLE_CONNECT_ID,
        });
      } catch (error) {
        if (cancelled) return;
        setDirectConnectId(DEFAULT_TREZOR_BLE_CONNECT_ID);
        setRememberedDevice(null);
        appendLog('warn', { step: 'authorizedDevices.load.error', error: formatError(error) });
      }
    };

    void loadRememberedDevice();

    return () => {
      cancelled = true;
    };
  }, [appendLog]);

  const onScan = useCallback(async () => {
    initAdapter();
    const adapter = adapterRef.current;
    if (!adapter) return;

    try {
      setBusy('scan');
      setFeatures(null);
      setBtcAddress(null);
      setAddress(null);
      appendLog('info', 'Scanning hardware-wallet devices...');
      // adapter emits REQUEST_DEVICE_PERMISSION itself; no pre-flight needed.

      // Web (WebUSB / WebHID): the browser only enumerates *authorized*
      // devices via getDevices() — the very first call returns an empty
      // list until the user has picked a device through the picker, which
      // *must* be triggered inside a user-gesture handler. We synchronously
      // chain it before searchDevices so this single click satisfies both.
      // Native: requestDeviceRef is undefined (scanning is automatic), so
      // we fall straight through.
      const requestDevice = requestDeviceRef.current;
      if (requestDevice) {
        try {
          await requestDevice();
          appendLog('info', 'Device authorized via WebUSB picker.');
        } catch (err) {
          // User dismissed the picker — searchDevices() will still pick up
          // any previously-authorized devices below.
          appendLog('warn', `requestDevice cancelled or failed: ${String(err)}`);
        }
      }

      const result = (await adapter.searchDevices()).map(normalizeDevice);
      setDevices(result);
      appendLog('info', { searchDevices: result });
      if (result.length > 0) {
        selectDevice(result[0], 'scan');
        return;
      }

      appendLog('warn', {
        searchDevices:
          'No devices found. On web make sure you picked one in the picker; on native make sure the device is advertising.',
      });
    } catch (error) {
      appendLog('error', { step: 'scan.error', error: formatError(error) });
    } finally {
      setBusy(null);
    }
  }, [appendLog, initAdapter, selectDevice]);

  const connectSelectedDevice = useCallback(
    async (device: DeviceInfo) => {
      initAdapter();
      const adapter = adapterRef.current;
      if (!adapter) return;
      const normalizedDevice = normalizeDevice(device);

      // adapter emits REQUEST_DEVICE_PERMISSION itself; no pre-flight needed.

      try {
        setBusy('connect');
        setFeatures(null);
        setBtcAddress(null);
        setAddress(null);
        setSelected(normalizedDevice);
        appendLog('info', `Connecting ${normalizedDevice.connectId}...`);
        const result = await adapter.connectDevice(normalizedDevice.connectId);
        appendLog('info', { connectDevice: result });
        if (!result.success) {
          Alert.alert('Connect failed', responseError(result));
          return;
        }
        setConnectedId(normalizedDevice.connectId);
        setSelected(normalizedDevice);
        setSelectedSource('handshake');
        await rememberDevice(normalizedDevice);
      } catch (error) {
        appendLog('error', { step: 'connect.error', error: formatError(error) });
      } finally {
        setBusy(null);
      }
    },
    [appendLog, initAdapter, rememberDevice]
  );

  const onConnect = useCallback(async () => {
    if (!selected) {
      Alert.alert('Tip', 'Please select a scanned or handshake success Trezor first.');
      return;
    }

    await connectSelectedDevice(selected);
  }, [connectSelectedDevice, selected]);

  const onDirectConnect = useCallback(async () => {
    const connectId = normalizeConnectId(directConnectId);
    if (!connectId) {
      Alert.alert('Tip', 'Please enter a BLE connectId.');
      return;
    }

    const device =
      authorizedDevices.find(item => item.connectId === connectId) ??
      (rememberedDevice?.connectId === connectId
        ? rememberedDevice
        : createRememberedDevice(connectId));
    selectDevice(device, 'direct');
    setDirectConnectId(connectId);
    await connectSelectedDevice(device);
  }, [authorizedDevices, connectSelectedDevice, directConnectId, rememberedDevice, selectDevice]);

  const deleteHandshakeDevice = useCallback(
    async (device: DeviceInfo) => {
      const connectId = normalizeConnectId(device.connectId);
      const nextAuthorizedDevices = authorizedDevices.filter(item => item.connectId !== connectId);
      const nextRememberedDevice = nextAuthorizedDevices[0] ?? null;

      setAuthorizedDevices(nextAuthorizedDevices);
      setRememberedDevice(nextRememberedDevice ? normalizeDevice(nextRememberedDevice) : null);
      if (selected?.connectId === connectId) {
        setSelected(null);
        setSelectedSource(null);
      }
      if (directConnectId === connectId) {
        setDirectConnectId(nextRememberedDevice?.connectId ?? DEFAULT_TREZOR_BLE_CONNECT_ID);
      }

      try {
        await AsyncStorage.setItem(
          AUTHORIZED_TREZOR_DEVICES_KEY,
          JSON.stringify(nextAuthorizedDevices)
        );
        if (nextRememberedDevice) {
          await AsyncStorage.setItem(
            REMEMBERED_TREZOR_DEVICE_KEY,
            JSON.stringify(normalizeDevice(nextRememberedDevice))
          );
        } else {
          await AsyncStorage.removeItem(REMEMBERED_TREZOR_DEVICE_KEY);
        }
        appendLog('info', {
          step: 'handshakeDevice.delete.done',
          connectId,
          count: nextAuthorizedDevices.length,
        });
      } catch (error) {
        appendLog('warn', { step: 'handshakeDevice.delete.error', error: formatError(error) });
      }
    },
    [appendLog, authorizedDevices, directConnectId, selected?.connectId]
  );

  const onGetFeatures = useCallback(async () => {
    const adapter = adapterRef.current;
    const connectId = selected?.connectId ?? connectedId;
    if (!adapter || !connectId) {
      Alert.alert('Tip', 'Please connect a Trezor first.');
      return;
    }

    if (brand !== 'trezor') {
      Alert.alert('Not supported', 'getFeatures is currently Trezor-only.');
      return;
    }
    try {
      setBusy('features');
      appendLog('info', `getFeatures ${connectId}...`);
      const result = await (adapter as TrezorAdapter).getFeatures(connectId);
      appendLog('info', { getFeatures: result });
      if (!result.success) {
        Alert.alert('getFeatures failed', responseError(result));
        return;
      }
      setFeatures(result.payload);
    } catch (error) {
      appendLog('error', { step: 'getFeatures.error', error: formatError(error) });
    } finally {
      setBusy(null);
    }
  }, [appendLog, brand, connectedId, selected?.connectId]);

  const onVerifyDevice = useCallback(async () => {
    const adapter = adapterRef.current;
    const connectId = selected?.connectId ?? connectedId;
    if (!adapter || !connectId) {
      Alert.alert('Tip', 'Please connect a device first.');
      return;
    }
    // Both TrezorAdapter and LedgerAdapter expose verifyDeviceAuthenticity(connectId).
    const verifier = adapter as unknown as {
      verifyDeviceAuthenticity: (id: string) => Promise<{
        success: boolean;
        payload: {
          verified?: boolean;
          deviceId?: string;
          usedDebugKey?: boolean;
          deviceCertPubKey?: string;
          serialNumber?: string;
          note?: string;
          error?: string;
        };
      }>;
    };
    try {
      setBusy('attestation');
      appendLog('info', `verifyDeviceAuthenticity ${connectId}... (confirm on device)`);
      const result = await verifier.verifyDeviceAuthenticity(connectId);
      appendLog('info', { verifyDeviceAuthenticity: result });
      if (!result.success) {
        Alert.alert('verifyDeviceAuthenticity failed', JSON.stringify(result.payload));
        return;
      }
      const { verified, deviceId, usedDebugKey, note } = result.payload;
      const id = deviceId ?? '(none)';
      const title = verified
        ? usedDebugKey
          ? 'Verified ⚠️ DEBUG key'
          : 'Verified ✅'
        : 'Not verified';
      Alert.alert(title, `id:\n${id}${note ? `\n\n${note}` : ''}`);
    } catch (error) {
      appendLog('error', { step: 'verifyDeviceAuthenticity.error', error: formatError(error) });
    } finally {
      setBusy(null);
    }
  }, [appendLog, connectedId, selected?.connectId]);

  const onGetAddress = useCallback(async () => {
    const adapter = adapterRef.current;
    const connectId = selected?.connectId ?? connectedId;
    const featureDeviceId = features?.device_id;
    const deviceId =
      typeof featureDeviceId === 'string' ? featureDeviceId : selected?.deviceId ?? connectId;
    if (!adapter || !connectId || !deviceId) {
      Alert.alert('Tip', 'Please connect a Trezor first.');
      return;
    }

    try {
      setBusy('address');
      const params = { path: EVM_TEST_PATH, showOnDevice: false };
      appendLog('info', { evmGetAddress: params });
      const result = await adapter.evmGetAddress(connectId, deviceId, params);
      appendLog('info', { evmGetAddressRes: result });
      if (!result.success) {
        Alert.alert('evmGetAddress failed', responseError(result));
        return;
      }
      setAddress(result.payload);
    } catch (error) {
      appendLog('error', { step: 'evmGetAddress.error', error: formatError(error) });
    } finally {
      setBusy(null);
    }
  }, [appendLog, connectedId, features?.device_id, selected?.connectId, selected?.deviceId]);

  const onGetBtcAddress = useCallback(async () => {
    const adapter = adapterRef.current;
    const connectId = selected?.connectId ?? connectedId;
    const featureDeviceId = features?.device_id;
    const deviceId =
      typeof featureDeviceId === 'string' ? featureDeviceId : selected?.deviceId ?? connectId;
    if (!adapter || !connectId || !deviceId) {
      Alert.alert('Tip', 'Please connect a Trezor first.');
      return;
    }

    try {
      setBusy('address');
      const params = {
        path: BTC_TEST_PATH,
        coin: 'Bitcoin',
        showOnDevice: false,
        scriptType: 'p2wpkh' as const,
      };
      appendLog('info', { getAddress: params });
      const result = await adapter.btcGetAddress(connectId, deviceId, params);
      appendLog('info', { getAddressRes: result });
      if (!result.success) {
        Alert.alert('getAddress failed', responseError(result));
        return;
      }
      setBtcAddress(result.payload);
    } catch (error) {
      appendLog('error', { step: 'getAddress.error', error: formatError(error) });
    } finally {
      setBusy(null);
    }
  }, [appendLog, connectedId, features?.device_id, selected?.connectId, selected?.deviceId]);

  const onDisconnect = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter || !connectedId) return;

    try {
      setBusy('disconnect');
      appendLog('info', `Disconnecting ${connectedId}...`);
      await adapter.disconnectDevice(connectedId);
      setConnectedId(null);
      setBtcAddress(null);
      setAddress(null);
      setFeatures(null);
      appendLog('info', 'Disconnected.');
    } catch (error) {
      appendLog('error', { step: 'disconnect.error', error: formatError(error) });
    } finally {
      setBusy(null);
    }
  }, [appendLog, connectedId]);

  const onSubmitPairingTag = useCallback(() => {
    const adapter = adapterRef.current;
    const tag = pairingPrompt?.tag.trim();
    if (!adapter || !pairingPrompt || !tag) {
      Alert.alert('Tip', 'Please enter the pairing code shown by the Trezor.');
      return;
    }

    appendLog('info', { thpPairingResponse: { tag } });
    adapter.uiResponse({
      type: UI_RESPONSE.RECEIVE_TREZOR_THP_PAIRING,
      payload: { tag },
    });
    setPairingPrompt(null);
  }, [appendLog, pairingPrompt]);

  const onCancelPairing = useCallback(() => {
    adapterRef.current?.uiResponse({ type: UI_RESPONSE.CANCEL });
    setPairingPrompt(null);
    appendLog('warn', 'THP pairing cancelled.');
  }, [appendLog]);

  const onSubmitPin = useCallback(() => {
    const adapter = adapterRef.current;
    const pin = pinPrompt?.pin.trim();
    if (!adapter || !pinPrompt || !pin) {
      Alert.alert('Tip', 'Please enter the PIN matrix value.');
      return;
    }

    appendLog('info', { pinResponse: { length: pin.length } });
    adapter.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: pin,
    });
    setPinPrompt(null);
  }, [appendLog, pinPrompt]);

  const onCancelPin = useCallback(() => {
    adapterRef.current?.uiResponse({ type: UI_RESPONSE.CANCEL });
    setPinPrompt(null);
    appendLog('warn', 'PIN request cancelled.');
  }, [appendLog]);

  const onShareLogs = useCallback(async () => {
    const content = logsRef.current
      .slice()
      .sort((a, b) => a.seq - b.seq)
      .map(line => `[${line.ts}] [${line.level}] ${line.msg}`)
      .join('\n\n');
    try {
      await Share.share({ message: content || 'No HWK Trezor logs.' });
    } catch (error) {
      appendLog('error', { step: 'shareLogs.error', error: formatError(error) });
    }
  }, [appendLog]);

  const selectedMeta = useMemo(() => {
    if (!selected) return 'Not selected';
    return `${selected.label ?? selected.model ?? 'Trezor'} · ${selected.connectId} · source=${
      selectedSource ?? '-'
    }`;
  }, [selected, selectedSource]);
  const busyLabel = busy ? busyLabelMap[busy] : 'Working...';

  const renderScanRows = (list: DeviceInfo[]) => {
    if (list.length === 0) {
      return <Text style={styles.emptyText}>No scan results.</Text>;
    }

    return list.map(device => (
      <View
        key={`scan-${device.connectId}`}
        style={[
          styles.listItem,
          selected?.connectId === device.connectId &&
            selectedSource === 'scan' &&
            styles.listItemActive,
        ]}
      >
        <TouchableOpacity style={styles.listInfo} onPress={() => selectDevice(device, 'scan')}>
          <Text style={styles.listName}>{device.label ?? device.model ?? 'Trezor'}</Text>
          <Text style={styles.listHint}>connectId: {device.connectId}</Text>
          <Text style={styles.listHint}>deviceId: {device.deviceId}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => connectSelectedDevice(device)}
          disabled={!!busy || connectedId === device.connectId}
        >
          <Text style={styles.actionBtnText}>connect</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  const renderHandshakeRows = (list: AuthorizedDevice[]) => {
    if (list.length === 0) {
      return <Text style={styles.emptyText}>No handshake success devices saved.</Text>;
    }

    return list.map(device => (
      <View
        key={`handshake-${device.connectId}`}
        style={[
          styles.listItem,
          selected?.connectId === device.connectId &&
            selectedSource === 'handshake' &&
            styles.listItemActive,
        ]}
      >
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{device.label ?? device.model ?? 'Trezor'}</Text>
          <Text style={styles.listHint}>connectId: {device.connectId}</Text>
          <Text style={styles.listHint}>deviceId: {device.deviceId}</Text>
        </View>
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => selectDevice(device, 'handshake')}
          >
            <Text style={styles.actionBtnText}>select</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => deleteHandshakeDevice(device)}
            disabled={!!busy}
          >
            <Text style={styles.actionBtnText}>delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} nestedScrollEnabled style={styles.scroll}>
        <StatusBar />
        <View style={styles.header}>
          <Text style={styles.title}>HWK Demo</Text>
          <Text style={styles.subtitle}>
            Drives the HWK adapter stack against the selected hardware-wallet brand. Trezor and
            Ledger are wired across native (BLE) and web (WebUSB / WebHID).
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Brand</Text>
          <View style={styles.row}>
            {(Object.keys(HWK_BRAND_LABELS) as HwkBrand[]).map(b => {
              const isActive = b === brand;
              return (
                <TouchableOpacity
                  key={b}
                  onPress={() => {
                    if (ready) {
                      Alert.alert(
                        'Reload required',
                        'Brand switching after init is not supported in this MVP. Restart the app to switch brands.'
                      );
                      return;
                    }
                    setBrand(b);
                  }}
                  style={[styles.brandChip, isActive && styles.brandChipActive]}
                >
                  <Text style={[styles.brandChipText, isActive && styles.brandChipTextActive]}>
                    {HWK_BRAND_LABELS[b]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Adapter</Text>
          <TouchableOpacity style={styles.btn} onPress={initAdapter} disabled={ready}>
            <Text style={styles.btnText}>
              {ready ? 'Initialized' : `Init HWK ${HWK_BRAND_LABELS[brand]}`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Devices</Text>
            <TouchableOpacity style={styles.btn} onPress={onScan} disabled={!!busy}>
              <Text style={styles.btnText}>
                {busy === 'scan'
                  ? 'Scanning...'
                  : Platform.OS === 'web' && hasRequestDevice
                  ? 'Scan / Pick Device'
                  : 'Scan'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.listSectionTitle}>Scan results</Text>
          {renderScanRows(devices)}

          <Text style={styles.listSectionTitle}>Handshake success</Text>
          {renderHandshakeRows(authorizedDevices)}

          <View style={styles.metaBlock}>
            <Text style={styles.metaText}>Selected: {selectedMeta}</Text>
            <Text style={styles.metaText}>Handshake success: {authorizedDevices.length}</Text>
            <Text style={styles.metaText}>Connected: {connectedId ?? 'No'}</Text>
          </View>

          <View style={styles.directBlock}>
            <Text style={styles.metaText}>Direct BLE connectId</Text>
            <TextInput
              style={styles.input}
              value={directConnectId}
              onChangeText={setDirectConnectId}
              placeholder="62:79:4D:55:37:8F"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={onDirectConnect}
              disabled={!!busy || connectedId === normalizeConnectId(directConnectId)}
            >
              <Text style={styles.btnText}>Direct connect</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request Chain</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={onConnect}
            disabled={!selected || !!busy || connectedId === selected?.connectId}
          >
            <Text style={styles.btnText}>connectDevice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={onGetFeatures}
            disabled={!selected || !!busy}
          >
            <Text style={styles.btnText}>getFeatures</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={onVerifyDevice}
            disabled={!selected || !!busy}
          >
            <Text style={styles.btnText}>verifyDevice (deviceId)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={onGetBtcAddress}
            disabled={!selected || !!busy}
          >
            <Text style={styles.btnText}>getAddress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={onGetAddress}
            disabled={!selected || !!busy}
          >
            <Text style={styles.btnText}>evmGetAddress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={onDisconnect}
            disabled={!connectedId || !!busy}
          >
            <Text style={styles.btnText}>disconnectDevice</Text>
          </TouchableOpacity>

          {features ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaText}>{JSON.stringify(features, null, 2)}</Text>
            </View>
          ) : null}

          {btcAddress ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaText}>{JSON.stringify(btcAddress, null, 2)}</Text>
            </View>
          ) : null}

          {address ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaText}>{JSON.stringify(address, null, 2)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <View style={styles.rowStart}>
              <TouchableOpacity style={styles.btn} onPress={onShareLogs}>
                <Text style={styles.btnText}>Share Logs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={() => {
                  logsRef.current = [];
                  logSeqRef.current = 0;
                  setLogs([]);
                }}
              >
                <Text style={styles.btnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.logWrapper}>
            <ScrollView
              ref={logsScrollRef}
              style={styles.logScroll}
              contentContainerStyle={styles.logBlock}
              nestedScrollEnabled
              persistentScrollbar
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
              onContentSizeChange={handleLogsContentSizeChange}
              onScroll={handleLogsScroll}
            >
              {logs.map(line => (
                <Text key={line.seq} selectable style={styles.logLine}>
                  {`[${line.ts}] [${line.level}] ${line.msg}`}
                </Text>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pairingPrompt)}
        onRequestClose={onCancelPairing}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>THP Pairing</Text>
            <Text style={styles.modalMeta}>connectId: {pairingPrompt?.connectId ?? '-'}</Text>
            <Text style={styles.modalMeta}>method: {pairingPrompt?.selectedMethod ?? '-'}</Text>
            <TextInput
              style={styles.input}
              value={pairingPrompt?.tag ?? ''}
              onChangeText={tag => setPairingPrompt(prev => (prev ? { ...prev, tag } : prev))}
              placeholder="Pairing code"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSubmitPairingTag}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btn} onPress={onSubmitPairingTag}>
                <Text style={styles.btnText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onCancelPairing}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pinPrompt)}
        onRequestClose={onCancelPin}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Trezor PIN</Text>
            <Text style={styles.modalMeta}>connectId: {pinPrompt?.connectId ?? '-'}</Text>
            <Text style={styles.modalMeta}>type: {pinPrompt?.type ?? '-'}</Text>
            <TextInput
              style={styles.input}
              value={pinPrompt?.pin ?? ''}
              onChangeText={pin => setPinPrompt(prev => (prev ? { ...prev, pin } : prev))}
              placeholder="PIN matrix value"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              autoFocus
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={onSubmitPin}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btn} onPress={onSubmitPin}>
                <Text style={styles.btnText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onCancelPin}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {busy && !pairingPrompt && !pinPrompt ? (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.overlayText}>{busyLabel}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
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
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  btnDanger: { backgroundColor: '#DC2626' },
  btnSecondary: { backgroundColor: '#0EA5E9', marginRight: 6 },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  rowGroup: { flexDirection: 'row', alignItems: 'center' },
  brandChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  brandChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  brandChipDisabled: { opacity: 0.55 },
  brandChipText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  brandChipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  brandChipTextDisabled: { color: '#6B7280' },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  listItemActive: { backgroundColor: '#EFF6FF' },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, color: '#111827' },
  listHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  listSectionTitle: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  emptyText: {
    marginTop: 6,
    paddingVertical: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  actionBtnDanger: { backgroundColor: '#DC2626' },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  metaBlock: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
  },
  directBlock: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#111827',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }),
  },
  input: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  logWrapper: {
    maxHeight: 420,
    height: 420,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logScroll: { flex: 1, backgroundColor: '#0B1020' },
  logBlock: { padding: 10 },
  logLine: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }),
    fontSize: 11,
    lineHeight: 16,
    color: '#E5E7EB',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#374151',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' }),
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    zIndex: 10,
    elevation: 10,
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

export default HwkScreen;
