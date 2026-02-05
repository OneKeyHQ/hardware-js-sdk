/**
 * PhonePilot MCP Client Type Definitions
 */

/** MCP Tool call result */
export interface McpToolResult<T = unknown> {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  result?: T;
}

/** Arm connect result */
export interface ArmConnectResult {
  success: boolean;
  handle: number;
  message: string;
}

/** Arm disconnect result */
export interface ArmDisconnectResult {
  success: boolean;
  message: string;
}

/** Arm move result */
export interface ArmMoveResult {
  success: boolean;
  position: { x: number; y: number };
  message: string;
  frame?: string; // base64 JPEG if captureFrame was true
}

/** Arm click result */
export interface ArmClickResult {
  success: boolean;
  message: string;
  frame?: string; // base64 JPEG if captureFrame was true
}

/** Capture frame result */
export interface CaptureFrameResult {
  success: boolean;
  message: string;
  frame?: string; // base64 JPEG
}

/** Device preparation parameters */
export interface PrepareDeviceParams {
  /** Type of test setup */
  testType: 'standard' | 'passphrase' | 'slip39' | 'pin';
  /** Standard mnemonic words */
  mnemonic?: string[];
  /** SLIP39 shares (array of word arrays) */
  slip39Shares?: string[][];
  /** Optional passphrase */
  passphrase?: string;
  /** Optional PIN */
  pin?: string;
}

/** Device preparation result */
export interface PrepareDeviceResult {
  success: boolean;
  message: string;
}

/** Confirm/Cancel action params */
export interface ConfirmActionParams {
  action: 'confirm' | 'cancel';
}

/** Action result */
export interface ActionResult {
  success: boolean;
  message: string;
}

/** PhonePilot connection state */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** PhonePilot health check response */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  server: string;
  version: string;
  activeSessions: {
    streamable: number;
    sse: number;
  };
}

/** Mnemonic group identifier */
export type MnemonicGroupId =
  | 'count12_one'
  | 'count12_two'
  | 'count12_three'
  | 'count18_one'
  | 'count18_two'
  | 'count18_three'
  | 'count24_one'
  | 'count24_two'
  | 'count24_three'
  | 'slip39_20_one'
  | 'slip39_20_two'
  | 'slip39_20_three'
  | 'slip39_33_one'
  | 'slip39_33_two';

/** Mnemonic group configuration */
export interface MnemonicGroup {
  id: MnemonicGroupId;
  name: string;
  type: 'standard' | 'slip39';
  wordCount: number;
  /** For standard mnemonic */
  mnemonic?: string[];
  /** For SLIP39 */
  slip39Shares?: string[][];
  /** PhonePilot sequence ID for this mnemonic */
  phonePilotSequenceId: string;
}

/** Passphrase variant */
export interface PassphraseVariant {
  name: string;
  passphrase: string;
  passphraseState: string;
}

/** Passphrase variant identifier */
export type PassphraseVariantId = 'normal' | 'passphrase_empty' | 'passphrase_1' | 'passphrase_2';

/** Passphrase variant display info */
export const PASSPHRASE_VARIANT_INFO: Record<PassphraseVariantId, { label: string; description: string }> = {
  normal: { label: 'Normal', description: '无 Passphrase' },
  passphrase_empty: { label: 'Empty', description: '空字符串 Passphrase' },
  passphrase_1: { label: 'Passphrase 1', description: 'asdfg7890' },
  passphrase_2: { label: 'Passphrase 2', description: '1234567890qwerty...' },
};

/** Test suite type */
export type TestSuiteType =
  | 'address'
  | 'pubkey'
  | 'passphrase'
  | 'slip39'
  | 'security'
  | 'functional'
  | 'attachToPin'
  | 'chainMethod';

/** Automation test configuration */
export interface AutomationTestConfig {
  /** Test suites to run */
  testSuites: TestSuiteType[];
  /** Mnemonic groups to test */
  mnemonicGroups: MnemonicGroupId[];
  /** Passphrase variants to test */
  passphraseVariants: PassphraseVariantId[];
  /** PhonePilot server URL */
  phonePilotUrl: string;
  /** Stop on first error */
  stopOnFirstError: boolean;
  /** Retry count for failed tests */
  retryCount: number;
  /** Delay between tests in ms */
  delayBetweenTests: number;
}

/** Test progress state */
export interface TestProgress {
  currentMnemonicGroup: MnemonicGroupId | null;
  currentPassphrase: string | null;
  currentTestSuite: TestSuiteType | null;
  currentTestIndex: number;
  totalTests: number;
  completedMnemonicGroups: number;
  totalMnemonicGroups: number;
  status: 'idle' | 'preparing-device' | 'running' | 'paused' | 'done' | 'error';
  errorMessage?: string;
}

/** Test case result */
export interface TestCaseResult {
  testName: string;
  method: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/** Test suite result */
export interface TestSuiteResult {
  suiteName: string;
  mnemonicGroup: MnemonicGroupId;
  passphrase: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  results: TestCaseResult[];
}

/** Complete test report */
export interface TestReport {
  startTime: number;
  endTime: number;
  duration: number;
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  suiteResults: TestSuiteResult[];
}
