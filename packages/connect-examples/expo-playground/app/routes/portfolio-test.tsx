import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getExpectationLabel,
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

function getResponseError(response: unknown): string {
  if (!response || typeof response !== 'object') return '未知错误';
  const payload = (response as { payload?: unknown }).payload;
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const error = (payload as { error?: unknown; message?: unknown }).error;
    const message = (payload as { error?: unknown; message?: unknown }).message;
    if (typeof error === 'string') return error;
    if (typeof message === 'string') return message;
  }
  return 'SDK 调用失败，但没有返回错误说明';
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return '';
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}

function resultBadge(result: CaseResult) {
  if (result.status === 'running') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> 执行中
      </Badge>
    );
  }
  if (result.status === 'passed') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> 通过
      </Badge>
    );
  }
  if (result.status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> 失败
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Circle className="h-3 w-3" /> 未执行
    </Badge>
  );
}

export default function PortfolioTestPage() {
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

  const connectDevice = useCallback(async (): Promise<DeviceInfo> => {
    if (isPortfolioTestDevice(currentDevice)) return currentDevice;
    setIsConnecting(true);
    setIsConnectingLocal(true);
    try {
      const response = await searchDevices({ promptWebUsbAccess: true });
      if (!response.success || !Array.isArray(response.payload)) {
        throw new Error(getResponseError(response));
      }
      const devices = (response.payload as DeviceInfo[]).filter(isPortfolioTestDevice);
      if (!devices.length) throw new Error('没有找到 OneKey Pro 2');
      const device = await hydrateConnectedDeviceInfo(devices[0]);
      setConnectedDevices([device, ...devices.slice(1)]);
      setCurrentDevice(device);
      setDeviceFeatures(device.features);
      return device;
    } finally {
      setIsConnecting(false);
      setIsConnectingLocal(false);
    }
  }, [currentDevice, setConnectedDevices, setCurrentDevice, setDeviceFeatures, setIsConnecting]);

  const runCaseWithDevice = useCallback(
    async (item: PortfolioCaseDefinition, device?: DeviceInfo) => {
      const startedAt = performance.now();
      setRunningCaseId(item.id);
      setResults(previous => ({ ...previous, [item.id]: { status: 'running' } }));
      try {
        const digitError = validatePortfolioSignificantDigits(item.payload);
        if (item.expected === 'client-block') {
          if (!digitError) throw new Error('客户端未拦截超过 7 位有效数字的金额');
          setResults(previous => ({
            ...previous,
            [item.id]: {
              status: 'passed',
              message: `${digitError}；未向硬件发包`,
              durationMs: Math.round(performance.now() - startedAt),
            },
          }));
          return true;
        }
        if (digitError) throw new Error(digitError);
        if (!device) throw new Error('执行硬件用例前必须连接 OneKey Pro 2');
        if (!device.connectId) throw new Error('OneKey Pro 2 缺少 connectId');
        if (!item.package) throw new Error('该用例缺少 .okpkg 文件');

        const packageResponse = await fetch(getPortfolioCaseUrl(item.package), {
          cache: 'no-store',
        });
        if (!packageResponse.ok) {
          throw new Error(`加载 ${item.package} 失败：HTTP ${packageResponse.status}`);
        }
        const packageBytes = await packageResponse.arrayBuffer();
        const response = await callHardwareAPI(
          'uploadPortfolio',
          { connectId: device.connectId, packageBase64: packageBytes },
          'connectId-params'
        );

        const responseError = response.success ? '' : getResponseError(response);
        const passed =
          item.expected === 'accept'
            ? response.success
            : !response.success &&
              Boolean(item.expectedError) &&
              responseError.includes(item.expectedError as string);
        const message = response.success
          ? 'FilesystemFileWrite 与 PortfolioUpdate 均成功'
          : responseError;
        setResults(previous => ({
          ...previous,
          [item.id]: {
            status: passed ? 'passed' : 'failed',
            message: passed
              ? item.expected === 'reject'
                ? `按预期拒绝：${message}`
                : message
              : item.expected === 'reject'
              ? `预期拒绝原因包含“${item.expectedError}”，实际：${message}`
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
    []
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
              <h1 className="text-2xl font-semibold text-foreground">Pro2 Portfolio 专项测试</h1>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              逐项验证金额格式、Native/Contract/All Networks Token 映射、精确 JSON 结构与固件边界。
              批量模式每隔 15 秒执行一次；正向用例必须完整通过上传和 PortfolioUpdate，反向用例必须返回指定拒绝原因。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetResults} disabled={isRunning}>
              <RotateCcw /> 清空结果
            </Button>
            {isRunning ? (
              <Button variant="warning" onClick={stopBatch}>
                <Square /> 停止后续用例
              </Button>
            ) : (
              <Button
                onClick={runAllCases}
                disabled={!manifest || !sdkInitState.isInitialized}
                data-testid="portfolio-test-run-all"
              >
                <Play /> 运行全部用例
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">设备</div>
                <div className="mt-1 font-medium text-foreground">
                  {isConnectingLocal
                    ? '连接中…'
                    : isPortfolioTestDevice(currentDevice)
                    ? currentDevice.label || currentDevice.name || 'OneKey Pro 2'
                    : '未连接 Pro 2'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">测试进度</div>
                <div className="mt-1 font-medium text-foreground">
                  {completedCount}/{cases.length}，通过 {passedCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">固件规则来源</div>
                <div
                  className="mt-1 truncate font-mono text-sm text-foreground"
                  title={manifest?.firmwareCommit}
                >
                  {manifest?.firmwareCommit?.slice(0, 12) || '--'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">下一用例</div>
                <div className="mt-1 flex items-center gap-1 font-medium text-foreground">
                  <Clock3 className="h-4 w-4" />
                  {countdownMs > 0 ? `${Math.ceil(countdownMs / 1000)} 秒` : runningCaseId || '--'}
                </div>
              </div>
            </div>
            <Progress value={progress} />
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant={sdkInitState.isInitialized ? 'success' : 'secondary'}>
                SDK {sdkInitState.isInitialized ? '已就绪' : '未就绪'}
              </Badge>
              <Badge variant="outline">
                {cases.filter(item => Boolean(item.package)).length} 个签名包
              </Badge>
              <Badge variant="outline">
                {cases.filter(item => item.expected === 'client-block').length} 个客户端拦截
              </Badge>
              <Badge variant="outline">{(manifest?.intervalMs ?? 0) / 1000} 秒间隔</Badge>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              测试包使用 firmware-pro2 标准打包器和开发签名生成，仅适用于接受开发 RESOURCE
              包的测试固件。客户端拦截用例不会向设备发送任何字节。
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
            <Loader2 className="h-5 w-5 animate-spin" /> 正在加载测试用例…
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
                          {getExpectationLabel(item.expected)}
                        </Badge>
                        {resultBadge(result)}
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
                      {item.expected === 'client-block' ? '验证拦截' : '执行'}
                    </Button>
                  </div>
                  <details className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                      查看 Payload 与预期
                    </summary>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <pre className="max-h-80 overflow-auto rounded-lg bg-background p-3 text-xs text-foreground">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div>预期：{getExpectationLabel(item.expected)}</div>
                        <div>包文件：{item.package || '无（禁止发送）'}</div>
                        {item.expectedError ? <div>匹配信息：{item.expectedError}</div> : null}
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
              搜索并连接 Pro 2
            </Button>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
