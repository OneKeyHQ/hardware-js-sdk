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
  BookOpen,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { PageLayout } from '../components/common/PageLayout';
import CollapsibleJsonViewer from '../components/common/CollapsibleJsonViewer';
import {
  callHardwareAPI,
  hydrateConnectedDeviceInfo,
  searchDevices,
} from '../services/hardwareService';
import { useToast } from '../hooks/use-toast';
import { useDeviceStore } from '../store/deviceStore';
import { logHardware } from '../utils/logger';
import { isPro2DeviceInfo } from '../utils/pro2Device';

import type { DeviceInfo } from '../types/hardware';

enum OnboardingStep {
  UNKNOWN = 0,
  DEVICE_VERIFICATION = 1,
  PERSONALIZATION = 2,
  SETUP = 3,
  FIRMWARE = 4,
}

type OnboardingStatus = {
  step: OnboardingStep;
  setup?: {
    new_device?: {
      seedcard_backup?: boolean;
    };
    restore?: {
      mnemonic?: boolean;
      seedcard?: boolean;
    };
  };
  detail_code?: number;
  detail_str?: string;
};

type PollSource = 'mock' | 'real';

type PollRecord = {
  id: number;
  source: PollSource;
  timestamp: string;
  durationMs: number;
  success: boolean;
  status?: OnboardingStatus;
  error?: string;
};

const DEFAULT_POLL_INTERVAL_MS = 1000;
const MIN_POLL_INTERVAL_MS = 250;
const MAX_POLL_INTERVAL_MS = 60_000;
const MAX_HISTORY_LENGTH = 12;

const ONBOARDING_WIRE_INFO = {
  txMsgType: '60602 (GetOnboardingStatus)',
  txPayload: 'ba ec',
  rxMsgType: '60603 (OnboardingStatus)',
  rxPayload: 'bb ec + step/setup/detail_code/detail_str',
  decoded: 'OnboardingStatus',
};

const STEP_LABELS: Record<number, string> = {
  [OnboardingStep.UNKNOWN]: 'Unknown',
  [OnboardingStep.DEVICE_VERIFICATION]: 'Device Verification',
  [OnboardingStep.PERSONALIZATION]: 'Personalization',
  [OnboardingStep.SETUP]: 'Setup',
  [OnboardingStep.FIRMWARE]: 'Firmware',
};

function getStepLabel(step?: OnboardingStep): string {
  if (step === undefined || step === null) return 'No status';
  return STEP_LABELS[step] ?? `Unknown (${step})`;
}

// Ordered steps for progress calculation (linear ordering of main flow)
const PROGRESS_STEPS = [
  OnboardingStep.UNKNOWN,
  OnboardingStep.DEVICE_VERIFICATION,
  OnboardingStep.PERSONALIZATION,
  OnboardingStep.SETUP,
  OnboardingStep.FIRMWARE,
];

// Mock flow simulates the new 0..4 major-step model with setup branch details.
const MOCK_FLOW: OnboardingStatus[] = [
  { step: OnboardingStep.DEVICE_VERIFICATION, detail_str: 'Genuine check' },
  { step: OnboardingStep.PERSONALIZATION, detail_str: 'PIN and device personalization' },
  { step: OnboardingStep.SETUP },
  { step: OnboardingStep.SETUP, setup: { new_device: {} }, detail_str: 'Create new wallet' },
  {
    step: OnboardingStep.SETUP,
    setup: { new_device: { seedcard_backup: true } },
    detail_str: 'SeedCard backup',
  },
  { step: OnboardingStep.FIRMWARE, detail_str: 'Wallet ready' },
];

function clampPollInterval(value: string | number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_POLL_INTERVAL_MS;
  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(MIN_POLL_INTERVAL_MS, Math.round(numeric)));
}

