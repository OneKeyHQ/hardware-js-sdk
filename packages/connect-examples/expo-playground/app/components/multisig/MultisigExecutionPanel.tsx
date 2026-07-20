import { AlertTriangle, CheckCircle2, Clock3, Play, ShieldAlert, Usb } from 'lucide-react';

import type {
  ExecutionSummaryItem,
  MultisigTestCase,
  ValidationResult,
} from '../../features/multisig/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { DeviceNotConnectedState } from '../common/DeviceNotConnectedState';
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

  return (
    <section className="grid shrink-0 grid-cols-1 gap-px bg-border lg:h-[270px] xl:grid-cols-[minmax(360px,0.46fr)_minmax(0,0.54fr)]">
      <div className="min-h-0 space-y-3 overflow-y-auto bg-muted/20 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Usb className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">设备交互</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {testCase.localOnly ? '该用例只运行本地参数校验。' : '执行前请确认设备屏幕内容与下方摘要一致。'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={canExecute || testCase.localOnly ? 'success' : 'secondary'}>
              {testCase.localOnly ? 'Local' : canExecute ? '已连接' : '未连接'}
            </Badge>
            <Button size="sm" disabled={actionDisabled} onClick={onExecute}>
              <Play className="h-4 w-4" />
              {running ? '等待确认…' : testCase.localOnly ? '本地校验' : '执行测试'}
            </Button>
          </div>
        </div>

        {!canExecute && !testCase.localOnly ? (
          <DeviceNotConnectedState className="border-border bg-background shadow-none" />
        ) : null}

        {testCase.testMnemonicOnly ? (
          <Alert variant="warning" className="py-2.5">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>测试助记词限定</AlertTitle>
            <AlertDescription>
              此 BTC fixture 对应固件默认测试助记词，仅用于测试设备或模拟器，不可广播交易。
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 2xl:grid-cols-4">
          {summary.map(item => (
            <div key={item.label} className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </div>
              <div className="truncate font-mono text-xs text-foreground" title={item.value}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {testCase.expectedDeviceChecks.map(item => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {item}
            </li>
          ))}
        </ul>

      </div>

      <div className="min-h-0 min-w-0 overflow-y-auto bg-background px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
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

        {state.status === 'idle' ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            执行后将在这里显示地址、签名或已签交易。
          </div>
        ) : null}
        {state.status === 'running' ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-primary/30 bg-primary/5 text-sm">
            请在设备上核对并确认，可能需要先解锁设备。
          </div>
        ) : null}
        {state.status === 'error' ? (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>执行失败</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {state.status === 'success' ? (
          <pre className="max-h-44 overflow-auto rounded-xl border border-border bg-muted/30 p-3 font-mono text-xs leading-5">
            {JSON.stringify(state.result, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
