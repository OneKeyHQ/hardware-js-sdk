import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Layers,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { ChainBoundary } from '../components/common/ChainBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { ChainIcon } from '../components/icons/ChainIcon';
import type { MethodCategory, ParameterField, UnifiedMethodConfig } from '../data/types';

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

const PARAMETER_PREVIEW_LIMIT = 6;

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

function formatParameterValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getParameterLabel(parameter: ParameterField) {
  return parameter.label || parameter.name;
}

function getRequiresDeviceConfirmation(method: UnifiedMethodConfig) {
  const category = getMethodCategory(method);

  if (category === 'signing' || category === 'transaction') {
    return true;
  }

  return method.presets.some(preset =>
    preset.parameters.some(parameter => parameter.name === 'showOnOneKey' && parameter.value === true)
  );
}

const ChainMethodsIndexPage: React.FC = () => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);

  const { selectedChain, isChainNotFound } = useMethodResolver({ chainId });

  const getTranslatedDescription = useCallback((description?: string) => {
    if (!description) return '';
    return description.startsWith('methodDescriptions.') ? t(description) : description;
  }, [t]);

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

    return filteredMethods.find(method => method.method === selectedMethodName) || filteredMethods[0];
  }, [filteredMethods, selectedMethodName]);

  const activePreset = activeMethod?.presets[0];
  const activePresetParameters = activePreset?.parameters ?? [];
  const visibleParameters = activePresetParameters.slice(0, PARAMETER_PREVIEW_LIMIT);
  const remainingParameterCount = Math.max(
    activePresetParameters.length - PARAMETER_PREVIEW_LIMIT,
    0
  );
  const requiresDeviceConfirmation = activeMethod ? getRequiresDeviceConfirmation(activeMethod) : false;

  useEffect(() => {
    if (!activeMethod) {
      setSelectedMethodName(null);
      return;
    }

    if (activeMethod.method !== selectedMethodName) {
      setSelectedMethodName(activeMethod.method);
    }
  }, [activeMethod, selectedMethodName]);

  const handleOpenRunner = (methodName: string) => {
    navigate(`/chains/${chainId}/${methodName}`);
  };

  return (
    <ChainBoundary chainId={chainId} checkNotFound={isChainNotFound}>
      {selectedChain && (
        <PageLayout fixedHeight={true}>
          <div className="flex h-full min-h-0 flex-col px-4 py-3">
            <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

                <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border/70 bg-card text-xs text-muted-foreground xl:w-[360px]">
                  <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="truncate">Chain</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 border-l border-border/70 px-3 py-2 text-foreground">
                    <CircleDot className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">Method</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 border-l border-border/70 px-3 py-2">
                    <Play className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Execute</span>
                  </div>
                </div>
              </div>

              <section className="rounded-lg border border-border/70 bg-card/80 p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
                      <ChainIcon chainId={selectedChain.id} size={24} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-semibold text-foreground">
                          {selectedChain.id}
                        </h1>
                        <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">
                          {t('chains.methodsCount', {
                            count: filteredMethods.length,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        Select a method, review its presets, then open the full runner.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
                      WebUSB ready
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
                      {selectedChain.methods.reduce(
                        (count, method) => count + method.presets.length,
                        0
                      )}{' '}
                      presets
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
                      Device confirmation
                    </span>
                  </div>
                </div>
              </section>

              <DeviceNotConnectedState />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
              <section className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/80">
                <div className="border-b border-border/70 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">Methods</h2>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Grouped by chain action
                      </p>
                    </div>
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                    <div key={group.category} className="mb-3 last:mb-0">
                      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
                        {CATEGORY_LABELS[group.category]}
                      </div>
                      <div className="space-y-1">
                        {group.methods.map(method => {
                          const isActive = activeMethod?.method === method.method;
                          const description =
                            getTranslatedDescription(method.description) || 'No description available';

                          return (
                            <button
                              key={`${selectedChain.id}-${method.method}`}
                              type="button"
                              className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
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
                                  <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px]">
                                    {method.presets.length}
                                  </span>
                                </div>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed">
                                {description}
                              </p>
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
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
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
                            {requiresDeviceConfirmation && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" />
                                Device review
                              </span>
                            )}
                          </div>
                          <h2 className="break-words font-mono text-lg font-semibold text-foreground">
                            {activeMethod.method}
                          </h2>
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                            {getTranslatedDescription(activeMethod.description) ||
                              'No description available'}
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleOpenRunner(activeMethod.method)}
                        >
                          Open runner
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_1fr]">
                        <div className="rounded-lg border border-border/70 bg-background p-3">
                          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Presets
                          </div>
                          <div className="mt-3 space-y-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {activePreset?.title || 'No preset'}
                              </div>
                              {activePreset?.description && (
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                  {activePreset.description}
                                </p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-md border border-border/70 bg-card px-2 py-2">
                                <div className="text-muted-foreground">Available</div>
                                <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                                  {activeMethod.presets.length}
                                </div>
                              </div>
                              <div className="rounded-md border border-border/70 bg-card px-2 py-2">
                                <div className="text-muted-foreground">Parameters</div>
                                <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                                  {activePresetParameters.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 rounded-lg border border-border/70 bg-background">
                          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                Parameter preview
                              </div>
                              <div className="text-xs text-muted-foreground">
                                First preset, editable in runner
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            {visibleParameters.length > 0 ? (
                              <table className="w-full min-w-[560px] text-left text-xs">
                                <thead className="border-b border-border/70 text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">Name</th>
                                    <th className="px-3 py-2 font-medium">Type</th>
                                    <th className="px-3 py-2 font-medium">Required</th>
                                    <th className="px-3 py-2 font-medium">Sample</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visibleParameters.map(parameter => (
                                    <tr
                                      key={parameter.name}
                                      className="border-b border-border/50 last:border-0"
                                    >
                                      <td className="max-w-[180px] px-3 py-2">
                                        <div className="truncate font-medium text-foreground">
                                          {getParameterLabel(parameter)}
                                        </div>
                                        {parameter.label && parameter.label !== parameter.name && (
                                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                                            {parameter.name}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 font-mono text-muted-foreground">
                                        {parameter.type}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span
                                          className={`rounded-full border px-2 py-0.5 ${
                                            parameter.required
                                              ? 'border-primary/30 bg-primary/10 text-primary'
                                              : 'border-border/70 text-muted-foreground'
                                          }`}
                                        >
                                          {parameter.required ? 'Yes' : 'No'}
                                        </span>
                                      </td>
                                      <td className="max-w-[260px] px-3 py-2">
                                        <div className="truncate font-mono text-muted-foreground">
                                          {formatParameterValue(parameter.value)}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                This method has no preset parameters.
                              </div>
                            )}
                          </div>

                          {remainingParameterCount > 0 && (
                            <div className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
                              {remainingParameterCount} more parameters are available in the runner.
                            </div>
                          )}
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