function normalizeSetup(payload: unknown): OnboardingStatus['setup'] {
  if (!payload || typeof payload !== 'object') return undefined;

  const data = payload as Record<string, unknown>;
  const setup: NonNullable<OnboardingStatus['setup']> = {};

  if (data.new_device && typeof data.new_device === 'object') {
    const newDevice = data.new_device as Record<string, unknown>;
    setup.new_device = {
      seedcard_backup:
        typeof newDevice.seedcard_backup === 'boolean' ? newDevice.seedcard_backup : undefined,
    };
  }

  if (data.restore && typeof data.restore === 'object') {
    const restore = data.restore as Record<string, unknown>;
    setup.restore = {
      mnemonic: typeof restore.mnemonic === 'boolean' ? restore.mnemonic : undefined,
      seedcard: typeof restore.seedcard === 'boolean' ? restore.seedcard : undefined,
    };
  }

  return Object.keys(setup).length ? setup : undefined;
}

function normalizeStatus(payload: unknown): OnboardingStatus {
  if (!payload || typeof payload !== 'object') return { step: OnboardingStep.UNKNOWN };

  const data = payload as Record<string, unknown>;
  return {
    step: typeof data.step === 'number' ? data.step : OnboardingStep.UNKNOWN,
    setup: normalizeSetup(data.setup),
    detail_code: typeof data.detail_code === 'number' ? data.detail_code : undefined,
    detail_str: typeof data.detail_str === 'string' ? data.detail_str : undefined,
  };
}

function getProgressValue(status: OnboardingStatus | null) {
  if (!status) return 0;
  if (status.step === OnboardingStep.FIRMWARE) return 100;

  const idx = PROGRESS_STEPS.indexOf(status.step);
  if (idx < 0) return 0;
  return Math.min(100, Math.max(0, Math.round((idx / (PROGRESS_STEPS.length - 1)) * 100)));
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
  return getStepLabel(record.status?.step);
}

function getSetupLabel(status?: OnboardingStatus | null) {
  if (!status?.setup) return '';
  const { setup } = status;

  if (setup.new_device) {
    return setup.new_device.seedcard_backup ? 'new_device.seedcard_backup' : 'new_device';
  }

  if (setup.restore) {
    if (setup.restore.mnemonic) return 'restore.mnemonic';
    if (setup.restore.seedcard) return 'restore.seedcard';
    return 'restore';
  }

  return '';
}

