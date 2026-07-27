# Multisig Test Execution Panel Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Multisig Test 右下执行区域从左右等宽双栏改为“执行栏 → 核对摘要 → 全宽结果”的上下工作台布局。

**Architecture:** 仅修改 `MultisigExecutionPanel` 的 JSX 与 Tailwind 布局类，不改变 props、执行状态或硬件调用。使用现有 Button、Badge、Alert 和主题 token，通过固定的顶部操作区、紧凑摘要区和弹性结果区建立主次层级。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Jest、ESLint、Webpack

---

### Task 1: 建立布局回归测试

**Files:**
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts`
- Test: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
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
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn jest packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts --runInBand`

Expected: FAIL，缺少新的上下布局标记，旧双栏类仍存在。

### Task 2: 重构执行面板布局

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx:58-178`
- Test: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts`

- [ ] **Step 1: 将根容器改为上下结构**

将根节点替换为固定顶部、弹性内容的纵向容器：

```tsx
<section className="flex shrink-0 flex-col border-t border-border bg-background lg:h-[clamp(320px,38vh,420px)]">
```

- [ ] **Step 2: 建立独立的执行栏**

执行栏左侧保留设备标题与说明，右侧保留 readiness Badge 和主按钮：

```tsx
<div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
  <div className="min-w-[240px] flex-1">...</div>
  <div className="flex shrink-0 items-center gap-2">...</div>
</div>
```

- [ ] **Step 3: 将警告、摘要与核对项合并为紧凑摘要区**

```tsx
<div
  data-section="execution-summary"
  className="shrink-0 space-y-3 border-b border-border/70 bg-card/50 px-4 py-3"
>
  {testCase.testMnemonicOnly ? <Alert ... /> : null}
  <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.38fr)_minmax(0,0.62fr)]">
    <div>设备核对项列表</div>
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">执行摘要</div>
  </div>
</div>
```

- [ ] **Step 4: 让结果区占满剩余宽度与高度**

```tsx
<div data-section="execution-result" className="flex min-h-0 flex-1 flex-col bg-background">
  <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-2.5">
    <div>结果标题与说明</div>
    {state.durationMs !== undefined ? <Badge ... /> : null}
  </div>
  <div className="min-h-0 flex-1 p-3">状态内容</div>
</div>
```

- [ ] **Step 5: 运行布局测试并确认通过**

Run: `yarn jest packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts --runInBand`

Expected: PASS。

### Task 3: 完整验证

**Files:**
- Verify: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx`
- Verify: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts`

- [ ] **Step 1: 运行 Multisig 测试**

Run: `yarn jest packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts --runInBand`

Expected: 所有测试通过。

- [ ] **Step 2: 运行目标文件 ESLint**

Run: `yarn eslint packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts`

Expected: 退出码 0。

- [ ] **Step 3: 运行 playground 生产构建**

Run: `cd packages/connect-examples/expo-playground && yarn build`

Expected: Webpack 编译成功；允许既有资源体积警告。

- [ ] **Step 4: 检查最终差异**

Run: `git diff --check && git status --short`

Expected: 无空白错误，仅出现计划内文件。
