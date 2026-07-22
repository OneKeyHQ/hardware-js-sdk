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

describe('MultisigExecutionPanel 布局', () => {
  test('执行、核对与结果按上下工作台排列', () => {
    expect(source).toContain('flex shrink-0 flex-col');
    expect(source).toContain('data-section="execution-summary"');
    expect(source).toContain('data-section="execution-result"');
    expect(source).not.toContain(
      'xl:grid-cols-[minmax(360px,0.48fr)_minmax(0,0.52fr)]'
    );
  });

  test('展示当前 signer 的环境变量和三种自动校验状态', () => {
    expect(source).toContain('testCase.hardwareExpectation?.signerEnvKey');
    expect(source).toContain('硬件校验通过');
    expect(source).toContain('硬件校验失败');
    expect(source).toContain('未自动校验');
  });
});
