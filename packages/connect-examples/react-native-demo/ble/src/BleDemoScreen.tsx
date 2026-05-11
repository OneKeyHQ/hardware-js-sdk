import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
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
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

import HardwareBLESDK from '@onekeyfe/hd-ble-sdk';
import {
  DEVICE_EVENT,
  LOG_EVENT,
  UI_EVENT,
  UI_REQUEST,
  type CoreApi,
  type SearchDevice,
} from '@onekeyfe/hd-core';
import { BleManager as BlePlxManager } from 'react-native-ble-plx';

const PRO2_BLE_FIRMWARE_ASSET = require('../../public/ble-firmware.bin');
const PRO2_BLE_FIRMWARE_FILE_NAME = 'ble-firmware.bin';
const PRO2_BLE_FIRMWARE_FILE_SIZE = 262572;
const PROTOCOL_V2_PARAMS = { connectProtocol: 'V2' as const };
const PRO2_DEMO_FILE_PATH = 'vol0:rn-demo.txt';
const PRO2_DEMO_DIR_PATH = 'vol0:rn-demo-dir';
const PRO2_FIRMWARE_STAGING_PATH = 'vol1:ble-firmware.bin';
const PRO2_BLE_CHUNK_SIZE = 1800;

type LogLine = { ts: string; level: 'info' | 'warn' | 'error' | 'debug'; msg: string };
type BusyAction = null | string;
type FirmwareProgressState = {
  progress: number;
  progressType?: string;
  transferredBytes?: number;
  totalBytes?: number;
  rateBytesPerSecond?: number;
};
type FirmwareResultState = {
  bootloaderVersion?: string;
  bleVersion?: string;
  firmwareVersion?: string;
};
type FirmwareTiming = {
  key: string;
  label: string;
  startAt: number;
  endAt?: number;
  durationMs?: number;
};
type FirmwareTimingSummary = {
  status: 'success' | 'failed';
  totalDurationMs?: number;
};
type Pro2MethodAction = {
  key: string;
  label: string;
  danger?: boolean;
  run: (sdk: any, connectId: string) => Promise<any>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { flex: 1 },
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  btn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  btnDanger: { backgroundColor: '#DC2626' },
  btnMuted: { backgroundColor: '#4B5563' },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  listName: { fontSize: 14, color: '#111827', fontWeight: '600' },
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
  hint: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
  },
  progressOuter: {
    height: 10,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  progressInner: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  progressText: {
    marginTop: 8,
    color: '#111827',
    fontSize: 12,
  },
  logWrapper: {
    maxHeight: 280,
    height: 280,
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

const formatBytes = (bytes?: number) => {
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes as number;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const formatDuration = (durationMs?: number) => {
  if (!Number.isFinite(durationMs)) return '-';
  const value = durationMs as number;
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(2)}s`;
};

const summarizeUiPayload = (payload: any) => {
  if (!payload) return undefined;
  if (payload.progress !== undefined) {
    return {
      progress: payload.progress,
      progressType: payload.progressType,
      transferredBytes: payload.transferredBytes,
      totalBytes: payload.totalBytes,
      rateBytesPerSecond: payload.rateBytesPerSecond,
    };
  }
  if (payload.data?.message) {
    return { data: payload.data };
  }
  if (payload.device) {
    return {
      device: {
        connectId: payload.device.connectId,
        deviceType: payload.device.features?.deviceType,
      },
    };
  }
  return payload;
};

const summarizeSdkLogPayload = (payload: any) => {
  const lines = Array.isArray(payload) ? payload : payload?.message;
  if (Array.isArray(lines)) {
    return lines
      .map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof payload === 'string') return payload;
  if (typeof payload?.message === 'string') return payload.message;
  if (payload === undefined) return '';
  return JSON.stringify(payload);
};

const arrayBufferFromBase64 = (base64: string) => {
  const bytes = Buffer.from(base64, 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const arrayBufferFromText = (text: string) => {
  const bytes = Buffer.from(text, 'utf8');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const FIRMWARE_TIP_STATUS: Record<string, string> = {
  StartDownloadFirmware: 'Preparing firmware package',
  FinishDownloadFirmware: 'Firmware package ready',
  AutoRebootToBootloader: 'Rebooting to bootloader',
  GoToBootloaderSuccess: 'Bootloader ready',
  StartTransferData: 'Uploading firmware file',
  ConfirmOnDevice: 'Waiting for device confirmation',
  FirmwareUpdating: 'Installing selected target',
  SwitchFirmwareReconnectDevice: 'Rebooting to normal, polling Ping',
  FirmwareUpdateCompleted: 'Normal mode ready',
};

const FIRMWARE_PROGRESS_STATUS: Record<string, string> = {
  transferData: 'Uploading firmware file',
  installingFirmware: 'Installing selected target',
};

const getFirmwareTipStatus = (message: string) => FIRMWARE_TIP_STATUS[message] || message;

export const BleDemoScreen = () => {
  const [sdkReady, setSdkReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [devices, setDevices] = useState<SearchDevice[]>([]);
  const [selected, setSelected] = useState<SearchDevice | null>(null);
  const [firmwareStatus, setFirmwareStatus] = useState('Idle');
  const [firmwareProgress, setFirmwareProgress] = useState<FirmwareProgressState | null>(null);
  const [firmwareResult, setFirmwareResult] = useState<FirmwareResultState | null>(null);
  const [firmwareTimings, setFirmwareTimings] = useState<FirmwareTiming[]>([]);
  const [firmwareTimingSummary, setFirmwareTimingSummary] =
    useState<FirmwareTimingSummary | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const sdkRef = useRef<CoreApi | null>(null);
  const bleRef = useRef<BlePlxManager | null>(null);
  const lastProgressLogAtRef = useRef(0);
  const lastSdkLogAtRef = useRef(0);
  const firmwareStageRef = useRef<{
    totalStartAt?: number;
    activeKey?: string;
    timings: FirmwareTiming[];
  }>({ timings: [] });
  const logsScrollRef = useRef<ScrollView | null>(null);

  const appendLog = useCallback((level: LogLine['level'], msg: any) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
    setLogs(prev => {
      const next = [{ ts: now(), level, msg: text }, ...prev].slice(0, 500);
      requestAnimationFrame(() => logsScrollRef.current?.scrollToEnd({ animated: true }));
      return next;
    });
  }, []);

  const syncFirmwareTimings = useCallback(() => {
    setFirmwareTimings([...firmwareStageRef.current.timings]);
  }, []);

  const startFirmwareStage = useCallback(
    (key: string, label: string) => {
      const nowMs = Date.now();
      const state = firmwareStageRef.current;
      if (state.activeKey) {
        const active = state.timings.find(item => item.key === state.activeKey && !item.endAt);
        if (active) {
          active.endAt = nowMs;
          active.durationMs = active.endAt - active.startAt;
        }
      }
      state.activeKey = key;
      state.timings.push({ key, label, startAt: nowMs });
      syncFirmwareTimings();
    },
    [syncFirmwareTimings]
  );

  const finishFirmwareStage = useCallback(
    (key?: string) => {
      const nowMs = Date.now();
      const state = firmwareStageRef.current;
      const stageKey = key ?? state.activeKey;
      if (!stageKey) return;
      const active = [...state.timings].reverse().find(item => item.key === stageKey && !item.endAt);
      if (active) {
        active.endAt = nowMs;
        active.durationMs = active.endAt - active.startAt;
      }
      if (state.activeKey === stageKey) {
        state.activeKey = undefined;
      }
      syncFirmwareTimings();
    },
    [syncFirmwareTimings]
  );

  const finishFirmwareTimingSummary = useCallback(
    (status: 'success' | 'failed') => {
      finishFirmwareStage();
      const totalStartAt = firmwareStageRef.current.totalStartAt;
      const totalDurationMs = totalStartAt ? Date.now() - totalStartAt : undefined;
      setFirmwareTimingSummary({ status, totalDurationMs });
      syncFirmwareTimings();
      const summary = firmwareStageRef.current.timings.map(item => ({
        stage: item.label,
        duration: formatDuration(item.durationMs),
      }));
      appendLog('info', {
        firmwareTimingSummary: {
          status,
          total: formatDuration(totalDurationMs),
          stages: summary,
        },
      });
    },
    [appendLog, finishFirmwareStage, syncFirmwareTimings]
  );

  const handleProgressEvent = useCallback(
    (evt: any) => {
      const payload = evt?.payload || {};
      const progress = Number(payload.progress ?? 0);
      const nextProgress: FirmwareProgressState = {
        progress: Number.isFinite(progress) ? Math.max(0, Math.min(progress, 100)) : 0,
        progressType: payload.progressType,
        transferredBytes: payload.transferredBytes,
        totalBytes: payload.totalBytes,
        rateBytesPerSecond: payload.rateBytesPerSecond,
      };
      setFirmwareProgress(nextProgress);
      if (nextProgress.progressType && FIRMWARE_PROGRESS_STATUS[nextProgress.progressType]) {
        setFirmwareStatus(FIRMWARE_PROGRESS_STATUS[nextProgress.progressType]);
      }

      const nowMs = Date.now();
      if (nowMs - lastProgressLogAtRef.current > 1000 || nextProgress.progress >= 99) {
        lastProgressLogAtRef.current = nowMs;
        appendLog('info', {
          progress: `${nextProgress.progress}%`,
          progressType: nextProgress.progressType,
          transferred: `${formatBytes(nextProgress.transferredBytes)} / ${formatBytes(
            nextProgress.totalBytes
          )}`,
          speed: `${formatBytes(nextProgress.rateBytesPerSecond)}/s`,
        });
      }
    },
    [appendLog]
  );

  const ensureBleReady = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const perms: Parameters<typeof PermissionsAndroid.requestMultiple>[0] = [];
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
      }

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

  const initSdk = useCallback(async () => {
    if (sdkRef.current || initializing) return;
    try {
      setInitializing(true);
      appendLog('info', 'Initializing @onekeyfe/hd-ble-sdk...');
      sdkRef.current = HardwareBLESDK as unknown as CoreApi;
      await sdkRef.current.init({ debug: true, fetchConfig: false });
      setSdkReady(true);
      appendLog('info', 'SDK initialized.');

      try {
        bleRef.current = new BlePlxManager();
      } catch (err: any) {
        appendLog('error', `Create BlePlxManager failed: ${err?.message || err}`);
      }

      sdkRef.current.on(UI_EVENT, async (evt: any) => {
        if (
          evt?.type === UI_REQUEST.DEVICE_PROGRESS ||
          evt?.type === UI_REQUEST.FIRMWARE_PROGRESS
        ) {
          handleProgressEvent(evt);
        } else if (evt?.type === UI_REQUEST.FIRMWARE_TIP) {
          const message = evt?.payload?.data?.message || 'Firmware update';
          setFirmwareStatus(getFirmwareTipStatus(message));
          if (message === 'StartDownloadFirmware') {
            startFirmwareStage('prepare', 'Prepare package');
          }
          if (message === 'FinishDownloadFirmware') {
            finishFirmwareStage('prepare');
          }
          if (message === 'StartTransferData') {
            startFirmwareStage('transfer', 'Transfer data');
          }
          if (message === 'ConfirmOnDevice') {
            finishFirmwareStage('transfer');
            startFirmwareStage('confirm', 'Confirm on device');
          }
          if (message === 'FirmwareUpdating') {
            finishFirmwareStage('confirm');
            startFirmwareStage('install', 'Install firmware');
          }
          if (message === 'SwitchFirmwareReconnectDevice') {
            finishFirmwareStage('install');
            startFirmwareStage('reboot', 'Reboot and poll');
            setFirmwareProgress(prev => ({
              ...(prev || {}),
              progress: Math.max(prev?.progress ?? 0, 99),
              progressType: 'rebootNormal',
            }));
          }
          if (message === 'FirmwareUpdateCompleted') {
            finishFirmwareStage('reboot');
            setFirmwareProgress(prev => ({
              ...(prev || {}),
              progress: 100,
              progressType: 'completed',
            }));
          }
          appendLog('info', { UI_EVENT: evt.type, payload: summarizeUiPayload(evt.payload) });
        } else {
          appendLog('debug', { UI_EVENT: evt?.type, payload: summarizeUiPayload(evt?.payload) });
        }

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
      sdkRef.current.on(LOG_EVENT, (evt: any) => {
        const nowMs = Date.now();
        const message = summarizeSdkLogPayload(evt?.payload);
        if (/FileWrite|FilesystemFileWrite|EmmcFileWrite/i.test(message)) {
          return;
        }
        const isImportantLog =
          /scan candidate|search device|Initializing transports|set transport|searchDevices|DevGet|FirmwareUpdate|Ping|ProtoVersion/i.test(
            message
          );
        if (!isImportantLog && nowMs - lastSdkLogAtRef.current < 1000) return;
        lastSdkLogAtRef.current = nowMs;
        appendLog('debug', { LOG_EVENT: evt?.type, message });
      });
    } catch (e: any) {
      appendLog('error', `SDK init failed: ${e?.message || e}`);
      Alert.alert('Init failed', e?.message || String(e));
    } finally {
      setInitializing(false);
    }
  }, [
    appendLog,
    ensureBleReady,
    finishFirmwareStage,
    handleProgressEvent,
    initializing,
    startFirmwareStage,
  ]);

  useEffect(() => {
    initSdk();
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
        appendLog('warn', 'BLE not ready.');
        return;
      }

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

  const runPro2Call = useCallback(
    async (
      busyAction: string,
      label: string,
      action: (sdk: any, connectId: string) => Promise<any>
    ) => {
      if (!sdkRef.current || !selected?.connectId) {
        Alert.alert('Tip', 'Please select a Pro2 device first');
        return;
      }
      try {
        setBusy(busyAction);
        appendLog('info', `Executing ${label}`);
        const res = await action(sdkRef.current as any, selected.connectId);
        appendLog('info', { [label]: res });
        if (!res?.success) {
          Alert.alert(`${label} failed`, res?.payload?.error || 'unknown');
        }
      } catch (e: any) {
        appendLog('error', `${label} error: ${e?.message || e}`);
      } finally {
        setBusy(null);
      }
    },
    [appendLog, selected?.connectId]
  );

  const pro2Methods = useMemo<Pro2MethodAction[]>(
    () => [
      {
        key: 'getProtoVersion',
        label: 'getProtoVersion',
        run: (sdk, connectId) => sdk.getProtoVersion(connectId, PROTOCOL_V2_PARAMS),
      },
      {
        key: 'ping',
        label: 'ping',
        run: (sdk, connectId) =>
          sdk.ping(connectId, { ...PROTOCOL_V2_PARAMS, message: 'rn-pro2-demo' }),
      },
      {
        key: 'devGetDeviceInfo',
        label: 'devGetDeviceInfo',
        run: (sdk, connectId) =>
          sdk.devGetDeviceInfo(connectId, {
            ...PROTOCOL_V2_PARAMS,
            targetHw: true,
            targetFw: true,
            targetBt: true,
            targetSe1: true,
            targetSe2: true,
            targetSe3: true,
            targetSe4: true,
            targetStatus: true,
            includeVersion: true,
            includeBuildId: true,
            includeHash: true,
            includeSpecific: true,
          }),
      },
      {
        key: 'devGetOnboardingStatus',
        label: 'devGetOnboardingStatus',
        run: (sdk, connectId) => sdk.devGetOnboardingStatus(connectId, PROTOCOL_V2_PARAMS),
      },
      {
        key: 'devGetFirmwareUpdateStatus',
        label: 'devGetFirmwareUpdateStatus',
        run: (sdk, connectId) => sdk.devGetFirmwareUpdateStatus(connectId, PROTOCOL_V2_PARAMS),
      },
      {
        key: 'factoryGetDeviceInfo',
        label: 'factoryGetDeviceInfo',
        run: (sdk, connectId) => sdk.factoryGetDeviceInfo(connectId),
      },
      {
        key: 'factoryDeviceInfoSettings',
        label: 'factoryDeviceInfoSettings',
        danger: true,
        run: (sdk, connectId) =>
          sdk.factoryDeviceInfoSettings(connectId, {
            ...PROTOCOL_V2_PARAMS,
            serialNo: 'RN-DEMO-SERIAL',
            cpuInfo: 'RN-DEMO-CPU',
            preFirmware: 'RN-DEMO-FW',
          }),
      },
      {
        key: 'filesystemPathInfoQuery',
        label: 'filesystemPathInfoQuery',
        run: (sdk, connectId) =>
          sdk.filesystemPathInfoQuery(connectId, {
            ...PROTOCOL_V2_PARAMS,
            path: PRO2_DEMO_FILE_PATH,
          }),
      },
      {
        key: 'filesystemDirList',
        label: 'filesystemDirList',
        run: (sdk, connectId) =>
          sdk.filesystemDirList(connectId, { ...PROTOCOL_V2_PARAMS, path: 'vol0:', depth: 1 }),
      },
      {
        key: 'filesystemDirMake',
        label: 'filesystemDirMake',
        run: (sdk, connectId) =>
          sdk.filesystemDirMake(connectId, { ...PROTOCOL_V2_PARAMS, path: PRO2_DEMO_DIR_PATH }),
      },
      {
        key: 'filesystemDirRemove',
        label: 'filesystemDirRemove',
        danger: true,
        run: (sdk, connectId) =>
          sdk.filesystemDirRemove(connectId, { ...PROTOCOL_V2_PARAMS, path: PRO2_DEMO_DIR_PATH }),
      },
      {
        key: 'filesystemFileWrite',
        label: 'filesystemFileWrite',
        run: (sdk, connectId) =>
          sdk.filesystemFileWrite(connectId, {
            ...PROTOCOL_V2_PARAMS,
            path: PRO2_DEMO_FILE_PATH,
            data: arrayBufferFromText(`OneKey Pro2 RN demo ${new Date().toISOString()}\n`),
            totalSize: 0,
            chunkSize: PRO2_BLE_CHUNK_SIZE,
            overwrite: true,
            append: false,
          }),
      },
      {
        key: 'filesystemFileRead',
        label: 'filesystemFileRead',
        run: (sdk, connectId) =>
          sdk.filesystemFileRead(connectId, {
            ...PROTOCOL_V2_PARAMS,
            path: PRO2_DEMO_FILE_PATH,
            offset: 0,
            totalSize: 0,
            chunkLen: PRO2_BLE_CHUNK_SIZE,
          }),
      },
      {
        key: 'filesystemFileDelete',
        label: 'filesystemFileDelete',
        danger: true,
        run: (sdk, connectId) =>
          sdk.filesystemFileDelete(connectId, { ...PROTOCOL_V2_PARAMS, path: PRO2_DEMO_FILE_PATH }),
      },
      {
        key: 'filesystemFixPermission',
        label: 'filesystemFixPermission',
        run: (sdk, connectId) => sdk.filesystemFixPermission(connectId),
      },
      {
        key: 'devFirmwareUpdate',
        label: 'devFirmwareUpdate(TARGET_BT)',
        danger: true,
        run: (sdk, connectId) =>
          sdk.devFirmwareUpdate(connectId, {
            ...PROTOCOL_V2_PARAMS,
            target_id: 2,
            path: PRO2_FIRMWARE_STAGING_PATH,
          }),
      },
      {
        key: 'devRebootNormal',
        label: 'devReboot(Normal)',
        danger: true,
        run: (sdk, connectId) =>
          sdk.devReboot(connectId, { ...PROTOCOL_V2_PARAMS, rebootType: 'Normal' }),
      },
      {
        key: 'filesystemFormat',
        label: 'filesystemFormat',
        danger: true,
        run: (sdk, connectId) => sdk.filesystemFormat(connectId),
      },
    ],
    []
  );

  const onRunPro2Method = useCallback(
    (method: Pro2MethodAction) => {
      const run = () => void runPro2Call(method.key, method.label, method.run);
      if (!method.danger) {
        run();
        return;
      }
      Alert.alert('Run dangerous Pro2 method?', method.label, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Run', style: 'destructive', onPress: run },
      ]);
    },
    [runPro2Call]
  );

  const loadBundledBleFirmware = useCallback(async () => {
    const asset = Asset.fromModule(PRO2_BLE_FIRMWARE_ASSET);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) {
      throw new Error('BLE firmware asset URI not found');
    }
    const file = new FileSystem.File(uri);
    const base64 = await file.base64();
    return arrayBufferFromBase64(base64);
  }, []);

  const runBleFirmwareUpdate = useCallback(async () => {
    if (!sdkRef.current || !selected?.connectId) {
      Alert.alert('Tip', 'Please select a Pro2 device first');
      return;
    }

    try {
      setBusy('ble-firmware');
      firmwareStageRef.current = { totalStartAt: Date.now(), timings: [] };
      setFirmwareTimings([]);
      setFirmwareTimingSummary(null);
      setFirmwareProgress({ progress: 0, progressType: 'prepare' });
      setFirmwareResult(null);
      setFirmwareStatus(`Loading ${PRO2_BLE_FIRMWARE_FILE_NAME}`);
      appendLog('info', `Loading bundled BLE firmware: ${PRO2_BLE_FIRMWARE_FILE_NAME}`);

      startFirmwareStage('loadAsset', 'Load bundled asset');
      const bleBinary = await loadBundledBleFirmware();
      finishFirmwareStage('loadAsset');
      appendLog('info', {
        bleBinary: PRO2_BLE_FIRMWARE_FILE_NAME,
        size: formatBytes(bleBinary.byteLength),
        chunkSize: PRO2_BLE_CHUNK_SIZE,
      });

      setFirmwareStatus('Running firmwareUpdateV4');
      const res = await (sdkRef.current as any).firmwareUpdateV4(selected.connectId, {
        ...PROTOCOL_V2_PARAMS,
        platform: 'native',
        forcedUpdateRes: false,
        bleBinary,
        chunkSize: PRO2_BLE_CHUNK_SIZE,
      });
      appendLog('info', { firmwareUpdateV4: res });

      if (!res?.success) {
        setFirmwareStatus('BLE firmware update failed');
        finishFirmwareTimingSummary('failed');
        appendLog('error', `BLE firmware update failed: ${res?.payload?.error || 'unknown'}`);
        return;
      }

      const versions = (res.payload || {}) as FirmwareResultState;
      setFirmwareResult(versions);
      setFirmwareProgress(prev => ({ ...(prev || {}), progress: 100 }));
      setFirmwareStatus('Normal mode ready');
      finishFirmwareTimingSummary('success');
    } catch (e: any) {
      setFirmwareStatus('BLE firmware update error');
      appendLog('error', `firmwareUpdateV4 error: ${e?.message || e}`);
      finishFirmwareTimingSummary('failed');
    } finally {
      setBusy(null);
    }
  }, [
    appendLog,
    finishFirmwareStage,
    finishFirmwareTimingSummary,
    loadBundledBleFirmware,
    selected?.connectId,
    startFirmwareStage,
  ]);

  const onBleFirmwareUpdate = useCallback(() => {
    void runBleFirmwareUpdate();
  }, [runBleFirmwareUpdate]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const selectedMeta = useMemo(() => {
    if (!selected) return 'Not selected';
    return `${selected.name} · ${selected.connectId || 'n/a'} · ${
      selected.deviceType || 'unknown'
    } · ${(selected as any).protocolType || 'auto'}`;
  }, [selected]);

  const isBusy = initializing || scanning || !!busy;
  const actionDisabled = !sdkReady || !selected || scanning || !!busy;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <StatusBar />
        <View style={styles.header}>
          <Text style={styles.title}>Pro2 BLE Debug</Text>
          <Text style={styles.subtitle}>
            Protocol V2 scan, device info, status, and bundled BLE firmware update.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Scan Devices</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={onScan}
              disabled={!sdkReady || scanning || !!busy}
            >
              <Text style={styles.btnText}>{scanning ? 'Scanning...' : 'Start Scan'}</Text>
            </TouchableOpacity>
          </View>

          {devices.map(d => (
            <TouchableOpacity
              key={`${d.uuid}-${d.connectId}`}
              style={styles.listItem}
              onPress={() => setSelected(d)}
            >
              <Text style={styles.listName}>{d.name || 'Unnamed device'}</Text>
              <Text style={styles.listHint}>connectId: {d.connectId || 'n/a'}</Text>
              <Text style={styles.listHint}>
                localName: {(d as any).localName || 'n/a'} · type: {d.deviceType || 'unknown'} ·
                protocol: {(d as any).protocolType || 'auto'}
              </Text>
              {!!(d as any).serviceUUIDs?.length && (
                <Text style={styles.listHint}>
                  services: {((d as any).serviceUUIDs as string[]).join(', ')}
                </Text>
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.metaBlock}>
            <Text style={styles.metaText}>Selected: {selectedMeta}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pro2 Methods</Text>
          <Text style={styles.hint}>
            Default file path: {PRO2_DEMO_FILE_PATH} · chunk: {PRO2_BLE_CHUNK_SIZE} B
          </Text>
          <View style={styles.actionGrid}>
            {pro2Methods.map(method => (
              <TouchableOpacity
                key={method.key}
                style={[styles.btn, method.danger ? styles.btnDanger : null]}
                onPress={() => onRunPro2Method(method)}
                disabled={actionDisabled}
              >
                <Text style={styles.btnText}>{method.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pro2 BLE Firmware Update</Text>
          <Text style={styles.hint}>
            Bundled file: {PRO2_BLE_FIRMWARE_FILE_NAME} (
            {formatBytes(PRO2_BLE_FIRMWARE_FILE_SIZE)})
          </Text>
          <Text style={styles.hint}>
            Target: TARGET_BT (2) · {PRO2_FIRMWARE_STAGING_PATH} · chunk: {PRO2_BLE_CHUNK_SIZE} B
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={onBleFirmwareUpdate}
            disabled={actionDisabled}
          >
            <Text style={styles.btnText}>
              {busy === 'ble-firmware' ? 'Updating...' : 'Update BLE Firmware'}
            </Text>
          </TouchableOpacity>
          <View style={styles.progressOuter}>
            <View
              style={[styles.progressInner, { width: `${firmwareProgress?.progress ?? 0}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {firmwareStatus} · {firmwareProgress?.progress ?? 0}% ·{' '}
            {formatBytes(firmwareProgress?.transferredBytes)} /{' '}
            {formatBytes(firmwareProgress?.totalBytes)} ·{' '}
            {formatBytes(firmwareProgress?.rateBytesPerSecond)}/s
          </Text>
          {firmwareResult ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaText}>Result:</Text>
              <Text style={styles.metaText}>
                Bootloader: {firmwareResult.bootloaderVersion || '-'}
              </Text>
              <Text style={styles.metaText}>BLE: {firmwareResult.bleVersion || '-'}</Text>
              <Text style={styles.metaText}>
                Firmware: {firmwareResult.firmwareVersion || '-'}
              </Text>
            </View>
          ) : null}
          {firmwareTimings.length || firmwareTimingSummary ? (
            <View style={styles.metaBlock}>
              <Text style={styles.metaText}>
                Timing: {firmwareTimingSummary?.status || 'running'} · Total:{' '}
                {formatDuration(firmwareTimingSummary?.totalDurationMs)}
              </Text>
              {firmwareTimings.map(item => (
                <Text key={`${item.key}-${item.startAt}`} style={styles.metaText}>
                  {item.label}: {formatDuration(item.durationMs)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <TouchableOpacity style={[styles.btn, styles.btnMuted]} onPress={clearLogs}>
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
      </ScrollView>
      {isBusy ? (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.overlayText}>
              {initializing ? 'Initializing...' : scanning ? 'Scanning...' : 'Working...'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default BleDemoScreen;
