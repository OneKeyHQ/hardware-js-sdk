import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const source = readFileSync(
  resolve(
    process.cwd(),
    'packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx'
  ),
  'utf8'
);
const parameterEditorSource = readFileSync(
  resolve(
    process.cwd(),
    'packages/connect-examples/expo-playground/app/components/multisig/MultisigParameterEditor.tsx'
  ),
  'utf8'
);
const caseLibrarySource = readFileSync(
  resolve(
    process.cwd(),
    'packages/connect-examples/expo-playground/app/components/multisig/MultisigCaseLibrary.tsx'
  ),
  'utf8'
);

describe('MultisigExecutionPanel 布局', () => {
  test('执行、核对与结果按上下工作台排列', () => {
    expect(source).toContain('flex min-h-[360px] flex-1 flex-col');
    expect(source).toContain('data-section="execution-summary"');
    expect(source).toContain('data-section="execution-result"');
    expect(source).not.toContain(
      'xl:grid-cols-[minmax(360px,0.48fr)_minmax(0,0.52fr)]'
    );
  });

  test('宽屏压缩快捷字段高度并把剩余高度留给结果区', () => {
    expect(parameterEditorSource).toContain('lg:max-h-[46vh] lg:flex-none');
    expect(parameterEditorSource).toContain('xl:grid-cols-4');
    expect(source).not.toContain('lg:h-[clamp(340px,38vh,420px)]');
  });

  test('用例库不再展示来源筛选', () => {
    expect(caseLibrarySource).not.toContain('全部来源');
    expect(caseLibrarySource).not.toContain('onSourceChange');
  });

  test('设备等待状态使用低饱和背景', () => {
    expect(source).toContain('border-primary/20 bg-primary/5');
    expect(source).toContain('animate-spin text-primary');
    expect(source).not.toContain('border border-primary bg-primary px-6');
  });

  test('展示当前 signer 的环境变量和三种自动校验状态', () => {
    expect(source).toContain('testCase.hardwareExpectation?.signerEnvKey');
    expect(source).toContain('硬件校验通过');
    expect(source).toContain('硬件校验失败');
    expect(source).toContain('未自动校验');
  });
});
