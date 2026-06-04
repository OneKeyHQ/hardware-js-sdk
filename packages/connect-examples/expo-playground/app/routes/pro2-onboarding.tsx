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
import { callHardwareAPI, searchDevices } from '../services/hardwareService';
import { useToast } from '../hooks/use-toast';
import { useDeviceStore } from '../store/deviceStore';
import { logHardware } from '../utils/logger';
import { isPro2DeviceInfo } from '../utils/pro2Device';

import type { DeviceInfo } from '../types/hardware';

enum OnboardingStep {
  UNKNOWN = 0,
  SECURITY_CHECK = 1,
  PIN = 2,
  SETUP_CHOICE = 3,
  CREATE_NEW = 4,
  SEEDCARD_BACKUP = 5,
  RESTORE_CHOICE = 6,
  RESTORE_MNEMONIC = 7,
  RESTORE_MNEMONIC_SEEDCARD_BACKUP = 8,
  RESTORE_SEEDCARD = 9,
  DONE = 100,
}

type DeviceOnboardingStatus = {
  step: OnboardingStep;
  page_name?: string;
};

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
  rxPayload: 'bb ec + step/page_name',
  decoded: 'DeviceOnboardingStatus',
};

const STEP_LABELS: Record<number, string> = {
  [OnboardingStep.UNKNOWN]: 'Unknown',
  [OnboardingStep.SECURITY_CHECK]: 'Security Check',
  [OnboardingStep.PIN]: 'PIN Setup',
  [OnboardingStep.SETUP_CHOICE]: 'Setup Choice',
  [OnboardingStep.CREATE_NEW]: 'Create New Wallet',
  [OnboardingStep.SEEDCARD_BACKUP]: 'SeedCard Backup',
  [OnboardingStep.RESTORE_CHOICE]: 'Restore Choice',
  [OnboardingStep.RESTORE_MNEMONIC]: 'Restore Mnemonic',
  [OnboardingStep.RESTORE_MNEMONIC_SEEDCARD_BACKUP]: 'Restore Mnemonic SeedCard Backup',
  [OnboardingStep.RESTORE_SEEDCARD]: 'Restore SeedCard',
  [OnboardingStep.DONE]: 'Done',
};

function getStepLabel(step?: OnboardingStep): string {
  if (step === undefined || step === null) return 'No status';
  return STEP_LABELS[step] ?? `Unknown (${step})`;
}

// Ordered steps for progress calculation (linear ordering of main flow)
const PROGRESS_STEPS = [
  OnboardingStep.UNKNOWN,
  OnboardingStep.SECURITY_CHECK,
  OnboardingStep.PIN,
  OnboardingStep.SETUP_CHOICE,
  OnboardingStep.CREATE_NEW,
  OnboardingStep.SEEDCARD_BACKUP,
  OnboardingStep.RESTORE_CHOICE,
  OnboardingStep.RESTORE_MNEMONIC,
  OnboardingStep.RESTORE_MNEMONIC_SEEDCARD_BACKUP,
  OnboardingStep.RESTORE_SEEDCARD,
  OnboardingStep.DONE,
];

// Mock flow simulates: SECURITY_CHECK → PIN → SETUP_CHOICE → CREATE_NEW → SEEDCARD_BACKUP → DONE
const MOCK_FLOW: OnboardingStep[] = [
  OnboardingStep.SECURITY_CHECK,
  OnboardingStep.PIN,
  OnboardingStep.SETUP_CHOICE,
  OnboardingStep.CREATE_NEW,
  OnboardingStep.SEEDCARD_BACKUP,
  OnboardingStep.DONE,
];

function clampPollInterval(value: string | number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_POLL_INTERVAL_MS;
  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(MIN_POLL_INTERVAL_MS, Math.round(numeric)));
}

function normalizeStatus(payload: unknown): DeviceOnboardingStatus {
  if (!payload || typeof payload !== 'object') return { step: OnboardingStep.UNKNOWN };

  const data = payload as Record<string, unknown>;
  return {
    step: typeof data.step === 'number' ? data.step : OnboardingStep.UNKNOWN,
    page_name: typeof data.page_name === 'string' ? data.page_name : undefined,
  };
}

