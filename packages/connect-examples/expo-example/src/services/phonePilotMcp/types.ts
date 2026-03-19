/**
 * PhonePilot MCP Client Type Definitions
 */

export interface ArmConnectResult {
  success: boolean;
  handle: number;
  message: string;
}

export interface ArmDisconnectResult {
  success: boolean;
  message: string;
}

export interface ArmMoveResult {
  success: boolean;
  position: { x: number; y: number };
  message: string;
  frame?: string;
}

export interface ArmClickResult {
  success: boolean;
  message: string;
  frame?: string;
}

export interface CaptureFrameResult {
  success: boolean;
  message: string;
  frame?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface ExecuteSequenceResult extends ActionResult {
  sequenceId?: string;
  sequenceName?: string;
  stepsCompleted?: number;
  totalSteps?: number;
  frame?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  server: string;
  version: string;
  mcpReady: boolean;
  ocrReady: boolean;
  message?: string;
  ocr: PhonePilotOcrHealth;
  sequenceIds: string[];
  activeSessions: {
    streamable: number;
    sse: number;
  };
}

export interface PhonePilotOcrHealth {
  ready: boolean;
  pythonBin: string;
  pythonVersion?: string;
  scriptPath?: string;
  missingDependencies: string[];
  missingModels: string[];
  message: string;
  checkedAt: string;
}

export interface MnemonicStoreMetadata {
  capturedAt?: string;
  wordCount?: number;
  source?: string;
}

export interface MnemonicStoreResult {
  success: boolean;
  message: string;
  words?: string[];
  wordCount?: number;
  metadata?: MnemonicStoreMetadata;
  shares?: string[][];
  shareCount?: number;
  threshold?: number;
  sequenceId?: string;
  walletType?: 'bip39' | 'slip39';
  flowType?: 'create' | 'import' | 'manual';
}

export type DevicePreparationMode = 'full' | 'sdkOnly' | 'deviceFlowOnly';

export const DEVICE_PREPARATION_MODE_INFO: Record<
  DevicePreparationMode,
  { label: string; description: string }
> = {
  full: {
    label: '完整流程',
    description: '重置钱包 → 创建/导入钱包 → SDK 测试（自动识别设备状态）',
  },
  sdkOnly: {
    label: '仅 SDK 测试',
    description: '设备已有正确钱包，跳过所有 PhonePilot，直接 SDK 测试',
  },
  deviceFlowOnly: {
    label: '仅设备流程',
    description: '仅执行重置 → 创建/导入序列，跳过所有 SDK 测试',
  },
};

export const ALL_DEVICE_PREPARATION_MODES: DevicePreparationMode[] = ['full', 'sdkOnly', 'deviceFlowOnly'];

export type JiraIssueKey = 'OK-26053' | 'OK-26054' | 'OK-5504' | 'OK-40090';
export type PassphraseVariantId = 'normal' | 'passphrase_empty' | 'passphrase_1' | 'passphrase_2';

export const PASSPHRASE_VARIANT_INFO: Record<
  PassphraseVariantId,
  { label: string; description: string }
> = {
  normal: { label: 'Normal', description: '标准钱包，不输入密码短语' },
  passphrase_empty: { label: 'Empty', description: '隐藏钱包，输入空字符串' },
  passphrase_1: { label: 'Passphrase 1', description: '场景绑定的第一组密码短语' },
  passphrase_2: { label: 'Passphrase 2', description: '场景绑定的第二组密码短语' },
};

export const ALL_PASSPHRASE_VARIANT_IDS: PassphraseVariantId[] = [
  'normal',
  'passphrase_empty',
  'passphrase_1',
  'passphrase_2',
];

export type TestSuiteType =
  | 'deviceFlow'
  | 'sdkAddressBatch'
  | 'sdkPubkeyBatch'
  | 'specialPassphrase'
  | 'securityCheck'
  | 'chainMethodBatch';

export const TEST_SUITE_INFO: Record<TestSuiteType, { label: string; description: string }> = {
  deviceFlow: {
    label: '设备流程',
    description: '通过 PhonePilot 执行设备端创建/导入钱包操作',
  },
  sdkAddressBatch: {
    label: '地址批量校验',
    description: '多链地址 SDK 查询 vs 预期值比对（含 passphrase 变体）',
  },
  sdkPubkeyBatch: {
    label: '公钥批量校验',
    description: '多链公钥 SDK 查询 vs 预期值比对（含 passphrase 变体）',
  },
  specialPassphrase: {
    label: '特殊密码短语',
    description: '9 组特殊字符 × 3 方法（BTC/EVM/DNX），mockDevice vs SDK',
  },
  securityCheck: {
    label: '安全检查',
    description: '盲签名安全检查：28 个链签名方法 × 合法/非法 coinType，验证 safetyChecks 行为',
  },
  chainMethodBatch: {
    label: '链方法批量测试',
    description: '5 条链（BTC/ETH/ADA/SOL/DOT）× 多方法 × presupposes，仅验证调用成功/失败',
  },
};

export type AutomationScenarioId =
  | 'bip39_import_12_api'
  | 'ok26053_bip39_create_12'
  | 'ok26053_bip39_create_18'
  | 'ok26053_bip39_create_24'
  | 'ok26054_bip39_import_12'
  | 'ok26054_bip39_import_12_two'
  | 'ok26054_bip39_import_12_three'
  | 'ok26054_bip39_import_18'
  | 'ok26054_bip39_import_18_two'
  | 'ok26054_bip39_import_18_three'
  | 'ok26054_bip39_import_24'
  | 'ok26054_bip39_import_24_two'
  | 'ok26054_bip39_import_24_three'
  | 'ok5504_slip39_create_20_1of1'
  | 'ok5504_slip39_create_20_2of2'
  | 'ok5504_slip39_create_20_8of8'
  | 'ok5504_slip39_create_20_16of2'
  | 'ok40090_slip39_import_20_1of1'
  | 'ok40090_slip39_import_20_3of2'
  | 'ok40090_slip39_import_20_16of16'
  | 'ok40090_slip39_import_33_1of1'
  | 'ok40090_slip39_import_33_2of3';

export type Slip39DatasetId =
  | 'count20_one'
  | 'count20_two'
  | 'count20_three'
  | 'count33_one'
  | 'count33_two';

export interface AutomationScenario {
  id: AutomationScenarioId;
  jiraKey: JiraIssueKey;
  title: string;
  flowType: 'create' | 'import';
  walletType: 'bip39' | 'slip39';
  caseLabel: string;
  wordCount: number;
  shareCount?: number;
  threshold?: number;
  phonePilotSequenceId: string;
  supportedSuites: TestSuiteType[];
  slip39DatasetId?: Slip39DatasetId;
  bip39ImportMnemonicWords?: string[];
}

export interface AutomationTestConfig {
  scenarioIds: AutomationScenarioId[];
  testSuites: TestSuiteType[];
  passphraseVariants: PassphraseVariantId[];
  phonePilotUrl: string;
  stopOnFirstError: boolean;
  retryCount: number;
  delayBetweenTests: number;
  devicePreparationMode: DevicePreparationMode;
}

export interface TestProgress {
  currentScenarioId: AutomationScenarioId | null;
  currentScenarioTitle: string | null;
  currentPassphrase: string | null;
  currentTestSuite: TestSuiteType | null;
  currentTestIndex: number;
  totalTests: number;
  completedTests: number;
  completedScenarios: number;
  totalScenarios: number;
  completedSuites: number;
  totalSuites: number;
  status: 'idle' | 'preparing-device' | 'running' | 'paused' | 'done' | 'error';
  errorMessage?: string;
}

export interface TestCaseResult {
  title: string;
  method?: string;
  expected?: string;
  actual?: string;
  passed: boolean;
  skipped?: boolean;
  error?: string;
  duration: number;
  metadata?: Record<string, string>;
}

export interface TestSuiteResult {
  suiteType: TestSuiteType;
  suiteName: string;
  status: 'passed' | 'failed' | 'skipped';
  totalTests: number;
  /** Pre-calculated expected total — set at suite start, stays fixed during live updates. */
  expectedTotalTests?: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  results: TestCaseResult[];
}

export interface ScenarioReportResult {
  scenarioId: AutomationScenarioId;
  scenarioTitle: string;
  jiraKey: JiraIssueKey;
  flowType: 'create' | 'import';
  walletType: 'bip39' | 'slip39';
  caseLabel: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  suiteResults: TestSuiteResult[];
}

export interface TestReport {
  startTime: number;
  endTime: number;
  duration: number;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  scenarioResults: ScenarioReportResult[];
}
