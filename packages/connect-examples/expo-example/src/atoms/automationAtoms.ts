/**
 * Automation Test State Management
 *
 * Jotai atoms for managing automation test state.
 */

import { atom } from 'jotai';
import type {
  AutomationTestConfig,
  TestProgress,
  TestReport,
  ConnectionState,
  MnemonicGroupId,
  TestSuiteType,
  PassphraseVariantId,
} from '../services/phonePilotMcp/types';

// ============================================================================
// PhonePilot Connection State
// ============================================================================

/** PhonePilot MCP connection state */
export const phonePilotConnectionStateAtom = atom<ConnectionState>('disconnected');

/** PhonePilot server URL */
export const phonePilotUrlAtom = atom<string>('http://localhost:3847');

/** Latest camera frame from PhonePilot (base64 JPEG) */
export const cameraFrameAtom = atom<string | null>(null);

// ============================================================================
// Automation Test Configuration
// ============================================================================

/** Default test configuration */
const defaultConfig: AutomationTestConfig = {
  testSuites: ['address'],
  mnemonicGroups: ['count24_one'],
  passphraseVariants: ['normal'],
  phonePilotUrl: 'http://localhost:3847',
  stopOnFirstError: false,
  retryCount: 1,
  delayBetweenTests: 500,
};

/** Automation test configuration */
export const automationConfigAtom = atom<AutomationTestConfig>(defaultConfig);

/** Selected test suites */
export const selectedTestSuitesAtom = atom(
  (get) => get(automationConfigAtom).testSuites,
  (get, set, newSuites: TestSuiteType[]) => {
    const config = get(automationConfigAtom);
    set(automationConfigAtom, { ...config, testSuites: newSuites });
  }
);

/** Selected mnemonic groups */
export const selectedMnemonicGroupsAtom = atom(
  (get) => get(automationConfigAtom).mnemonicGroups,
  (get, set, newGroups: MnemonicGroupId[]) => {
    const config = get(automationConfigAtom);
    set(automationConfigAtom, { ...config, mnemonicGroups: newGroups });
  }
);

/** Selected passphrase variants */
export const selectedPassphraseVariantsAtom = atom(
  (get) => get(automationConfigAtom).passphraseVariants,
  (get, set, newVariants: PassphraseVariantId[]) => {
    const config = get(automationConfigAtom);
    set(automationConfigAtom, { ...config, passphraseVariants: newVariants });
  }
);

// ============================================================================
// Test Execution State
// ============================================================================

/** Default progress state */
const defaultProgress: TestProgress = {
  currentMnemonicGroup: null,
  currentPassphrase: null,
  currentTestSuite: null,
  currentTestIndex: 0,
  totalTests: 0,
  completedMnemonicGroups: 0,
  totalMnemonicGroups: 0,
  status: 'idle',
};

/** Test execution progress */
export const automationProgressAtom = atom<TestProgress>(defaultProgress);

/** Reset progress to initial state */
export const resetProgressAtom = atom(null, (_get, set) => {
  set(automationProgressAtom, defaultProgress);
});

/** Update progress status */
export const updateProgressStatusAtom = atom(
  null,
  (get, set, status: TestProgress['status'], errorMessage?: string) => {
    const progress = get(automationProgressAtom);
    set(automationProgressAtom, { ...progress, status, errorMessage });
  }
);

// ============================================================================
// Test Results
// ============================================================================

/** Current test report */
export const automationReportAtom = atom<TestReport | null>(null);

/** Test logs */
export const automationLogsAtom = atom<string[]>([]);

/** Add a log entry */
export const addLogAtom = atom(null, (get, set, log: string) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const logs = get(automationLogsAtom);
  set(automationLogsAtom, [...logs, `[${timestamp}] ${log}`]);
});

/** Clear logs */
export const clearLogsAtom = atom(null, (_get, set) => {
  set(automationLogsAtom, []);
});

// ============================================================================
// Derived Atoms
// ============================================================================

/** Is automation test running */
export const isAutomationRunningAtom = atom((get) => {
  const progress = get(automationProgressAtom);
  return progress.status === 'running' || progress.status === 'preparing-device';
});

/** Is PhonePilot connected */
export const isPhonePilotConnectedAtom = atom((get) => {
  return get(phonePilotConnectionStateAtom) === 'connected';
});

/** Can start automation test */
export const canStartAutomationAtom = atom((get) => {
  const isConnected = get(isPhonePilotConnectedAtom);
  const isRunning = get(isAutomationRunningAtom);
  const config = get(automationConfigAtom);
  return (
    isConnected &&
    !isRunning &&
    config.mnemonicGroups.length > 0 &&
    config.testSuites.length > 0 &&
    config.passphraseVariants.length > 0
  );
});

/** Progress percentage */
export const progressPercentageAtom = atom((get) => {
  const progress = get(automationProgressAtom);
  if (progress.totalTests === 0) return 0;
  return Math.round((progress.currentTestIndex / progress.totalTests) * 100);
});
