import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Clock, Play, RotateCcw, Terminal } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useMethodParameters } from '../../hooks/useMethodParameters';
import { useMethodExecution } from '../../hooks/useMethodExecution';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { useFirmwareProgress } from '../providers/SDKProvider';
import { useDeviceStore } from '../../store/deviceStore';
import { useHardwareStore } from '../../store/hardwareStore';
import { separateParameters } from '../../utils/parameterUtils';
import type { UnifiedMethodConfig } from '~/data/types';
import type { CommonParametersState } from '../../store/hardwareStore';
// 导入子组件
import ParameterInput from './ParameterInput';
import DeviceInteractionArea from './DeviceInteractionArea';
import ExecutionPanel from './ExecutionPanel';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import type { UnifiedLogEntry } from './UnifiedLogger';

interface MethodExecutorProps {
  methodConfig: UnifiedMethodConfig;
  executionHandler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
  type?: 'standard' | 'firmware';
  devicePanelTitle?: string | null;
  layout?: 'default' | 'debug-first';
  debugPanel?: React.ReactNode;
}

interface FirmwareVersionInfo {
  bootloaderVersion?: string;
  firmwareVersion?: string;
  bleVersion?: string;
}

type DebugLogRecord = Record<string, unknown>;

function getLogRecord(log: UnifiedLogEntry): DebugLogRecord {
  const data = log.data || log.content;
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as DebugLogRecord)
    : {};
}

function getLogTimestamp(log: UnifiedLogEntry): Date {
  return typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
}

function formatLogTime(log: UnifiedLogEntry): string {
  return getLogTimestamp(log).toLocaleTimeString();
}

function formatBytes(value: unknown): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '-';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatRate(bytes: number, ms: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0 || !Number.isFinite(ms) || ms <= 0) return '-';
  return `${formatBytes((bytes / ms) * 1000)}/s`;
}

const LOG_HEX_PREVIEW_BYTES = 24;
const LOG_HEX_PREVIEW_CHARS = LOG_HEX_PREVIEW_BYTES * 2;
const COMPACT_HEX_RE = /\b[0-9a-fA-F]{64,}\b/g;
const SPACED_HEX_RE = /(?:\b[0-9a-fA-F]{2}\b(?:\s+|$)){25,}/g;

function truncateCompactHex(value: string): string {
  return value.replace(COMPACT_HEX_RE, match => {
    const totalBytes = Math.floor(match.length / 2);
    return `${match.slice(0, LOG_HEX_PREVIEW_CHARS)}...(${totalBytes} bytes)`;
  });
}

function truncateSpacedHex(value: string): string {
  return value.replace(SPACED_HEX_RE, match => {
    const bytes = match.trim().split(/\s+/);
    return `${bytes.slice(0, LOG_HEX_PREVIEW_BYTES).join(' ')}...(${bytes.length} bytes)`;
  });
}

function formatRawLogValue(value: unknown): string {
  return truncateSpacedHex(truncateCompactHex(formatInlineValue(value, 2)));
}

function formatRawLogText(value: string): string {
  return truncateSpacedHex(truncateCompactHex(value));
}

function getLogTimeMs(log: UnifiedLogEntry): number {
  return getLogTimestamp(log).getTime();
}

function getByteSize(value: unknown): number | undefined {
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value.size;
  if (typeof value === 'string') return new TextEncoder().encode(value).byteLength;
  return undefined;
}

function getNumberField(source: unknown, field: string): number | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const value = (source as Record<string, unknown>)[field];
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function getUploadBytesFromResult(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const record = result as Record<string, unknown>;
  const data = record.data && typeof record.data === 'object' ? record.data : record;
  return getNumberField(data, 'total_size') ?? getNumberField(data, 'processed_byte');
}

function isUploadMethod(method: string): boolean {
  return method === 'fileWrite' || method === 'filesystemFileWrite';
}

function getUploadBytesFromRequestParameters(params: Record<string, unknown>): number | undefined {
  return (
    getByteSize(params.data) ??
    getNumberField(params, 'data_size') ??
    getNumberField(params, 'totalSize') ??
    getNumberField(params, 'total_size')
  );
}

