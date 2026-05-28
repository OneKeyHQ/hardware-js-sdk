import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Filter,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Square,
  XCircle,
} from 'lucide-react';

import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Progress } from '../components/ui/Progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { signerMethodsRegistry } from '../hooks/useMethodsRegistry';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { cancelHardwareOperation } from '../services/hardwareService';
import { useHardwareStore } from '../store/hardwareStore';
import {
  getParameterDisplayValue,
  isLazyParameterValue,
  processParameters,
} from '../utils/parameterUtils';
import type { MethodPreset, UnifiedMethodConfig } from '../data/types';

type BatchStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';
type PresetMode = 'first' | 'all';

type BatchCase = {
  id: string;
  groupId: string;
  method: UnifiedMethodConfig;
  presetTitle: string;
  params: Record<string, unknown>;
};

type BatchResult = {
  caseId: string;
  status: BatchStatus;
  request?: Record<string, unknown>;
  response?: unknown;
  error?: string;
  durationMs?: number;
};

const DEFAULT_PRESET: MethodPreset = {
  title: 'Default',
  parameters: [],
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function summarizePreviewValue(value: unknown, depth = 0): unknown {
  if (isLazyParameterValue(value)) {
    return summarizePreviewValue(getParameterDisplayValue(value), depth);
  }

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

function formatBatchPreview(value: unknown) {
  try {
    return JSON.stringify(summarizePreviewValue(value), null, 2);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function getPresetParams(preset: MethodPreset) {
  return processParameters(
    Object.fromEntries(
      preset.parameters
        .filter(parameter => parameter.visible !== false && parameter.value !== undefined)
        .map(parameter => [parameter.name, parameter.value])
    )
  );
}

function getMethodPresets(method: UnifiedMethodConfig, presetMode: PresetMode) {
  const presets = method.presets.length > 0 ? method.presets : [DEFAULT_PRESET];
  return presetMode === 'first' ? presets.slice(0, 1) : presets;
}

function getCaseSearchText(testCase: BatchCase) {
  return [
    'chain',
    testCase.groupId,
    testCase.method.method,
    testCase.presetTitle,
    testCase.method.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getStatusBadgeClass(status: BatchStatus | 'ready') {
  switch (status) {
    case 'success':
      return 'border-primary bg-primary text-primary-foreground shadow-sm';
    case 'error':
      return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300';
    case 'running':
      return 'border-primary bg-primary text-primary-foreground shadow-sm';
    case 'cancelled':
      return 'border-border/70 bg-muted/40 text-muted-foreground';
    default:
      return 'border-border/70 bg-background text-muted-foreground';
  }
}

function BatchStatusIcon({ status }: { status: BatchStatus | 'ready' }) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === 'cancelled') return <Square className="h-4 w-4 text-muted-foreground" />;
  return <Filter className="h-4 w-4 text-muted-foreground" />;
}

const MethodBatchTestPage: React.FC = () => {
  const { executeMethod, currentDevice } = useHardwareMethodExecution();
  const { commonParameters } = useHardwareStore();
  const [presetMode, setPresetMode] = useState<PresetMode>('first');
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<string, BatchResult>>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const stopRequestedRef = useRef(false);

  const allCases = useMemo<BatchCase[]>(() => {
    return signerMethodsRegistry.chains.flatMap(group =>
      group.methods.flatMap((method, methodIndex) =>
        getMethodPresets(method, presetMode).map((preset, presetIndex) => {
          const methodParams = getPresetParams(preset);
          const params = Object.fromEntries(
            Object.entries({
              ...methodParams,
              ...commonParameters,
            }).filter(([, value]) => value !== undefined && value !== null && value !== '')
          );
          const id = `chain:${group.id}:${methodIndex}:${method.method}:${presetIndex}:${preset.title}`;

          return {
            id,
            groupId: group.id,
            method,
            presetTitle: preset.title,
            params,
          };
        })
      )
    );
  }, [commonParameters, presetMode]);

  const groupOptions = useMemo(() => {
    const groups = Array.from(new Set(allCases.map(testCase => testCase.groupId))).sort();
    return ['all', ...groups];
  }, [allCases]);

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allCases.filter(testCase => {
      if (groupFilter !== 'all' && testCase.groupId !== groupFilter) return false;
      if (normalizedSearch && !getCaseSearchText(testCase).includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [allCases, groupFilter, searchTerm]);

  const summary = useMemo(() => {
    const visibleResults = filteredCases
      .map(testCase => results[testCase.id])
      .filter((result): result is BatchResult => Boolean(result));

    const total = filteredCases.length;
    const success = visibleResults.filter(result => result.status === 'success').length;
    const error = visibleResults.filter(result => result.status === 'error').length;
    const running = visibleResults.filter(result => result.status === 'running').length;
    const cancelled = visibleResults.filter(result => result.status === 'cancelled').length;
    const completed = success + error + cancelled;

    return {
      total,
      success,
      error,
      running,
      cancelled,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [filteredCases, results]);

  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return null;
    return filteredCases.find(testCase => testCase.id === selectedCaseId) ?? null;
  }, [filteredCases, selectedCaseId]);

  const resultCases = useMemo(() => {
    return selectedCase ? [selectedCase] : filteredCases;
  }, [filteredCases, selectedCase]);

  const setCaseResult = useCallback((caseId: string, update: Partial<BatchResult>) => {
    setResults(current => ({
      ...current,
      [caseId]: {
        ...(current[caseId] ?? { caseId, status: 'pending' }),
        ...update,
      },
    }));
  }, []);

  const runCases = useCallback(
    async (casesToRun: BatchCase[], resetResults: boolean) => {
      if (casesToRun.length === 0 || isRunning) return;

      stopRequestedRef.current = false;
      setIsRunning(true);
      setIsStopping(false);

      if (resetResults) {
        setResults(
          Object.fromEntries(
            filteredCases.map(testCase => [
              testCase.id,
              {
                caseId: testCase.id,
                status: 'pending',
              },
            ])
          )
        );
      }

      try {
        for (const testCase of casesToRun) {
          if (stopRequestedRef.current) {
            setCaseResult(testCase.id, {
              status: 'cancelled',
              error: 'Cancelled before execution',
            });
            continue;
          }

          const startedAt = Date.now();
          setCaseResult(testCase.id, {
            status: 'running',
            request: testCase.params,
            response: undefined,
            error: undefined,
            durationMs: undefined,
          });

          try {
            const response = await executeMethod(testCase.params, testCase.method);
            setCaseResult(testCase.id, {
              status: 'success',
              response,
              durationMs: Date.now() - startedAt,
            });
          } catch (error) {
            setCaseResult(testCase.id, {
              status: stopRequestedRef.current ? 'cancelled' : 'error',
              error: error instanceof Error ? error.message : String(error),
              durationMs: Date.now() - startedAt,
            });
          }

          await sleep(80);
        }
      } finally {
        setIsRunning(false);
        setIsStopping(false);
      }
    },
    [executeMethod, filteredCases, isRunning, setCaseResult]
  );

  const handleRunVisibleCases = useCallback(() => {
    void runCases(filteredCases, true);
  }, [filteredCases, runCases]);

  const handleRetryFailed = useCallback(() => {
    const failedCases = filteredCases.filter(testCase => results[testCase.id]?.status === 'error');
    void runCases(failedCases, false);
  }, [filteredCases, results, runCases]);

  const handleStop = useCallback(async () => {
    stopRequestedRef.current = true;
    setIsStopping(true);

    if (currentDevice?.connectId) {
      try {
        await cancelHardwareOperation(currentDevice.connectId);
      } catch {
        // Keep the local stop flag as the source of truth for the batch loop.
      }
    }
  }, [currentDevice?.connectId]);

  const handleReset = useCallback(() => {
    stopRequestedRef.current = false;
    setSelectedCaseId(null);
    setResults({});
  }, []);

  const failedCount = summary.error;
  const runDisabled = isRunning || filteredCases.length === 0;

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex h-full min-h-0 flex-col px-4 py-3">
        <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Breadcrumb items={[{ label: 'Chain Method Batch Test', icon: Layers }]} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleRunVisibleCases}
                disabled={runDisabled}
              >
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play />}
                Run visible
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetryFailed}
                disabled={isRunning || failedCount === 0}
              >
                <RotateCcw />
                Retry failed
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          <DeviceNotConnectedState />
        </div>

        <div className="mb-3 grid flex-shrink-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-border/70 bg-card/80 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Group</Label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map(group => (
                      <SelectItem key={group} value={group}>
                        {group === 'all' ? 'All groups' : group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Presets</Label>
                <Select
                  value={presetMode}
                  onValueChange={value => setPresetMode(value as PresetMode)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First preset only</SelectItem>
                    <SelectItem value="all">All presets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="method, chain, preset"
                    className="h-9 pl-9"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Batch progress</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {summary.completed}/{summary.total} completed
                </div>
              </div>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={summary.progress} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-border/70 bg-background px-2 py-1.5">
                <div className="text-muted-foreground">Success</div>
                <div className="font-semibold text-foreground">{summary.success}</div>
              </div>
              <div className="rounded-md border border-border/70 bg-background px-2 py-1.5">
                <div className="text-muted-foreground">Failed</div>
                <div className="font-semibold text-red-600 dark:text-red-300">{summary.error}</div>
              </div>
              <div className="rounded-md border border-border/70 bg-background px-2 py-1.5">
                <div className="text-muted-foreground">Cancelled</div>
                <div className="font-semibold text-muted-foreground">{summary.cancelled}</div>
              </div>
            </div>
          </section>
        </div>

        <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/70 bg-card/80">
          <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
            <div className="min-h-0 overflow-y-auto border-b border-border/70 xl:border-b-0 xl:border-r">
              <div className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">Cases</div>
                  <Badge variant="secondary">{filteredCases.length}</Badge>
                </div>
              </div>

              <div className="divide-y divide-border/70">
                {filteredCases.map(testCase => {
                  const result = results[testCase.id];
                  const status = result?.status ?? 'ready';

                  return (
                    <button
                      key={testCase.id}
                      type="button"
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                        selectedCaseId === testCase.id ? 'bg-muted/40' : ''
                      }`}
                      onClick={() => setSelectedCaseId(testCase.id)}
                    >
                      <BatchStatusIcon status={status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="break-all font-mono text-xs font-semibold text-foreground">
                            {testCase.method.method}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${getStatusBadgeClass(
                              status
                            )}`}
                          >
                            {status === 'ready' ? 'ready' : status}
                          </span>
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>chain</span>
                          <span>/</span>
                          <span>{testCase.groupId}</span>
                          <span>/</span>
                          <span className="break-all">{testCase.presetTitle}</span>
                        </div>
                        {result?.durationMs !== undefined && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {result.durationMs}ms
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredCases.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No cases match the current filters.
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-4">
              <div className="space-y-3">
                {resultCases.map(testCase => {
                  const result = results[testCase.id];
                  if (!result || result.status === 'pending') return null;

                  const previewValue =
                    result.response !== undefined
                      ? result.response
                      : {
                          error: result.error,
                          request: result.request,
                        };

                  return (
                    <div
                      key={`${testCase.id}-result`}
                      className="overflow-hidden rounded-lg border border-border/70 bg-background"
                    >
                      <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="break-all font-mono text-xs font-semibold text-foreground">
                            {testCase.method.method}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {testCase.groupId} / {testCase.presetTitle}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${getStatusBadgeClass(
                            result.status
                          )}`}
                        >
                          {result.status}
                        </span>
                      </div>
                      {result.error && (
                        <div className="border-b border-border/70 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                          {result.error}
                        </div>
                      )}
                      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                        {formatBatchPreview(previewValue)}
                      </pre>
                    </div>
                  );
                })}

                {selectedCase &&
                  (!results[selectedCase.id] || results[selectedCase.id]?.status === 'pending') && (
                    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border/70 px-6 text-center text-sm text-muted-foreground">
                      This selected case has no completed result yet.
                    </div>
                  )}

                {!selectedCase && Object.keys(results).length === 0 && (
                  <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-border/70 px-6 text-center text-sm text-muted-foreground">
                    Run visible cases to collect method responses and SDK errors.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default MethodBatchTestPage;
