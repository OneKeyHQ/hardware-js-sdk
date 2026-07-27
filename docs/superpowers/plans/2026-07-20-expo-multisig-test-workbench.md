# Expo Playground Multisig Test Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Expo Playground 新增一个独立的 ETH/BTC 多签测试台，支持内置回归用例、快捷字段与 JSON 编辑、本地自定义用例和真实硬件执行。

**Architecture:** 将纯数据与校验逻辑放在 `app/features/multisig/`，React 页面只负责选择、编辑和调用现有 `useHardwareMethodExecution`。内置 BTC fixture 使用 Pro 2 固件默认测试助记词对应的公开 BIP48 测试账户，并明确标注仅用于测试设备；自定义用例通过版本化 localStorage 保存。

**Tech Stack:** React 18、TypeScript、React Router、Tailwind CSS、Jest、OneKey Hardware SDK。

---

## 文件结构

- Create: `packages/connect-examples/expo-playground/app/features/multisig/types.ts` — 用例、校验结果和编辑字段类型。
- Create: `packages/connect-examples/expo-playground/app/features/multisig/cases.ts` — ETH/BTC 内置测试向量。
- Create: `packages/connect-examples/expo-playground/app/features/multisig/validation.ts` — 方法级本地校验和执行摘要。
- Create: `packages/connect-examples/expo-playground/app/features/multisig/editor.ts` — 深层字段读写、JSON 草稿应用和用例复制。
- Create: `packages/connect-examples/expo-playground/app/features/multisig/storage.ts` — 版本化 localStorage 读写。
- Create: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts` — 纯逻辑测试。
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigCaseLibrary.tsx` — 左侧用例库。
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigParameterEditor.tsx` — 快捷字段和高级 JSON 编辑器。
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx` — 设备摘要、结果和错误。
- Create: `packages/connect-examples/expo-playground/app/routes/multisig-test.tsx` — 页面状态编排和硬件调用。
- Modify: `packages/connect-examples/expo-playground/app/entry.client.tsx` — 注册 `/multisig-test`。
- Modify: `packages/connect-examples/expo-playground/app/components/sidebar.tsx` — 增加侧边栏入口。
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/en.ts` — 英文导航文案。
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/zh.ts` — 中文导航文案。

### Task 1: 建立多签领域模型与失败测试

**Files:**
- Create: `packages/connect-examples/expo-playground/app/features/multisig/types.ts`
- Create: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts`

- [ ] **Step 1: 定义测试期待的公共 API**

测试导入以下 API：

```ts
import { BUILT_IN_MULTISIG_CASES } from './cases';
import { applyJsonDraft, cloneAsCustomCase, setByPath } from './editor';
import { loadCustomCases, saveCustomCases } from './storage';
import { validateMultisigCase } from './validation';
```

覆盖 ID 唯一、四个 SDK 方法、ETH 正向用例、BTC 三种脚本、无效阈值、无效 JSON 和损坏存储降级。

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
yarn jest packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts --runInBand
```

Expected: FAIL，提示 `./cases`、`./editor`、`./storage`、`./validation` 尚不存在。

- [ ] **Step 3: 添加最小类型定义**

```ts
export type MultisigChain = 'eth' | 'btc';
export type MultisigCaseSource =
  | 'firmware-capability'
  | 'existing-example'
  | 'regression'
  | 'custom';
export type MultisigMethod =
  | 'evmSignTypedData'
  | 'evmSignTransaction'
  | 'btcGetAddress'
  | 'btcSignTransaction';

export type MultisigTestCase = {
  id: string;
  title: string;
  description: string;
  chain: MultisigChain;
  source: MultisigCaseSource;
  method: MultisigMethod;
  parameters: Record<string, unknown>;
  expectedDeviceChecks: string[];
  builtIn: boolean;
  localOnly?: boolean;
  testMnemonicOnly?: boolean;
};

export type ValidationIssue = { path: string; message: string };
export type ValidationResult = { valid: boolean; issues: ValidationIssue[] };
```

### Task 2: 实现内置用例、编辑器、校验与存储

**Files:**
- Create: `packages/connect-examples/expo-playground/app/features/multisig/cases.ts`
- Create: `packages/connect-examples/expo-playground/app/features/multisig/editor.ts`
- Create: `packages/connect-examples/expo-playground/app/features/multisig/validation.ts`
- Create: `packages/connect-examples/expo-playground/app/features/multisig/storage.ts`
- Test: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts`

- [ ] **Step 1: 固化 ETH 用例**

从 `app/data/methods/ethereum.ts` 复用 SafeTx 类型结构和三条 Gnosis Safe 参数，并添加两条 `evmSignTransaction` calldata 回归用例。所有地址使用现有公开示例地址，交易不广播。

- [ ] **Step 2: 固化 BTC BIP48 用例**

BTC 单元测试的签名输入在测试运行时由固定合成 entropy 生成；真机用例只允许从环境变量读取调用方提供的测试凭据，文档、源码和 fixture 均不得保存完整助记词。

- [ ] **Step 3: 实现深层字段编辑**

```ts
export function setByPath(
  source: Record<string, unknown>,
  path: Array<string | number>,
  value: unknown
): Record<string, unknown>;

