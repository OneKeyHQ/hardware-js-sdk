import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Layers, Loader2, Play, Search } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { ChainBoundary } from '../components/common/ChainBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useHardwareStore } from '../store/hardwareStore';
import { ChainIcon } from '../components/icons/ChainIcon';
import { processParameters } from '../utils/parameterUtils';
import type { MethodCategory, MethodPreset, UnifiedMethodConfig } from '../data/types';

const CATEGORY_ORDER: MethodCategory[] = [
  'address',
  'publicKey',
  'signing',
  'transaction',
  'device',
  'info',
  'firmware',
  'other',
];

const CATEGORY_LABELS: Record<MethodCategory, string> = {
  address: 'Address',
  publicKey: 'Public key',
  signing: 'Signing',
  transaction: 'Transaction',
  device: 'Device',
  info: 'Info',
  firmware: 'Firmware',
  other: 'Other',
};

type InlineExecutionState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  request?: Record<string, unknown>;
  response?: unknown;
  error?: string;
  durationMs?: number;
};

function cleanExecutionParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function getPresetExecutionParams(preset?: MethodPreset) {
  if (!preset) {
    return {};
  }

  return processParameters(
    Object.fromEntries(
      preset.parameters
        .filter(parameter => parameter.visible !== false && parameter.value !== undefined)
        .map(parameter => [parameter.name, parameter.value])
    )
  );
}

