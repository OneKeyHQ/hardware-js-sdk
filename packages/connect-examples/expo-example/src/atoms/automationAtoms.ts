/**
 * Automation Test State Management
 */

import { atom } from 'jotai';

import type {
  AutomationTestConfig,
  ConnectionState,
  HealthCheckResponse,
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
};

const defaultProgress: TestProgress = {
  currentScenarioId: null,
  currentScenarioTitle: null,
  currentPassphrase: null,
  currentTestSuite: null,
  currentTestIndex: 0,
  totalTests: 0,
  completedScenarios: 0,
  totalScenarios: 0,
  completedSuites: 0,
  totalSuites: 0,
  status: 'idle',
};

export const phonePilotConnectionStateAtom = atom<ConnectionState>('disconnected');
export const phonePilotHealthAtom = atom<HealthCheckResponse | null>(null);
export const cameraFrameAtom = atom<string | null>(null);
export const automationConfigAtom = atom<AutomationTestConfig>(defaultConfig);
export const automationProgressAtom = atom<TestProgress>(defaultProgress);
export const automationReportAtom = atom<TestReport | null>(null);
export const automationLogsAtom = atom<string[]>([]);

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
  return isConnected && !isRunning && config.scenarioIds.length > 0 && config.testSuites.length > 0;
});

export const progressPercentageAtom = atom(get => {
  const progress = get(automationProgressAtom);
  if (progress.totalSuites === 0) {
    return 0;
  }
  return Math.round((progress.completedSuites / progress.totalSuites) * 100);
});

export const reportFilterAtom = atom<'all' | 'failed'>('all');
export const reportExpandAllAtom = atom(false);
