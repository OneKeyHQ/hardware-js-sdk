import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Square,
  XCircle,
} from 'lucide-react';
import { PageLayout } from '../components/common/PageLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import {
  callHardwareAPI,
  hydrateConnectedDeviceInfo,
  searchDevices,
} from '../services/hardwareService';
import { useDeviceStore } from '../store/deviceStore';
import type { DeviceInfo } from '../types/hardware';
import { EDeviceType } from '@onekeyfe/hd-shared';
import {
  validatePortfolioSignificantDigits,
  type PortfolioCaseDefinition,
  type PortfolioCasesManifest,
} from '../features/portfolio-test/portfolioCases';

type CaseStatus = 'idle' | 'running' | 'passed' | 'failed';

type CaseResult = {
  status: CaseStatus;
  message?: string;
  durationMs?: number;
};

const INITIAL_RESULT: CaseResult = { status: 'idle' };

function isPortfolioTestDevice(device?: DeviceInfo | null): device is DeviceInfo {
  if (!device) return false;
  return (
    device.deviceType === EDeviceType.Pro2 ||
    device.state?.identity.deviceType === EDeviceType.Pro2 ||
    device.features?.deviceType === EDeviceType.Pro2 ||
    device.features?.model?.toLowerCase() === 'pro2'
  );
}

function getPortfolioCasesBaseUrl() {
  const commitSha = process.env.COMMIT_SHA;
  return commitSha && commitSha !== 'dev' ? `${commitSha}/portfolio-cases` : 'portfolio-cases';
}

