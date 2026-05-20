import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  FlaskConical,
  Play,
  Search,
  Square,
  TerminalSquare,
  Usb,
} from 'lucide-react';
import { HARDWARE_CONNECT_PROTOCOL } from '@onekeyfe/hd-shared';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { PageLayout } from '../components/common/PageLayout';
import CollapsibleJsonViewer from '../components/common/CollapsibleJsonViewer';
import { callHardwareAPI, searchDevices } from '../services/hardwareService';
import { useToast } from '../hooks/use-toast';
import { useDeviceStore } from '../store/deviceStore';
import { SDKUtils } from '../utils/hardwareInstance';
import { logHardware } from '../utils/logger';

import type { DeviceOnboardingStatus } from '@onekeyfe/hd-transport';

type PollSource = 'mock' | 'real';

type PollRecord = {
  id: number;
  source: PollSource;
  timestamp: string;
  durationMs: number;
  success: boolean;
  status?: DeviceOnboardingStatus;
  error?: string;
};

const DEFAULT_POLL_INTERVAL_MS = 1000;
const MIN_POLL_INTERVAL_MS = 250;
const MAX_POLL_INTERVAL_MS = 60_000;
const MAX_HISTORY_LENGTH = 12;

const ONBOARDING_WIRE_INFO = {
  txMsgType: '60602 (DeviceGetOnboardingStatus)',
  txPayload: 'ba ec',
  rxMsgType: '60603 (DeviceOnboardingStatus)',
  rxPayload: 'bb ec + page_index/page_count/page_name',
  decoded: 'DeviceOnboardingStatus',
};

const MOCK_ONBOARDING_PAGES = [
  'welcome',
  'language',
  'create_wallet',
  'backup_seed',
  'verify_seed',
  'complete',
];

function clampPollInterval(value: string | number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_POLL_INTERVAL_MS;
  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(MIN_POLL_INTERVAL_MS, Math.round(numeric)));
}

function normalizeStatus(payload: unknown): DeviceOnboardingStatus {
  if (!payload || typeof payload !== 'object') return {};

  const data = payload as Record<string, unknown>;
  return {
    page_index: typeof data.page_index === 'number' ? data.page_index : undefined,
    page_count: typeof data.page_count === 'number' ? data.page_count : undefined,
    page_name: typeof data.page_name === 'string' ? data.page_name : undefined,
  };
}

function getProgressValue(status: DeviceOnboardingStatus | null) {
  if (!status?.page_count) return 0;
  const pageIndex = status.page_index ?? 0;
  return Math.min(100, Math.max(0, Math.round((pageIndex / status.page_count) * 100)));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString();
}

function getSourceLabel(source: PollSource) {
  return source === 'real' ? 'Real' : 'Mock';
}

function getLatestLabel(record?: PollRecord) {
  if (!record) return 'Waiting';
  if (!record.success) return 'Error';
  return record.status?.page_name || 'Ready';
}

function StatusMetric({
  label,
  value,
  title,
}: {
  label: string;
  value: string | number;
  title?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-background/70 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-foreground" title={title}>
        {value}
      </div>
    </div>
  );
}

