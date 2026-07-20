import { Copy, FileJson, ShieldCheck } from 'lucide-react';

import type {
  MultisigCaseSource,
  MultisigChain,
  MultisigTestCase,
} from '../../features/multisig/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const SOURCE_LABELS: Record<MultisigCaseSource | 'all', string> = {
  all: '全部来源',
  'firmware-capability': 'Firmware',
  'existing-example': 'Example',
  regression: 'Regression',
  custom: 'Custom',
};

interface MultisigCaseLibraryProps {
  cases: MultisigTestCase[];
  selectedId: string;
  chain: MultisigChain;
  source: MultisigCaseSource | 'all';
  disabled?: boolean;
  onChainChange: (chain: MultisigChain) => void;
  onSourceChange: (source: MultisigCaseSource | 'all') => void;
  onSelect: (testCase: MultisigTestCase) => void;
}

export function MultisigCaseLibrary({
  cases,
  selectedId,
  chain,
  source,
  disabled,
  onChainChange,
  onSourceChange,
  onSelect,
}: MultisigCaseLibraryProps) {
  const visibleCases = cases.filter(
    item => item.chain === chain && (source === 'all' || item.source === source)
  );
  const builtInCases = visibleCases.filter(item => item.builtIn);
  const customCases = visibleCases.filter(item => !item.builtIn);

  const renderCase = (testCase: MultisigTestCase) => {
    const selected = testCase.id === selectedId;
    return (
      <button
        key={testCase.id}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(testCase)}
        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
          selected
            ? 'border-primary/60 bg-primary/10'
            : 'border-border/70 bg-background hover:border-primary/30 hover:bg-muted/40'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold leading-4 text-foreground">{testCase.title}</span>
          {testCase.builtIn ? (
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          ) : (
            <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
          {testCase.description}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge variant="outline" className="px-1.5 py-0 text-[9px]">
            {SOURCE_LABELS[testCase.source]}
          </Badge>
          <Badge variant="info" className="px-1.5 py-0 text-[9px]">
            {testCase.method}
          </Badge>
          {testCase.testMnemonicOnly ? (
            <Badge variant="warning" className="px-1.5 py-0 text-[9px]">
              Test mnemonic
            </Badge>
          ) : null}
          {testCase.localOnly ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
              Local only
            </Badge>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <aside className="flex max-h-[380px] min-h-0 flex-col border-b border-border bg-muted/20 lg:max-h-none lg:border-b-0 lg:border-r">
      <div className="space-y-2.5 border-b border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-xs font-semibold">测试用例</h2>
            <p className="text-[11px] text-muted-foreground">固件能力、历史示例与回归向量</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['eth', 'btc'] as MultisigChain[]).map(item => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={chain === item ? 'default' : 'outline'}
              disabled={disabled}
              onClick={() => onChainChange(item)}
              className="h-7 px-3 text-xs uppercase"
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SOURCE_LABELS) as Array<MultisigCaseSource | 'all'>).map(item => (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onSourceChange(item)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                source === item
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {SOURCE_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2.5 py-2.5">
        <section className="space-y-2">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            内置基准
          </div>
          {builtInCases.map(renderCase)}
        </section>
        {customCases.length > 0 ? (
          <section className="space-y-2">
            <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              我的用例
            </div>
            {customCases.map(renderCase)}
          </section>
        ) : null}
        {visibleCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
            当前筛选条件下没有用例。
          </div>
        ) : null}
      </div>
    </aside>
  );
}
