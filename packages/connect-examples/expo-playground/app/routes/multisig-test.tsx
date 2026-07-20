import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { MultisigCaseLibrary } from '../components/multisig/MultisigCaseLibrary';
import {
  MultisigExecutionPanel,
  type MultisigExecutionState,
} from '../components/multisig/MultisigExecutionPanel';
import { MultisigParameterEditor } from '../components/multisig/MultisigParameterEditor';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { BUILT_IN_MULTISIG_CASES } from '../features/multisig/cases';
import { applyJsonDraft, cloneAsCustomCase, setByPath } from '../features/multisig/editor';
import { loadCustomCases, saveCustomCases } from '../features/multisig/storage';
import type {
  MultisigCaseSource,
  MultisigChain,
  MultisigTestCase,
  ValidationIssue,
} from '../features/multisig/types';
import { buildExecutionSummary, validateMultisigCase } from '../features/multisig/validation';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { signerMethodsRegistry } from '../hooks/useMethodsRegistry';

function cloneParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(parameters)) as Record<string, unknown>;
}

function getInitialCustomCases() {
  if (typeof window === 'undefined') return [];
  return loadCustomCases(window.localStorage);
}

export default function MultisigTestPage() {
  const [customCases, setCustomCases] = useState<MultisigTestCase[]>(getInitialCustomCases);
  const [chain, setChain] = useState<MultisigChain>('eth');
  const [source, setSource] = useState<MultisigCaseSource | 'all'>('all');
  const [selectedId, setSelectedId] = useState(BUILT_IN_MULTISIG_CASES[0].id);
  const [parameters, setParameters] = useState<Record<string, unknown>>(() =>
    cloneParameters(BUILT_IN_MULTISIG_CASES[0].parameters)
  );
  const [title, setTitle] = useState(BUILT_IN_MULTISIG_CASES[0].title);
  const [execution, setExecution] = useState<MultisigExecutionState>({ status: 'idle' });
  const { executeMethod, canExecute } = useHardwareMethodExecution();

  const allCases = useMemo(
    () => [...BUILT_IN_MULTISIG_CASES, ...customCases],
    [customCases]
  );
  const selectedCase = useMemo(
    () => allCases.find(item => item.id === selectedId) ?? allCases[0],
    [allCases, selectedId]
  );
  const currentCase = useMemo(
    () => ({ ...selectedCase, title, parameters }),
    [parameters, selectedCase, title]
  );
  const validation = useMemo(() => validateMultisigCase(currentCase), [currentCase]);
  const summary = useMemo(() => buildExecutionSummary(currentCase), [currentCase]);
  const dirty = useMemo(
    () =>
      title !== selectedCase.title ||
      JSON.stringify(parameters) !== JSON.stringify(selectedCase.parameters),
    [parameters, selectedCase, title]
  );
  const running = execution.status === 'running';

  useEffect(() => {
    if (typeof window !== 'undefined') saveCustomCases(window.localStorage, customCases);
  }, [customCases]);

  const resetFromCase = (testCase: MultisigTestCase) => {
    setSelectedId(testCase.id);
    setChain(testCase.chain);
    setParameters(cloneParameters(testCase.parameters));
    setTitle(testCase.title);
    setExecution({ status: 'idle' });
  };

  const handleSelect = (testCase: MultisigTestCase) => {
    if (dirty && !window.confirm('当前参数尚未保存，确定切换用例吗？')) return;
    resetFromCase(testCase);
  };

  const handleChainChange = (nextChain: MultisigChain) => {
    if (dirty && !window.confirm('当前参数尚未保存，确定切换链吗？')) return;
    const firstCase = allCases.find(item => item.chain === nextChain);
    setChain(nextChain);
    setSource('all');
    if (firstCase) resetFromCase(firstCase);
  };

  const handleApplyJson = (draft: string): ValidationIssue[] => {
    const result = applyJsonDraft(draft, currentCase);
    if (result.parameters) setParameters(result.parameters);
    return result.issues;
  };

  const handleSaveCopy = () => {
    const id = `custom-${Date.now()}`;
    const clone = cloneAsCustomCase(currentCase, id, `${currentCase.title} 副本`);
    setCustomCases(items => [...items, clone]);
    resetFromCase(clone);
  };

  const handleSave = () => {
    const saved = { ...currentCase, title: title.trim(), builtIn: false, source: 'custom' as const };
    setCustomCases(items => items.map(item => (item.id === saved.id ? saved : item)));
    resetFromCase(saved);
  };

  const handleDelete = () => {
    if (!window.confirm(`确定删除自定义用例“${currentCase.title}”吗？`)) return;
    const nextCases = customCases.filter(item => item.id !== currentCase.id);
    setCustomCases(nextCases);
    const fallback = BUILT_IN_MULTISIG_CASES.find(item => item.chain === currentCase.chain) ?? BUILT_IN_MULTISIG_CASES[0];
    resetFromCase(fallback);
  };

  const handleExecute = async () => {
    const startedAt = performance.now();
    const nextValidation = validateMultisigCase(currentCase);
    if (currentCase.localOnly) {
      setExecution({
        status: 'success',
        result: nextValidation,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return;
    }

    if (!nextValidation.valid) {
      setExecution({ status: 'error', error: '参数校验未通过，请先修复页面中列出的字段。' });
      return;
    }

    const methodConfig = signerMethodsRegistry.allMethods.find(
      item => item.method === currentCase.method
    );
    if (!methodConfig) {
      setExecution({ status: 'error', error: `未找到 SDK 方法配置：${currentCase.method}` });
      return;
    }

    setExecution({ status: 'running' });
    try {
      const result = await executeMethod(cloneParameters(currentCase.parameters), methodConfig);
      setExecution({
        status: 'success',
        result,
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      setExecution({
        status: 'error',
        error: error instanceof Error ? error.message : '未知执行错误',
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border px-4 py-3">
        <Breadcrumb items={[{ label: 'Multisig Test', icon: ShieldCheck }]} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(260px,0.27fr)_minmax(0,1fr)] lg:overflow-hidden">
        <MultisigCaseLibrary
          cases={allCases}
          selectedId={selectedCase.id}
          chain={chain}
          source={source}
          disabled={running}
          onChainChange={handleChainChange}
          onSourceChange={setSource}
          onSelect={handleSelect}
        />
        <main className="flex min-h-[720px] flex-col lg:min-h-0 lg:overflow-hidden">
          <MultisigParameterEditor
            testCase={selectedCase}
            title={title}
            parameters={parameters}
            validationIssues={validation.issues}
            disabled={running}
            dirty={dirty}
            onTitleChange={setTitle}
            onParameterChange={(path, value) => setParameters(items => setByPath(items, path, value))}
            onApplyJson={handleApplyJson}
            onSaveCopy={handleSaveCopy}
            onSave={handleSave}
            onReset={() => resetFromCase(selectedCase)}
            onDelete={handleDelete}
          />
          <MultisigExecutionPanel
            testCase={currentCase}
            summary={summary}
            validation={validation}
            canExecute={canExecute}
            state={execution}
            onExecute={handleExecute}
          />
        </main>
      </div>
    </div>
  );
}
