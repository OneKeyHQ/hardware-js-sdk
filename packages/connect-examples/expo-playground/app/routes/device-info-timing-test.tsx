import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Cpu,
  Loader2,
  Play,
  RotateCcw,
  Square,
  XCircle,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Checkbox } from '../components/ui/Checkbox';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Progress } from '../components/ui/Progress';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { cancelHardwareOperation } from '../services/hardwareService';
import { device } from '../data/methods/device';
import type { UnifiedMethodConfig } from '../data/types';

type TimingStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';
type DeviceInfoTargetKey = 'hw' | 'fw' | 'bt' | 'se1' | 'se2' | 'se3' | 'se4' | 'status';
type DeviceInfoTypeKey = 'version' | 'build_id' | 'hash' | 'specific';

type DeviceInfoTimingCase = {
  id: string;
  label: string;
  targetLabel: string;
  targets: Partial<Record<DeviceInfoTargetKey, boolean>>;
};

type TimingStats = {
  averageMs?: number;
  minMs?: number;
  maxMs?: number;
};

type TimingResult = TimingStats & {
  caseId: string;
  status: TimingStatus;
  request?: Record<string, unknown>;
  response?: unknown;
  error?: string;
  durations: number[];
  activeRound?: number;
  durationMs?: number;
};

const DEVICE_INFO_TARGET_CASES: DeviceInfoTimingCase[] = [
  {
    id: 'all',
    label: 'All Modules',
    targetLabel: 'hw + fw + bt + se1-4 + status',
    targets: {
      hw: true,
      fw: true,
      bt: true,
      se1: true,
      se2: true,
      se3: true,
      se4: true,
      status: true,
    },
  },
  { id: 'hw', label: 'Hardware', targetLabel: 'hw', targets: { hw: true } },
  { id: 'fw', label: 'Firmware', targetLabel: 'fw', targets: { fw: true } },
  { id: 'bt', label: 'Bluetooth', targetLabel: 'bt', targets: { bt: true } },
  { id: 'se1', label: 'Secure Element 1', targetLabel: 'se1', targets: { se1: true } },
  { id: 'se2', label: 'Secure Element 2', targetLabel: 'se2', targets: { se2: true } },
  { id: 'se3', label: 'Secure Element 3', targetLabel: 'se3', targets: { se3: true } },
  { id: 'se4', label: 'Secure Element 4', targetLabel: 'se4', targets: { se4: true } },
  { id: 'status', label: 'Status', targetLabel: 'status', targets: { status: true } },
];

const DEVICE_INFO_TYPE_OPTIONS: { id: DeviceInfoTypeKey; label: string }[] = [
  { id: 'version', label: 'Version' },
  { id: 'build_id', label: 'Build ID' },
  { id: 'hash', label: 'Hash' },
  { id: 'specific', label: 'Specific' },
];

const DEFAULT_DEVICE_INFO_TYPES: Record<DeviceInfoTypeKey, boolean> = {
  version: true,
  build_id: true,
  hash: false,
  specific: true,
};

const DEFAULT_SELECTED_CASE_IDS = DEVICE_INFO_TARGET_CASES.map(testCase => testCase.id);
const DEVICE_INFO_METHOD_NAME = 'deviceGetDeviceInfo';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getDeviceInfoMethodConfig(): UnifiedMethodConfig | undefined {
  return device.api.find(method => method.method === DEVICE_INFO_METHOD_NAME);
}

function clampRounds(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.floor(parsed), 1), 20);
}

function buildInfoTypes(types: Record<DeviceInfoTypeKey, boolean>) {
  return Object.fromEntries(
    Object.entries(types).filter(([, value]) => value)
  ) as Partial<Record<DeviceInfoTypeKey, boolean>>;
}

function hasSelectedInfoType(types: Record<DeviceInfoTypeKey, boolean>) {
  return Object.values(types).some(Boolean);
}

function getStats(durations: number[]): TimingStats {
  if (durations.length === 0) return {};
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return {
    averageMs: Math.round(total / durations.length),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
  };
}

function formatDuration(ms?: number) {
  if (ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function summarizePreviewValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (value instanceof ArrayBuffer) return `<ArrayBuffer ${value.byteLength} B>`;
  if (ArrayBuffer.isView(value)) return `<${value.constructor.name} ${value.byteLength} B>`;
  if (depth >= 6) return '[Object]';

  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map(item => summarizePreviewValue(item, depth + 1));
    return value.length > 20 ? [...items, `... (${value.length - 20} more items)`] : items;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 80)
      .map(([key, item]) => [
        key,
        typeof item === 'string' && item.length > 800
          ? `${item.slice(0, 800)}... (len=${item.length})`
          : summarizePreviewValue(item, depth + 1),
      ])
  );
}

