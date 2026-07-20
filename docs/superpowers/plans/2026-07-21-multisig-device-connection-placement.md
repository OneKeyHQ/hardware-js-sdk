# Multisig Test Device Connection Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `Multisig Test` 的设备搜索入口从底部执行面板移动到页面标题下方，同时保持现有连接和执行逻辑不变。

**Architecture:** 页面路由负责渲染页面级未连接提示，复用现有 `DeviceNotConnectedState` 和全局设备状态。`MultisigExecutionPanel` 只负责用例执行、请求摘要、设备核对与结果展示，不再承载设备搜索入口。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Zustand、Webpack

---

## 文件结构

- 修改 `packages/connect-examples/expo-playground/app/routes/multisig-test.tsx`：在面包屑和工作区之间渲染页面级设备连接提示。
- 修改 `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx`：移除底部重复的设备连接提示和无用导入。
- 验证 `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts`：确认既有多签领域测试保持通过。

### Task 1: 将设备连接提示提升到页面顶部

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/routes/multisig-test.tsx`

- [ ] **Step 1: 引入通用设备连接提示组件**

在多签组件导入区域加入：

```tsx
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
```

- [ ] **Step 2: 在面包屑和工作区之间渲染提示条**

将页面顶部结构改为：

```tsx
<div className="border-b border-border px-4 py-3">
  <Breadcrumb items={[{ label: 'Multisig Test', icon: ShieldCheck }]} />
</div>
<DeviceNotConnectedState className="mx-4 mt-3 shrink-0 shadow-none" />
<div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(260px,0.27fr)_minmax(0,1fr)] lg:overflow-hidden">
```

`DeviceNotConnectedState` 在设备已连接时返回 `null`，因此不会留下空白占位。

- [ ] **Step 3: 运行格式和类型检查**

Run:

```bash
pnpm --filter onekey-hardware-playground typecheck
```

Expected: TypeScript 检查通过，无新增错误。

### Task 2: 清理底部执行面板中的重复连接入口

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx`

- [ ] **Step 1: 删除无用组件导入**

删除：

```tsx
import { DeviceNotConnectedState } from '../common/DeviceNotConnectedState';
```

- [ ] **Step 2: 删除执行面板中的连接提示卡片**

删除：

```tsx
{!canExecute && !testCase.localOnly ? (
  <DeviceNotConnectedState className="border-border bg-background shadow-none" />
) : null}
```

保留 `canExecute` 对状态标签和执行按钮禁用条件的控制。

- [ ] **Step 3: 运行 ESLint**

Run:

```bash
pnpm --filter onekey-hardware-playground lint
```

Expected: ESLint 通过，且没有未使用导入。

### Task 3: 回归验证页面逻辑和生产构建

**Files:**
- Test: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts`

- [ ] **Step 1: 运行多签领域测试**

Run:

```bash
pnpm jest packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts --runInBand
```

Expected: 所有多签用例、校验、编辑和存储测试通过。

- [ ] **Step 2: 运行生产构建**

Run:

```bash
pnpm --filter onekey-hardware-playground build
```

Expected: Webpack 生产构建成功。

- [ ] **Step 3: 检查最终差异**

Run:

```bash
git diff --check
git diff -- packages/connect-examples/expo-playground/app/routes/multisig-test.tsx packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx
```

Expected: 无空白错误；差异只包含连接提示上移和底部重复入口删除。

- [ ] **Step 4: 提交实现**

```bash
git add packages/connect-examples/expo-playground/app/routes/multisig-test.tsx packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx docs/superpowers/plans/2026-07-21-multisig-device-connection-placement.md
git commit -m "fix(playground): move multisig device search to page header"
```
