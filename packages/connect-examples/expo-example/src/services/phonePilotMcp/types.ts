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

export type TestSuiteType = 'deviceFlow' | 'sdkAddressBatch' | 'sdkPubkeyBatch';

export const TEST_SUITE_INFO: Record<TestSuiteType, { label: string; description: string }> = {
  deviceFlow: { label: 'Device Flow', description: 'PhonePilot 设备端创建/导入流程执行是否成功' },
  sdkAddressBatch: {
    label: 'SDK Address Batch',
    description: '仅导入助记词场景执行地址结果核对',
  },
  sdkPubkeyBatch: {
    label: 'SDK Pubkey Batch',
    description: '仅导入助记词场景执行公钥结果核对',
  },
};

export type AutomationScenarioId =
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
}

export interface TestProgress {
  currentScenarioId: AutomationScenarioId | null;
  currentScenarioTitle: string | null;
  currentPassphrase: string | null;
  currentTestSuite: TestSuiteType | null;
  currentTestIndex: number;
  totalTests: number;
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
