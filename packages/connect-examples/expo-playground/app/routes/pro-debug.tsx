import { useCallback, useMemo, useState } from 'react';
import {
  BarChart3,
  Cpu,
  FileDown,
  Gauge,
  RotateCcw,
  Search,
  Timer,
  Zap,
} from 'lucide-react';
import MethodExecutor from '../components/common/MethodExecutor';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import { device } from '../data/methods/device';
import { firmware } from '../data/methods/firmware';
import { isSdkDebugEnabled } from '../utils/hardwareInstance';
import { logHardware } from '../utils/logger';
import type { UnifiedMethodConfig } from '../data/types';

const PRO_METHOD_GROUPS = [
  {
    id: 'device',
    title: 'Device Info',
    icon: Cpu,
    methods: ['getFeatures', 'getOnekeyFeatures', 'getPassphraseState'],
  },
  {
    id: 'release',
    title: 'Release Checks',
    icon: Search,
    methods: [
      'checkFirmwareRelease',
      'checkBLEFirmwareRelease',
      'checkBootloaderRelease',
      'checkAllFirmwareRelease',
    ],
  },
  {
    id: 'bootloader',
    title: 'Bootloader Methods',
    icon: RotateCcw,
    methods: ['deviceRebootToBootloader', 'deviceRebootToBoardloader', 'deviceUpdateBootloader'],
  },
  {
    id: 'firmware',
    title: 'Full FirmwareUpdateV3',
    icon: Zap,
    methods: ['firmwareUpdateV3'],
  },
] as const;

const DEFAULT_SELECTED_METHOD = 'firmwareUpdateV3';

const PRO_METHOD_LABELS: Record<string, string> = {
  getFeatures: 'Features',
  getOnekeyFeatures: 'OneKey Features',
  getPassphraseState: 'Passphrase',
  checkFirmwareRelease: 'FW Release',
  checkBLEFirmwareRelease: 'BLE Release',
  checkBootloaderRelease: 'Boot Release',
  checkAllFirmwareRelease: 'All Releases',
  deviceRebootToBootloader: 'To Bootloader',
  deviceRebootToBoardloader: 'To Boardloader',
  deviceUpdateBootloader: 'Update Boot',
  firmwareUpdateV3: 'Firmware V3',
};

const PRO_METHOD_FLOW: Record<string, string[]> = {
  firmwareUpdateV3: [
    'Download release binaries or use local binaries',
    'Reboot Pro to bootloader mode',
    'Upload resource / bootloader / firmware through EmmcFileWrite',
    'Trigger FirmwareUpdateEmmc',
    'Poll GetFeatures until normal firmware is ready',
  ],
  deviceUpdateBootloader: [
    'Use local bootloader binary or latest release binary',
    'Upload bootloader through the Pro EMMC path',
    'Reboot and reconnect after the bootloader update',
  ],
  deviceRebootToBootloader: ['Send reboot command', 'Reconnect after Pro enters bootloader mode'],
  deviceRebootToBoardloader: ['Send reboot command', 'Reconnect after Pro enters boardloader mode'],
};

const FIRMWARE_METHODS = new Set([
  'firmwareUpdateV3',
  'deviceUpdateBootloader',
  'checkFirmwareRelease',
  'checkBLEFirmwareRelease',
  'checkBootloaderRelease',
  'checkAllFirmwareRelease',
]);

type TimingStatus = 'success' | 'error';

type TimingRecord = {
  id: string;
  method: string;
  mode: string;
  status: TimingStatus;
  startedAt: Date;
  durationMs: number;
  payloadBytes?: number;
  error?: string;
};

type StageTimingRecord = {
  id: string;
  runId: string;
  method: string;
  stage: string;
  status: TimingStatus;
  startedAt: Date;
  durationMs: number;
  detail?: string;
  payloadBytes?: number;
};

type PublicBinaryAsset = {
  key: 'firmwareBinary' | 'bleBinary' | 'bootloaderBinary';
  label: string;
  path: string;
};