function summarizeLogValue(value: unknown, depth = 0, maxDepth = 5): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === undefined || value === null || typeof value !== 'object') return value;

  if (value instanceof ArrayBuffer) return `<${formatBytes(value.byteLength)}>`;
  if (ArrayBuffer.isView(value)) return `<${formatBytes(value.byteLength)}>`;
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const fileName = 'name' in value && typeof value.name === 'string' ? value.name : 'Blob';
    return `${fileName} (${formatBytes(value.size)})`;
  }
  if (Array.isArray(value)) {
    return depth >= maxDepth
      ? `[${value.length} items]`
      : value.map(item => summarizeLogValue(item, depth + 1, maxDepth));
  }
  if (value instanceof Date) return value.toISOString();
  if (depth >= maxDepth) return '[Object]';

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      summarizeLogValue(item, depth + 1, maxDepth),
    ])
  );
}

function formatInlineValue(value: unknown, maxDepth = 3): string {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const summary = summarizeLogValue(value, 0, maxDepth);
      return typeof summary === 'string' ? summary : JSON.stringify(summary);
    }
    return JSON.stringify(summarizeLogValue(value, 0, maxDepth));
  } catch {
    return String(value);
  }
}

function formatBlockValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    const summary = summarizeLogValue(value, 0, 8);
    return typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2);
  } catch {
    return formatInlineValue(value, 5);
  }
}

function getMethodFromLog(log: UnifiedLogEntry, record: DebugLogRecord): string {
  if (typeof record.method === 'string') return record.method;

  const title = log.title || log.message || '';
  const match = title.match(/(?:method:|successful:|failed:|exception:)\s*([A-Za-z0-9_]+)/);
  return match?.[1] || title || 'Command';
}

type CommandStatusEntry = {
  id: string;
  method: string;
  params: Array<{ key: string; value: unknown; tone?: 'success' | 'error' | 'accent' }>;
  result?: { value: unknown; tone: 'success' | 'error' | 'accent' };
  startedAt: number;
  time: string;
  uploadBytes?: number;
};

function buildCommandStatusEntries(logs: UnifiedLogEntry[]) {
  const entries: CommandStatusEntry[] = [];

  logs.forEach(log => {
    const title = log.title || log.message || '';
    const record = getLogRecord(log);
    const method = getMethodFromLog(log, record);

    if (title.includes('Pro2 demo protocol trace')) {
      const requestRecord =
        record.request_parameters &&
        typeof record.request_parameters === 'object' &&
        !Array.isArray(record.request_parameters)
          ? (record.request_parameters as Record<string, unknown>)
          : undefined;
      const requestParameters =
        requestRecord !== undefined
          ? Object.entries(requestRecord)
              .filter(([key]) => !(isUploadMethod(method) && key === 'data'))
              .map(([key, value]) => ({ key, value }))
          : [];
      const uploadBytes =
        isUploadMethod(method) && requestRecord
          ? getUploadBytesFromRequestParameters(requestRecord)
          : undefined;

      entries.push({
        id: log.id,
        method,
        params: [
          ...requestParameters,
          { key: 'TX msg_type', value: record.tx_msg_type, tone: 'accent' },
          { key: 'TX payload', value: record.tx_payload },
        ],
        result: { value: 'Sending...', tone: 'accent' },
        startedAt: getLogTimeMs(log),
        time: formatLogTime(log),
        uploadBytes,
      });
      return;
    }

    if (title.includes('Pro2 decoded response')) {
      const target = [...entries]
        .reverse()
        .find(entry => entry.method === method && entry.result?.value === 'Sending...');
      const resultValue =
        record.decoded_result !== undefined
          ? record.decoded_result
          : record.decoded ?? 'Decoded response';
      const finishedAt = getLogTimeMs(log);

      if (target) {
        target.params.push(
          { key: 'RX msg_type', value: record.rx_msg_type, tone: 'success' },
          { key: 'RX payload', value: record.rx_payload, tone: 'success' }
        );
        if (isUploadMethod(method)) {
          const uploadBytes = target.uploadBytes ?? getUploadBytesFromResult(resultValue);
          const durationMs = finishedAt - target.startedAt;
          target.params.push(
            { key: 'Duration', value: formatDuration(durationMs), tone: 'success' },
            { key: 'Uploaded', value: formatBytes(uploadBytes), tone: 'success' },
            {
              key: 'Rate',
              value: uploadBytes ? formatRate(uploadBytes, durationMs) : '-',
              tone: 'success',
            }
          );
        }
        target.result = { value: resultValue, tone: 'success' };
        target.time = formatLogTime(log);
        return;
      }

      entries.push({
        id: log.id,
        method,
        params: [
          { key: 'RX msg_type', value: record.rx_msg_type, tone: 'success' },
          { key: 'RX payload', value: record.rx_payload, tone: 'success' },
        ],
        result: { value: resultValue, tone: 'success' },
        startedAt: finishedAt,
        time: formatLogTime(log),
      });
      return;
    }

    if (
      title.includes('Hardware API call failed') ||
      title.includes('Hardware API call exception') ||
      log.type === 'error'
    ) {
      entries.push({
        id: log.id,
        method,
        params: [{ key: 'error', value: record.error || record.originalError || title }],
        result: { value: formatInlineValue(record.error || title), tone: 'error' },
        startedAt: getLogTimeMs(log),
        time: formatLogTime(log),
      });
      return;
    }

    // 成功态由 Pro2 decoded response 合并到同一条命令状态里，避免状态区重复刷屏。
  });

  return entries.reverse().slice(0, 20);
}

