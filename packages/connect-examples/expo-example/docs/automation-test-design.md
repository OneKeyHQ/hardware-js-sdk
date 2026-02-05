# 硬件钱包自动化测试系统设计文档

## 概述

本文档描述了基于 PhonePilot MCP 的硬件钱包自动化测试系统设计方案。该系统通过机械臂物理控制硬件钱包，实现完全自动化的端到端测试。

## 核心原则：职责分离

```
┌─────────────────────────────────────────────────────────────────────┐
│                           职责划分                                   │
├──────────────────────────────┬──────────────────────────────────────┤
│       PhonePilot 负责         │         expo-example 负责            │
├──────────────────────────────┼──────────────────────────────────────┤
│  ✓ 设备重置 (wipe)            │  ✓ 执行测试用例                       │
│  ✓ 恢复助记词                  │  ✓ 调用 SDK 方法                      │
│  ✓ 恢复 SLIP39 分片           │  ✓ 验证返回结果                       │
│  ✓ 输入 PIN                   │  ✓ 记录测试状态                       │
│  ✓ 输入 Passphrase           │  ✓ 生成测试报告                       │
│  ✓ 点击确认/取消按钮           │  ✓ 测试流程编排                       │
│  ✓ 所有物理操作                │  ✓ 通知 PhonePilot 执行物理操作       │
└──────────────────────────────┴──────────────────────────────────────┘
```

**expo-example 不直接调用 SDK.resetDevice() 等设备准备方法，而是通知 PhonePilot 来完成。**

## 目录

