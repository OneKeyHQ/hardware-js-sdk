import { AlertTriangle, Circle, Clock3, Loader2, Play, ShieldAlert, Usb } from 'lucide-react';

import type {
  ExecutionSummaryItem,
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
    <section className="grid shrink-0 grid-cols-1 gap-px bg-border lg:h-[clamp(300px,32vh,360px)] xl:grid-cols-[minmax(380px,0.48fr)_minmax(0,0.52fr)]">
      <div className="flex min-h-0 flex-col overflow-hidden bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center gap-2">
              <Usb className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">设备交互</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {testCase.localOnly ? '该用例只运行本地参数校验。' : '执行前请确认设备屏幕内容与下方摘要一致。'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className={`border px-2.5 py-1 ${readiness.className}`}>
              {readiness.label}
            </Badge>
            <Button
              size="sm"
              disabled={actionDisabled}
              onClick={onExecute}
              className="h-9 px-4 text-sm disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? '等待确认…' : testCase.localOnly ? '本地校验' : '执行测试'}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {testCase.testMnemonicOnly ? (
            <Alert variant="warning" className="mb-4 py-2.5">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>测试助记词限定</AlertTitle>
              <AlertDescription>
                此 BTC fixture 对应固件默认测试助记词，仅用于测试设备或模拟器，不可广播交易。
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {summary.map(item => (
              <div key={item.label} className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                <div
                  className="mt-1 truncate font-mono text-sm font-medium text-foreground"
                  title={item.value}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border/70 pt-3">
            <div className="mb-2 text-xs font-medium text-foreground">设备核对项</div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {testCase.expectedDeviceChecks.map(item => (
                <li key={item} className="flex items-center gap-2">
                  <Circle className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">结果与错误</h2>
            <p className="text-xs text-muted-foreground">页面不会广播任何交易。</p>
          </div>
          {state.durationMs !== undefined ? (
            <Badge variant="info" className="gap-1">
              <Clock3 className="h-3 w-3" />
              {state.durationMs} ms
            </Badge>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 p-4">
          {state.status === 'idle' ? (
            <div className="flex h-full min-h-32 items-center justify-center rounded-md border border-dashed border-border/70 px-6 text-center text-sm text-muted-foreground">
              执行后将在这里显示地址、签名或已签交易。
            </div>
          ) : null}
          {state.status === 'running' ? (
            <div className="flex h-full min-h-32 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-6 text-center text-sm font-medium text-primary-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
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
            <pre className="h-full min-h-0 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border/70 bg-muted/30 p-4 font-mono text-xs leading-5">
              {JSON.stringify(state.result, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </section>
  );
}
