import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Cpu,
  Download,
  Search,
  Settings,
  Wrench,
  Zap,
} from 'lucide-react';

import MethodExecutor from '../components/common/MethodExecutor';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { device } from '../data/methods/device';
import { getDeviceMethodSection } from '../data/methods/deviceCategories';
import { firmware } from '../data/methods/firmware';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import type { UnifiedMethodConfig } from '../data/types';

interface MethodCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  methods: UnifiedMethodConfig[];
}

const DeviceMethodsIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { currentDevice } = useDeviceStore();
  const { executeMethod } = useHardwareMethodExecution();
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    basic: true,
  });

  const allMethods = useMemo<UnifiedMethodConfig[]>(() => [...device.api, ...firmware.api], []);
  const methodQuery = searchParams.get('method')?.trim();

  const categories = useMemo((): MethodCategory[] => {
    const methodsBySection = {
      basic: [] as UnifiedMethodConfig[],
      device: [] as UnifiedMethodConfig[],
      firmware: [] as UnifiedMethodConfig[],
      advanced: [] as UnifiedMethodConfig[],
    };

    allMethods.forEach(method => {
      methodsBySection[getDeviceMethodSection(method.method)].push(method);
    });

    return [
      {
        id: 'basic',
        name: t('deviceMethods.categories.basic.name'),
        icon: Zap,
        methods: methodsBySection.basic,
      },
      {
        id: 'device',
        name: t('deviceMethods.categories.device.name'),
        icon: Settings,
        methods: methodsBySection.device,
      },
      {
        id: 'firmware',
        name: t('deviceMethods.categories.firmware.name'),
        icon: Download,
        methods: methodsBySection.firmware,
      },
      {
        id: 'advanced',
        name: t('deviceMethods.categories.advanced.name'),
        icon: Wrench,
        methods: methodsBySection.advanced,
      },
    ].filter(category => category.methods.length > 0);
  }, [allMethods, t]);

  const activeMethod = useMemo(() => {
    if (allMethods.length === 0) return undefined;
    const targetMethodName = methodQuery || selectedMethodName;
    return allMethods.find(method => method.method === targetMethodName) || allMethods[0];
  }, [allMethods, methodQuery, selectedMethodName]);

  const activeCategoryId = useMemo(() => {
    if (!activeMethod) return undefined;
    return categories.find(category =>
      category.methods.some(method => method.method === activeMethod.method)
    )?.id;
  }, [activeMethod, categories]);

  const normalizedFilter = methodFilter.trim().toLowerCase();
  const visibleCategories = useMemo(
    () =>
      categories
        .map(category => ({
          ...category,
          methods: normalizedFilter
            ? category.methods.filter(method => {
                const description = method.description?.startsWith('methodDescriptions.')
                  ? t(method.description)
                  : method.description || '';
                return (
                  method.method.toLowerCase().includes(normalizedFilter) ||
                  description.toLowerCase().includes(normalizedFilter)
                );
              })
            : category.methods,
        }))
        .filter(category => category.methods.length > 0),
    [categories, normalizedFilter, t]
  );

  const activeMethodDescription = useMemo(() => {
    if (!activeMethod?.description) return '';
    return activeMethod.description.startsWith('methodDescriptions.')
      ? t(activeMethod.description)
      : activeMethod.description;
  }, [activeMethod?.description, t]);

  useEffect(() => {
    if (!activeMethod) {
      setSelectedMethodName(null);
      return;
    }
    setSelectedMethodName(activeMethod.method);
  }, [activeMethod]);

  useEffect(() => {
    if (!activeCategoryId) return;
    setExpandedCategories(previous =>
      previous[activeCategoryId] ? previous : { ...previous, [activeCategoryId]: true }
    );
  }, [activeCategoryId]);

  const handleSelectMethod = useCallback(
    (methodName: string) => {
      setSelectedMethodName(methodName);
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('method', methodName);
      setSearchParams(nextSearchParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const handleMethodExecution = useCallback(
    async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!activeMethod) throw new Error('Method configuration not found');
      return executeMethod(params, activeMethod);
    },
    [activeMethod, executeMethod]
  );

  const handleOpenDetails = useCallback(() => {
    if (activeMethod) navigate(`/device-methods/${activeMethod.method}`);
  }, [activeMethod, navigate]);

  const isFirmwareMethod = useMemo(
    () =>
      Boolean(activeMethod && firmware.api.some(method => method.method === activeMethod.method)),
    [activeMethod]
  );

  const shouldShowConnectionHint = Boolean(
    activeMethod && !activeMethod.noConnIdReq && !currentDevice
  );

  const renderMethodDescription = (method: UnifiedMethodConfig) => {
    if (!method.description) return '';
    return method.description.startsWith('methodDescriptions.')
      ? t(method.description)
      : method.description;
  };

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex h-full min-h-0 flex-col px-4 py-3">
        <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <Breadcrumb items={[{ label: t('deviceMethods.title') || 'Device', icon: Cpu }]} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="px-2 py-0.5">
                {t('deviceMethods.totalMethods', { count: allMethods.length })}
              </Badge>
              <Badge variant="info" className="px-2 py-0.5">
                {t('deviceMethods.totalCategories', { count: categories.length })}
              </Badge>
            </div>
          </div>
          {shouldShowConnectionHint && <DeviceNotConnectedState />}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/80">
            <div className="border-b border-border/70 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background">
                  <Cpu className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold text-foreground">Device</h1>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {allMethods.length} hardware methods
                  </p>
                </div>
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={methodFilter}
                  onChange={event => setMethodFilter(event.target.value)}
                  placeholder="Filter methods"
                  aria-label="Filter device methods"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {visibleCategories.length > 0 ? (
                <div className="space-y-3">
                  {visibleCategories.map(category => {
                    const CategoryIcon = category.icon;
                    const isExpanded = expandedCategories[category.id] ?? false;
                    return (
                      <div key={category.id} className="space-y-1.5">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border/70 hover:bg-muted/40"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedCategories(previous => ({
                              ...previous,
                              [category.id]: !previous[category.id],
                            }))
                          }
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            {category.name}
                          </span>
                          <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {category.methods.length}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="space-y-1">
                            {category.methods.map(method => {
                              const isActive = activeMethod?.method === method.method;
                              return (
                                <button
                                  key={method.method}
                                  type="button"
                                  aria-current={isActive ? 'page' : undefined}
                                  className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                                    isActive
                                      ? 'border-primary/50 bg-primary/10 text-foreground'
                                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/40 hover:text-foreground'
                                  }`}
                                  onClick={() => handleSelectMethod(method.method)}
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="block min-w-0 flex-1 truncate font-mono text-xs font-semibold">
                                      {method.method}
                                    </span>
                                    {method.deprecated && (
                                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                    )}
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {renderMethodDescription(method)}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                  No methods match “{methodFilter}”.
                </div>
              )}
            </div>
          </section>

          <section className="min-h-[440px] min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card/80">
            {activeMethod ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border/70 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-2">
                      <h2 className="break-words font-mono text-lg font-semibold text-foreground">
                        {activeMethod.method}
                      </h2>
                      {activeMethodDescription && (
                        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                          {activeMethodDescription}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={activeMethod.noConnIdReq ? 'outline' : 'secondary'}>
                          {activeMethod.noConnIdReq ? 'No connection required' : 'Device required'}
                        </Badge>
                        {activeMethod.tags?.map(tag => (
                          <Badge key={tag} variant="info">
                            {tag}
                          </Badge>
                        ))}
                        {activeMethod.deprecated && (
                          <Badge variant="warning">
                            <AlertTriangle className="h-3 w-3" />
                            Deprecated
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={handleOpenDetails}
                    >
                      Details
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <MethodExecutor
                    key={activeMethod.method}
                    className="min-h-0"
                    methodConfig={activeMethod}
                    executionHandler={handleMethodExecution}
                    type={isFirmwareMethod ? 'firmware' : 'standard'}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[440px] items-center justify-center px-4 text-center">
                <div>
                  <Cpu className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">No method selected</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select a device method from the list to execute it here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default DeviceMethodsIndexPage;