- [1. 系统架构](#1-系统架构)
- [2. 流程图](#2-流程图)
- [3. 模块设计](#3-模块设计)
- [4. 接口定义](#4-接口定义)
- [5. 状态管理](#5-状态管理)
- [6. 实现计划](#6-实现计划)

---

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              自动化测试系统架构                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐         │
│  │   expo-example  │      │   PhonePilot    │      │   硬件钱包设备   │         │
│  │   (测试控制器)   │      │   (物理操作)     │      │   (OneKey)      │         │
│  └────────┬────────┘      └────────┬────────┘      └────────┬────────┘         │
│           │                        │                        │                   │
│           │  MCP Protocol          │  机械臂                │                   │
│           │◄──────────────────────►│◄──────────────────────►│                   │
│           │                        │                        │                   │
│           │  USB/BLE SDK           │                        │                   │
│           │◄───────────────────────┼───────────────────────►│                   │
│           │                        │                        │                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 组件职责

| 组件 | 职责 |
|------|------|
| **expo-example** | 测试编排、SDK 调用、结果验证、报告生成 |
| **PhonePilot** | MCP Server、机械臂控制、摄像头捕获 |
| **硬件钱包** | 被测设备、执行签名/地址生成等操作 |

### 1.3 通信协议

- **expo-example ↔ PhonePilot**: MCP Protocol (HTTP/SSE)
- **expo-example ↔ 硬件钱包**: USB/Bluetooth (via hardware-js-sdk)
- **PhonePilot ↔ 机械臂**: HTTP (ESP32 Controller)

---

## 2. 流程图

### 2.1 测试执行时序图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ expo-example │     │  PhonePilot  │     │   机械臂     │     │  硬件钱包    │
│  (测试执行)   │     │  (设备准备)   │     │  Controller  │     │  (OneKey)    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ 1. 请求准备设备      │                    │                    │
       │ ─────────────────► │                    │                    │
       │  prepare-device    │                    │                    │
       │  {mnemonic, type}  │                    │                    │
       │                    │                    │                    │
       │                    │ 2. PhonePilot 完成设备准备 (内部流程)     │
       │                    │ ════════════════════════════════════════│
       │                    │                    │                    │
       │                    │  重置设备            │                    │
       │                    │───────────────────►│───────────────────►│
       │                    │  输入助记词          │                    │
       │                    │───────────────────►│───────────────────►│
       │                    │  确认操作            │                    │
       │                    │───────────────────►│───────────────────►│
       │                    │                    │                    │
       │   device-ready     │◄═══════════════════════════════════════│
       │ ◄───────────────── │                    │                    │
       │                    │                    │                    │
       │ 3. 执行测试用例序列 (expo-example 核心职责)                    │
       │ ════════════════════════════════════════════════════════════│
       │                    │                    │                    │
       │ SDK.btcGetAddress()│                    │                    │
       │ ───────────────────┼────────────────────┼───────────────────►│
       │                    │                    │     显示确认        │
       │                    │                    │                    │
       │  请求物理确认        │                    │                    │
       │ ──────────────────►│  move + click      │     物理点击        │
       │   confirm-action   │───────────────────►│───────────────────►│
       │      done          │◄───────────────────│                    │
       │ ◄─────────────────│                    │                    │
       │                    │                    │                    │
       │  address: 1A1z...  │                    │                    │
       │ ◄──────────────────┼────────────────────┼────────────────────│
       │                    │                    │                    │
       │  验证地址 ✓         │                    │                    │
       │  记录结果           │                    │                    │
       │                    │                    │                    │
       │ ... 重复更多测试 ... │                    │                    │
       │                    │                    │                    │
       │ 4. 测试完成，生成报告 │                    │                    │
       │ ════════════════════════════════════════════════════════════│
       │                    │                    │                    │
       │  通知测试完成        │                    │                    │
       │ ──────────────────►│                    │                    │
       │   test-complete    │                    │                    │
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
```

### 2.2 测试套件执行流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                     自动化测试套件执行流程                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐                                                    │
│  │  开始测试    │                                                    │
│  └──────┬──────┘                                                    │
│         ▼                                                           │
│  ┌─────────────────────────────────────┐                           │
│  │  1. 初始化阶段 (expo-example)         │                           │
│  │  ├─ 连接 PhonePilot MCP              │                           │
│  │  └─ 连接硬件钱包 (USB/BLE)            │                           │
│  └──────┬──────────────────────────────┘                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. 按助记词分组执行 (每个助记词只需准备一次)                  │   │
│  │                                                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │  助记词组 1: count24_one (24位助记词 - 组1)             │  │   │
│  │  │  ├─ prepare-device {mnemonic}  ← PhonePilot 重置恢复   │  │   │
│  │  │  │                                                     │  │   │
│  │  │  │  同一助记词下，不需要重置:                            │  │   │
│  │  │  ├─ normal: 执行测试 (无 passphrase)                   │  │   │
│  │  │  ├─ passphrase_empty: 执行测试 (passphrase="")         │  │   │
│  │  │  ├─ passphrase_1: 执行测试 (passphrase="asdfg7890")    │  │   │
│  │  │  └─ passphrase_2: 执行测试 (passphrase="xxx")          │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                         ▼ 切换助记词，需要重置                │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │  助记词组 2: count24_two (24位助记词 - 组2)             │  │   │
│  │  │  ├─ prepare-device {mnemonic}  ← PhonePilot 重置恢复   │  │   │
│  │  │  ├─ normal, passphrase_empty, passphrase_1, ...       │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                         ▼ 切换到 SLIP39                      │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │  SLIP39 测试组                                          │  │   │
│  │  │  ├─ prepare-device {slip39Shares}  ← 分片恢复          │  │   │
│  │  │  └─ 执行 SLIP39 测试用例                               │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                         ▼                                    │   │
│  │  ... 更多助记词组 ...                                        │   │
│  │                                                              │   │
│  └──────┬──────────────────────────────────────────────────────┘   │
│         ▼                                                           │
│  ┌─────────────────────────────────────┐                           │
│  │  3. 报告生成 (expo-example)           │                           │
│  │  ├─ 汇总测试结果                      │                           │
│  │  ├─ 生成 Markdown 报告               │                           │
│  │  └─ 导出/保存报告                     │                           │
│  └──────┬──────────────────────────────┘                           │
│         ▼                                                           │
│  ┌─────────────┐                                                    │
│  │  测试完成    │                                                    │
│  └─────────────┘                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 设备重置时机

| 场景 | 是否需要重置 | 说明 |
|------|-------------|------|
| 同一助记词下执行多个测试用例 | ❌ 不需要 | 钱包状态不变 |
| 同一助记词，切换 Passphrase | ❌ 不需要 | Passphrase 运行时通过 SDK 输入 |
| 切换到不同助记词 | ✅ 需要 | 调用 `prepare-device` |
| 切换到 SLIP39 恢复 | ✅ 需要 | 调用 `prepare-device` |
| 设置/修改 PIN | ✅ 需要 | 调用 `prepare-device` |

**说明**: Passphrase 是通过 SDK 的 `UI_REQUEST.REQUEST_PASSPHRASE` 事件在运行时输入的，不需要重置设备。

---

## 3. 模块设计

### 3.1 目录结构

```
expo-example/src/
├── services/
│   └── phonePilotMcp/              # 新增: PhonePilot MCP 客户端
│       ├── index.ts                # MCP 客户端主模块
│       ├── types.ts                # 类型定义
│       ├── walletActions.ts        # 钱包物理操作封装
│       └── screenMapping.ts        # 屏幕坐标映射配置
│
├── testTools/
│   └── automationTest/             # 新增: 自动化测试编排
│       ├── index.ts                # 测试套件入口
│       ├── testSuiteRunner.ts      # 测试套件执行器
│       ├── devicePreparation.ts    # 设备准备逻辑
│       └── reportGenerator.ts      # 增强版报告生成
│
├── views/
│   └── AutomationTestScreen.tsx    # 新增: 自动化测试界面
│
└── atoms/
    └── automationAtoms.ts          # 新增: 自动化测试状态
```

### 3.2 模块说明

#### 3.2.1 PhonePilot MCP 客户端 (`services/phonePilotMcp/`)

负责与 PhonePilot MCP Server 通信，封装机械臂控制操作。

**核心类:**

- `PhonePilotClient` - MCP 协议客户端
- `WalletPhysicalActions` - 钱包物理操作高级封装
- `ScreenConfig` - 屏幕坐标配置

#### 3.2.2 自动化测试编排 (`testTools/automationTest/`)

负责测试流程编排、设备准备、结果收集。

**核心类:**

- `AutomationTestRunner` - 测试执行引擎
- `DevicePreparation` - 设备状态准备
- `ReportGenerator` - 报告生成器

#### 3.2.3 自动化测试界面 (`views/AutomationTestScreen.tsx`)

提供可视化的测试配置和执行界面。

---

## 4. 接口定义

### 4.1 PhonePilot MCP 客户端

```typescript
// services/phonePilotMcp/index.ts

export class PhonePilotClient {
  private serverUrl: string;
  private sessionId: string | null = null;

  constructor(serverUrl: string = 'http://localhost:3847');

  // 连接管理
  async connect(): Promise<boolean>;
  async disconnect(): Promise<void>;
  async healthCheck(): Promise<boolean>;

  // 机械臂控制
  async armConnect(): Promise<ArmConnectResult>;
  async armDisconnect(): Promise<void>;
  async armMove(x: number, y: number, captureFrame?: boolean): Promise<MoveResult>;
  async armClick(depth?: number, captureFrame?: boolean): Promise<ClickResult>;
  async captureFrame(): Promise<string>; // base64 JPEG

  // 高级操作
  async tapAt(x: number, y: number): Promise<void>;
  async inputText(text: string, keyboard: KeyboardLayout): Promise<void>;
}
```

### 4.2 PhonePilot MCP 扩展工具 (需在 PhonePilot 侧实现)

expo-example 通过 MCP 调用以下工具，由 PhonePilot 负责执行：

```typescript
// PhonePilot 需要新增的 MCP Tools

// 设备准备 (PhonePilot 内部处理所有物理操作)
interface PrepareDeviceParams {
  testType: 'standard' | 'passphrase' | 'slip39' | 'pin';
  mnemonic?: string[];           // 标准助记词
  slip39Shares?: string[][];     // SLIP39 分片
  passphrase?: string;           // Passphrase
  pin?: string;                  // PIN
}
// Tool: prepare-device

// 物理确认操作
interface ConfirmActionParams {
  action: 'confirm' | 'cancel';
}
// Tool: confirm-action

// 输入 Passphrase (测试过程中)
interface InputPassphraseParams {
  passphrase: string;
}
// Tool: input-passphrase

// 输入 PIN (测试过程中)
interface InputPinParams {
  pin: string;
}
// Tool: input-pin
```

### 4.3 expo-example 调用封装

```typescript
// services/phonePilotMcp/index.ts

export class PhonePilotClient {
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3847');

  // 连接管理
  async connect(): Promise<boolean>;
  async disconnect(): Promise<void>;
  async healthCheck(): Promise<boolean>;

  // 设备准备 (通知 PhonePilot 执行)
  async prepareDevice(params: PrepareDeviceParams): Promise<{ success: boolean }>;

  // 物理操作 (通知 PhonePilot 执行)
  async confirmAction(): Promise<void>;
  async cancelAction(): Promise<void>;
  async inputPassphrase(passphrase: string): Promise<void>;
  async inputPin(pin: string): Promise<void>;

  // 调试用
  async captureFrame(): Promise<string>; // base64 JPEG
}
```

### 4.3 屏幕坐标配置

```typescript
// services/phonePilotMcp/screenMapping.ts

export interface ScreenConfig {
  deviceType: 'classic' | 'classic1s' | 'pro' | 'touch' | 'mini';

  // 键盘布局坐标
  keyboard: {
    [key: string]: { x: number; y: number };
  };

  // 按钮位置
  buttons: {
    confirm: { x: number; y: number };
    cancel: { x: number; y: number };
    back: { x: number; y: number };
  };

  // 功能区域
  areas: {
    scrollUp: { x: number; y: number };
    scrollDown: { x: number; y: number };
  };
}

// 预设配置
export const SCREEN_CONFIGS: Record<string, ScreenConfig> = {
  classic1s: { /* ... */ },
  pro: { /* ... */ },
  // ...
};
```

### 4.4 自动化测试配置

```typescript
// testTools/automationTest/types.ts

export interface AutomationTestConfig {
  // 测试配置
  testSuites: TestSuiteType[];
  mnemonic: string[];           // 测试用助记词
  passphrase?: string;          // 可选 passphrase
  slip39Shares?: string[][];    // SLIP39 分片
  pin?: string;                 // 测试 PIN

  // PhonePilot 配置
  phonePilotUrl: string;
  screenConfig: ScreenConfig;

  // 执行选项
  stopOnFirstError: boolean;
  retryCount: number;
  delayBetweenTests: number;
}

export type TestSuiteType =
  | 'address'
  | 'pubkey'
  | 'passphrase'
  | 'slip39'
  | 'security'
  | 'functional'
  | 'attachToPin'
  | 'chainMethod';
```

### 4.5 测试套件执行器

```typescript
// testTools/automationTest/testSuiteRunner.ts

export class AutomationTestRunner {
  private config: AutomationTestConfig;
  private phonePilot: PhonePilotClient;
  private sdk: HardwareSDK;

  constructor(config: AutomationTestConfig);

  // 生命周期
  async initialize(): Promise<void>;
  async runAllTests(): Promise<TestReport>;
  async stop(): Promise<void>;
  async cleanup(): Promise<void>;

  // 请求 PhonePilot 准备设备 (不直接操作设备)
  private async requestDevicePreparation(suiteType: TestSuiteType): Promise<void>;

  // 测试执行 (expo-example 核心职责)
  private async runTestSuite(suite: TestSuiteType): Promise<SuiteResult>;
  private async executeTestCase(testCase: TestCase): Promise<TestCaseResult>;

  // UI 请求处理 (通知 PhonePilot 执行物理操作)
  private async handleUIRequest(request: UIRequest): Promise<void>;

  // 事件回调
  onProgress: (progress: TestProgress) => void;
  onTestComplete: (result: TestCaseResult) => void;
  onSuiteComplete: (result: SuiteResult) => void;
}
```

**核心逻辑示意:**

```typescript
async function runAutomationTest(config: AutomationTestConfig) {
  const phonePilot = new PhonePilotClient(config.phonePilotUrl);
  await phonePilot.connect();

  // 1. 请求 PhonePilot 准备设备 (PhonePilot 内部完成重置、恢复助记词等)
  await phonePilot.prepareDevice({
    testType: 'standard',
    mnemonic: config.mnemonic,
  });

  // 2. 设置 SDK 监听器 (当需要物理操作时通知 PhonePilot)
  sdk.on(UI_EVENT, async (message) => {
    if (message.type === UI_REQUEST.REQUEST_BUTTON) {
      await phonePilot.confirmAction(); // 通知 PhonePilot 点击确认
    }
    if (message.type === UI_REQUEST.REQUEST_PIN) {
      await phonePilot.inputPin(config.pin);
      sdk.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE' });
    }
    if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      await phonePilot.inputPassphrase(config.passphrase);
      sdk.uiResponse({ type: UI_RESPONSE.RECEIVE_PASSPHRASE, payload: { passphraseOnDevice: true } });
    }
  });

  // 3. 执行测试 (expo-example 核心职责)
  for (const testCase of testCases) {
    const result = await sdk.btcGetAddress(...); // 调用 SDK
    validateResult(result);                       // 验证结果
    recordResult(testCase, result);               // 记录结果
  }

  // 4. 生成报告
  return generateReport(results);
}
```

---

## 5. 状态管理

### 5.1 Jotai Atoms

```typescript
// atoms/automationAtoms.ts

import { atom } from 'jotai';

// PhonePilot 连接状态
export const phonePilotConnectedAtom = atom<boolean>(false);
export const phonePilotUrlAtom = atom<string>('http://localhost:3847');

// 自动化测试配置
export const automationConfigAtom = atom<AutomationTestConfig>({
  testSuites: ['address', 'pubkey'],
  mnemonic: [],
  phonePilotUrl: 'http://localhost:3847',
  screenConfig: defaultScreenConfig,
  stopOnFirstError: false,
  retryCount: 1,
  delayBetweenTests: 500,
});

// 测试执行状态
export const automationRunnerStateAtom = atom<
  'idle' | 'preparing' | 'running' | 'paused' | 'done'
>('idle');

// 当前进度
export const automationProgressAtom = atom<{
  currentSuite: TestSuiteType | null;
  currentTest: string | null;
  completedSuites: number;
  totalSuites: number;
  completedTests: number;
  totalTests: number;
}>({
  currentSuite: null,
  currentTest: null,
  completedSuites: 0,
  totalSuites: 0,
  completedTests: 0,
  totalTests: 0,
});

// 测试结果
export const automationResultsAtom = atom<TestReport | null>(null);

// PhonePilot 摄像头画面
export const cameraFrameAtom = atom<string | null>(null);
```

---

## 6. 实现计划

### 6.1 PhonePilot 侧工作 (前置依赖)

| 任务 | 描述 | 优先级 |
|------|------|--------|
| 屏幕坐标映射 | 标定 Classic1s 设备坐标 | P0 |
| 助记词输入 | 实现键盘输入逻辑 | P0 |
| 设备重置恢复 | wipe + restore 流程 | P0 |
| `prepare-device` Tool | MCP 工具: 设备准备 | P0 |
| `confirm-action` Tool | MCP 工具: 物理确认 | P0 |
| `input-passphrase` Tool | MCP 工具: 输入 Passphrase | P1 |
| `input-pin` Tool | MCP 工具: 输入 PIN | P1 |
| SLIP39 恢复 | 分片恢复流程 | P1 |
| 多设备支持 | Pro/Touch 坐标配置 | P2 |

### 6.2 expo-example 侧工作

#### Phase 1: 基础设施 (P0)

| 任务 | 描述 |
|------|------|
| PhonePilot MCP 客户端 | 实现 MCP 协议通信封装 |
| 测试配置管理 | 助记词、测试套件选择等 |

#### Phase 2: 核心功能 (P0)

| 任务 | 描述 |
|------|------|
| UI 请求处理 | 监听 SDK UI_EVENT，通知 PhonePilot |
| 地址测试自动化 | 集成现有 addressTest |
| 测试结果验证 | 验证 SDK 返回结果 |

#### Phase 3: 完整集成 (P1)

| 任务 | 描述 |
|------|------|
| 测试套件集成 | 集成全部 8 类测试 |
| 自动化测试 UI | 实现 AutomationTestScreen |
| 进度显示 | 实时显示测试进度 |

#### Phase 4: 增强功能 (P2)

| 任务 | 描述 |
|------|------|
| 报告生成增强 | 详细测试报告 |
| 错误恢复重试 | 失败自动重试 |
| 测试历史记录 | 保存历史测试结果 |

---

## 7. 测试套件清单

| 测试类型 | 描述 | 物理操作需求 |
|----------|------|-------------|
| **Address Test** | 地址生成验证 | 确认按钮 |
| **PubKey Test** | 公钥生成验证 | 确认按钮 |
| **Passphrase Test** | 密语保护测试 | 确认 + 密语输入 |
| **SLIP39 Test** | Shamir 恢复测试 | 分片输入 |
| **Security Check** | 安全检查测试 | 确认按钮 |
| **Functional Test** | 功能测试 | 多种操作 |
| **Attach-to-PIN** | PIN 绑定测试 | PIN 输入 |
| **Chain Method** | 链式调用测试 | 多次确认 |

---

## 8. 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 屏幕坐标漂移 | 点击位置不准 | 定期校准 + 视觉识别 |
| 设备响应超时 | 测试中断 | 超时重试机制 |
| 助记词输入错误 | 恢复失败 | 逐字验证 + 截图对比 |
| 网络连接不稳定 | MCP 通信失败 | 重连机制 + 本地运行 |

---

## 附录

### A. PhonePilot MCP Tools

| Tool | 描述 | 参数 |
|------|------|------|
| `arm-connect` | 连接机械臂 | - |
| `arm-disconnect` | 断开连接 | - |
| `arm-move` | 移动到坐标 | x, y, captureFrame |
| `arm-click` | 执行点击 | depth, captureFrame |
| `capture-frame` | 截取画面 | - |

### B. 相关资源

- [PhonePilot 项目](../../../../../PhonePilot)
- [hardware-js-sdk 文档](https://developer.onekey.so/)
- [MCP Protocol 规范](https://modelcontextprotocol.io/)