function formatJsonPreview(value: unknown) {
  if (value === undefined) {
    return '';
  }

  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getMethodCategory(method: UnifiedMethodConfig): MethodCategory {
  if (method.category) {
    return method.category;
  }

  const methodName = method.method.toLowerCase();

  if (methodName.includes('address')) {
    return 'address';
  }

  if (methodName.includes('publickey') || methodName.includes('public_key')) {
    return 'publicKey';
  }

  if (methodName.includes('transaction') || methodName.includes('psbt')) {
    return 'transaction';
  }

  if (methodName.includes('sign') || methodName.includes('verify')) {
    return 'signing';
  }

  if (methodName.includes('firmware') || methodName.includes('bootloader')) {
    return 'firmware';
  }

  if (methodName.startsWith('get') || methodName.includes('info') || methodName.includes('state')) {
    return 'info';
  }

  return 'other';
}

const ChainMethodsIndexPage: React.FC = () => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);
  const [selectedPresetTitle, setSelectedPresetTitle] = useState<string | null>(null);
  const [inlineExecution, setInlineExecution] = useState<InlineExecutionState>({ status: 'idle' });

  const { selectedChain, isChainNotFound } = useMethodResolver({ chainId });
  const { executeMethod, canExecute } = useHardwareMethodExecution();
  const { commonParameters } = useHardwareStore();

  const getTranslatedDescription = useCallback(
    (description?: string) => {
      if (!description) return '';
      return description.startsWith('methodDescriptions.') ? t(description) : description;
    },
    [t]
  );

  const filteredMethods = useMemo(
    () =>
      selectedChain?.methods.filter(method => {
        const translatedDescription = getTranslatedDescription(method.description);
        const normalizedSearchTerm = searchTerm.toLowerCase();

        return (
          method.method.toLowerCase().includes(normalizedSearchTerm) ||
          translatedDescription.toLowerCase().includes(normalizedSearchTerm) ||
          CATEGORY_LABELS[getMethodCategory(method)].toLowerCase().includes(normalizedSearchTerm)
        );
      }) || [],
    [getTranslatedDescription, searchTerm, selectedChain?.methods]
  );

  const groupedMethods = useMemo(() => {
    const groups = filteredMethods.reduce(
      (result, method) => {
        const category = getMethodCategory(method);
        result[category].push(method);
        return result;
      },
      CATEGORY_ORDER.reduce(
        (result, category) => ({
          ...result,
          [category]: [],
        }),
        {} as Record<MethodCategory, UnifiedMethodConfig[]>
      )
    );

    return CATEGORY_ORDER.map(category => ({
      category,
      methods: groups[category],
    })).filter(group => group.methods.length > 0);
  }, [filteredMethods]);

  const activeMethod = useMemo(() => {
    if (filteredMethods.length === 0) {
      return undefined;
    }

    return (
      filteredMethods.find(method => method.method === selectedMethodName) || filteredMethods[0]
    );
  }, [filteredMethods, selectedMethodName]);

  const activePreset = useMemo(() => {
    if (!activeMethod) {
      return undefined;
    }

    return (
      activeMethod.presets.find(preset => preset.title === selectedPresetTitle) ||
      activeMethod.presets[0]
    );
  }, [activeMethod, selectedPresetTitle]);

  useEffect(() => {
    if (!activeMethod) {
      setSelectedMethodName(null);
      return;
    }

    if (activeMethod.method !== selectedMethodName) {
      setSelectedMethodName(activeMethod.method);
    }
  }, [activeMethod, selectedMethodName]);

  useEffect(() => {
    if (!activeMethod) {
      setSelectedPresetTitle(null);
      return;
    }

    if (!activeMethod.presets.some(preset => preset.title === selectedPresetTitle)) {
      setSelectedPresetTitle(activeMethod.presets[0]?.title ?? null);
    }
  }, [activeMethod, selectedPresetTitle]);

  useEffect(() => {
    setInlineExecution({ status: 'idle' });
  }, [activeMethod?.method, activePreset?.title]);

  const handleOpenRunner = (methodName: string) => {
    navigate(`/chains/${chainId}/${methodName}`);
  };

  const getInlineExecutionParams = useCallback(
    (preset?: MethodPreset) =>
      cleanExecutionParams({
        ...getPresetExecutionParams(preset),
        ...commonParameters,
      }),
    [commonParameters]
  );

  const activeRequestPayload = useMemo(
    () => getInlineExecutionParams(activePreset),
    [activePreset, getInlineExecutionParams]
  );

  const handleInlineExecute = useCallback(async () => {
    if (!activeMethod) {
      return;
    }

    const request = activeRequestPayload;

    if (!canExecute) {
      setInlineExecution({
        status: 'error',
        request,
        error: 'Device not connected',
      });
      return;
    }

    const startTime = Date.now();
    setInlineExecution({
      status: 'loading',
      request,
    });

    try {
      const response = await executeMethod(request, activeMethod);
      setInlineExecution({
        status: 'success',
        request,
        response,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      setInlineExecution({
        status: 'error',
        request,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });
    }
  }, [activeMethod, activeRequestPayload, canExecute, executeMethod]);

  return (
    <ChainBoundary chainId={chainId} checkNotFound={isChainNotFound}>
      {selectedChain && (
        <PageLayout fixedHeight={true}>
          <div className="flex h-full min-h-0 flex-col px-4 py-3">
            <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
              <Breadcrumb
                items={[
                  {
                    label: t('chains.title'),
                    href: '/chains',
                    icon: Layers,
                  },
                  {
                    label: selectedChain.id,
                    icon: () => <ChainIcon chainId={selectedChain.id} size={16} />,
                  },
                ]}
              />

              <DeviceNotConnectedState />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
              <section className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/80">
                <div className="border-b border-border/70 p-3">
                  <div className="mb-3 flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background">
                      <ChainIcon chainId={selectedChain.id} size={22} />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-base font-semibold text-foreground">
                        {selectedChain.id}
                      </h1>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search methods, categories, descriptions"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {groupedMethods.map(group => (
                    <div key={group.category} className="mb-2.5 last:mb-0">
                      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
                        {CATEGORY_LABELS[group.category]}
                      </div>
                      <div className="space-y-1">
                        {group.methods.map(method => {
                          const isActive = activeMethod?.method === method.method;

                          return (
                            <button
                              key={`${selectedChain.id}-${method.method}`}
                              type="button"
                              className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                                isActive
                                  ? 'border-primary/50 bg-primary/10 text-foreground'
                                  : 'border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/40 hover:text-foreground'
                              }`}
                              onClick={() => setSelectedMethodName(method.method)}
                            >
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <span className="min-w-0 truncate font-mono text-xs font-semibold">
                                  {method.method}
                                </span>
                                <div className="flex shrink-0 items-center gap-1">
                                  {method.deprecated && (
                                    <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-600 dark:text-orange-300">
                                      Deprecated
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {filteredMethods.length === 0 && (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-muted/20">
                        <Search className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">No methods found</h3>
                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                        No method matches &quot;{searchTerm}&quot;. Try a method name, category, or
                        action.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="min-h-[360px] min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card/80">
                {activeMethod ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="border-b border-border/70 p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                              {CATEGORY_LABELS[getMethodCategory(activeMethod)]}
                            </span>
                            {activeMethod.deprecated && (
                              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-600 dark:text-orange-300">
                                Deprecated
                              </span>
                            )}
                          </div>
                          <h2 className="break-words font-mono text-lg font-semibold text-foreground">
                            {activeMethod.method}
                          </h2>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleInlineExecute}
                            disabled={inlineExecution.status === 'loading' || !canExecute}
                          >
                            {inlineExecution.status === 'loading' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            Execute
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRunner(activeMethod.method)}
                          >
                            Details
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      <div className="grid min-h-full gap-4 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
                        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-background">
                          <div className="border-b border-border/70 px-4 py-3">
                            <div className="text-sm font-semibold text-foreground">
                              Active preset
                            </div>
                            {activeMethod.presets.length > 1 ? (
                              <Select
                                value={activePreset?.title || ''}
                                onValueChange={setSelectedPresetTitle}
                              >
                                <SelectTrigger className="mt-2 h-8 bg-card text-xs">
                                  <SelectValue placeholder="Select preset" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeMethod.presets.map(preset => (
                                    <SelectItem key={preset.title} value={preset.title}>
                                      {preset.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="mt-2 truncate font-semibold text-foreground">
                                {activePreset?.title || 'No preset'}
                              </div>
                            )}
                            {activePreset?.description && (
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {activePreset.description}
                              </p>
                            )}
                          </div>

                          <details open className="flex min-h-0 flex-1 flex-col">
                            <summary className="cursor-pointer border-b border-border/70 px-4 py-2.5 text-sm font-semibold text-foreground">
                              Request payload
                            </summary>
                            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                              {formatJsonPreview(activeRequestPayload)}
                            </pre>
                          </details>
                        </div>

                        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-background">
                          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
                            <div>
                              <div className="text-sm font-semibold text-foreground">Response</div>
                              <div className="text-xs text-muted-foreground">
                                Direct execution result
                              </div>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                inlineExecution.status === 'success'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                                  : inlineExecution.status === 'error'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'
                                  : inlineExecution.status === 'loading'
                                  ? 'border-primary/30 bg-primary/10 text-primary'
                                  : 'border-border/70 text-muted-foreground'
                              }`}
                            >
                              {inlineExecution.status === 'idle'
                                ? 'Idle'
                                : inlineExecution.status === 'loading'
                                ? 'Running'
                                : inlineExecution.status === 'success'
                                ? 'Success'
                                : 'Error'}
                            </span>
                          </div>

                          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
                            {inlineExecution.durationMs !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                Duration: {inlineExecution.durationMs}ms
                              </div>
                            )}

                            {inlineExecution.status === 'idle' && (
                              <div className="rounded-md border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
                                Execute the selected preset to view the response here.
                              </div>
                            )}

                            {inlineExecution.status === 'loading' && (
                              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-primary">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Waiting for device response...
                              </div>
                            )}

                            {inlineExecution.status === 'error' && (
                              <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-3 text-sm text-red-600 dark:text-red-300">
                                {inlineExecution.error}
                              </div>
                            )}

                            {inlineExecution.response !== undefined && (
                              <pre className="max-h-[360px] overflow-auto rounded-md border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                                {formatJsonPreview(inlineExecution.response)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[360px] items-center justify-center px-4 text-center">
                    <div>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-muted/20">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">No method selected</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Select a method from the list to inspect its presets.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </PageLayout>
      )}
    </ChainBoundary>
  );
};

export default ChainMethodsIndexPage;
