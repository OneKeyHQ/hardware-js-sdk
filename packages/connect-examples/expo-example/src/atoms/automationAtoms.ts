/**
 * Automation Test State Management
 */

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import type {
  AutomationTestConfig,
  ConnectionState,
  HealthCheckResponse,
  ScenarioReportResult,
  TestProgress,
  TestReport,
} from '../services/phonePilotMcp/types';

const defaultConfig: AutomationTestConfig = {
  scenarioIds: ['ok26054_bip39_import_12', 'ok40090_slip39_import_20_1of1'],
  testSuites: ['deviceFlow', 'sdkAddressBatch', 'sdkPubkeyBatch'],
  passphraseVariants: ['normal', 'passphrase_2'],
  phonePilotUrl: process.env.EXPO_PUBLIC_PHONEPILOT_URL || 'http://localhost:3847',
  stopOnFirstError: false,
  retryCount: 1,
  delayBetweenTests: 500,
  devicePreparationMode: 'full',
};

const defaultProgress: TestProgress = {
  currentScenarioId: null,
  currentScenarioTitle: null,
  currentPassphrase: null,
  currentTestSuite: null,
  currentTestIndex: 0,
  totalTests: 0,
  completedTests: 0,
  completedScenarios: 0,
  totalScenarios: 0,
  completedSuites: 0,
  totalSuites: 0,
  status: 'idle',
};

export const phonePilotConnectionStateAtom = atom<ConnectionState>('disconnected');
export const phonePilotHealthAtom = atom<HealthCheckResponse | null>(null);
export const cameraFrameAtom = atom<string | null>(null);
export const automationConfigAtom = atomWithStorage<AutomationTestConfig>(
  'automation-test-config',
  defaultConfig
);
export const automationProgressAtom = atom<TestProgress>(defaultProgress);
export const automationReportAtom = atom<TestReport | null>(null);
export const liveReportAtom = atom<TestReport | null>(null);
export const automationLogsAtom = atom<string[]>([]);

export const initLiveReportAtom = atom(
  null,
  (_get, set, params: { totalScenarios: number; startTime: number }) => {
    set(liveReportAtom, {
      startTime: params.startTime,
      endTime: params.startTime,
      duration: 0,
      totalScenarios: params.totalScenarios,
      passedScenarios: 0,
      failedScenarios: 0,
      skippedScenarios: 0,
      scenarioResults: [],
    });
  }
);

export const updateLiveScenarioAtom = atom(
  null,
  (get, set, scenarioResult: ScenarioReportResult) => {
    const current = get(liveReportAtom);
    const now = Date.now();

    if (!current) {
      set(liveReportAtom, {
        startTime: now,
        endTime: now,
        duration: 0,
        totalScenarios: 1,
        passedScenarios: scenarioResult.status === 'passed' ? 1 : 0,
        failedScenarios: scenarioResult.status === 'failed' ? 1 : 0,
        skippedScenarios: scenarioResult.status === 'skipped' ? 1 : 0,
        scenarioResults: [scenarioResult],
      });
      return;
    }

    const existing = current.scenarioResults.findIndex(
      s => s.scenarioId === scenarioResult.scenarioId
    );
    const scenarioResults =
      existing >= 0
        ? current.scenarioResults.map((s, i) => (i === existing ? scenarioResult : s))
        : [...current.scenarioResults, scenarioResult];

    set(liveReportAtom, {
      startTime: current.startTime,
      endTime: now,
      duration: now - current.startTime,
      totalScenarios: current.totalScenarios,
      passedScenarios: scenarioResults.filter(s => s.status === 'passed').length,
      failedScenarios: scenarioResults.filter(s => s.status === 'failed').length,
      skippedScenarios: scenarioResults.filter(s => s.status === 'skipped').length,
      scenarioResults,
    });
  }
);

export const effectiveReportAtom = atom<TestReport | null>(get => {
  const live = get(liveReportAtom);
  if (live && live.scenarioResults.length > 0) {
    return live;
  }
  return get(automationReportAtom);
});

const MAX_LOG_ENTRIES = 2000;

export const addLogAtom = atom(null, (get, set, log: string) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const logs = get(automationLogsAtom);
  const next = [...logs, `[${timestamp}] ${log}`];
  set(automationLogsAtom, next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next);
});

export const clearLogsAtom = atom(null, (_get, set) => {
  set(automationLogsAtom, []);
});

export const resetProgressAtom = atom(null, (_get, set) => {
  set(automationProgressAtom, defaultProgress);
});

export const isAutomationRunningAtom = atom(get => {
  const progress = get(automationProgressAtom);
  return progress.status === 'running' || progress.status === 'preparing-device';
});

export const canStartAutomationAtom = atom(get => {
  const isConnected = get(phonePilotConnectionStateAtom) === 'connected';
  const isRunning = get(isAutomationRunningAtom);
  const config = get(automationConfigAtom);
  // deviceFlowOnly always runs only deviceFlow suite, testSuites selection is irrelevant
  const hasScenarios = config.scenarioIds.length > 0 &&
    (config.devicePreparationMode === 'deviceFlowOnly' || config.testSuites.length > 0);
  if (config.devicePreparationMode === 'sdkOnly') {
    return !isRunning && hasScenarios;
  }
  return isConnected && !isRunning && hasScenarios;
});

export const progressPercentageAtom = atom(get => {
  const progress = get(automationProgressAtom);
  if (progress.totalTests > 0) {
    return Math.round((progress.completedTests / progress.totalTests) * 100);
  }
  if (progress.totalSuites === 0) {
    return 0;
  }
  return Math.round((progress.completedSuites / progress.totalSuites) * 100);
});

export const reportFilterAtom = atom<'all' | 'failed'>('all');
export const reportExpandAllAtom = atom(false);
