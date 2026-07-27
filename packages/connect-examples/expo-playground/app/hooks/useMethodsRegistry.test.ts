import { describe, expect, test } from '@jest/globals';

import { deviceMethodsRegistry, signerMethodsRegistry } from './useMethodsRegistry';

describe('Expo Playground 方法注册表', () => {
  test.each([
    ['Device', deviceMethodsRegistry.allMethods],
    ['Signer', signerMethodsRegistry.allMethods],
  ])('%s 模块只暴露一次同名方法', (_moduleName, methods) => {
    const methodNames = methods.map(item => item.method);

    expect(new Set(methodNames).size).toBe(methodNames.length);
  });
});
