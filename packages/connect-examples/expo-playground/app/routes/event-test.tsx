import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  FileJson,
  Play,
  Radio,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { DEVICE, FIRMWARE_EVENT, IFRAME, LOG_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Checkbox } from '../components/ui/Checkbox';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import CollapsibleJsonViewer from '../components/common/CollapsibleJsonViewer';
import { PageLayout } from '../components/common/PageLayout';
import { callHardwareAPI, searchDevices, type HardwareApiMethod } from '../services/hardwareService';
import { useDeviceStore } from '../store/deviceStore';
import {
  EventTestEntry,
  EventTestSource,
  useEventTestStore,
} from '../store/eventTestStore';
import { formatJsonPreview } from '../utils/jsonPreview';

interface EventExpectation {
  source?: EventTestSource;
  type: string;
  label: string;
  optional?: boolean;
}

interface EventScenario {
  id: string;
  title: string;
  description: string;
  method: string;
  requireDevice: boolean;
  includeDeviceId?: boolean;
  params: Record<string, unknown>;
  expectations: EventExpectation[];
}

const EVENT_SOURCES: EventTestSource[] = [
  'UI_EVENT',
  'DEVICE_EVENT',
  'FIRMWARE_EVENT',
  'LOG_EVENT',
  'API',
];

const EVENT_CATALOG = [
  {
    group: 'UI 请求',
    source: 'UI_EVENT' as EventTestSource,
    events: Object.values(UI_REQUEST),
  },
  {
    group: 'UI 响应',
    source: 'UI_EVENT' as EventTestSource,
    events: Object.values(UI_RESPONSE),
  },
  {
    group: 'Iframe 内部事件',
    source: 'UI_EVENT' as EventTestSource,
    events: Object.values(IFRAME),
  },
  {
    group: '设备事件',
    source: 'DEVICE_EVENT' as EventTestSource,
    events: [
      DEVICE.CONNECT,
      DEVICE.DISCONNECT,
      DEVICE.FEATURES,
      DEVICE.SUPPORT_FEATURES,
      DEVICE.ACQUIRE,
      DEVICE.RELEASE,
    ],
  },
  {
    group: '固件/日志',
    source: 'FIRMWARE_EVENT' as EventTestSource,
    events: [FIRMWARE_EVENT, LOG_EVENT],
  },
];

const SCENARIOS: EventScenario[] = [
  {
    id: 'search-devices',
    title: '搜索设备',
    description: '触发 searchDevices，用来验证连接链路能否产生 device-connect。',
    method: 'searchDevices',
    requireDevice: false,
    params: {},
    expectations: [
      {
        source: 'DEVICE_EVENT',
        type: DEVICE.CONNECT,
        label: '发现并连接设备',
        optional: true,
      },
    ],
  },
  {
    id: 'get-features',
    title: '读取 Features',
    description: '触发 getFeatures，期望 SDK 下发 features 设备事件，并返回设备基础能力。',
    method: 'getFeatures',
    requireDevice: true,
    params: {},
    expectations: [
      {
        source: 'DEVICE_EVENT',
        type: DEVICE.FEATURES,
        label: '收到 features',
      },
    ],
  },
  {
    id: 'evm-address-confirm',
    title: 'EVM 地址确认',
    description: '触发 evmGetAddress(showOnOneKey=true)，验证设备确认类 UI 事件。',
    method: 'evmGetAddress',
    requireDevice: true,
    includeDeviceId: true,
    params: {
      path: "m/44'/60'/0'/0/0",
      showOnOneKey: true,
    },
    expectations: [
      {
        source: 'UI_EVENT',
        type: UI_REQUEST.REQUEST_BUTTON,
        label: '设备确认请求',
      },
      {
        source: 'UI_EVENT',
        type: UI_REQUEST.CLOSE_UI_WINDOW,
        label: '交互窗口关闭',
      },
    ],
  },
  {
    id: 'passphrase-state',
    title: 'Passphrase 状态',
    description: '触发 getPassphraseState，用来观察 passphrase 相关事件和响应。',
    method: 'getPassphraseState',
    requireDevice: true,
    params: {},
    expectations: [
      {
        source: 'UI_EVENT',
        type: UI_REQUEST.REQUEST_PASSPHRASE,
        label: '请求 passphrase',
        optional: true,
      },
      {
        source: 'UI_EVENT',
        type: UI_REQUEST.CLOSE_UI_WINDOW,
        label: '交互窗口关闭',
        optional: true,
      },
    ],
  },
];

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const getSourceBadgeClass = (source: EventTestSource) => {
  switch (source) {
    case 'UI_EVENT':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
    case 'DEVICE_EVENT':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';
    case 'FIRMWARE_EVENT':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800';
    case 'LOG_EVENT':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800';
    case 'API':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const eventMatches = (entry: EventTestEntry, expectation: EventExpectation) =>
  entry.type === expectation.type && (!expectation.source || entry.source === expectation.source);

const parseJsonParams = (text: string): Record<string, unknown> => {
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('参数必须是 JSON object');
  }
  return value as Record<string, unknown>;
};

const parseCustomExpectations = (text: string): EventExpectation[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [maybeSource, ...rest] = line.split(':');
      if (EVENT_SOURCES.includes(maybeSource as EventTestSource) && rest.length > 0) {
        const type = rest.join(':').trim();
        return {
          source: maybeSource as EventTestSource,
          type,
          label: type,
        };
      }
      return {
        type: line,
        label: line,
      };
    });