function CommunicationTrace({
  history,
  rawResponse,
}: {
  history: PollRecord[];
  rawResponse: unknown;
}) {
  const latestRecordId = history[0]?.id;

  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TerminalSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Communication log</h2>
          </div>
          <Badge variant="outline" className="w-fit">
            60602 / 60603
          </Badge>
        </div>

        {history.length ? (
          <div className="space-y-2">
            {history.slice(0, 6).map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    {item.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <Badge variant={item.source === 'mock' ? 'secondary' : 'outline'}>
                      {getSourceLabel(item.source)}
                    </Badge>
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.status?.page_name ?? item.error ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatTime(item.timestamp)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.durationMs}ms
                    </span>
                  </div>
                </div>

                <details className="group mt-2">
                  <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                    Wire details
                  </summary>
                  <div className="mt-2 rounded-lg bg-neutral-950 p-3 font-mono text-[11px] leading-relaxed text-neutral-200">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-neutral-500">TX</div>
                        <div className="break-all">{ONBOARDING_WIRE_INFO.txMsgType}</div>
                        <div className="break-all text-cyan-300">
                          {ONBOARDING_WIRE_INFO.txPayload}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-neutral-500">RX</div>
                        <div
                          className={item.success ? 'break-all text-emerald-300' : 'text-red-300'}
                        >
                          {item.success ? ONBOARDING_WIRE_INFO.rxMsgType : 'Error'}
                        </div>
                        <div
                          className={
                            item.success ? 'break-all text-emerald-300' : 'break-all text-red-300'
                          }
                        >
                          {item.success ? ONBOARDING_WIRE_INFO.rxPayload : item.error}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <span className="text-neutral-500">Decoded: </span>
                      <span className={item.success ? 'text-emerald-300' : 'text-red-300'}>
                        {item.success
                          ? `${ONBOARDING_WIRE_INFO.decoded} ${JSON.stringify(item.status)}`
                          : item.error}
                      </span>
                    </div>
                  </div>
                  {item.id === latestRecordId && rawResponse ? (
                    <details className="mt-2 rounded-lg border border-border/60 bg-background/80 p-2">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                        Raw response
                      </summary>
                      <div className="mt-2 overflow-auto">
                        <CollapsibleJsonViewer data={rawResponse} maxDepth={4} />
                      </div>
                    </details>
                  ) : null}
                </details>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No trace records.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Pro2OnboardingPage() {
  const {
    currentDevice,
    isConnecting,
    sdkInitState,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    setIsConnecting,
  } = useDeviceStore();
  const { toast } = useToast();
  const [pollSource, setPollSource] = useState<PollSource>('real');
  const [intervalInput, setIntervalInput] = useState(String(DEFAULT_POLL_INTERVAL_MS));
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<DeviceOnboardingStatus | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PollRecord[]>([]);

  const mockIndexRef = useRef(0);
  const inFlightRef = useRef(false);
  const sequenceRef = useRef(0);

  const pollIntervalMs = useMemo(() => clampPollInterval(intervalInput), [intervalInput]);
  const progress = useMemo(() => getProgressValue(status), [status]);

  const buildMockStatus = useCallback((): DeviceOnboardingStatus => {
    const pageIndex = mockIndexRef.current % MOCK_ONBOARDING_PAGES.length;
    mockIndexRef.current += 1;

    return {
      page_index: pageIndex + 1,
      page_count: MOCK_ONBOARDING_PAGES.length,
      page_name: MOCK_ONBOARDING_PAGES[pageIndex],
    };
  }, []);

  const requestRealStatus = useCallback(async () => {
    if (!currentDevice?.connectId) {
      throw new Error('设备未连接，无法调用真实 DeviceGetOnboardingStatus');
    }

    const response = await callHardwareAPI('deviceGetOnboardingStatus', {
      connectId: currentDevice.connectId,
      connectProtocol: HARDWARE_CONNECT_PROTOCOL.V2,
    });

    if (!response.success) {
      throw new Error(response.payload?.error || 'DeviceGetOnboardingStatus 调用失败');
    }

    return {
      status: normalizeStatus(response.payload),
      raw: response,
    };
  }, [currentDevice?.connectId]);

  const handleSearchPro2Device = useCallback(async () => {
    if (!sdkInitState.isInitialized) {
      toast({
        title: 'SDK is not ready',
        description: 'Please wait for SDK initialization before searching devices.',
        variant: 'warning',
      });
      return;
    }

    setIsConnecting(true);

    try {
      const protocolParams = { connectProtocol: HARDWARE_CONNECT_PROTOCOL.V2 };
      const searchResult = await searchDevices(protocolParams);

      if (!searchResult.success || !searchResult.payload) {
        toast({
          title: 'Search failed',
          description: searchResult.payload?.error || 'Unable to search Pro2 device.',
          variant: 'warning',
        });
        setConnectedDevices([]);
        return;
      }

      const devices = searchResult.payload;
      setConnectedDevices(devices);

      if (!devices.length) {
        toast({
          title: 'No device found',
          description: 'Connect a Pro2 device and try again.',
          variant: 'warning',
        });
        return;
      }

      const targetDevice = devices[0];
      const sdk = await SDKUtils.getInstance();

      if (targetDevice.features) {
        setDeviceFeatures(targetDevice.features);
        setCurrentDevice(targetDevice);
      } else if (targetDevice.connectId && targetDevice.deviceId) {
        const featuresResult = await sdk.getFeatures(targetDevice.connectId, protocolParams);
        if (featuresResult.success && featuresResult.payload) {
          setDeviceFeatures(featuresResult.payload);
          setCurrentDevice({
            ...targetDevice,
            features: featuresResult.payload,
          });
        } else {
          setCurrentDevice(targetDevice);
        }
      } else {
        setCurrentDevice(targetDevice);
      }

      toast({
        title: 'Device connected',
        description: targetDevice.label || targetDevice.deviceType || targetDevice.connectId,
      });
    } catch (searchError) {
      toast({
        title: 'Connection failed',
        description: getErrorMessage(searchError),
        variant: 'warning',
      });
      setConnectedDevices([]);
    } finally {
      setIsConnecting(false);
    }
  }, [
    sdkInitState.isInitialized,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    setIsConnecting,
    toast,
  ]);

  const pollOnce = useCallback(
    async (source: PollSource = pollSource) => {
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setIsLoading(true);

      const startedAt = performance.now();
      const timestamp = new Date().toISOString();
      const id = sequenceRef.current + 1;
      sequenceRef.current = id;

      try {
        const result = await (async () => {
          if (source === 'real') return requestRealStatus();

          const mockStatus = buildMockStatus();
          return {
            status: mockStatus,
            raw: {
              success: true,
              payload: mockStatus,
              source: 'mock',
            },
          };
        })();
        const durationMs = Math.round(performance.now() - startedAt);

        setStatus(result.status);
        setRawResponse(result.raw);
        setError(null);
        setHistory(prev =>
          [
            {
              id,
              source,
              timestamp,
              durationMs,
              success: true,
              status: result.status,
            },
            ...prev,
          ].slice(0, MAX_HISTORY_LENGTH)
        );
        logHardware('Pro2 onboarding status', {
          source,
          durationMs,
          status: result.status,
        });
      } catch (pollError) {
        const message = getErrorMessage(pollError);
        const durationMs = Math.round(performance.now() - startedAt);

        setError(message);
        setRawResponse({ success: false, payload: { error: message }, source });
        setHistory(prev =>
          [
            {
              id,
              source,
              timestamp,
              durationMs,
              success: false,
              error: message,
            },
            ...prev,
          ].slice(0, MAX_HISTORY_LENGTH)
        );
        logHardware('Pro2 onboarding status failed', {
          source,
          durationMs,
          error: message,
        });
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [buildMockStatus, pollSource, requestRealStatus]
  );

  useEffect(() => {
    if (!isPolling) return undefined;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await pollOnce(pollSource);
      if (!stopped) {
        timer = setTimeout(tick, pollIntervalMs);
      }
    };

    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [isPolling, pollIntervalMs, pollOnce, pollSource]);

  const handleStartPolling = () => {
    setIsPolling(true);
  };

  const handleStopPolling = () => {
    setIsPolling(false);
  };

  const handleIntervalBlur = () => {
    setIntervalInput(String(pollIntervalMs));
  };

  const latestRecord = history[0];
  const selectedSourceLabel = getSourceLabel(pollSource);
  const isRealBlocked = pollSource === 'real' && !currentDevice;
  const canRequestSelectedSource = !isLoading && !isRealBlocked;

  return (
    <PageLayout fixedHeight>
      <div className="min-h-full px-4 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pro2 Onboarding</h1>
              <p className="mt-1 text-sm text-muted-foreground">DeviceGetOnboardingStatus polling</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isPolling ? 'default' : 'outline'}>
                {isPolling ? 'Polling' : 'Stopped'}
              </Badge>
              <Badge variant={pollSource === 'mock' ? 'secondary' : 'outline'}>
                {selectedSourceLabel}
              </Badge>
              <Badge variant={currentDevice ? 'default' : 'outline'} className="max-w-full">
                <span className="truncate">{currentDevice?.connectId ?? 'No device'}</span>
              </Badge>
            </div>
          </div>

          <Card className="rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(240px,1fr)_minmax(380px,0.95fr)_auto] xl:items-end">
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">Source</div>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
                    <button
                      type="button"
                      onClick={() => setPollSource('real')}
                      className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
                        pollSource === 'real'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Usb className="h-4 w-4" />
                      Real
                    </button>
                    <button
                      type="button"
                      onClick={() => setPollSource('mock')}
                      className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
                        pollSource === 'mock'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FlaskConical className="h-4 w-4" />
                      Mock
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="poll-interval"
                      className="text-xs font-medium uppercase text-muted-foreground"
                    >
                      Interval
                    </label>
                    <span className="text-xs text-muted-foreground">{pollIntervalMs} ms</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="poll-interval"
                      type="number"
                      min={MIN_POLL_INTERVAL_MS}
                      max={MAX_POLL_INTERVAL_MS}
                      step={250}
                      value={intervalInput}
                      onChange={event => setIntervalInput(event.target.value)}
                      onBlur={handleIntervalBlur}
                      className="h-9 w-32"
                    />
                    {[500, 1000, 2000].map(value => (
                      <Button
                        key={value}
                        size="sm"
                        variant="outline"
                        onClick={() => setIntervalInput(String(value))}
                        className="px-3 shadow-none hover:shadow-none"
                      >
                        {value}ms
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => pollOnce(pollSource)}
                    disabled={!canRequestSelectedSource}
                    className="justify-center shadow-none hover:shadow-none"
                  >
                    <Activity className="h-4 w-4" />
                    Run once
                  </Button>
                  {isPolling ? (
                    <Button
                      variant="outline"
                      onClick={handleStopPolling}
                      className="justify-center shadow-none hover:shadow-none"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartPolling}
                      disabled={isRealBlocked}
                      className="justify-center shadow-none hover:shadow-none hover:scale-100 active:scale-100"
                    >
                      <Play className="h-4 w-4" />
                      Start polling
                    </Button>
                  )}
                </div>
              </div>

              {isRealBlocked ? (
                <div className="flex flex-col gap-2 rounded-lg border border-orange-200/70 bg-orange-50/50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-200 sm:flex-row sm:items-center sm:justify-between">
                  <span>Real mode needs a connected Pro2 device.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSearchPro2Device}
                    disabled={!sdkInitState.isInitialized || isConnecting}
                    className="h-8 justify-center border-orange-200 bg-white/80 px-3 text-orange-900 shadow-none hover:bg-white hover:shadow-none dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100"
                  >
                    <Search className="h-3.5 w-3.5" />
                    {isConnecting ? 'Searching...' : 'Search Pro2'}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
            <Card className="rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-sm">
              <CardContent className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-base font-semibold text-foreground">Latest status</h2>
                    </div>
                    <div
                      className="mt-3 truncate text-3xl font-semibold text-foreground"
                      title={status?.page_name}
                    >
                      {status?.page_name ?? 'No status yet'}
                    </div>
                  </div>
                  <Badge variant={error ? 'destructive' : status ? 'default' : 'outline'}>
                    {getLatestLabel(latestRecord)}
                  </Badge>
                </div>

                {error ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-words">{error}</span>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatusMetric
                    label="Page"
                    value={`${status?.page_index ?? '-'} / ${status?.page_count ?? '-'}`}
                  />
                  <StatusMetric
                    label="Source"
                    value={latestRecord ? getSourceLabel(latestRecord.source) : selectedSourceLabel}
                  />
                  <StatusMetric
                    label="Latency"
                    value={latestRecord ? `${latestRecord.durationMs}ms` : '-'}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Progress</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>

            <CommunicationTrace history={history} rawResponse={rawResponse} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
