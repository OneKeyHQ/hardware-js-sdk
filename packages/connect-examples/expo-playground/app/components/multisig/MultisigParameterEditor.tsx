import { useEffect, useMemo, useState } from 'react';
import { Braces, Copy, RefreshCcw, Save, Trash2 } from 'lucide-react';

import type { MultisigTestCase, ValidationIssue } from '../../features/multisig/types';
import { Alert, AlertDescription } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Textarea } from '../ui/Textarea';

type FieldPath = Array<string | number>;

type QuickField = {
  label: string;
  path: FieldPath;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  wide?: boolean;
};

function getByPath(source: Record<string, unknown>, path: FieldPath): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string | number, unknown>)[segment];
  }, source);
}

function getQuickFields(testCase: MultisigTestCase): QuickField[] {
  if (testCase.method === 'evmSignTypedData') {
    return [
      { label: '派生路径', path: ['path'] },
      { label: 'Chain ID', path: ['data', 'domain', 'chainId'] },
      { label: 'Safe 地址', path: ['data', 'domain', 'verifyingContract'], wide: true },
      { label: '目标地址', path: ['data', 'message', 'to'], wide: true },
      { label: 'Value', path: ['data', 'message', 'value'] },
      { label: 'Nonce', path: ['data', 'message', 'nonce'] },
      { label: 'Operation', path: ['data', 'message', 'operation'], type: 'select', options: ['0', '1'] },
      { label: 'Safe Tx Gas', path: ['data', 'message', 'safeTxGas'] },
    ];
  }

  if (testCase.method === 'evmSignTransaction') {
    return [
      { label: '派生路径', path: ['path'] },
      { label: 'Chain ID', path: ['transaction', 'chainId'], type: 'number' },
      { label: 'Safe 合约', path: ['transaction', 'to'], wide: true },
      { label: 'Value', path: ['transaction', 'value'] },
      { label: 'Nonce', path: ['transaction', 'nonce'] },
      { label: 'Gas Limit', path: ['transaction', 'gasLimit'] },
      { label: 'Gas Price', path: ['transaction', 'gasPrice'] },
      { label: 'Calldata', path: ['transaction', 'data'], type: 'textarea', wide: true },
    ];
  }

  if (testCase.method === 'btcGetAddress') {
    return [
      { label: '派生路径', path: ['path'], wide: true },
      { label: 'Coin', path: ['coin'] },
      {
        label: '脚本类型',
        path: ['scriptType'],
        type: 'select',
        options: ['SPENDMULTISIG', 'SPENDP2SHWITNESS', 'SPENDWITNESS'],
      },
      { label: '阈值 m', path: ['multisig', 'm'], type: 'number' },
    ];
  }

  return [
    { label: '签名路径', path: ['inputs', 0, 'address_n'], wide: true },
    { label: 'Coin', path: ['coin'] },
    {
      label: '脚本类型',
      path: ['inputs', 0, 'script_type'],
      type: 'select',
      options: ['SPENDMULTISIG', 'SPENDP2SHWITNESS', 'SPENDWITNESS'],
    },
    { label: '阈值 m', path: ['inputs', 0, 'multisig', 'm'], type: 'number' },
    { label: '输入金额', path: ['inputs', 0, 'amount'] },
    { label: '输出地址', path: ['outputs', 0, 'address'], wide: true },
    { label: '输出金额', path: ['outputs', 0, 'amount'] },
  ];
}

interface MultisigParameterEditorProps {
  testCase: MultisigTestCase;
  title: string;
  parameters: Record<string, unknown>;
  validationIssues: ValidationIssue[];
  disabled?: boolean;
  dirty?: boolean;
  onTitleChange: (title: string) => void;
  onParameterChange: (path: FieldPath, value: unknown) => void;
  onApplyJson: (draft: string) => ValidationIssue[];
  onSaveCopy: () => void;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
}