export function applyJsonDraft(
  draft: string,
  testCase: MultisigTestCase
): { parameters?: Record<string, unknown>; issues: ValidationIssue[] };

export function cloneAsCustomCase(
  testCase: MultisigTestCase,
  id: string,
  title?: string
): MultisigTestCase;
```

更新必须复制沿途对象和数组，不修改内置用例引用。

- [ ] **Step 4: 实现方法级校验**

```ts
export function validateMultisigCase(testCase: MultisigTestCase): ValidationResult;
export function buildExecutionSummary(testCase: MultisigTestCase): Array<{
  label: string;
  value: string;
}>;
```

ETH 校验路径、地址、chainId、typed data 和交易字段；BTC 校验 m/n、公钥、签名槽位、脚本类型、输入输出和 refTxs。`localOnly` 负向用例即使校验失败也不发送设备。

- [ ] **Step 5: 实现版本化存储**

```ts
export const MULTISIG_STORAGE_KEY = 'onekey.multisig-test-cases';
export function loadCustomCases(storage: Pick<Storage, 'getItem'>): MultisigTestCase[];
export function saveCustomCases(
  storage: Pick<Storage, 'setItem'>,
  cases: MultisigTestCase[]
): void;
```

仅接受 `version: 1` 且 `builtIn === false` 的合法记录；JSON 损坏时返回空数组。

- [ ] **Step 6: 运行测试并确认 GREEN**

Run:

```bash
yarn jest packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts --runInBand
```

Expected: PASS。

### Task 3: 实现多签测试台 UI

**Files:**
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigCaseLibrary.tsx`
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigParameterEditor.tsx`
- Create: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx`
- Create: `packages/connect-examples/expo-playground/app/routes/multisig-test.tsx`

- [ ] **Step 1: 实现左侧用例库**

提供 ETH/BTC 标签、来源筛选、内置/自定义分组和选中状态。列表项展示方法、来源、`Test mnemonic` 或 `Local validation` 标记；自定义项展示复制、重命名和删除操作。

- [ ] **Step 2: 实现快捷字段与高级 JSON**

快捷字段只覆盖路径、chainId、Safe 地址、目标地址、value、nonce、operation、BTC coin/script type/m。深层 inputs、outputs、pubkeys、signatures 和 refTxs 通过高级 JSON 编辑。JSON 草稿只有点击“应用”并通过校验后才更新可执行参数。

- [ ] **Step 3: 实现执行面板**

显示连接状态、设备核对清单、请求摘要、耗时、结果和错误。执行时禁用编辑与切换；拒绝和超时不自动重试。`localOnly` 用例只展示校验结果。

- [ ] **Step 4: 编排页面状态与硬件调用**

页面使用：

```ts
const { executeMethod, canExecute } = useHardwareMethodExecution();
const methodConfig = signerMethodsRegistry.allMethods.find(
  item => item.method === selectedCase.method
);
await executeMethod(selectedCase.parameters, methodConfig);
```

内置用例编辑后保存为副本；自定义用例允许覆盖保存。刷新页面时从 localStorage 恢复。

### Task 4: 注册路由、导航与文案

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/entry.client.tsx`
- Modify: `packages/connect-examples/expo-playground/app/components/sidebar.tsx`
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/en.ts`
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/zh.ts`

- [ ] **Step 1: 注册路由**

导入 `MultisigTestPage` 并增加：

```tsx
{
  path: 'multisig-test',
  element: <MultisigTestPage />,
}
```

- [ ] **Step 2: 增加侧边栏入口**

使用 `ShieldCheck` 图标，URL 为 `/multisig-test`，标题键为 `common.multisigTest`。

- [ ] **Step 3: 增加中英文文案**

```ts
multisigTest: 'Multisig Test'
```

```ts
multisigTest: '多签测试'
```

### Task 5: 完整验证与交付

**Files:**
- Review: all files above

- [ ] **Step 1: 运行单元测试**

```bash
yarn jest packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts --runInBand
```

- [ ] **Step 2: 运行类型检查**

```bash
yarn --cwd packages/connect-examples/expo-playground typecheck
```

- [ ] **Step 3: 运行 ESLint**

```bash
yarn --cwd packages/connect-examples/expo-playground lint
```

- [ ] **Step 4: 运行生产构建**

```bash
yarn --cwd packages/connect-examples/expo-playground build
```

- [ ] **Step 5: 检查变更范围**

```bash
git diff --check
git status --short
```

确认未覆盖 `docs/superpowers/specs/2026-07-16-pro2-eventless-wallet-session-design.md` 等用户现有改动。