function buildRawLogLines(logs: UnifiedLogEntry[]) {
  return [...logs].reverse().flatMap(log => {
    const title = log.title || log.message || '';
    const record = getLogRecord(log);
    const time = formatLogTime(log);

    if (title.includes('Pro2 demo protocol trace')) {
      return [
        {
          id: `${log.id}-tx`,
          tone: 'tx' as const,
          text: `[${time}] TX msg_type: ${record.tx_msg_type}`,
        },
        {
          id: `${log.id}-tx-payload`,
          tone: 'tx' as const,
          text: `[${time}] TX payload: ${formatRawLogValue(record.tx_payload)}`,
        },
      ];
    }

    if (title.includes('Pro2 decoded response')) {
      return [
        {
          id: `${log.id}-rx`,
          tone: 'rx' as const,
          text: `[${time}] RX msg_type: ${record.rx_msg_type}`,
        },
        {
          id: `${log.id}-rx-payload`,
          tone: 'rx' as const,
          text: `[${time}] RX payload: ${formatRawLogValue(record.rx_payload)}`,
        },
        {
          id: `${log.id}-decoded`,
          tone: 'success' as const,
          text: `[${time}] Decoded:\n${formatRawLogText(
            formatBlockValue(record.decoded_result ?? record.decoded)
          )}`,
        },
      ];
    }

    if (title.includes('SDK debug log') && typeof record.message === 'string') {
      return [
        {
          id: log.id,
          tone: 'info' as const,
          text: `[${time}] ${formatRawLogText(record.message)}`,
        },
      ];
    }

    const tone = log.type === 'error' ? 'error' : log.type === 'response' ? 'success' : 'info';
    return [{ id: log.id, tone, text: `[${time}] ${title}` }];
  });
}

function toneClassName(tone?: 'success' | 'error' | 'accent' | 'tx' | 'rx' | 'info') {
  switch (tone) {
    case 'success':
      return 'text-emerald-400';
    case 'error':
      return 'text-red-400';
    case 'accent':
    case 'tx':
      return 'text-cyan-300';
    case 'rx':
      return 'text-sky-400';
    case 'info':
    default:
      return 'text-amber-300';
  }
}