function getPortfolioCaseUrl(path: string) {
  return `${getPortfolioCasesBaseUrl()}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function getResponseError(
  response: unknown,
  fallbackUnknown: string,
  fallbackSdkError: string
): string {
  if (!response || typeof response !== 'object') return fallbackUnknown;
  const payload = (response as { payload?: unknown }).payload;
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const error = (payload as { error?: unknown; message?: unknown }).error;
    const message = (payload as { error?: unknown; message?: unknown }).message;
    if (typeof error === 'string') return error;
    if (typeof message === 'string') return message;
  }
  return fallbackSdkError;
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return '';
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}

function resultBadge(result: CaseResult, labels: Record<CaseStatus, string>) {
  if (result.status === 'running') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> {labels.running}
      </Badge>
    );
  }
  if (result.status === 'passed') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> {labels.passed}
      </Badge>
    );
  }
  if (result.status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> {labels.failed}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Circle className="h-3 w-3" /> {labels.idle}
    </Badge>
  );
}

export default function PortfolioTestPage() {
  const { t } = useTranslation();
  const {
    currentDevice,
    sdkInitState,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    setIsConnecting,
  } = useDeviceStore();
  const [manifest, setManifest] = useState<PortfolioCasesManifest | null>(null);
  const [manifestError, setManifestError] = useState('');
  const [results, setResults] = useState<Record<string, CaseResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(getPortfolioCaseUrl('manifest.json'), { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<PortfolioCasesManifest>;
      })
      .then(value => {
        if (cancelled) return;
        setManifest(value);
        setManifestError('');
      })
      .catch(error => {
        if (cancelled) return;
        setManifestError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
      abortRef.current = true;
    };
  }, []);

  const cases = useMemo(() => manifest?.cases ?? [], [manifest]);
  const completedCount = useMemo(
    () => cases.filter(item => ['passed', 'failed'].includes(results[item.id]?.status)).length,
    [cases, results]
  );
  const passedCount = useMemo(
    () => cases.filter(item => results[item.id]?.status === 'passed').length,
    [cases, results]
  );
  const progress = cases.length ? (completedCount / cases.length) * 100 : 0;
  const intervalSeconds = (manifest?.intervalMs ?? 0) / 1000;
  const resultLabels: Record<CaseStatus, string> = {
    idle: t('portfolioTest.status.idle'),
    running: t('portfolioTest.status.running'),
    passed: t('portfolioTest.status.passed'),
    failed: t('portfolioTest.status.failed'),
  };
  const getLocalizedExpectationLabel = (expected: PortfolioCaseDefinition['expected']) =>
    t(`portfolioTest.expectation.${expected}`);

  const connectDevice = useCallback(async (): Promise<DeviceInfo> => {
    if (isPortfolioTestDevice(currentDevice)) return currentDevice;
    setIsConnecting(true);
    setIsConnectingLocal(true);
    try {
      const response = await searchDevices({ promptWebUsbAccess: true });
      if (!response.success || !Array.isArray(response.payload)) {
        throw new Error(
          getResponseError(
            response,
            t('portfolioTest.errors.unknown'),
            t('portfolioTest.errors.sdkWithoutMessage')
          )
        );
      }
      const devices = (response.payload as DeviceInfo[]).filter(isPortfolioTestDevice);
      if (!devices.length) throw new Error(t('portfolioTest.errors.deviceNotFound'));
      const device = await hydrateConnectedDeviceInfo(devices[0]);
      setConnectedDevices([device, ...devices.slice(1)]);
      setCurrentDevice(device);
      setDeviceFeatures(device.features);
      return device;
    } finally {
      setIsConnecting(false);
      setIsConnectingLocal(false);
    }
  }, [currentDevice, setConnectedDevices, setCurrentDevice, setDeviceFeatures, setIsConnecting, t]);

  const runCaseWithDevice = useCallback(
    async (item: PortfolioCaseDefinition, device?: DeviceInfo) => {
      const startedAt = performance.now();
      setRunningCaseId(item.id);
      setResults(previous => ({ ...previous, [item.id]: { status: 'running' } }));
      try {
        const digitError = validatePortfolioSignificantDigits(item.payload);
        if (item.expected === 'client-block') {
          if (!digitError) throw new Error(t('portfolioTest.errors.clientDidNotBlock'));
          setResults(previous => ({
            ...previous,
            [item.id]: {
              status: 'passed',
              message: t('portfolioTest.errors.blockedBeforeSend', { error: digitError }),
              durationMs: Math.round(performance.now() - startedAt),
            },
          }));
          return true;
        }
        if (digitError) throw new Error(digitError);
        if (!device) throw new Error(t('portfolioTest.errors.deviceRequired'));
        if (!device.connectId) throw new Error(t('portfolioTest.errors.connectIdMissing'));
        if (!item.package) throw new Error(t('portfolioTest.errors.packageMissing'));

        const packageResponse = await fetch(getPortfolioCaseUrl(item.package), {
          cache: 'no-store',
        });
        if (!packageResponse.ok) {
          throw new Error(
            t('portfolioTest.errors.packageLoadFailed', {
              packageName: item.package,
              status: packageResponse.status,
            })
          );
        }
        const packageBytes = await packageResponse.arrayBuffer();
        const response = await callHardwareAPI(
          'uploadPortfolio',
          { connectId: device.connectId, packageBase64: packageBytes },
          'connectId-params'
        );

        const responseError = response.success
          ? ''
          : getResponseError(
              response,
              t('portfolioTest.errors.unknown'),
              t('portfolioTest.errors.sdkWithoutMessage')
            );
        const passed =
          item.expected === 'accept'
            ? response.success
            : !response.success &&
              Boolean(item.expectedError) &&
              responseError.includes(item.expectedError as string);
        const message = response.success
          ? t('portfolioTest.errors.uploadSucceeded')
          : responseError;
        setResults(previous => ({
          ...previous,
          [item.id]: {
            status: passed ? 'passed' : 'failed',
            message: passed
              ? item.expected === 'reject'
                ? t('portfolioTest.errors.rejectedAsExpected', { message })
                : message
              : item.expected === 'reject'
              ? t('portfolioTest.errors.unexpectedRejectReason', {
                  expectedError: item.expectedError,
                  message,
                })
              : message,
            durationMs: Math.round(performance.now() - startedAt),
          },
        }));
        return passed;
      } catch (error) {
        setResults(previous => ({
          ...previous,
          [item.id]: {
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
            durationMs: Math.round(performance.now() - startedAt),
          },
        }));
        return false;
      } finally {
        setRunningCaseId(null);
      }
    },
    [t]
  );

  const runSingleCase = useCallback(
    async (item: PortfolioCaseDefinition) => {
      setIsRunning(true);
      abortRef.current = false;
      try {
        const device = item.expected === 'client-block' ? undefined : await connectDevice();
        await runCaseWithDevice(item, device);
      } catch (error) {
        setResults(previous => ({
          ...previous,
          [item.id]: {
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
          },
        }));
      } finally {
        setIsRunning(false);
      }
    },
    [connectDevice, runCaseWithDevice]
  );

  const waitForNextCase = useCallback(async (intervalMs: number) => {
    const deadline = Date.now() + intervalMs;
    while (!abortRef.current) {
      const remaining = Math.max(0, deadline - Date.now());
      setCountdownMs(remaining);
      if (remaining === 0) break;
      await new Promise(resolve => setTimeout(resolve, Math.min(250, remaining)));
    }
    setCountdownMs(0);
  }, []);

  const runAllCases = useCallback(async () => {
    if (!manifest) return;
    setIsRunning(true);
    abortRef.current = false;
    try {
      const device = await connectDevice();
      let hasRunHardwareCase = false;
      for (let index = 0; index < manifest.cases.length; index += 1) {
        if (abortRef.current) break;
        const item = manifest.cases[index];
        if (item.expected !== 'client-block' && hasRunHardwareCase) {
          await waitForNextCase(manifest.intervalMs);
        }
        if (abortRef.current) break;
        await runCaseWithDevice(item, device);
        if (item.expected !== 'client-block') hasRunHardwareCase = true;
      }
    } catch (error) {
      setManifestError(error instanceof Error ? error.message : String(error));
    } finally {
      setCountdownMs(0);
      setRunningCaseId(null);
      setIsRunning(false);
    }
  }, [connectDevice, manifest, runCaseWithDevice, waitForNextCase]);

  const stopBatch = useCallback(() => {
    abortRef.current = true;
    setCountdownMs(0);
  }, []);

  const resetResults = useCallback(() => {
    setResults({});
    setManifestError('');
  }, []);

  return (
    <PageLayout>
      <div className="space-y-5 p-4 sm:p-6" data-testid="portfolio-test-page">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">{t('portfolioTest.title')}</h1>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('portfolioTest.description', { intervalSeconds })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetResults} disabled={isRunning}>
              <RotateCcw /> {t('portfolioTest.resetResults')}
            </Button>
            {isRunning ? (
              <Button variant="warning" onClick={stopBatch}>
                <Square /> {t('portfolioTest.stopBatch')}
              </Button>
            ) : (
              <Button
                onClick={runAllCases}
                disabled={!manifest || !sdkInitState.isInitialized}
                data-testid="portfolio-test-run-all"
              >
                <Play /> {t('portfolioTest.runAll')}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">{t('portfolioTest.device')}</div>
                <div className="mt-1 font-medium text-foreground">
                  {isConnectingLocal
                    ? t('portfolioTest.connecting')
                    : isPortfolioTestDevice(currentDevice)
                    ? currentDevice.label || currentDevice.name || 'OneKey Pro 2'
                    : t('portfolioTest.notConnected')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('portfolioTest.progress')}</div>
                <div className="mt-1 font-medium text-foreground">
                  {t('portfolioTest.progressValue', {
                    completed: completedCount,
                    total: cases.length,
                    passed: passedCount,
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {t('portfolioTest.firmwareSource')}
                </div>
                <div
                  className="mt-1 truncate font-mono text-sm text-foreground"
                  title={manifest?.firmwareCommit}
                >
                  {manifest?.firmwareCommit?.slice(0, 12) || '--'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('portfolioTest.nextCase')}</div>
                <div className="mt-1 flex items-center gap-1 font-medium text-foreground">
                  <Clock3 className="h-4 w-4" />
                  {countdownMs > 0
                    ? t('portfolioTest.seconds', { count: Math.ceil(countdownMs / 1000) })
                    : runningCaseId || '--'}
                </div>
              </div>
            </div>
            <Progress value={progress} />
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant={sdkInitState.isInitialized ? 'success' : 'secondary'}>
                SDK{' '}
                {sdkInitState.isInitialized
                  ? t('portfolioTest.sdkReady')
                  : t('portfolioTest.sdkNotReady')}
              </Badge>
              <Badge variant="outline">
                {t('portfolioTest.signedPackages', {
                  count: cases.filter(item => Boolean(item.package)).length,
                })}
              </Badge>
              <Badge variant="outline">
                {t('portfolioTest.clientBlocks', {
                  count: cases.filter(item => item.expected === 'client-block').length,
                })}
              </Badge>
              <Badge variant="outline">{t('portfolioTest.interval', { intervalSeconds })}</Badge>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {t('portfolioTest.packageNotice')}
            </p>
          </CardContent>
        </Card>

        {manifestError ? (
          <Card className="border-red-300">
            <CardContent className="pt-5 text-sm text-red-600">{manifestError}</CardContent>
          </Card>
        ) : null}

        {!manifest && !manifestError ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> {t('portfolioTest.loadingCases')}
          </div>
        ) : null}

        <div className="space-y-3">
          {cases.map(item => {
            const result = results[item.id] ?? INITIAL_RESULT;
            const isCurrent = runningCaseId === item.id;
            return (
              <Card
                key={item.id}
                data-testid={`portfolio-case-${item.id}`}
                className={isCurrent ? 'border-primary ring-1 ring-primary/30' : ''}
              >
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-primary">
                          {item.id}
                        </span>
                        <h2 className="font-semibold text-foreground">{item.title}</h2>
                        <Badge
                          variant={
                            item.expected === 'accept'
                              ? 'outline'
                              : item.expected === 'reject'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {item.expected === 'client-block' ? (
                            <Ban className="mr-1 h-3 w-3" />
                          ) : null}
                          {getLocalizedExpectationLabel(item.expected)}
                        </Badge>
                        {resultBadge(result, resultLabels)}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                      {result.message ? (
                        <p
                          className={`mt-2 text-sm ${
                            result.status === 'failed' ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {result.message}
                          {result.durationMs !== undefined
                            ? ` · ${formatDuration(result.durationMs)}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        isRunning ||
                        (item.expected !== 'client-block' && !sdkInitState.isInitialized)
                      }
                      onClick={() => runSingleCase(item)}
                      data-testid={`portfolio-case-run-${item.id}`}
                    >
                      {item.expected === 'client-block' ? <Ban /> : <Play />}
                      {item.expected === 'client-block'
                        ? t('portfolioTest.verifyBlock')
                        : t('portfolioTest.run')}
                    </Button>
                  </div>
                  <details className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                      {t('portfolioTest.viewPayload')}
                    </summary>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <pre className="max-h-80 overflow-auto rounded-lg bg-background p-3 text-xs text-foreground">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                          {t('portfolioTest.expected')}:{' '}
                          {getLocalizedExpectationLabel(item.expected)}
                        </div>
                        <div>
                          {t('portfolioTest.packageFile')}:{' '}
                          {item.package || t('portfolioTest.noPackage')}
                        </div>
                        {item.expectedError ? (
                          <div>
                            {t('portfolioTest.matchMessage')}: {item.expectedError}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isPortfolioTestDevice(currentDevice) && manifest ? (
          <div className="sticky bottom-4 flex justify-center">
            <Button
              variant="elegant"
              onClick={() => void connectDevice()}
              disabled={isConnectingLocal}
            >
              {isConnectingLocal ? <Loader2 className="animate-spin" /> : <Search />}
              {t('portfolioTest.searchAndConnect')}
            </Button>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