function getStatusSubtitle(status?: OnboardingStatus | null) {
  if (!status) return '';

  const parts = [getSetupLabel(status), status.detail_str].filter(Boolean);
  if (typeof status.detail_code === 'number') parts.push(`detail_code: ${status.detail_code}`);
  return parts.join(' / ');
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

function OnboardingFlowDoc() {
  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Onboarding 流程参考</h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 font-medium text-foreground">协议</div>
            <div className="space-y-1 font-mono text-xs text-muted-foreground">
              <div>TX: GetOnboardingStatus (60602) — 空请求，App 定时轮询</div>
              <div>
                RX: OnboardingStatus (60603) — step + setup + detail_code + detail_str
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-3 font-medium text-foreground">新状态模型</div>
            <div className="text-xs text-muted-foreground">
              <p className="mb-3">
                固件现在只返回 0..4 大阶段，创建/恢复路径通过 setup 子状态表达；旧的
                5/6/7/8/9/100 细状态不再作为 step 返回。
              </p>

              <div className="flex flex-wrap items-center gap-1.5 font-mono">
                <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">0 UNKNOWN</span>
                <span>→</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                  1 DEVICE_VERIFICATION
                </span>
                <span>→</span>
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                  2 PERSONALIZATION
                </span>
                <span>→</span>
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                  3 SETUP
                </span>
                <span>→</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  4 FIRMWARE
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 font-medium text-foreground">旧状态映射</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="pb-1.5 text-left font-medium">旧状态</th>
                  <th className="pb-1.5 text-left font-medium">旧值</th>
                  <th className="pb-1.5 text-left font-medium">当前固件返回</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">UNKNOWN</td>
                  <td className="align-top">0</td>
                  <td className="text-muted-foreground">step = UNKNOWN</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">SECURITY_CHECK</td>
                  <td className="align-top">1</td>
                  <td className="text-muted-foreground">step = DEVICE_VERIFICATION</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">PIN</td>
                  <td className="align-top">2</td>
                  <td className="text-muted-foreground">step = PERSONALIZATION</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">SETUP_CHOICE</td>
                  <td className="align-top">3</td>
                  <td className="text-muted-foreground">step = SETUP，setup 为空</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">CREATE_NEW</td>
                  <td className="align-top">4</td>
                  <td className="text-muted-foreground">step = SETUP + setup.new_device = {}</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">SEEDCARD_BACKUP</td>
                  <td className="align-top">5</td>
                  <td className="text-muted-foreground">
                    step = SETUP + setup.new_device.seedcard_backup = true
                  </td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">RESTORE_CHOICE</td>
                  <td className="align-top">6</td>
                  <td className="text-muted-foreground">step = SETUP + setup.restore = {}</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">RESTORE_MNEMONIC</td>
                  <td className="align-top">7</td>
                  <td className="text-muted-foreground">
                    step = SETUP + setup.restore.mnemonic = true
                  </td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">RESTORE_MNEMONIC_SEEDCARD_BACKUP</td>
                  <td className="align-top">8</td>
                  <td className="text-muted-foreground">当前固件无对应状态，恢复成功后进入 FIRMWARE</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">RESTORE_SEEDCARD</td>
                  <td className="align-top">9</td>
                  <td className="text-muted-foreground">
                    step = SETUP + setup.restore.seedcard = true
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top">DONE</td>
                  <td className="align-top">100</td>
                  <td className="text-muted-foreground">step = FIRMWARE，值是 4，不是 100</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-orange-200/50 bg-orange-50/30 p-3 dark:border-orange-900/40 dark:bg-orange-950/10">
            <div className="mb-1 font-medium text-foreground">注意事项</div>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>步骤不是严格递增的：用户按返回时 step 会回退</li>
              <li>step 只表示大阶段，创建/恢复细分必须读取 setup 子字段</li>
              <li>App 不能假设 step 只会向前推进，需要处理任意 step 跳转</li>
              <li>轮询无副作用，不会改变设备状态，可安全高频调用</li>
              <li>detail_code/detail_str 是固件调试信息，不应作为业务状态主键</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
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
                      {item.success ? getStepLabel(item.status?.step) : (item.error ?? '-')}
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
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PollRecord[]>([]);

  const mockIndexRef = useRef(0);
  const inFlightRef = useRef(false);
  const sequenceRef = useRef(0);

  const pollIntervalMs = useMemo(() => clampPollInterval(intervalInput), [intervalInput]);
  const progress = useMemo(() => getProgressValue(status), [status]);

  const buildMockStatus = useCallback((): OnboardingStatus => {
    const idx = mockIndexRef.current % MOCK_FLOW.length;
    mockIndexRef.current += 1;
    return MOCK_FLOW[idx];
  }, []);

  const requestRealStatus = useCallback(async () => {
    if (!currentDevice?.connectId) {
      throw new Error('Device not connected');
    }

    const response = await callHardwareAPI('deviceGetOnboardingStatus', {
      connectId: currentDevice.connectId,
    });

    if (!response.success) {
      throw new Error(response.payload?.error || 'GetOnboardingStatus failed');
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
      const searchResult = await searchDevices();

      if (!searchResult.success || !searchResult.payload) {
        toast({
          title: 'Search failed',
          description: searchResult.payload?.error || 'Unable to search Pro2 device.',
          variant: 'warning',
        });
        setConnectedDevices([]);
        return;
      }

      const devices = (searchResult.payload as DeviceInfo[]).filter(isPro2DeviceInfo);
      setConnectedDevices(devices);

      if (!devices.length) {
        toast({
          title: 'No device found',
          description: 'Connect a Pro2 device and try again.',
          variant: 'warning',
        });
        return;
      }

      const targetDevice = await hydrateConnectedDeviceInfo(devices[0]);
      setConnectedDevices([targetDevice, ...devices.slice(1)]);
      setDeviceFeatures(targetDevice.features);
      setCurrentDevice(targetDevice);

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
              <p className="mt-1 text-sm text-muted-foreground">GetOnboardingStatus polling</p>
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
                      title={status ? getStepLabel(status.step) : undefined}
                    >
                      {status ? getStepLabel(status.step) : 'No status yet'}
                    </div>
                    {getStatusSubtitle(status) ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {getStatusSubtitle(status)}
                      </div>
                    ) : null}
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
                    label="Step"
                    value={status ? `${status.step}` : '-'}
                    title={status ? getStepLabel(status.step) : undefined}
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

          <OnboardingFlowDoc />
        </div>
      </div>
    </PageLayout>
  );
}