function Pro2DemoConsole({
  logs,
  onClearLogs,
}: {
  logs: UnifiedLogEntry[];
  onClearLogs: () => void;
}) {
  const commandEntries = buildCommandStatusEntries(logs);
  const rawLines = buildRawLogLines(logs);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Command Status</h3>
          </div>
          <div className="h-[420px] xl:h-[520px] overflow-y-auto rounded-lg bg-[#171717] p-3 font-mono text-[11px] leading-relaxed">
            {commandEntries.length === 0 ? (
              <div className="text-neutral-500">No command status yet.</div>
            ) : (
              <div className="space-y-3">
                {commandEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="border-b border-[#3a3a3a] pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="mb-1.5 text-sm font-semibold text-neutral-300">
                      {entry.method}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {entry.params.map(param => (
                        <span key={param.key} className="inline-flex min-w-0 gap-1">
                          <span className="text-neutral-500">{param.key}:</span>
                          <span className={`${toneClassName(param.tone)} break-all`}>
                            {formatInlineValue(param.value)}
                          </span>
                        </span>
                      ))}
                    </div>
                    {entry.result ? (
                      <div className="mt-2">
                        <span className="text-neutral-500">Result:</span>
                        <pre
                          className={`${toneClassName(
                            entry.result.tone
                          )} mt-1 max-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/20 p-2`}
                        >
                          {formatBlockValue(entry.result.value)}
                        </pre>
                      </div>
                    ) : null}
                    <div className="mt-2 text-[11px] text-neutral-600">{entry.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <Terminal className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Log</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="h-8 px-3 text-xs"
            >
              Clear Log
            </Button>
          </div>
          <div className="h-[420px] xl:h-[520px] overflow-y-auto rounded-lg bg-[#171717] p-3 font-mono text-[11px] leading-relaxed">
            {rawLines.length === 0 ? (
              <div className="text-neutral-500">No logs yet.</div>
            ) : (
              <div className="space-y-1">
                {rawLines.map(line => (
                  <div
                    key={line.id}
                    className={`${toneClassName(line.tone)} whitespace-pre-wrap break-all`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getFirmwareVersionsFromResult(result: unknown): FirmwareVersionInfo | null {
  if (!result || typeof result !== 'object') return null;
  const data = (result as { firmwareVersions?: unknown }).firmwareVersions;
  if (!data || typeof data !== 'object') return null;

  const versions = data as Record<string, unknown>;
  const firmwareVersions = {
    bootloaderVersion:
      typeof versions.bootloaderVersion === 'string' ? versions.bootloaderVersion : undefined,
    firmwareVersion:
      typeof versions.firmwareVersion === 'string' ? versions.firmwareVersion : undefined,
    bleVersion: typeof versions.bleVersion === 'string' ? versions.bleVersion : undefined,
  };

  return firmwareVersions.bootloaderVersion ||
    firmwareVersions.firmwareVersion ||
    firmwareVersions.bleVersion
    ? firmwareVersions
    : null;
}

const MethodExecutor: React.FC<MethodExecutorProps> = ({
  methodConfig,
  executionHandler,
  onResult,
  onError,
  className = '',
  type = 'standard',
  devicePanelTitle,
  layout = 'default',
  debugPanel,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { deviceAction: globalDeviceAction, logs: globalLogs } = useDeviceStore();

  // 使用 hardwareStore 获取完整的执行参数（包含通用参数）
  const {
    executionParameters: storeExecutionParameters,
    getExecutionParameters,
    setMethodParameters,
  } = useHardwareStore();

  // 方法级别的执行日志状态
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const [firmwareVersions, setFirmwareVersions] = useState<FirmwareVersionInfo | null>(null);

  // 使用新的 Hooks
  const { currentDevice, deviceModel, deviceTheme, isConnected } = useDeviceInfo();
  const { progressData, reset: resetFirmwareProgress } = useFirmwareProgress();

  // 参数管理
  const {
    selectedPreset,
    parameters: methodParams,
    setParameter,
    selectPreset,
    reset: resetParameters,
  } = useMethodParameters({ methodConfig });

  // 同步 useMethodParameters 的参数到 hardwareStore
  useEffect(() => {
    if (Object.keys(methodParams).length > 0) {
      setMethodParameters(methodParams);
    }
  }, [methodParams, setMethodParameters]);

  // 处理预设选择
  const handlePresetChange = useCallback(
    (presetTitle: string) => {
      selectPreset(presetTitle);
      // 预设选择后，参数会通过上面的 useEffect 自动同步到 hardwareStore
    },
    [selectPreset]
  );

  const handleExecutionResult = useCallback(
    (result: unknown) => {
      if (type === 'firmware') {
        setFirmwareVersions(getFirmwareVersionsFromResult(result));
      }
      onResult?.(result);
    },
    [onResult, type]
  );

  // 执行状态管理
  const {
    status,
    isCancelling,
    deviceAction,
    execute,
    cancel,
    reset: resetExecution,
    setDeviceAction,
  } = useMethodExecution({
    type,
    onResult: handleExecutionResult,
    onError,
  });

  // 计算当前方法的执行日志（只显示本次执行的日志）
  const currentExecutionLogs = useMemo(() => {
    if (!executionStartTime) {
      return [];
    }

    // 只返回执行开始时间之后的日志
    return globalLogs.filter(log => {
      const logTime =
        typeof log.timestamp === 'string'
          ? new Date(log.timestamp).getTime()
          : log.timestamp.getTime();
      return logTime >= executionStartTime;
    });
  }, [globalLogs, executionStartTime]);

  // 监听全局设备动作状态
  useEffect(() => {
    if (globalDeviceAction.isActive && globalDeviceAction.actionType) {
      setDeviceAction({
        actionType: globalDeviceAction.actionType,
        deviceInfo: globalDeviceAction.deviceInfo,
      });
    }
  }, [globalDeviceAction, setDeviceAction]);

  // 执行方法
  const handleExecute = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: t('components.methodExecutor.deviceNotConnected'),
        description: t('components.methodExecutor.connectDeviceFirst'),
        variant: 'destructive',
      });
      return;
    }

    // 记录执行开始时间，用于过滤当前执行的日志
    setExecutionStartTime(Date.now());
    if (type === 'firmware') {
      setFirmwareVersions(null);
    }

    // 使用 hardwareStore 的完整执行参数（包含通用参数）
    const finalExecutionParams = getExecutionParameters();
    await execute(finalExecutionParams, executionHandler);
  }, [isConnected, execute, getExecutionParameters, executionHandler, toast, t, type]);

  // 取消操作
  const handleCancel = useCallback(async () => {
    await cancel(currentDevice?.connectId);
  }, [cancel, currentDevice?.connectId]);

  // 重置状态
  const handleReset = useCallback(async () => {
    if (status === 'loading' || status === 'device-interaction') {
      await handleCancel();
    }
    resetExecution();
    resetParameters();
    // 重置执行开始时间，清空执行日志显示
    setExecutionStartTime(null);

    // 如果是固件更新，重置固件进度状态
    if (type === 'firmware') {
      resetFirmwareProgress();
      setFirmwareVersions(null);
    }
  }, [status, handleCancel, resetExecution, resetParameters, type, resetFirmwareProgress]);

  // 清空当前执行日志（只影响显示，不影响全局日志）
  const handleClearExecutionLogs = useCallback(() => {
    setExecutionStartTime(Date.now());
  }, []);

  // 处理参数变化
  const handleParamChange = useCallback(
    (paramName: string, value: unknown) => {
      // 同时更新 useMethodParameters 和 hardwareStore
      setParameter(paramName, value); // 这会更新 useMethodParameters 的本地状态

      // 直接从 store 获取 setCommonParameter 和 setMethodParameter
      const { setCommonParameter, setMethodParameter } = useHardwareStore.getState();

      const commonParamNames = ['useEmptyPassphrase', 'passphraseState', 'deriveCardano']; // 定义通用参数名

      if (commonParamNames.includes(paramName)) {
        setCommonParameter(paramName as keyof CommonParametersState, value); // 更新通用参数
      } else {
        setMethodParameter(paramName, value); // 更新方法参数
      }
    },
    [setParameter] // 依赖项只需 setParameter，因为 setCommonParameter/setMethodParameter 是从 getState() 获取的
  );

  // 处理参数编辑请求
  const handleRequestParamsEdit = useCallback(
    (data: Record<string, unknown>) => {
      // 使用统一的参数处理工具分离和处理参数
      const { methodParams, commonParams } = separateParameters(data);

      // 同步方法参数到 useMethodParameters
      Object.entries(methodParams).forEach(([key, value]) => {
        setParameter(key, value);
      });

      // 批量更新到 hardwareStore
      if (Object.keys(methodParams).length > 0) {
        setMethodParameters(methodParams);
      }

      // 如果有通用参数，需要单独处理
      if (Object.keys(commonParams).length > 0) {
        // 这里需要调用 hardwareStore 的 setCommonParameters
        const { setCommonParameters } = useHardwareStore.getState();
        setCommonParameters(commonParams);
      }
    },
    [setParameter, setMethodParameters]
  );

  const isExecutionDisabled = status === 'loading' || status === 'device-interaction';

  const renderDeviceArea = (compact = false) => (
    <DeviceInteractionArea
      status={status}
      deviceAction={deviceAction}
      deviceModel={deviceModel}
      deviceTheme={deviceTheme}
      onExecute={handleExecute}
      onReset={handleReset}
      isCancelling={isCancelling}
      firmwareProgress={type === 'firmware' ? progressData : undefined}
      firmwareVersions={type === 'firmware' ? firmwareVersions : undefined}
      currentDevice={currentDevice}
      title={devicePanelTitle}
      compact={compact}
    />
  );

  const renderExecutionPanel = ({
    showRequestParameters = true,
    showLogs = true,
    defaultParamsCollapsed = false,
    compactLogs = false,
    className: panelClassName = 'h-full',
  }: {
    showRequestParameters?: boolean;
    showLogs?: boolean;
    defaultParamsCollapsed?: boolean;
    compactLogs?: boolean;
    className?: string;
  } = {}) => (
    <ExecutionPanel
      requestData={storeExecutionParameters}
      onSaveRequest={handleRequestParamsEdit}
      logs={currentExecutionLogs}
      onClearLogs={handleClearExecutionLogs}
      disabled={isExecutionDisabled}
      className={panelClassName}
      showRequestParameters={showRequestParameters}
      showLogs={showLogs}
      defaultParamsCollapsed={defaultParamsCollapsed}
      compactLogs={compactLogs}
    />
  );

  const getDebugStatusText = () => {
    switch (status) {
      case 'loading':
        return t('components.methodExecutor.executing');
      case 'device-interaction':
        return t('deviceOperations.deviceInstructions');
      case 'success':
        return t('components.methodExecutor.executionSuccess');
      case 'error':
        return t('components.methodExecutor.executionFailed');
      default:
        return t('components.methodExecutor.waitingExecution');
    }
  };

  if (layout === 'debug-first') {
    return (
      <div className={`flex flex-col gap-3 min-h-0 ${className}`}>
        <Card className="flex-shrink-0 rounded-xl border border-border/60 bg-card shadow-sm">
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground">Current command</span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {methodConfig.method}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[11px]">
                    {getDebugStatusText()}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {currentDevice ? currentDevice.connectId : 'No device'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 lg:justify-end">
                <Button
                  onClick={handleExecute}
                  disabled={!isConnected || isExecutionDisabled}
                  className="h-9 px-4"
                >
                  {isExecutionDisabled ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>{t('components.methodExecutor.executing2')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>{t('common.execute')}</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={status === 'idle' || status === 'error' || isCancelling}
                  className="h-9 px-4"
                >
                  {isCancelling ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>{t('components.methodExecutor.cancelling')}</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      <span>{t('common.cancel')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <ParameterInput
              methodConfig={methodConfig}
              selectedPreset={selectedPreset}
              onPresetChange={handlePresetChange}
              onParamChange={handleParamChange}
              embedded
            />
          </CardContent>
        </Card>

        {debugPanel ? <div className="flex-shrink-0">{debugPanel}</div> : null}

        <Pro2DemoConsole logs={currentExecutionLogs} onClearLogs={handleClearExecutionLogs} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 参数输入区域 - 紧凑布局 */}
      <div className="flex-shrink-0 mb-2">
        <ParameterInput
          methodConfig={methodConfig}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          onParamChange={handleParamChange}
        />
      </div>

      {/* 主要内容区域 - 紧凑高度 */}
      <div className="w-full min-h-[380px] h-full">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-full">
          {/* 左侧：设备交互动效 */}
          <div className="lg:col-span-2 flex flex-col h-full min-h-0">
            {renderDeviceArea()}
          </div>

          {/* 右侧：执行面板 */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-0">
            {renderExecutionPanel()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodExecutor;