const PRO_PUBLIC_BINARY_ASSETS: PublicBinaryAsset[] = [
  {
    key: 'firmwareBinary',
    label: 'Firmware',
    path: '/pro.4.20.0-Stable-0420-3542e8c_thd89_app_PROD_20250813_1.1.7_353c593_0x10_thd89_appfp_PROD_20250813_1.1.7_353c593_0x13.bin',
  },
  {
    key: 'bleBinary',
    label: 'BLE',
    path: '/bluetooth-firmware-pro-2.3.7-20260303-a60e1bc.bin',
  },
  {
    key: 'bootloaderBinary',
    label: 'Bootloader',
    path: '/pro.bootloader.2.8.4-Stable-0420-3542e8c.signed.bin',
  },
];

const FIRMWARE_UPDATE_V3_STAGE_RANGES = [
  {
    stage: 'SDK prepare binaries',
    start: 'StartDownloadFirmware',
    end: 'FinishDownloadFirmware',
  },
  {
    stage: 'Reboot to bootloader',
    start: 'AutoRebootToBootloader',
    end: 'GoToBootloaderSuccess',
  },
  {
    stage: 'Upload EMMC files',
    start: 'StartTransferData',
    end: 'ConfirmOnDevice',
    usePayloadBytes: true,
  },
  {
    stage: 'Install and return normal',
    start: 'ConfirmOnDevice',
    end: 'FirmwareUpdateCompleted',
  },
  {
    stage: 'Poll normal features',
    start: 'FirmwareProcessing',
    end: 'FirmwareUpdateCompleted',
  },
];

