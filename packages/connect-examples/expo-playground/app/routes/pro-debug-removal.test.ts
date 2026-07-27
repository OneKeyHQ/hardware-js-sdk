import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const appRoot = resolve(process.cwd(), 'packages/connect-examples/expo-playground/app');
const readAppFile = (relativePath: string) => readFileSync(resolve(appRoot, relativePath), 'utf8');

describe('Pro Debug 模块移除', () => {
  test('删除页面文件和路由注册', () => {
    expect(existsSync(resolve(appRoot, 'routes/pro-debug.tsx'))).toBe(false);
    expect(readAppFile('entry.client.tsx')).not.toMatch(/ProDebugPage|path:\s*'pro-debug'/);
  });

  test('删除导航入口和翻译文案', () => {
    expect(readAppFile('components/sidebar.tsx')).not.toMatch(/common\.proDebug|\/pro-debug/);
    expect(readAppFile('i18n/locales/zh.ts')).not.toMatch(/proDebug:/);
    expect(readAppFile('i18n/locales/en.ts')).not.toMatch(/proDebug:/);
  });
});