export default function EventTestPage() {
  const { currentDevice } = useDeviceStore();
  const { entries, activeRun, isRecording, startRun, finishRun, recordEvent, clearEvents } =
    useEventTestStore();
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
  const selectedScenario = SCENARIOS.find(item => item.id === selectedScenarioId) ?? SCENARIOS[0];
  const [paramsText, setParamsText] = useState(formatJsonPreview(selectedScenario.params));
  const [customMethod, setCustomMethod] = useState('getFeatures');
  const [customInjectDevice, setCustomInjectDevice] = useState(true);
  const [customInjectDeviceId, setCustomInjectDeviceId] = useState(false);
  const [customExpectationsText, setCustomExpectationsText] = useState(
    `${'DEVICE_EVENT'}:${DEVICE.FEATURES}`
  );
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCustomMode) {
      setParamsText(formatJsonPreview(selectedScenario.params));
    }
  }, [isCustomMode, selectedScenario]);

  const expectations = useMemo(() => {
    if (isCustomMode) return parseCustomExpectations(customExpectationsText);
    return selectedScenario.expectations;
  }, [customExpectationsText, isCustomMode, selectedScenario.expectations]);

  const matchedExpectations = useMemo(
    () =>
      expectations.map(expectation => ({
        expectation,
        matchedEntry: entries.find(entry => eventMatches(entry, expectation)),
      })),
    [entries, expectations]
  );

  const summary = useMemo(() => {
    const required = matchedExpectations.filter(item => !item.expectation.optional);
    const passed = required.filter(item => item.matchedEntry).length;
    return {
      passed,
      total: required.length,
      optionalPassed: matchedExpectations.filter(
        item => item.expectation.optional && item.matchedEntry
      ).length,
    };
  }, [matchedExpectations]);

  const runScenario = async () => {
    const scenario = isCustomMode
      ? {
          id: 'custom',
          title: customMethod,
          method: customMethod,
          requireDevice: customInjectDevice,
          includeDeviceId: customInjectDevice && customInjectDeviceId,
          params: {},
          expectations: parseCustomExpectations(customExpectationsText),
        }
      : selectedScenario;

    if (scenario.requireDevice && !currentDevice) {
      setLastError('请先连接设备，再执行该事件测试。');
      return;
    }

    setIsExecuting(true);
    setLastResult(null);
    setLastError(null);
    startRun(scenario.id);

    try {
      const parsedParams = parseJsonParams(paramsText || '{}');
      const executionParams = {
        ...(scenario.requireDevice && currentDevice
          ? {
              connectId: currentDevice.connectId,
              ...(scenario.includeDeviceId ? { deviceId: currentDevice.deviceId } : {}),
            }
          : {}),
        ...parsedParams,
      };

      recordEvent({
        source: 'API',
        type: 'api-call-start',
        payload: {
          method: scenario.method,
          params: executionParams,
        },
      });

      const result =
        scenario.method === 'searchDevices'
          ? await searchDevices()
          : await callHardwareAPI(scenario.method as HardwareApiMethod, executionParams);

      recordEvent({
        source: 'API',
        type: result.success ? 'api-call-success' : 'api-call-error',
        payload: result,
      });
      setLastResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordEvent({
        source: 'API',
        type: 'api-call-exception',
        payload: { error: message },
      });
      setLastError(message);
    } finally {
      setIsExecuting(false);
      setTimeout(() => finishRun(), 250);
    }
  };

  const resetPage = () => {
    clearEvents();
    setLastResult(null);
    setLastError(null);
  };

  const renderExpectationStatus = (item: (typeof matchedExpectations)[number]) => {
    if (item.matchedEntry) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }
    if (item.expectation.optional) {
      return <Radio className="h-4 w-4 text-muted-foreground" />;
    }
    return isExecuting ? (
      <Activity className="h-4 w-4 animate-spin text-primary" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <PageLayout fixedHeight>
      <div className="flex min-h-full flex-col gap-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">事件测试</h1>
              <Badge variant="secondary" className="text-xs">
                {isRecording ? 'Recording' : 'Idle'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              按“触发 API → 捕获事件 → 匹配期望”的流程验证 SDK 事件链路。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetPage}>
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
            <Button size="sm" onClick={runScenario} disabled={isExecuting}>
              <Play className="h-4 w-4" />
              {isExecuting ? '执行中' : '执行测试'}
            </Button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 min-h-0 xl:grid-cols-[300px_minmax(0,1fr)_minmax(360px,0.9fr)]">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">测试场景</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SCENARIOS.map(scenario => {
                const active = !isCustomMode && selectedScenarioId === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setSelectedScenarioId(scenario.id);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{scenario.title}</span>
                      <Badge variant="outline" className="px-2 py-0 text-[10px]">
                        {scenario.method}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {scenario.description}
                    </p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isCustomMode
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  <span className="text-sm font-semibold">自定义 API</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  手动输入 method、params 和期望事件，适合临时覆盖新事件。
                </p>
              </button>
            </CardContent>
          </Card>

          <div className="flex min-h-0 flex-col gap-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">API 与参数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isCustomMode ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="event-test-method"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Method
                    </label>
                    <Input
                      id="event-test-method"
                      value={customMethod}
                      onChange={event => setCustomMethod(event.target.value)}
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label
                        htmlFor="event-test-inject-device"
                        className="flex items-center gap-2 rounded-lg border border-border/70 p-2 text-xs text-muted-foreground"
                      >
                        <Checkbox
                          id="event-test-inject-device"
                          checked={customInjectDevice}
                          onCheckedChange={checked => setCustomInjectDevice(Boolean(checked))}
                        />
                        自动注入当前设备
                      </label>
                      <label
                        htmlFor="event-test-inject-device-id"
                        className="flex items-center gap-2 rounded-lg border border-border/70 p-2 text-xs text-muted-foreground"
                      >
                        <Checkbox
                          id="event-test-inject-device-id"
                          checked={customInjectDeviceId}
                          disabled={!customInjectDevice}
                          onCheckedChange={checked => setCustomInjectDeviceId(Boolean(checked))}
                        />
                        注入 deviceId
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedScenario.method}</Badge>
                    <Badge variant={selectedScenario.requireDevice ? 'secondary' : 'info'}>
                      {selectedScenario.requireDevice ? '需要设备' : '无需设备'}
                    </Badge>
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="event-test-params"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Params JSON
                  </label>
                  <Textarea
                    id="event-test-params"
                    value={paramsText}
                    onChange={event => setParamsText(event.target.value)}
                    className="min-h-[150px] text-xs leading-5"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    连接设备场景会自动注入 connectId，标记需要 deviceId 的场景会额外注入 deviceId。
                  </p>
                </div>

                {isCustomMode ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="event-test-expectations"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Expected events
                    </label>
                    <Textarea
                      id="event-test-expectations"
                      value={customExpectationsText}
                      onChange={event => setCustomExpectationsText(event.target.value)}
                      className="min-h-[96px] text-xs leading-5"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      每行一个事件，支持 `UI_EVENT:ui-button` 或直接写 `ui-button`。
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>期望事件</span>
                  <Badge variant={summary.passed === summary.total ? 'success' : 'secondary'}>
                    {summary.passed}/{summary.total}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {matchedExpectations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    暂无期望事件。自定义模式下可在 Expected events 中添加。
                  </div>
                ) : (
                  matchedExpectations.map(item => (
                    <div
                      key={`${item.expectation.source ?? 'ANY'}-${item.expectation.type}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {renderExpectationStatus(item)}
                          <span className="truncate text-sm font-medium">
                            {item.expectation.label}
                          </span>
                          {item.expectation.optional ? (
                            <Badge variant="info" className="px-2 py-0 text-[10px]">
                              optional
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.expectation.source ?? 'ANY'}</span>
                          <span>{item.expectation.type}</span>
                        </div>
                      </div>
                      {item.matchedEntry ? (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(item.matchedEntry.timestamp)}
                        </span>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {(lastResult || lastError) && (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">API 结果</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                      {lastError}
                    </div>
                  ) : (
                    <div className="max-h-[260px] overflow-auto rounded-lg bg-muted/30 p-3">
                      <CollapsibleJsonViewer data={lastResult} maxDepth={2} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <Card className="flex min-h-[420px] flex-1 flex-col border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    实时事件流
                  </span>
                  <Badge variant="secondary">{entries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto">
                {entries.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    执行测试后，这里会显示捕获到的事件。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map(entry => (
                      <div key={entry.id} className="rounded-lg border border-border/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`px-2 py-0 text-[10px] ${getSourceBadgeClass(
                                  entry.source
                                )}`}
                              >
                                {entry.source}
                              </Badge>
                              <span className="break-all text-sm font-semibold">{entry.type}</span>
                            </div>
                            {activeRun ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                +{Math.max(0, entry.timestamp - activeRun.startedAt)}ms
                              </div>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        {entry.payload !== undefined ? (
                          <div className="mt-3 max-h-[260px] overflow-auto rounded-md bg-muted/30 p-2">
                            <CollapsibleJsonViewer data={entry.payload} maxDepth={1} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">事件目录</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {EVENT_CATALOG.map(group => (
                  <div key={group.group} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`px-2 py-0 text-[10px] ${getSourceBadgeClass(group.source)}`}
                      >
                        {group.source}
                      </Badge>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {group.group}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.events.map(event => (
                        <Badge key={`${group.source}-${event}`} variant="secondary" className="px-2 py-0">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
