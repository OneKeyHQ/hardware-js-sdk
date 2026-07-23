import type { MultisigTestCase } from './types';

export function getMultisigCompatibilityIssue(
  testCase: MultisigTestCase,
  isPro2: boolean
): string | undefined {
  if (testCase.protocolTarget === 'onekey-pro-v1' && isPro2) {
    return '该 EVM Safe 用例使用 OneKey Pro Protocol V1；Pro2 暂未支持。';
  }

  return undefined;
}
