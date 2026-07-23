import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Code2,
  Info,
  Loader2,
  Play,
  ShieldAlert,
  Usb,
  XCircle,
} from 'lucide-react';

import type {
  ExecutionSummaryItem,
  MultisigHardwareVerification,
  MultisigTestCase,
  ValidationResult,
} from '../../features/multisig/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export type MultisigExecutionState = {
  status: 'idle' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  durationMs?: number;
  verification?: MultisigHardwareVerification;
};

interface MultisigExecutionPanelProps {
  testCase: MultisigTestCase;
  summary: ExecutionSummaryItem[];
  validation: ValidationResult;
  canExecute: boolean;
  state: MultisigExecutionState;
  onExecute: () => void;
}

export function MultisigExecutionPanel({
  testCase,
  summary,
  validation,
  canExecute,
  state,
  onExecute,
}: MultisigExecutionPanelProps) {
  const [rawResponseOpen, setRawResponseOpen] = useState(false);
  const running = state.status === 'running';
  const actionDisabled =
    running || (!testCase.localOnly && (!validation.valid || !canExecute));
  const readiness = running
    ? {
        label: '等待设备',
        className: 'border-primary/25 bg-primary/5 text-primary',
      }
    : testCase.localOnly
    ? {
        label: '本地校验',
        className: 'border-border bg-muted/40 text-muted-foreground',
      }
    : !validation.valid
    ? {
        label: '参数错误',
        className:
          'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
      }
    : !canExecute
    ? {
        label: '未连接',
        className: 'border-border bg-muted/40 text-muted-foreground',
      }
    : {
        label: '可执行',
        className: 'border-primary/25 bg-primary/5 text-primary',
      };

  return (
    <section className="flex min-h-[360px] flex-1 flex-col bg-background lg:min-h-[380px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-[240px] flex-1">
          <div className="flex items-center gap-2">
            <Usb className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-xs font-semibold">设备交互</h2>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            {testCase.localOnly ? '该用例只运行本地参数校验。' : '执行前请确认设备屏幕内容与核对摘要一致。'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="secondary"
            className={`border px-2 py-0.5 text-[11px] ${readiness.className}`}
          >
            {readiness.label}
          </Badge>
          <Button
            size="sm"
            disabled={actionDisabled}
            onClick={onExecute}
            className="h-9 px-4 text-xs disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? '等待确认…' : testCase.localOnly ? '本地校验' : '执行测试'}
          </Button>
        </div>
      </div>

      <div
        data-section="execution-summary"
        className="max-h-[180px] shrink-0 space-y-2 overflow-y-auto border-b border-border/70 bg-card/50 px-4 py-2.5"
      >
        {testCase.testMnemonicOnly ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-orange-300/70 bg-orange-50 px-2.5 py-1.5 text-[11px] text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">测试设备</span>
            <span className="font-mono">
              {testCase.hardwareExpectation?.signerEnvKey ?? '对应测试助记词'}
            </span>
            <span className="text-orange-700/80 dark:text-orange-200/70">仅用于测试，不可广播</span>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4 xl:grid-cols-6">
          {summary.map(item => (
            <div key={item.label} className="min-w-0">
              <div className="text-[10px] font-medium text-muted-foreground">{item.label}</div>
              <div
                className="mt-0.5 truncate font-mono text-[11px] text-foreground"
                title={item.value}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <details className="group text-[11px] text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-0.5 font-medium text-foreground/80 hover:text-foreground">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            展开设备核对项
          </summary>
          <div className="pt-1.5">
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
              {testCase.expectedDeviceChecks.map(item => (
                <li key={item} className="flex items-center gap-2">
                  <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      <div
        data-section="execution-result"
        className="flex min-h-0 min-w-0 flex-1 flex-col bg-background"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
          <div>
            <h2 className="text-xs font-semibold">结果与错误</h2>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              页面不会广播任何交易。
            </p>
          </div>
          {state.durationMs !== undefined ? (
            <Badge variant="info" className="gap-1">
              <Clock3 className="h-3 w-3" />
              {state.durationMs} ms
            </Badge>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 p-3">
          {state.status === 'idle' ? (
            <div className="flex h-full min-h-28 items-center justify-center rounded-md border border-dashed border-border/70 px-6 text-center text-xs text-muted-foreground">
              执行后将在这里显示地址、签名或已签交易。
            </div>
          ) : null}
          {state.status === 'running' ? (
            <div className="flex h-full min-h-28 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-6 text-center text-xs font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              请在设备上核对并确认，可能需要先解锁设备。
            </div>
          ) : null}
          {state.status === 'error' ? (
            <div className="h-full overflow-y-auto">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>执行失败</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            </div>
          ) : null}
          {state.status === 'success' ? (
            <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
              {state.verification?.status === 'passed' ? (
                <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-green-800 dark:border-green-900 dark:bg-green-950/35 dark:text-green-200">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    硬件校验通过
                  </div>
                  <div className="mt-1 text-[11px]">
                    {state.verification.checks.map(item => item.label).join('、')}均与离线 fixture 一致。
                  </div>
                </div>
              ) : null}
              {state.verification?.status === 'failed' ? (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <XCircle className="h-4 w-4" />
                    硬件校验失败
                  </div>
                  <div className="mt-1 text-[11px]">{state.verification.message}</div>
                </div>
              ) : null}
              {state.verification?.status === 'unavailable' || !state.verification ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-muted-foreground">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Info className="h-4 w-4" />
                    未自动校验
                  </div>
                  <div className="mt-1 text-[11px]">
                    {state.verification?.message ?? '当前执行结果没有配置离线期望值。'}
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-expanded={rawResponseOpen}
                onClick={() => setRawResponseOpen(value => !value)}
                className="h-7 w-fit gap-1.5 px-2 text-[11px] text-muted-foreground"
              >
                <Code2 className="h-3.5 w-3.5" />
                {rawResponseOpen ? '收起原始响应' : '查看原始响应'}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${rawResponseOpen ? 'rotate-180' : ''}`}
                />
              </Button>
              {rawResponseOpen ? (
                <pre className="min-h-28 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border/70 bg-muted/30 p-3 font-mono text-xs leading-5">
                  {JSON.stringify(state.result, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