function getProgressValue(status: DeviceOnboardingStatus | null) {
  if (!status) return 0;
  if (status.step === OnboardingStep.DONE) return 100;

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
          {/* ── 协议说明 ── */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 font-medium text-foreground">协议</div>
            <div className="space-y-1 font-mono text-xs text-muted-foreground">
              <div>TX: DeviceGetOnboardingStatus (60602) — 空请求，App 定时轮询</div>
              <div>RX: DeviceOnboardingStatus (60603) — step (枚举) + page_name (可选调试字段)</div>
            </div>
          </div>

          {/* ── 流程总览 ── */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-3 font-medium text-foreground">流程总览</div>
            <div className="text-xs text-muted-foreground">
              <p className="mb-3">整个 Onboarding 分为 4 个阶段，所有路径共享前 3 个阶段，在 SETUP_CHOICE 处产生分支：</p>

              {/* 公共阶段 */}
              <div className="mb-3 rounded border border-border/40 bg-background/50 p-2.5">
                <div className="mb-1.5 text-xs font-medium text-foreground">公共阶段（所有路径）</div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">1 SECURITY_CHECK</span>
                  <span>→</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">2 PIN</span>
                  <span>→</span>
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">3 SETUP_CHOICE</span>
                </div>
              </div>

              {/* 分支 */}
              <div className="space-y-2">
                {/* 路径 A: 创建 */}
                <div className="rounded border border-border/40 bg-background/50 p-2.5">
                  <div className="mb-1.5 text-xs font-medium text-foreground">路径 A：创建新钱包</div>
                  <div className="mb-1 text-muted-foreground">用户选择「设置为新设备」</div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono">
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-200">4 CREATE_NEW</span>
                    <span>→</span>
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">5 SEEDCARD_BACKUP</span>
                    <span>→</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">100 DONE</span>
                  </div>
                  <div className="mt-1.5 text-muted-foreground">
                    CREATE_NEW 包含：选择词数(12/18/24)/SLIP39 → 生成助记词 → 显示助记词 → 验证助记词 → Wallet Ready
                  </div>
                </div>

                {/* 路径 B: 助记词恢复 */}
                <div className="rounded border border-border/40 bg-background/50 p-2.5">
                  <div className="mb-1.5 text-xs font-medium text-foreground">路径 B：助记词恢复</div>
                  <div className="mb-1 text-muted-foreground">用户选择「恢复钱包」→ 选择「助记词恢复」</div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono">
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">6 RESTORE_CHOICE</span>
                    <span>→</span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-200">7 RESTORE_MNEMONIC</span>
                    <span>→</span>
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">8 RESTORE_..._BACKUP</span>
                    <span>→</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">100 DONE</span>
                  </div>
                  <div className="mt-1.5 text-muted-foreground">
                    RESTORE_MNEMONIC 包含：选择词数 → 逐词输入(BIP39) 或 逐份输入(SLIP39) → 写入 SE → Wallet Ready
                  </div>
                </div>

                {/* 路径 C: SeedCard 恢复 */}
                <div className="rounded border border-border/40 bg-background/50 p-2.5">
                  <div className="mb-1.5 text-xs font-medium text-foreground">路径 C：SeedCard 恢复</div>
                  <div className="mb-1 text-muted-foreground">用户选择「恢复钱包」→ 选择「SeedCard 恢复」</div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono">
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">6 RESTORE_CHOICE</span>
                    <span>→</span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-200">9 RESTORE_SEEDCARD</span>
                    <span>→</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">100 DONE</span>
                  </div>
                  <div className="mt-1.5 text-muted-foreground">
                    RESTORE_SEEDCARD 包含：NFC 读取 SeedCard → 写入 SE → Wallet Ready。无需额外备份。
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 各阶段详细说明 ── */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 font-medium text-foreground">各阶段包含的固件页面</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="pb-1.5 text-left font-medium">值</th>
                  <th className="pb-1.5 text-left font-medium">步骤</th>
                  <th className="pb-1.5 text-left font-medium">包含的固件页面</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">0</td>
                  <td className="align-top">UNKNOWN</td>
                  <td className="text-muted-foreground">设备未进入 onboarding，或正在启动中</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">1</td>
                  <td className="align-top">SECURITY_CHECK</td>
                  <td className="text-muted-foreground">Hello → 选择语言 → 法律条款 → Let&apos;s get started → 连接 OneKey App (扫码) → Genuine Check (SE 验证设备真伪) → 给设备命名</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">2</td>
                  <td className="align-top">PIN</td>
                  <td className="text-muted-foreground">Create PIN 引导 → 输入新 PIN (4~50位) → 再次输入确认 → 不匹配则重试 → PIN Enabled</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">3</td>
                  <td className="align-top">SETUP_CHOICE</td>
                  <td className="text-muted-foreground">Setup Option 页面：选择「创建新钱包」或「恢复钱包」（分支点）</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">4</td>
                  <td className="align-top">CREATE_NEW</td>
                  <td className="text-muted-foreground">Recovery Phrase Types (12/18/24 词或 SLIP39) → 生成助记词 → Ready to Back Up → 逐词显示 → 验证助记词 → Wallet is Ready</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">5</td>
                  <td className="align-top">SEEDCARD_BACKUP</td>
                  <td className="text-muted-foreground">Set Up SeedCard Backup 引导 → NFC 写入 SeedCard → Backup Verification</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">6</td>
                  <td className="align-top">RESTORE_CHOICE</td>
                  <td className="text-muted-foreground">Restore Wallet 页面：选择恢复方式（助记词 / SeedCard）</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">7</td>
                  <td className="align-top">RESTORE_MNEMONIC</td>
                  <td className="text-muted-foreground">选择词数 (12/18/24) → 逐词输入 (BIP39) 或逐份输入 (SLIP39) → 写入 SE → Wallet is Ready</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">8</td>
                  <td className="whitespace-nowrap align-top">RESTORE_..._BACKUP</td>
                  <td className="text-muted-foreground">助记词恢复完成后，提示将助记词备份到 SeedCard → NFC 写入 → Backup Verification</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td className="py-1.5 align-top">9</td>
                  <td className="align-top">RESTORE_SEEDCARD</td>
                  <td className="text-muted-foreground">NFC 读取 SeedCard → 写入 SE → Wallet is Ready（已有 SeedCard，无需再备份）</td>
                </tr>
                <tr>
                  <td className="py-1.5 align-top">100</td>
                  <td className="align-top">DONE</td>
                  <td className="text-muted-foreground">Onboarding 完成，设备进入固件主界面</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 注意事项 ── */}
          <div className="rounded-lg border border-orange-200/50 bg-orange-50/30 p-3 dark:border-orange-900/40 dark:bg-orange-950/10">
            <div className="mb-1 font-medium text-foreground">注意事项</div>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>步骤不是严格递增的：用户按返回时 step 会回退（如 SETUP_CHOICE → SECURITY_CHECK）</li>
              <li>步骤可能被跳过：SEEDCARD_BACKUP (5) 和 RESTORE_MNEMONIC_SEEDCARD_BACKUP (8) 是可选的，可能直接跳到 DONE</li>
              <li>App 不能假设 step 只会向前推进，需要处理任意 step 跳转</li>
              <li>轮询无副作用，不会改变设备状态，可安全高频调用</li>
              <li>page_name 是固件内部页面名（如 &quot;Recovery Phrase&quot;），仅用于调试</li>
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
    const idx = mockIndexRef.current % MOCK_FLOW.length;
    mockIndexRef.current += 1;
    const step = MOCK_FLOW[idx];

    return {
      step,
      page_name: getStepLabel(step),
    };
  }, []);

  const requestRealStatus = useCallback(async () => {
    if (!currentDevice?.connectId) {
      throw new Error('Device not connected');
    }

    const response = await callHardwareAPI('deviceGetOnboardingStatus', {
      connectId: currentDevice.connectId,
    });

    if (!response.success) {
      throw new Error(response.payload?.error || 'DeviceGetOnboardingStatus failed');
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

      const targetDevice = devices[0];
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
                      title={status ? getStepLabel(status.step) : undefined}
                    >
                      {status ? getStepLabel(status.step) : 'No status yet'}
                    </div>
                    {status?.page_name ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        page: {status.page_name}
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