export function MultisigParameterEditor({
  testCase,
  title,
  parameters,
  validationIssues,
  disabled,
  dirty,
  onTitleChange,
  onParameterChange,
  onApplyJson,
  onSaveCopy,
  onSave,
  onReset,
  onDelete,
}: MultisigParameterEditorProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(parameters, null, 2));
  const [jsonIssues, setJsonIssues] = useState<ValidationIssue[]>([]);
  const quickFields = useMemo(() => getQuickFields(testCase), [testCase]);

  useEffect(() => {
    setJsonDraft(JSON.stringify(parameters, null, 2));
    setJsonIssues([]);
  }, [parameters, testCase.id]);

  const renderField = (field: QuickField) => {
    const value = getByPath(parameters, field.path);
    const id = `${testCase.id}-${field.path.join('-')}`;
    const className = field.wide ? 'md:col-span-2' : '';
    const handleValue = (next: string) => {
      onParameterChange(field.path, field.type === 'number' ? Number(next) : next);
    };

    return (
      <div key={id} className={className}>
        <Label htmlFor={id} className="mb-1 block text-[11px] text-muted-foreground">
          {field.label}
        </Label>
        {field.type === 'select' ? (
          <Select value={String(value ?? '')} disabled={disabled} onValueChange={handleValue}>
          <SelectTrigger id={id} className="h-8 px-2.5 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option} className="text-xs">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'textarea' ? (
          <Textarea
            id={id}
            value={String(value ?? '')}
            disabled={disabled}
            onChange={event => handleValue(event.target.value)}
            className="min-h-20 px-2.5 py-2 font-mono text-xs"
          />
        ) : (
          <Input
            id={id}
            type={field.type === 'number' ? 'number' : 'text'}
            value={String(value ?? '')}
            disabled={disabled}
            onChange={event => handleValue(event.target.value)}
            className="h-8 px-2.5 font-mono text-xs"
          />
        )}
      </div>
    );
  };

  return (
    <section className="flex min-h-0 flex-col border-b border-border bg-background lg:max-h-[46vh] lg:flex-none">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          {testCase.builtIn ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold">{testCase.title}</h1>
                <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
                  只读基准
                </Badge>
                {dirty ? (
                  <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
                    已修改
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{testCase.description}</p>
            </>
          ) : (
            <div className="max-w-xl">
              <Label htmlFor="multisig-case-title" className="mb-1.5 block text-xs text-muted-foreground">
                自定义用例名称
              </Label>
              <Input
                id="multisig-case-title"
                value={title}
                disabled={disabled}
                onChange={event => onTitleChange(event.target.value)}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={disabled || !dirty} onClick={onReset}>
            <RefreshCcw className="h-4 w-4" />
            恢复
          </Button>
          {testCase.builtIn ? (
            <Button size="sm" variant="outline" disabled={disabled} onClick={onSaveCopy}>
              <Copy className="h-4 w-4" />
              保存副本
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled={disabled} onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
              <Button size="sm" disabled={disabled || !title.trim()} onClick={onSave}>
                <Save className="h-4 w-4" />
                保存
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-auto space-y-3 overflow-visible px-4 py-3 lg:overflow-y-auto">
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold">快捷字段</h2>
              <p className="text-[11px] text-muted-foreground">
                常用字段会同步到完整 SDK 请求参数。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={advancedOpen ? 'secondary' : 'ghost'}
              onClick={() => setAdvancedOpen(value => !value)}
              className="h-7 px-3 text-[11px]"
            >
              <Braces className="h-4 w-4" />
              高级 JSON
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
            {quickFields.map(renderField)}
          </div>
        </div>

        {advancedOpen ? (
          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold">完整请求参数</h2>
                <p className="text-[11px] text-muted-foreground">
                  JSON 合法并通过方法校验后才会应用。
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => {
                  const issues = onApplyJson(jsonDraft);
                  setJsonIssues(issues);
                }}
              >
                应用 JSON
              </Button>
            </div>
            <Textarea
              value={jsonDraft}
              disabled={disabled}
              onChange={event => setJsonDraft(event.target.value)}
              className="min-h-72 font-mono text-xs leading-5"
              spellCheck={false}
            />
          </div>
        ) : null}

        {[...jsonIssues, ...validationIssues].length > 0 ? (
          <Alert variant="warning">
            <AlertDescription>
              <ul className="space-y-1">
                {[...jsonIssues, ...validationIssues].map((issue, index) => (
                  <li key={`${issue.path}-${index}`}>
                    <code>{issue.path}</code>：{issue.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </section>
  );
}
