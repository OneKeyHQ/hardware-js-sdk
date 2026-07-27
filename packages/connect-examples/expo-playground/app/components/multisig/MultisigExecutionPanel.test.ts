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

  test('宽屏限制参数区高度并把剩余空间留给结果区', () => {
    expect(parameterEditorSource).toContain('lg:max-h-[36vh] lg:flex-none');
    expect(parameterEditorSource).toContain('xl:grid-cols-4');
    expect(parameterEditorSource).toContain('2xl:grid-cols-6');
    expect(source).not.toContain('lg:h-[clamp(340px,38vh,420px)]');
  });

  test('快捷字段使用紧凑控件并移除重复说明', () => {
    expect(parameterEditorSource).toContain('h-7 px-2 font-mono text-[11px]');
    expect(parameterEditorSource).toContain('min-h-10 h-10');
    expect(parameterEditorSource).not.toContain('常用字段会同步到完整 SDK 请求参数。');
  });

  test('快捷字段与高级 JSON 使用互斥视图，避免重复内容同时占高', () => {
    expect(parameterEditorSource).toContain('data-section="quick-fields"');
    expect(parameterEditorSource).toContain('data-section="json-editor"');
    expect(parameterEditorSource).toContain("advancedOpen ? '快捷字段' : '高级 JSON'");
  });

  test('次要核对信息和原始响应默认折叠，按需展开', () => {
    expect(source).toContain('<details');
    expect(source).toContain('展开设备核对项');
    expect(source).toContain('查看原始响应');
    expect(source).toContain('收起原始响应');
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