function formatPreview(value: unknown) {
  try {
    return JSON.stringify(summarizePreviewValue(value), null, 2);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function getResponseKeys(response: unknown) {
  if (!response || typeof response !== 'object') return '-';
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return '-';
  const keys = Object.keys(data);
  return keys.length > 0 ? keys.join(', ') : '-';
}

function getStatusBadgeClass(status: TimingStatus | 'ready') {
  switch (status) {
    case 'success':
      return 'border-primary bg-primary text-primary-foreground';
    case 'error':
      return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300';
    case 'running':
      return 'border-primary bg-primary text-primary-foreground';
    case 'cancelled':
      return 'border-border/70 bg-muted/40 text-muted-foreground';
    default:
      return 'border-border/70 bg-background text-muted-foreground';
  }
}

function TimingStatusIcon({ status }: { status: TimingStatus | 'ready' }) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === 'cancelled') return <Square className="h-4 w-4 text-muted-foreground" />;
  return <Clock3 className="h-4 w-4 text-muted-foreground" />;
}

const DeviceInfoTimingTestPage: React.FC = () => {
  const { executeMethod, currentDevice } = useHardwareMethodExecution();
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(DEFAULT_SELECTED_CASE_IDS);
  const [infoTypes, setInfoTypes] =
    useState<Record<DeviceInfoTypeKey, boolean>>(DEFAULT_DEVICE_INFO_TYPES);
  const [roundsInput, setRoundsInput] = useState('1');
  const [results, setResults] = useState<Partial<Record<string, TimingResult>>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string>('all');
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const stopRequestedRef = useRef(false);

  const deviceInfoMethod = useMemo(() => getDeviceInfoMethodConfig(), []);
  const rounds = clampRounds(roundsInput);
  const selectedCases = useMemo(
    () => DEVICE_INFO_TARGET_CASES.filter(testCase => selectedCaseIds.includes(testCase.id)),
    [selectedCaseIds]
  );
  const infoTypesEnabled = hasSelectedInfoType(infoTypes);

  const summary = useMemo(() => {
    const visibleResults = selectedCases
      .map(testCase => results[testCase.id])
      .filter((result): result is TimingResult => Boolean(result));
    const success = visibleResults.filter(result => result.status === 'success').length;
    const error = visibleResults.filter(result => result.status === 'error').length;
    const cancelled = visibleResults.filter(result => result.status === 'cancelled').length;
    const completed = success + error + cancelled;
    const durations = visibleResults.flatMap(result => result.durations);

    return {
      total: selectedCases.length,
      success,
      error,
      cancelled,
      completed,
      progress:
        selectedCases.length > 0 ? Math.round((completed / selectedCases.length) * 100) : 0,
      ...getStats(durations),
    };
  }, [results, selectedCases]);

  const selectedCase =
    DEVICE_INFO_TARGET_CASES.find(testCase => testCase.id === selectedCaseId) ??
    DEVICE_INFO_TARGET_CASES[0];
  const selectedResult = selectedCase ? results[selectedCase.id] : undefined;

  const setCaseResult = useCallback((caseId: string, update: Partial<TimingResult>) => {
    setResults(current => ({
      ...current,
      [caseId]: {
        ...(current[caseId] ?? { caseId, status: 'pending', durations: [] }),
        ...update,
      },
    }));
  }, []);

  const toggleCase = useCallback((caseId: string, checked: boolean) => {
    setSelectedCaseIds(current => {
      if (checked) return Array.from(new Set([...current, caseId]));
      return current.filter(id => id !== caseId);
    });
  }, []);

  const toggleInfoType = useCallback((typeId: DeviceInfoTypeKey, checked: boolean) => {
    setInfoTypes(current => ({
      ...current,
      [typeId]: checked,
    }));
  }, []);

  const handleSelectAllCases = useCallback(() => {
    setSelectedCaseIds(DEFAULT_SELECTED_CASE_IDS);
  }, []);

  const handleClearCases = useCallback(() => {
    setSelectedCaseIds([]);
  }, []);

  const handleReset = useCallback(() => {
    stopRequestedRef.current = false;
    setSelectedCaseId('all');
    setResults({});
  }, []);

  const runCases = useCallback(async () => {
    if (!deviceInfoMethod || selectedCases.length === 0 || isRunning || !infoTypesEnabled) return;

    stopRequestedRef.current = false;
    setIsRunning(true);
    setIsStopping(false);

    setResults(
      Object.fromEntries(
        selectedCases.map(testCase => [
          testCase.id,
          {
            caseId: testCase.id,
            status: 'pending',
            durations: [],
          },
        ])
      )
    );

    const types = buildInfoTypes(infoTypes);

    try {
      for (const testCase of selectedCases) {
        const durations: number[] = [];

        for (let round = 1; round <= rounds; round += 1) {
          if (stopRequestedRef.current) {
            setCaseResult(testCase.id, {
              status: 'cancelled',
              error: 'Cancelled before execution',
              durations,
              ...getStats(durations),
            });
            break;
          }

          const request = {
            targets: testCase.targets,
            types,
          };
          setCaseResult(testCase.id, {
            status: 'running',
            request,
            response: undefined,
            error: undefined,
            durations,
            activeRound: round,
            durationMs: undefined,
            ...getStats(durations),
          });

          const startedAt = performance.now();

          try {
            const response = await executeMethod(request, deviceInfoMethod);
            const durationMs = Math.round(performance.now() - startedAt);
            durations.push(durationMs);
            setCaseResult(testCase.id, {
              status: 'success',
              request,
              response,
              durations: [...durations],
              activeRound: undefined,
              durationMs,
              ...getStats(durations),
            });
          } catch (error) {
            const durationMs = Math.round(performance.now() - startedAt);
            setCaseResult(testCase.id, {
              status: stopRequestedRef.current ? 'cancelled' : 'error',
              request,
              error: error instanceof Error ? error.message : String(error),
              durations: [...durations],
              activeRound: undefined,
              durationMs,
              ...getStats(durations),
            });
            break;
          }

          await sleep(80);
        }
      }
    } finally {
      setIsRunning(false);
      setIsStopping(false);
    }
  }, [
    deviceInfoMethod,
    executeMethod,
    infoTypes,
    infoTypesEnabled,
    isRunning,
    rounds,
    selectedCases,
    setCaseResult,
  ]);

  const handleStop = useCallback(async () => {
    stopRequestedRef.current = true;
    setIsStopping(true);

    if (currentDevice?.connectId) {
      try {
        await cancelHardwareOperation(currentDevice.connectId);
      } catch {
        // 本地停止状态由 stopRequestedRef 控制。
      }
    }
  }, [currentDevice?.connectId]);

  const runDisabled =
    isRunning || !currentDevice || selectedCases.length === 0 || !deviceInfoMethod || !infoTypesEnabled;

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex h-full min-h-0 flex-col px-4 py-3">
        <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Breadcrumb items={[{ label: 'Device Info Timing Test', icon: BarChart3 }]} />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={runCases} disabled={runDisabled}>
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play />}
                Run selected
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStop}
                disabled={!isRunning || isStopping}
              >
                {isStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square />}
                Stop
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw />
                Reset
              </Button>
            </div>
          </div>

          {!currentDevice && <DeviceNotConnectedState showFullPage={false} pro2Only />}
        </div>

        <div className="mb-3 grid flex-shrink-0 grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-lg border border-border/70 bg-card/80 p-3">
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.8fr)_160px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">Modules</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllCases}>
                      All
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearCases}>
                      None
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {DEVICE_INFO_TARGET_CASES.map(testCase => {
                    const checkboxId = `device-info-target-${testCase.id}`;

                    return (
                      <label
                        key={testCase.id}
                        htmlFor={checkboxId}
                        className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={selectedCaseIds.includes(testCase.id)}
                          onCheckedChange={checked => toggleCase(testCase.id, checked === true)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {testCase.label}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">
                            {testCase.targetLabel}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Info types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEVICE_INFO_TYPE_OPTIONS.map(option => {
                    const checkboxId = `device-info-type-${option.id}`;

                    return (
                      <label
                        key={option.id}
                        htmlFor={checkboxId}
                        className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={infoTypes[option.id]}
                          onCheckedChange={checked => toggleInfoType(option.id, checked === true)}
                        />
                        <span className="truncate text-foreground">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                {!infoTypesEnabled && (
                  <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                    Select at least one info type.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Rounds</Label>
                <Input
                  value={roundsInput}
                  type="number"
                  min={1}
                  max={20}
                  onChange={event => setRoundsInput(event.target.value)}
                  className="h-9 bg-background"
                />
                <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                  Effective: {rounds}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Timing summary</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {summary.completed}/{summary.total} modules completed
                </div>
              </div>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={summary.progress} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-border/70 bg-background px-2 py-1.5">
                <div className="text-muted-foreground">Avg</div>
                <div className="font-semibold text-foreground">
                  {formatDuration(summary.averageMs)}
                </div>
              </div>
              <div className="rounded-md border border-border/70 bg-background px-2 py-1.5">
                <div className="text-muted-foreground">Success</div>
                <div className="font-semibold text-foreground">{summary.success}</div>
              </div>
              <div className="rounded-md border border-border/70 bg-background px-2 py-1.5">
                <div className="text-muted-foreground">Failed</div>
                <div className="font-semibold text-red-600 dark:text-red-300">
                  {summary.error}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/70 bg-card/80">
          <div className="grid min-h-full grid-cols-1 2xl:grid-cols-[minmax(760px,1fr)_minmax(320px,0.7fr)]">
            <div className="min-h-[420px] overflow-auto border-b border-border/70 2xl:border-b-0 2xl:border-r">
              <div className="sticky top-0 z-10 grid min-w-[780px] grid-cols-[36px_minmax(150px,1fr)_150px_110px_repeat(4,90px)_minmax(140px,1fr)] gap-3 border-b border-border/70 bg-card/95 px-4 py-3 text-xs font-medium text-muted-foreground backdrop-blur">
                <span />
                <span>Module</span>
                <span>Target</span>
                <span>Status</span>
                <span>Last</span>
                <span>Avg</span>
                <span>Min</span>
                <span>Max</span>
                <span>Returned keys</span>
              </div>

              <div className="min-w-[780px] divide-y divide-border/70">
                {DEVICE_INFO_TARGET_CASES.map(testCase => {
                  const result = results[testCase.id];
                  const status = result?.status ?? 'ready';
                  const isSelected = selectedCaseId === testCase.id;

                  return (
                    <button
                      key={testCase.id}
                      type="button"
                      className={`grid w-full grid-cols-[36px_minmax(150px,1fr)_150px_110px_repeat(4,90px)_minmax(140px,1fr)] items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/30 ${
                        isSelected ? 'bg-muted/40' : ''
                      }`}
                      onClick={() => setSelectedCaseId(testCase.id)}
                    >
                      <TimingStatusIcon status={status} />
                      <span className="min-w-0 font-medium text-foreground">
                        {testCase.label}
                        {result?.status === 'running' && result.activeRound ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {result.activeRound}/{rounds}
                          </span>
                        ) : null}
                      </span>
                      <span className="break-all font-mono text-xs text-muted-foreground">
                        {testCase.targetLabel}
                      </span>
                      <span
                        className={`w-fit rounded-full border px-2 py-0.5 text-xs ${getStatusBadgeClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(result?.durationMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(result?.averageMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(result?.minMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(result?.maxMs)}
                      </span>
                      <span className="break-all text-xs text-muted-foreground">
                        {getResponseKeys(result?.response)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[320px] overflow-y-auto p-4">
              {selectedResult ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-foreground">{selectedCase.label}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {selectedCase.targetLabel}
                      </div>
                    </div>
                    <Badge variant={selectedResult.status === 'success' ? 'default' : 'secondary'}>
                      {selectedResult.durations.length} rounds
                    </Badge>
                  </div>

                  {selectedResult.error && (
                    <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-3 text-sm text-red-600 dark:text-red-300">
                      {selectedResult.error}
                    </div>
                  )}

                  <Card className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm">
                    <CardContent className="p-0">
                      <div className="border-b border-border/70 px-4 py-2.5 text-sm font-semibold text-foreground">
                        Request
                      </div>
                      <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                        {formatPreview(selectedResult.request)}
                      </pre>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm">
                    <CardContent className="p-0">
                      <div className="border-b border-border/70 px-4 py-2.5 text-sm font-semibold text-foreground">
                        Response
                      </div>
                      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                        {formatPreview(selectedResult.response ?? { error: selectedResult.error })}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border/70 px-6 text-center text-sm text-muted-foreground">
                  Run selected modules to collect timing data.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default DeviceInfoTimingTestPage;