function findMethodConfig(methodName: string, methods: UnifiedMethodConfig[]) {
  return methods.find(method => method.method === methodName);
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${(seconds % 60).toFixed(1)}s`;
}

function formatBytes(bytes: number | undefined) {
  if (!Number.isFinite(bytes ?? NaN) || !bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRate(bytes: number | undefined, ms: number) {
  if (!bytes || !Number.isFinite(ms) || ms <= 0) return '-';
  return `${formatBytes((bytes / ms) * 1000)}/s`;
}

function getByteSize(value: unknown): number | undefined {
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value.size;
  if (typeof value === 'string') return new TextEncoder().encode(value).byteLength;
  return undefined;
}

function summarizeValue(value: unknown): unknown {
  const byteSize = getByteSize(value);
  if (byteSize !== undefined) {
    const name =
      value && typeof value === 'object' && 'name' in value && typeof value.name === 'string'
        ? value.name
        : 'binary';
    return { name, size: byteSize };
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        summarizeValue(item),
      ])
    );
  }
  return value;
}

function sanitizeParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, summarizeValue(value)])
  );
}

function getPayloadBytes(params: Record<string, unknown>) {
  const payloadValues: unknown[] = [
    params.binary,
    params.firmwareBinary,
    params.bleBinary,
    params.bootloaderBinary,
    params.resourceBinary,
  ];
  return payloadValues.reduce<number>((total, value) => total + (getByteSize(value) ?? 0), 0);
}

function getExecutionMode(method: string, params: Record<string, unknown>) {
  if (method === 'firmwareUpdateV3') {
    const hasLocalBinary = [
      params.firmwareBinary,
      params.bleBinary,
      params.bootloaderBinary,
      params.resourceBinary,
    ].some(Boolean);
    return hasLocalBinary ? 'local binaries' : 'release versions';
  }
  if (method === 'deviceUpdateBootloader') {
    return params.binary ? 'local binary' : 'release binary';
  }
  return 'single method';
}

function buildDebugLogData(
  method: UnifiedMethodConfig,
  params?: Record<string, unknown>,
  result?: Record<string, unknown>,
  durationMs?: number
) {
  return {
    source: 'pro-debug',
    protocol: 'Protocol V1',
    method: method.method,
    tx_msg_type: `${method.method} SDK call`,
    tx_payload: params ? sanitizeParams(params) : '-',
    rx_msg_type: result ? 'SDK response' : '-',
    rx_payload: result ? 'decoded by hd-core' : '-',
    decoded: method.description ?? method.method,
    ...(params ? { request_parameters: sanitizeParams(params) } : {}),
    ...(result ? { decoded_result: result } : {}),
    ...(durationMs !== undefined ? { duration: formatDuration(durationMs) } : {}),
  };
}

function buildTimingRecord({
  method,
  params,
  mode,
  status,
  startedAt,
  durationMs,
  error,
}: {
  method: UnifiedMethodConfig;
  params: Record<string, unknown>;
  mode?: string;
  status: TimingStatus;
  startedAt: Date;
  durationMs: number;
  error?: string;
}): TimingRecord {
  const payloadBytes = getPayloadBytes(params);
  return {
    id: `${method.method}-${startedAt.getTime()}-${status}`,
    method: method.method,
    mode: mode ?? getExecutionMode(method.method, params),
    status,
    startedAt,
    durationMs,
    payloadBytes: payloadBytes > 0 ? payloadBytes : undefined,
    error,
  };
}

function getLogTimeMs(log: { timestamp: string | Date }) {
  return typeof log.timestamp === 'string' ? new Date(log.timestamp).getTime() : log.timestamp.getTime();
}

function getLogRecord(log: { data?: unknown; content?: unknown }) {
  const data = log.data || log.content;
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function readPath(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

function getFirmwareStageEvents(startedAtMs: number, endedAtMs: number) {
  const logs = useDeviceStore.getState().logs;
  return logs
    .filter(log => {
      const time = getLogTimeMs(log);
      return time >= startedAtMs && time <= endedAtMs + 1000;
    })
    .flatMap(log => {
      const title = log.title || log.message || '';
      const record = getLogRecord(log);
      const time = getLogTimeMs(log);

      if (title.includes('ui-firmware-tip')) {
        const message = readPath(record, ['data', 'message']) ?? record.message;
        return typeof message === 'string' ? [{ key: message, time, detail: 'firmware tip' }] : [];
      }

      if (title.includes('ui-firmware-processing')) {
        const type = typeof record.type === 'string' ? record.type : 'firmware';
        return [{ key: 'FirmwareProcessing', time, detail: `processing ${type}` }];
      }

      if (
        title.includes('SDK progress event') &&
        record.progressType === 'installingFirmware'
      ) {
        return [{ key: 'FirmwareProcessing', time, detail: 'installing progress' }];
      }

      return [];
    })
    .sort((a, b) => a.time - b.time);
}

function buildStageTimingRecords({
  runId,
  method,
  params,
  status,
  startedAt,
  endedAt,
  assetStage,
}: {
  runId: string;
  method: UnifiedMethodConfig;
  params: Record<string, unknown>;
  status: TimingStatus;
  startedAt: Date;
  endedAt: Date;
  assetStage?: {
    startedAt: Date;
    durationMs: number;
    payloadBytes: number;
    detail: string;
  };
}): StageTimingRecord[] {
  const payloadBytes = getPayloadBytes(params);
  const events = getFirmwareStageEvents(startedAt.getTime(), endedAt.getTime());
  const firstEvent = (key: string) => events.find(event => event.key === key);
  const records: StageTimingRecord[] = [];

  if (assetStage) {
    records.push({
      id: `${runId}-public-assets`,
      runId,
      method: method.method,
      stage: 'Load public binaries',
      status: 'success',
      startedAt: assetStage.startedAt,
      durationMs: assetStage.durationMs,
      detail: assetStage.detail,
      payloadBytes: assetStage.payloadBytes,
    });
  }

  FIRMWARE_UPDATE_V3_STAGE_RANGES.forEach(range => {
    const start = firstEvent(range.start);
    if (!start) return;
    const end = firstEvent(range.end);
    const endTime = end?.time ?? endedAt.getTime();

    records.push({
      id: `${runId}-${range.stage}`,
      runId,
      method: method.method,
      stage: range.stage,
      status: end ? 'success' : status,
      startedAt: new Date(start.time),
      durationMs: Math.max(endTime - start.time, 0),
      detail: end ? `${range.start} -> ${range.end}` : `${range.start} -> method ended`,
      payloadBytes: range.usePayloadBytes ? payloadBytes : undefined,
    });
  });

  records.push({
    id: `${runId}-total`,
    runId,
    method: method.method,
    stage: 'Total SDK call',
    status,
    startedAt,
    durationMs: Math.max(endedAt.getTime() - startedAt.getTime(), 0),
    detail: getExecutionMode(method.method, params),
    payloadBytes: payloadBytes > 0 ? payloadBytes : undefined,
  });

  return records;
}

async function fetchPublicBinary(asset: PublicBinaryAsset) {
  const response = await fetch(asset.path);
  if (!response.ok) {
    throw new Error(`Failed to load ${asset.label}: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

function FlowPanel({ method }: { method: UnifiedMethodConfig }) {
  const flow = PRO_METHOD_FLOW[method.method];
  if (!flow) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gauge className="h-4 w-4 text-primary" />
        <span>{PRO_METHOD_LABELS[method.method] ?? method.method} flow</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-5">
        {flow.map((step, index) => (
          <div
            key={step}
            className="rounded-md border border-border/50 bg-background px-2.5 py-2 text-xs"
          >
            <div className="mb-1 font-mono text-[10px] text-muted-foreground">
              STEP {index + 1}
            </div>
            <div className="text-foreground">{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimingPanel({
  records,
  stageRecords,
  onClear,
}: {
  records: TimingRecord[];
  stageRecords: StageTimingRecord[];
  onClear: () => void;
}) {
  const latest = records[0];

  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Timer className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Firmware Timing</h2>
            {latest ? (
              <Badge variant={latest.status === 'success' ? 'default' : 'destructive'}>
                latest {formatDuration(latest.durationMs)}
              </Badge>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={records.length === 0 && stageRecords.length === 0}
            className="h-8 px-3 text-xs"
          >
            Clear Timing
          </Button>
        </div>

        {records.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-3 py-5 text-center text-sm text-muted-foreground">
            Execute a Pro method to record elapsed time.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Payload</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className="border-t border-border/50">
                    <td className="px-3 py-2 font-mono text-foreground">{record.method}</td>
                    <td className="px-3 py-2 text-muted-foreground">{record.mode}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">
                      {formatDuration(record.durationMs)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatBytes(record.payloadBytes)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatRate(record.payloadBytes, record.durationMs)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {record.startedAt.toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          record.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                        }
                        title={record.error}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gauge className="h-4 w-4 text-primary" />
            <span>Stage Timing</span>
          </div>
          {stageRecords.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-sm text-muted-foreground">
              Firmware stage timings will appear after a V3 run.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Payload</th>
                    <th className="px-3 py-2 font-medium">Rate</th>
                    <th className="px-3 py-2 font-medium">Started</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {stageRecords.map(record => (
                    <tr key={record.id} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium text-foreground">{record.stage}</td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        {formatDuration(record.durationMs)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatBytes(record.payloadBytes)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatRate(record.payloadBytes, record.durationMs)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {record.startedAt.toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            record.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                          }
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{record.detail || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProDebugPage() {
  const { currentDevice } = useDeviceStore();
  const { executeMethod } = useHardwareMethodExecution();
  const [selectedMethodName, setSelectedMethodName] = useState(DEFAULT_SELECTED_METHOD);
  const [timingRecords, setTimingRecords] = useState<TimingRecord[]>([]);
  const [stageTimingRecords, setStageTimingRecords] = useState<StageTimingRecord[]>([]);
  const [isBundledUpdateRunning, setIsBundledUpdateRunning] = useState(false);

  const proMethods = useMemo(() => {
    const allMethods = [...device.api, ...firmware.api];
    const orderedNames = PRO_METHOD_GROUPS.flatMap(group => group.methods);
    return orderedNames
      .map(methodName => findMethodConfig(methodName, allMethods))
      .filter((method): method is UnifiedMethodConfig => Boolean(method));
  }, []);

  const selectedMethod = useMemo(() => {
    return (
      findMethodConfig(selectedMethodName, proMethods) ??
      findMethodConfig(DEFAULT_SELECTED_METHOD, proMethods) ??
      proMethods[0]
    );
  }, [proMethods, selectedMethodName]);

  const sdkDebugEnabled = isSdkDebugEnabled();

  const pushTimingRecord = useCallback((record: TimingRecord) => {
    setTimingRecords(prev => [record, ...prev].slice(0, 20));
  }, []);

  const pushStageTimingRecords = useCallback((records: StageTimingRecord[]) => {
    if (records.length === 0) return;
    setStageTimingRecords(prev => [...records, ...prev].slice(0, 60));
  }, []);

  const executeWithTiming = useCallback(
    async ({
      method,
      params,
      mode,
      assetStage,
    }: {
      method: UnifiedMethodConfig;
      params: Record<string, unknown>;
      mode?: string;
      assetStage?: {
        startedAt: Date;
        durationMs: number;
        payloadBytes: number;
        detail: string;
      };
    }): Promise<Record<string, unknown>> => {
      const runId = `${method.method}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = new Date();
      const startedAtMs = performance.now();
      logHardware('Pro debug protocol trace', buildDebugLogData(method, params));

      try {
        const result = await executeMethod(params, method);
        const endedAt = new Date();
        const durationMs = performance.now() - startedAtMs;
        pushTimingRecord(
          buildTimingRecord({
            method,
            params,
            mode,
            status: 'success',
            startedAt,
            durationMs,
          })
        );
        pushStageTimingRecords(
          buildStageTimingRecords({
            runId,
            method,
            params,
            status: 'success',
            startedAt,
            endedAt,
            assetStage,
          })
        );
        logHardware('Pro debug decoded response', buildDebugLogData(method, undefined, result, durationMs));
        return result;
      } catch (error) {
        const endedAt = new Date();
        const durationMs = performance.now() - startedAtMs;
        const message = error instanceof Error ? error.message : String(error);
        pushTimingRecord(
          buildTimingRecord({
            method,
            params,
            mode,
            status: 'error',
            startedAt,
            durationMs,
            error: message,
          })
        );
        pushStageTimingRecords(
          buildStageTimingRecords({
            runId,
            method,
            params,
            status: 'error',
            startedAt,
            endedAt,
            assetStage,
          })
        );
        logHardware('Pro debug decoded response', {
          ...buildDebugLogData(method, undefined, undefined, durationMs),
          decoded_result: { error: message },
          rx_msg_type: 'SDK error',
        });
        throw error;
      }
    },
    [executeMethod, pushStageTimingRecords, pushTimingRecord]
  );

  const handleMethodExecution = useCallback(
    async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!selectedMethod) {
        throw new Error('Method configuration not found');
      }

      return executeWithTiming({ method: selectedMethod, params });
    },
    [executeWithTiming, selectedMethod]
  );

  const handleBundledFirmwareUpdate = useCallback(async () => {
    const method = findMethodConfig('firmwareUpdateV3', proMethods);
    if (!method || isBundledUpdateRunning) return;

    setIsBundledUpdateRunning(true);
    const assetStartedAt = new Date();
    const assetStartedAtMs = performance.now();

    try {
      const entries = await Promise.all(
        PRO_PUBLIC_BINARY_ASSETS.map(async asset => {
          const binary = await fetchPublicBinary(asset);
          return [asset.key, binary] as const;
        })
      );
      const params = {
        platform: 'web',
        forcedUpdateRes: false,
        ...Object.fromEntries(entries),
      };
      const payloadBytes = getPayloadBytes(params);
      const assetStage = {
        startedAt: assetStartedAt,
        durationMs: performance.now() - assetStartedAtMs,
        payloadBytes,
        detail: PRO_PUBLIC_BINARY_ASSETS.map(asset => asset.label).join(' + '),
      };

      logHardware('Pro debug public binaries loaded', {
        files: PRO_PUBLIC_BINARY_ASSETS.map(asset => ({
          label: asset.label,
          path: asset.path,
        })),
        payloadBytes,
        duration: formatDuration(assetStage.durationMs),
      });

      await executeWithTiming({
        method,
        params,
        mode: 'public binaries',
        assetStage,
      });
    } finally {
      setIsBundledUpdateRunning(false);
    }
  }, [executeWithTiming, isBundledUpdateRunning, proMethods]);

  const clearAllTimingRecords = useCallback(() => {
    setTimingRecords([]);
    setStageTimingRecords([]);
  }, []
  );

  return (
    <PageLayout fixedHeight>
      <div className="px-4 py-3 space-y-3 min-h-full">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">OneKey Pro Debug</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Protocol V1 Pro firmware timing, standalone methods, and full firmwareUpdateV3.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sdkDebugEnabled ? 'secondary' : 'outline'}>
              SDK debug: {sdkDebugEnabled ? 'enabled' : 'off'}
            </Badge>
            <Badge variant="outline">Protocol V1</Badge>
            <Badge variant={currentDevice ? 'default' : 'outline'}>
              {currentDevice ? currentDevice.connectId : 'No device'}
            </Badge>
          </div>
        </div>

        {!currentDevice && (
          <div>
            <DeviceNotConnectedState showFullPage={false} />
          </div>
        )}

        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Pro Methods</h2>
              </div>
              <div className="text-xs text-muted-foreground">
                firmwareUpdateV3 has release-version and local-binary presets.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 xl:grid-cols-2">
              {PRO_METHOD_GROUPS.map(group => {
                const Icon = group.icon;
                const availableMethods = group.methods
                  .map(methodName => findMethodConfig(methodName, proMethods))
                  .filter((method): method is UnifiedMethodConfig => Boolean(method));

                return (
                  <div key={group.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span>{group.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableMethods.map(method => (
                        <Button
                          key={method.method}
                          size="sm"
                          variant="outline"
                          className={`h-7 rounded-md px-2.5 text-[11px] ${
                            selectedMethod?.method === method.method
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'bg-background text-foreground hover:bg-muted'
                          }`}
                          onClick={() => setSelectedMethodName(method.method)}
                        >
                          {PRO_METHOD_LABELS[method.method] ?? method.method}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedMethod ? <FlowPanel method={selectedMethod} /> : null}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-foreground">
                  <FileDown className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Bundled Pro FirmwareUpdateV3</h2>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Uses firmware, BLE, and bootloader binaries from public assets.
                </div>
              </div>
              <Button
                onClick={handleBundledFirmwareUpdate}
                disabled={!currentDevice || isBundledUpdateRunning}
                className="h-9 px-4"
              >
                {isBundledUpdateRunning ? 'Running...' : 'Run Bundled V3 Update'}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {PRO_PUBLIC_BINARY_ASSETS.map(asset => (
                <div key={asset.key} className="rounded-md border border-border/50 bg-muted/20 p-2">
                  <div className="text-xs font-medium text-foreground">{asset.label}</div>
                  <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                    {asset.path.replace(/^\//, '')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <TimingPanel
          records={timingRecords}
          stageRecords={stageTimingRecords}
          onClear={clearAllTimingRecords}
        />

        {selectedMethod ? (
          <MethodExecutor
            key={selectedMethod.method}
            methodConfig={selectedMethod}
            executionHandler={handleMethodExecution}
            devicePanelTitle={null}
            layout="debug-first"
            type={FIRMWARE_METHODS.has(selectedMethod.method) ? 'firmware' : 'standard'}
          />
        ) : (
          <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardContent className="py-6 text-sm text-muted-foreground">
              Pro method configuration not found.
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
