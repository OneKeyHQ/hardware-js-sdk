/**
 * useAutomationTest Hook
 */

import { useCallback, useContext, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { OpenWalletSessionMode, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { getAllAutomationScenarios, getAutomationScenario } from './scenarioCatalog';
import { convertTestData, getDeviceExpected } from '../securityCheckTest/blindSignature/utils';
import securityCheckData from '../securityCheckTest/blindSignature/data';
import { chainTestData } from '../chainMethodTest/data';
import {
  type AutomationSdkCase,
  type AutomationSdkMethodCase,
  getScenarioPassphraseLiteral,
  getSlip39CreateTemplateCase,
  resolveBip39ImportSdkCases,
  resolveSlip39SdkCases,
} from './scenarioResolver';
import { compatibilityManager } from '../deviceCompatibility/DeviceCompatibility';
import '../deviceCompatibility/plugins';
import { PhonePilotClient } from '../../services/phonePilotMcp';
import {
  addLogAtom,
  automationConfigAtom,
  automationLogsAtom,
  automationProgressAtom,
  automationReportAtom,
  cameraFrameAtom,
  clearLogsAtom,
  effectiveReportAtom,
  initLiveReportAtom,
  liveReportAtom,
  phonePilotConnectionStateAtom,
  phonePilotHealthAtom,
  resetProgressAtom,
  updateLiveScenarioAtom,
} from '../../atoms/automationAtoms';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../../utils/mockDevice/helper';
import {
  getProtocolAwareFeatures,
  isPassphraseProtectionEnabled,
} from '../../utils/protocolAwareFeatures';
import { executeProtocolAwareMethod } from '../../utils/protocolAwareMethod';
import { generateAptosPublicKeyFromSeed } from '../../utils/mockDevice/method/aptosGetPublicKey';
import { generateEvmAddressFromSeed } from '../../utils/mockDevice/method/evmGetAddress';
import {
  generateMultiChainAddressFromSLIP39,
  generateMultiChainPublicKeyFromSLIP39,
} from '../slip39Test/slip39Utils';
import {
  type AutomationScenario,
  type HealthCheckResponse,
  type MnemonicStoreResult,
  type PassphraseVariantId,
  STANDALONE_MODULE_SCENARIO_ID,
  STANDALONE_TEST_SUITES,
  type ScenarioReportResult,
  type TestCaseResult,
  type TestReport,
  type TestSuiteResult,
  type TestSuiteType,
} from '../../services/phonePilotMcp/types';

import type {
  CoreApi,
  CoreMessage,
  UiRequestDeviceAction,
  UiRequestPassphrase,
} from '@onekeyfe/hd-core';
import type { SLIP39MethodData, SLIP39TestCaseData } from '../slip39Test/types';

const SUITE_EXECUTION_ORDER: TestSuiteType[] = [
  'deviceFlow',
  'sdkAddressBatch',
  'sdkPubkeyBatch',
  'specialPassphrase',
  'securityCheck',
  'chainMethodBatch',
];
const EVM_ADDRESS_PATH = "m/44'/60'/0'/0/0";

const getFeaturesProtocol = (features?: Record<string, unknown>) => {
  const protocol = features?.protocol;
  return protocol === 'V1' || protocol === 'V2' ? protocol : undefined;
};
const BIP39_CREATE_PUBKEY_PROBES: Array<{
  method: string;
  caseName: string;
  path: string;
}> = [
  {
    method: 'btcGetPublicKey',
    caseName: 'btcGetPublicKey-pubkey',
    path: "m/44'/0'/0'/0/0",
  },
  {
    method: 'btcGetPublicKey',
    caseName: 'btcGetPublicKey-xpub',
    path: "m/44'/0'/0'",
  },
  {
    method: 'evmGetPublicKey',
    caseName: 'evmGetPublicKey-pubkey',
    path: EVM_ADDRESS_PATH,
  },
  {
    method: 'evmGetPublicKey',
    caseName: 'evmGetPublicKey-xpub',
    path: "m/44'/60'/0'",
  },
  {
    method: 'aptosGetPublicKey',
    caseName: 'aptosGetPublicKey',
    path: "m/44'/637'/0'/0'/0'",
  },
];
const SLIP39_CREATE_ALLOWED_VARIANTS: PassphraseVariantId[] = ['normal', 'passphrase_2'];
const RESET_SEQUENCE_LOCKED = 'reset-wallet-locked';
const RESET_SEQUENCE_UNLOCKED = 'reset-wallet-unlocked';
const DEBUG_SKIP_DEVICE_FLOW_REASON = 'debug mode skipped device flow';

/**
 * Timing constants — aligned with SLIP39 standalone test timings.
 * After a wallet import/create sequence the device needs time to persist
 * state before it can respond to Initialize commands.
 */
const CONFIRM_ACTION_DELAY_MS = 900;
const CONFIRM_ACTION_STEP_DELAY_MS = 1000;
const POST_SEQUENCE_SETTLE_MS = 3000;
/** Extra settle time between device preparation (import/create) and the first SDK call. */
const PRE_SDK_SETTLE_MS = 3000;
const SDK_CASE_DELAY_MS = 80;
const DEVICE_FLOW_ONLY_SUITES: TestSuiteType[] = ['deviceFlow'];
type DeviceUiAction = 'confirm' | 'slide';

type AutomationRunMode = 'full' | 'debug';
type RetryCaseSelection = Map<AutomationScenario['id'], Map<TestSuiteType, Set<string>>>;

interface PreparationResult {
  success: boolean;
  suiteResult: TestSuiteResult;
  mnemonicStoreResult: MnemonicStoreResult | null;
}

interface DebugScenarioDecision {
  matched: boolean;
  reason?: string;
}

interface DebugRunContext {
  deviceId: string;
  currentEvmAddress: string;
  mnemonicStoreResult: MnemonicStoreResult | null;
  scenarioDecisions: Map<string, DebugScenarioDecision>;
}

interface SingleSecurityCheckCaseInput {
  id: string;
  title: string;
  method: string;
  params: Record<string, unknown>;
  expectedResult: boolean;
  confirmCount: number;
  slideCount: number;
}

interface SingleChainMethodCaseInput {
  id: string;
  title: string;
  method: string;
  params: Record<string, unknown>;
  confirmCount: number;
  slideCount: number;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function createSuiteResult(
  suiteType: TestSuiteType,
  suiteName: string,
  results: TestCaseResult[],
  duration: number
): TestSuiteResult {
  const skippedTests = results.filter(item => item.skipped).length;
  const failedTests = results.filter(item => !item.passed && !item.skipped).length;
  const passedTests = results.filter(item => item.passed).length;
  let status: TestSuiteResult['status'] = 'passed';

  if (results.length === 0 || skippedTests === results.length) {
    status = 'skipped';
  } else if (failedTests > 0) {
    status = 'failed';
  }

  return {
    suiteType,
    suiteName,
    status,
    totalTests: results.length,
    passedTests,
    failedTests,
    skippedTests,
    duration,
    results,
  };
}

function createSkippedSuiteResult(
  suiteType: TestSuiteType,
  suiteName: string,
  reason: string
): TestSuiteResult {
  return createSuiteResult(
    suiteType,
    suiteName,
    [
      {
        title: suiteName,
        passed: false,
        skipped: true,
        error: reason,
        duration: 0,
      },
    ],
    0
  );
}

function createFailureSuiteResult(
  suiteType: TestSuiteType,
  suiteName: string,
  reason: string
): TestSuiteResult {
  return createSuiteResult(
    suiteType,
    suiteName,
    [
      {
        title: suiteName,
        passed: false,
        error: reason,
        duration: 0,
      },
    ],
    0
  );
}

function extractPublicKeyValue(payload: unknown, method: string, caseName?: string): string {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }

  const normalizedPayload = payload as {
    publicKey?: string;
    xpub?: string;
    public_key?: string;
    pub?: string;
    publickey?: string;
    node?: { public_key?: string };
    message?: {
      node?: { public_key?: string };
      public_keys?: string[];
    };
  };

  const lowerCaseName = (caseName || '').toLowerCase();
  const expectXpub = lowerCaseName.includes('xpub');
  const expectPubkey = lowerCaseName.includes('pubkey');

  if (expectXpub) {
    return String(normalizedPayload.xpub || '');
  }

  if (expectPubkey) {
    return String(
      normalizedPayload.publicKey ||
        normalizedPayload.public_key ||
        normalizedPayload.pub ||
        normalizedPayload.publickey ||
        normalizedPayload.node?.public_key ||
        normalizedPayload.message?.node?.public_key ||
        normalizedPayload.message?.public_keys?.[0] ||
        normalizedPayload.xpub ||
        ''
    );
  }

  if (method === 'cardanoGetPublicKey') {
    return String(normalizedPayload.xpub || '');
  }

  return String(
    normalizedPayload.publicKey ||
      normalizedPayload.public_key ||
      normalizedPayload.pub ||
      normalizedPayload.publickey ||
      normalizedPayload.node?.public_key ||
      normalizedPayload.message?.node?.public_key ||
      normalizedPayload.message?.public_keys?.[0] ||
      normalizedPayload.xpub ||
      ''
  );
}

function extractAddressValue(payload: unknown): string {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }

  const normalizedPayload = payload as {
    address?: string;
    payload?: { address?: string };
  };

  return String(normalizedPayload.address || normalizedPayload.payload?.address || '');
}

function normalizeComparisonValue(
  value: string,
  caseType: 'address' | 'pubkey',
  method: string,
  caseName?: string
): string {
  if (!value) {
    return '';
  }

  if (caseType === 'pubkey') {
    const lowerCaseName = (caseName || '').toLowerCase();
    if (
      method === 'evmGetPublicKey' &&
      !lowerCaseName.includes('xpub') &&
      !value.startsWith('0x')
    ) {
      return `0x${value}`;
    }
    if (method === 'suiGetPublicKey' && value.length === 64) {
      return `00${value}`;
    }
  }

  return value;
}

function extractComparisonValue(
  payload: unknown,
  caseType: 'address' | 'pubkey',
  method: string,
  caseName?: string
): string {
  const rawValue =
    caseType === 'address'
      ? extractAddressValue(payload)
      : extractPublicKeyValue(payload, method, caseName);
  return normalizeComparisonValue(rawValue, caseType, method, caseName);
}

function formatPassphraseDisplay(passphrase?: string): string {
  if (passphrase === undefined) {
    return '(none)';
  }
  if (passphrase === '') {
    return '(empty)';
  }
  return passphrase;
}

function normalizeMnemonicWords(words?: string[]): string[] {
  return (words || []).map(word => word.trim()).filter(Boolean);
}

function normalizeSlip39Shares(shares?: string[][]): string[] {
  return (shares || [])
    .map(share =>
      share
        .map(word => word.trim())
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean);
}

function buildBip39CreateExpectedValue(
  method: string,
  caseName: string,
  seed: Buffer,
  path: string
): string {
  if (method === 'evmGetAddress') {
    return generateEvmAddressFromSeed(seed, path);
  }

  if (method === 'aptosGetPublicKey') {
    return extractComparisonValue(
      { publicKey: generateAptosPublicKeyFromSeed(seed, path) },
      'pubkey',
      method,
      caseName
    );
  }

  const keyPair = deriveKeyPairWithPath(seed, path, 'secp256k1');
  const publicKey = keyPair.publicKey ? Buffer.from(keyPair.publicKey).toString('hex') : '';
  const xpub = (keyPair as { publicExtendedKey?: string }).publicExtendedKey || '';

  if (method === 'btcGetPublicKey') {
    return extractComparisonValue(
      { xpub, node: { public_key: publicKey } },
      'pubkey',
      method,
      caseName
    );
  }

  if (method === 'evmGetPublicKey') {
    return extractComparisonValue(
      { publicKey: `0x${publicKey}`, xpub },
      'pubkey',
      method,
      caseName
    );
  }

  return '';
}

function extractExpectedByPath(
  expectedByPath: Record<string, unknown>,
  expectedPath: string,
  caseType: 'address' | 'pubkey',
  method: string,
  caseName?: string
): string {
  return extractComparisonValue(expectedByPath[expectedPath], caseType, method, caseName);
}

function buildSdkParamsForPath(methodCase: AutomationSdkMethodCase, expectedPath: string): any {
  const bundle = methodCase.params?.bundle;
  if (Array.isArray(bundle)) {
    const matchedParams = bundle.find(
      (item: any) => item?.path === expectedPath || item?.addressParameters?.path === expectedPath
    );
    if (!matchedParams) {
      throw new Error(
        `Missing bundle params for ${methodCase.name || methodCase.method} / ${expectedPath}`
      );
    }
    return {
      ...matchedParams,
      showOnOneKey: false,
    };
  }

  if (methodCase.params?.addressParameters?.path) {
    return {
      ...methodCase.params,
      showOnOneKey: false,
    };
  }

  return {
    ...(methodCase.params || {}),
    path: expectedPath,
    showOnOneKey: false,
  };
}

function getSuiteName(suiteType: TestSuiteType): string {
  const names: Record<TestSuiteType, string> = {
    deviceFlow: 'Device Flow',
    sdkAddressBatch: 'SDK Address Batch',
    sdkPubkeyBatch: 'SDK Pubkey Batch',
    specialPassphrase: 'Special Passphrase',
    securityCheck: 'Security Check',
    chainMethodBatch: 'Chain Method Batch',
  };
  return names[suiteType] || suiteType;
}

async function fetchDeviceFeatures(
  sdk: CoreApi,
  connectId: string
): Promise<Record<string, unknown> | undefined> {
  const result = await getProtocolAwareFeatures(sdk, connectId);
  return result.success ? result.payload : undefined;
}

function withMainWalletCommonParams<T>(params: T, forceUseEmptyPassphrase: boolean): T {
  if (!forceUseEmptyPassphrase || !params || typeof params !== 'object') {
    return params;
  }

  return {
    ...(params as Record<string, unknown>),
    useEmptyPassphrase: true,
  } as T;
}

function getBip39ImportProbeAddress(scenario: AutomationScenario): string {
  const sdkCase = resolveBip39ImportSdkCases(scenario, ['normal'], 'address')[0];

  if (sdkCase) {
    for (const methodData of sdkCase.data) {
      if (methodData.method === 'evmGetAddress') {
        return extractExpectedByPath(
          methodData.expectedByPath,
          EVM_ADDRESS_PATH,
          'address',
          methodData.method,
          methodData.name
        );
      }
    }
  }

  if (!scenario.bip39ImportMnemonicWords?.length) {
    return '';
  }

  const seed = mnemonicToSeed(scenario.bip39ImportMnemonicWords.join(' '));
  return generateEvmAddressFromSeed(seed, EVM_ADDRESS_PATH);
}

function getSlip39ImportProbeAddress(scenario: AutomationScenario): string {
  const slip39Cases = resolveSlip39SdkCases(scenario, ['normal'], 'address');
  for (const slip39Case of slip39Cases) {
    for (const methodData of slip39Case.data) {
      if (methodData.method === 'evmGetAddress') {
        const expected = methodData.expectedAddress?.[EVM_ADDRESS_PATH];
        if (expected) {
          return expected;
        }
      }
    }
  }

  return '';
}

function buildScenarioStatus(suiteResults: TestSuiteResult[]): ScenarioReportResult['status'] {
  if (suiteResults.length === 0 || suiteResults.every(item => item.status === 'skipped')) {
    return 'skipped';
  }
  if (suiteResults.some(item => item.status === 'failed')) {
    return 'failed';
  }
  return 'passed';
}

function buildScenarioReport(
  scenario: AutomationScenario,
  suiteResults: TestSuiteResult[],
  duration: number,
  status?: ScenarioReportResult['status']
): ScenarioReportResult {
  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    jiraKey: scenario.jiraKey,
    flowType: scenario.flowType,
    walletType: scenario.walletType,
    caseLabel: scenario.caseLabel,
    status: status || buildScenarioStatus(suiteResults),
    duration,
    suiteResults,
  };
}

function buildSelectedSuites(
  scenario: AutomationScenario,
  selectedSuites: TestSuiteType[]
): TestSuiteType[] {
  const resolved = SUITE_EXECUTION_ORDER.filter(
    suiteType => selectedSuites.includes(suiteType) && scenario.supportedSuites.includes(suiteType)
  );

  if (scenario.id === STANDALONE_MODULE_SCENARIO_ID) {
    return resolved;
  }

  return resolved.filter(suiteType => !STANDALONE_TEST_SUITES.includes(suiteType));
}

function hasStandaloneSuiteSelection(selectedSuites: TestSuiteType[]): boolean {
  return selectedSuites.some(suiteType => STANDALONE_TEST_SUITES.includes(suiteType));
}

function buildEffectiveSelectedScenarios(
  scenarioIds: AutomationScenario['id'][],
  selectedSuites: TestSuiteType[]
): AutomationScenario[] {
  const scenarioMap = new Map<AutomationScenario['id'], AutomationScenario>();

  scenarioIds
    .filter(id => id !== STANDALONE_MODULE_SCENARIO_ID)
    .forEach(id => {
      scenarioMap.set(id, getAutomationScenario(id));
    });

  if (hasStandaloneSuiteSelection(selectedSuites)) {
    scenarioMap.set(
      STANDALONE_MODULE_SCENARIO_ID,
      getAutomationScenario(STANDALONE_MODULE_SCENARIO_ID)
    );
  }

  return Array.from(scenarioMap.values());
}

function countSdkCasePaths(
  scenario: AutomationScenario,
  suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
  passphraseVariants: PassphraseVariantId[]
): number {
  const caseType = suiteType === 'sdkAddressBatch' ? 'address' : 'pubkey';
  let count = 0;

  if (scenario.walletType === 'bip39' && scenario.flowType === 'import') {
    const cases = resolveBip39ImportSdkCases(scenario, passphraseVariants, caseType);
    for (const sdkCase of cases) {
      for (const methodCase of sdkCase.data) {
        count += Object.keys(methodCase.expectedByPath || {}).length;
      }
    }
  } else if (scenario.walletType === 'bip39' && scenario.flowType === 'create') {
    const probes =
      suiteType === 'sdkAddressBatch'
        ? [{ method: 'evmGetAddress', caseName: 'evmGetAddress', path: EVM_ADDRESS_PATH }]
        : BIP39_CREATE_PUBKEY_PROBES;
    count = probes.length * passphraseVariants.length;
  } else if (scenario.walletType === 'slip39' && scenario.flowType === 'import') {
    const cases = resolveSlip39SdkCases(scenario, passphraseVariants, caseType);
    for (const slip39Case of cases) {
      for (const methodData of slip39Case.data) {
        const expectedMap =
          caseType === 'address' ? methodData.expectedAddress : methodData.expectedPublicKey;
        count += Object.keys(expectedMap || {}).length;
      }
    }
  } else if (scenario.walletType === 'slip39' && scenario.flowType === 'create') {
    const templateCase = getSlip39CreateTemplateCase(caseType);
    const variantIds = passphraseVariants.filter(v => SLIP39_CREATE_ALLOWED_VARIANTS.includes(v));
    if (templateCase && variantIds.length > 0) {
      let pathsPerVariant = 0;
      for (const methodData of templateCase.data) {
        const expectedMap =
          caseType === 'address' ? methodData.expectedAddress : methodData.expectedPublicKey;
        pathsPerVariant += Object.keys(expectedMap || {}).length;
      }
      count = pathsPerVariant * variantIds.length;
    }
  }

  return count;
}

function countChainMethodBatchTests(): number {
  return chainTestData.reduce((sum, chain) => {
    const chainCount = (chain.data as { presupposes?: unknown[] }[]).reduce(
      (s2, entry) => s2 + (entry.presupposes?.length ?? 0),
      0
    );
    return sum + chainCount;
  }, 0);
}

function countScenarioTotalTests(
  scenario: AutomationScenario,
  selectedSuites: TestSuiteType[],
  passphraseVariants: PassphraseVariantId[]
): number {
  let total = 0;
  for (const suiteType of selectedSuites) {
    if (suiteType === 'deviceFlow') {
      total += 1;
    } else if (suiteType === 'specialPassphrase') {
      if (
        scenario.supportedSuites.includes('specialPassphrase') &&
        scenario.bip39ImportMnemonicWords
      ) {
        total += 9 * 3; // 9 passphrases × 3 methods
      }
    } else if (suiteType === 'securityCheck') {
      total += convertTestData(securityCheckData).data.length;
    } else if (suiteType === 'chainMethodBatch') {
      total += countChainMethodBatchTests();
    } else {
      total += countSdkCasePaths(scenario, suiteType, passphraseVariants);
    }
  }
  return total;
}

function shouldStopBySuiteFailure(
  stopOnFirstError: boolean,
  suiteResults: TestSuiteResult[]
): boolean {
  return stopOnFirstError && suiteResults.some(item => item.status === 'failed');
}

function buildFailedCaseSelection(report: TestReport): RetryCaseSelection {
  const selection: RetryCaseSelection = new Map();

  report.scenarioResults.forEach(scenario => {
    scenario.suiteResults.forEach(suite => {
      const failedTitles = suite.results
        .filter(item => !item.passed && !item.skipped)
        .map(item => item.title);

      if (failedTitles.length === 0) {
        return;
      }

      const suiteSelection = selection.get(scenario.scenarioId) ?? new Map();
      suiteSelection.set(suite.suiteType, new Set(failedTitles));
      selection.set(scenario.scenarioId, suiteSelection);
    });
  });

  return selection;
}

function getRetrySuiteFilter(
  retrySelection: RetryCaseSelection | undefined,
  scenarioId: AutomationScenario['id'],
  suiteType: TestSuiteType
): Set<string> | undefined {
  return retrySelection?.get(scenarioId)?.get(suiteType);
}

function countRetrySelectionTests(retrySelection: RetryCaseSelection): number {
  let total = 0;
  retrySelection.forEach(suiteSelection => {
    suiteSelection.forEach(caseTitles => {
      total += caseTitles.size;
    });
  });
  return total;
}

function hasMatchingRetryTitle(
  filterTitles: Set<string> | undefined,
  predicate: (title: string) => boolean
): boolean {
  if (!filterTitles) {
    return true;
  }

  return Array.from(filterTitles).some(predicate);
}

export function useAutomationTest() {
  const [connectionState, setConnectionState] = useAtom(phonePilotConnectionStateAtom);
  const config = useAtomValue(automationConfigAtom);
  const currentReport = useAtomValue(effectiveReportAtom);
  const [progress, setProgress] = useAtom(automationProgressAtom);
  const setReport = useSetAtom(automationReportAtom);
  const setLiveReport = useSetAtom(liveReportAtom);
  const initLiveReport = useSetAtom(initLiveReportAtom);
  const updateLiveScenario = useSetAtom(updateLiveScenarioAtom);
  const logs = useAtomValue(automationLogsAtom);
  const addLog = useSetAtom(addLogAtom);
  const clearLogs = useSetAtom(clearLogsAtom);
  const resetProgress = useSetAtom(resetProgressAtom);
  const setCameraFrame = useSetAtom(cameraFrameAtom);
  const setPhonePilotHealth = useSetAtom(phonePilotHealthAtom);

  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const clientRef = useRef<PhonePilotClient | null>(null);
  const runningRef = useRef(false);
  const currentPassphraseRef = useRef('');
  const lastUrlRef = useRef(config.phonePilotUrl);
  const phonePilotHealthRef = useRef<HealthCheckResponse | null>(null);
  const singleSecurityCheckPreparedRef = useRef<{ connectId: string; deviceId: string } | null>(
    null
  );
  const pendingUiActionRef = useRef<{
    suite: 'deviceSettings' | 'securityCheck' | 'chainMethodBatch';
    label: string;
    actions: DeviceUiAction[];
    total: number;
  } | null>(null);

  const deviceFeaturesRef = useRef<Record<string, unknown> | undefined>(undefined);

  const liveScenarioCtxRef = useRef<{
    scenario: AutomationScenario;
    startedAt: number;
    completedSuiteResults: TestSuiteResult[];
  } | null>(null);

  /**
   * Throttle live-report UI updates: flush at most once per LIVE_UPDATE_INTERVAL_MS,
   * or every LIVE_UPDATE_BATCH_SIZE cases, whichever comes first.
   * This prevents O(n²) re-renders when a suite has hundreds of cases.
   */
  const LIVE_UPDATE_INTERVAL_MS = 1000;
  const LIVE_UPDATE_BATCH_SIZE = 10;
  const liveUpdatePendingRef = useRef<{
    suiteType: TestSuiteType;
    suiteName: string;
    results: TestCaseResult[];
    expectedTotal: number;
    lastFlushedAt: number;
    pendingCount: number;
  } | null>(null);
  const liveUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushLiveUpdate = useCallback(() => {
    if (liveUpdateTimerRef.current) {
      clearTimeout(liveUpdateTimerRef.current);
      liveUpdateTimerRef.current = null;
    }
    const pending = liveUpdatePendingRef.current;
    if (!pending) return;
    const ctx = liveScenarioCtxRef.current;
    if (!ctx) return;
    const partialSuite = createSuiteResult(
      pending.suiteType,
      pending.suiteName,
      pending.results,
      Date.now() - ctx.startedAt
    );
    partialSuite.expectedTotalTests = pending.expectedTotal || partialSuite.totalTests;
    const allSuites = [...ctx.completedSuiteResults, partialSuite];
    const report = buildScenarioReport(ctx.scenario, allSuites, Date.now() - ctx.startedAt);
    updateLiveScenario(report);
    pending.lastFlushedAt = Date.now();
    pending.pendingCount = 0;
  }, [updateLiveScenario]);

  const notifyLiveCaseUpdate = useCallback(
    (
      suiteType: TestSuiteType,
      suiteName: string,
      partialResults: TestCaseResult[],
      expectedTotal?: number
    ) => {
      if (!liveScenarioCtxRef.current) return;

      const now = Date.now();
      if (!liveUpdatePendingRef.current || liveUpdatePendingRef.current.suiteType !== suiteType) {
        liveUpdatePendingRef.current = {
          suiteType,
          suiteName,
          results: partialResults,
          expectedTotal: expectedTotal ?? partialResults.length,
          lastFlushedAt: now,
          pendingCount: 0,
        };
      } else {
        liveUpdatePendingRef.current.results = partialResults;
        if (expectedTotal !== undefined) {
          liveUpdatePendingRef.current.expectedTotal = expectedTotal;
        }
      }
      liveUpdatePendingRef.current.pendingCount += 1;

      const pending = liveUpdatePendingRef.current;
      const shouldFlushNow =
        pending.pendingCount >= LIVE_UPDATE_BATCH_SIZE ||
        now - pending.lastFlushedAt >= LIVE_UPDATE_INTERVAL_MS;

      if (shouldFlushNow) {
        flushLiveUpdate();
      } else if (!liveUpdateTimerRef.current) {
        liveUpdateTimerRef.current = setTimeout(flushLiveUpdate, LIVE_UPDATE_INTERVAL_MS);
      }
    },
    [flushLiveUpdate]
  );

  const updateSuiteProgress = useCallback(
    (suiteType: TestSuiteType, scenario: AutomationScenario) => {
      setProgress(prev => ({
        ...prev,
        status: 'running',
        currentScenarioId: scenario.id,
        currentScenarioTitle: scenario.title,
        currentTestSuite: suiteType,
        currentTestIndex: prev.completedSuites,
      }));
    },
    [setProgress]
  );

  const markSuiteCompleted = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      completedSuites: prev.completedSuites + 1,
      currentTestIndex: prev.completedSuites + 1,
    }));
  }, [setProgress]);

  const markScenarioCompleted = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      completedScenarios: prev.completedScenarios + 1,
      currentPassphrase: null,
    }));
  }, [setProgress]);

  const incrementCompletedTests = useCallback(
    (count = 1) => {
      setProgress(prev => ({
        ...prev,
        completedTests: prev.completedTests + count,
      }));
    },
    [setProgress]
  );

  const updateHealthState = useCallback(
    (health: HealthCheckResponse | null) => {
      phonePilotHealthRef.current = health;
      setPhonePilotHealth(health);
    },
    [setPhonePilotHealth]
  );

  const setPendingUiActions = useCallback(
    (
      suite: 'deviceSettings' | 'securityCheck' | 'chainMethodBatch',
      label: string,
      actions: DeviceUiAction[]
    ) => {
      pendingUiActionRef.current = {
        suite,
        label,
        actions: [...actions],
        total: actions.length,
      };
      addLog(
        `[${suite}] Pending UI actions for ${label}: ${
          actions.length > 0 ? actions.join(' -> ') : 'no action'
        }`
      );
    },
    [addLog]
  );

  const clearPendingUiActions = useCallback(() => {
    pendingUiActionRef.current = null;
  }, []);

  const executeNextPendingUiAction = useCallback(async (): Promise<void> => {
    const pending = pendingUiActionRef.current;
    if (!pending) {
      addLog('UI Event REQUEST_BUTTON received with no pending action');
      return;
    }

    if (pending.actions.length === 0) {
      addLog(`[${pending.suite}] No remaining UI actions for ${pending.label}`);
      return;
    }

    const client = clientRef.current;
    if (!client) {
      throw new Error('PhonePilot client unavailable');
    }

    const steps = [...pending.actions];
    pendingUiActionRef.current = null;
    const result = await client.executeActionSequence(steps, {
      startDelayMs: CONFIRM_ACTION_DELAY_MS,
      betweenStepsDelayMs: CONFIRM_ACTION_STEP_DELAY_MS,
      returnFrame: false,
    });
    if (!result.success) {
      throw new Error(result.message);
    }

    addLog(
      `[${pending.suite}] Executed sequence for ${pending.label}: ${
        steps.join(' -> ') || 'no action'
      } (${result.stepsCompleted}/${pending.total})`
    );
  }, [addLog]);

  useEffect(() => {
    if (!clientRef.current || lastUrlRef.current !== config.phonePilotUrl) {
      if (clientRef.current && lastUrlRef.current !== config.phonePilotUrl) {
        clientRef.current.disconnect();
      }
      singleSecurityCheckPreparedRef.current = null;
      pendingUiActionRef.current = null;
      clientRef.current = new PhonePilotClient(config.phonePilotUrl);
      clientRef.current.setOnStateChange(setConnectionState);
      lastUrlRef.current = config.phonePilotUrl;
      updateHealthState(null);
    }
  }, [config.phonePilotUrl, setConnectionState, updateHealthState]);

  useEffect(
    () => () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      singleSecurityCheckPreparedRef.current = null;
      pendingUiActionRef.current = null;
      updateHealthState(null);
    },
    [updateHealthState]
  );

  const refreshPhonePilotHealth = useCallback(async (): Promise<HealthCheckResponse | null> => {
    if (!clientRef.current) {
      return null;
    }

    const health = await clientRef.current.healthCheck();
    if (health) {
      updateHealthState(health);
    }
    return health;
  }, [updateHealthState]);

  const connectPhonePilot = useCallback(async (): Promise<boolean> => {
    if (!clientRef.current) {
      clientRef.current = new PhonePilotClient(config.phonePilotUrl);
      clientRef.current.setOnStateChange(setConnectionState);
    }

    const client = clientRef.current;
    const health = await refreshPhonePilotHealth();
    if (!health) {
      addLog(`PhonePilot server is not reachable: ${config.phonePilotUrl}`);
      setConnectionState('error');
      updateHealthState(null);
      return false;
    }

    addLog(`PhonePilot server is healthy: ${health.version}`);
    addLog(
      `MCP ready: ${health.mcpReady ? 'yes' : 'no'} · OCR ready: ${health.ocrReady ? 'yes' : 'no'}`
    );
    if (health.message) {
      addLog(`Health message: ${health.message}`);
    }
    addLog(`Sequence count: ${health.sequenceIds.length}`);

    const mcpConnected = await client.connect();
    if (!mcpConnected) {
      addLog('PhonePilot MCP connection failed');
      return false;
    }

    try {
      await client.armConnect();
      addLog('PhonePilot connected (MCP + arm)');
    } catch (error) {
      addLog(`Warning: arm-connect failed (${error}), sequences requiring arm may fail`);
    }
    return true;
  }, [
    addLog,
    config.phonePilotUrl,
    refreshPhonePilotHealth,
    setConnectionState,
    updateHealthState,
  ]);

  const disconnectPhonePilot = useCallback(async (): Promise<void> => {
    singleSecurityCheckPreparedRef.current = null;
    pendingUiActionRef.current = null;
    if (clientRef.current) {
      try {
        await clientRef.current.armDisconnect();
      } catch (error) {
        addLog(`PhonePilot arm disconnect ignored: ${error}`);
      }
      await clientRef.current.disconnect();
      updateHealthState(null);
      addLog('PhonePilot disconnected');
    }
  }, [addLog, updateHealthState]);

  const uiListenerRef = useRef<((message: CoreMessage) => void) | null>(null);

  const setupUIListener = useCallback(
    (sdk: CoreApi, buttonOverride?: () => Promise<void>) => {
      if (uiListenerRef.current) {
        sdk.off(UI_EVENT, uiListenerRef.current);
      }

      const listener = async (message: CoreMessage) => {
        addLog(`UI Event: ${message.type}`);

        switch (message.type) {
          case UI_REQUEST.REQUEST_BUTTON:
            if (buttonOverride) {
              try {
                await buttonOverride();
              } catch (error) {
                addLog(`Button override failed: ${error}`);
              }
            } else if (clientRef.current) {
              try {
                await delay(CONFIRM_ACTION_DELAY_MS);
                await clientRef.current.confirmAction();
                addLog('Button confirmed via PhonePilot');
              } catch (error) {
                addLog(`Button confirm failed: ${error}`);
              }
            }
            break;
          case UI_REQUEST.REQUEST_PIN:
            if (clientRef.current) {
              try {
                const requestPayload: UiRequestDeviceAction['payload'] = message.payload;
                const isProtocolV2 =
                  requestPayload?.device?.connectProtocol === 'V2' ||
                  requestPayload?.interaction?.protocol === 'V2';
                await clientRef.current.inputPin('1111');
                if (!isProtocolV2 && requestPayload?.responseCorrelation) {
                  sdk.uiResponse({
                    type: UI_RESPONSE.RECEIVE_PIN,
                    payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
                    ...requestPayload.responseCorrelation,
                  });
                  addLog('PIN input via PhonePilot (Protocol V1)');
                } else {
                  // Protocol V2 PIN prompts are device-only and non-blocking.
                  addLog('PIN input via PhonePilot (Protocol V2 device-side)');
                }
              } catch (error) {
                addLog(`PIN input failed: ${error}`);
              }
            }
            break;
          case UI_REQUEST.REQUEST_PASSPHRASE:
            {
              const requestPayload: UiRequestPassphrase['payload'] = message.payload;
              const passphrase = currentPassphraseRef.current;
              const responseCorrelation = requestPayload?.responseCorrelation;
              const passphraseOnDevice = passphrase.length === 0;
              addLog(
                `Device requesting passphrase, responding via ${
                  passphraseOnDevice ? 'device' : 'host'
                } input`
              );
              setTimeout(async () => {
                sdk.uiResponse({
                  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
                  payload: {
                    value: passphraseOnDevice ? '' : passphrase,
                    passphraseOnDevice,
                    save: false,
                  },
                  ...(responseCorrelation ?? {}),
                });
                // Host passphrase entry still requires device confirmation.
                if (!passphraseOnDevice && clientRef.current) {
                  try {
                    await clientRef.current.confirmAction();
                    addLog('Passphrase confirmed via PhonePilot');
                  } catch (error) {
                    addLog(`Passphrase confirm failed: ${error}`);
                  }
                }
              }, 200);
            }
            break;
          case UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE:
            // Protocol V2 handles on-device passphrase entry entirely on the device.
            addLog('Passphrase input requested on device');
            break;
          default:
            break;
        }
      };

      uiListenerRef.current = listener;
      sdk.on(UI_EVENT, listener);
    },
    [addLog]
  );

  const runWithRetry = useCallback(
    async <T>(label: string, operation: () => Promise<T>): Promise<T> => {
      let lastError: unknown;
      const attempts = Math.max(1, config.retryCount);

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          if (attempt > 1) {
            addLog(`${label} retry ${attempt}/${attempts}`);
          }
          return await operation();
        } catch (error) {
          lastError = error;
          if (attempt < attempts) {
            await delay(300);
          }
        }
      }

      throw lastError;
    },
    [addLog, config.retryCount]
  );

  const executePhonePilotSequence = useCallback(
    async (sequenceId: string) => {
      const result = await runWithRetry(`execute-sequence:${sequenceId}`, () => {
        if (!clientRef.current) {
          throw new Error('PhonePilot client is not initialized');
        }
        return clientRef.current.executeSequence(sequenceId);
      });

      if (result.frame) {
        setCameraFrame(result.frame);
      }

      return result;
    },
    [runWithRetry, setCameraFrame]
  );

  const executeScenarioPreparation = useCallback(
    async (
      scenario: AutomationScenario,
      options?: { health?: HealthCheckResponse | null; clearMnemonicStore?: boolean }
    ): Promise<PreparationResult> => {
      updateSuiteProgress('deviceFlow', scenario);
      setProgress(prev => ({
        ...prev,
        status: 'preparing-device',
        currentScenarioId: scenario.id,
        currentScenarioTitle: scenario.title,
        currentPassphrase: null,
      }));
      addLog(`Preparing scenario: ${scenario.title}`);

      if (!clientRef.current) {
        return {
          success: false,
          suiteResult: createFailureSuiteResult(
            'deviceFlow',
            'Device Flow',
            'PhonePilot client is not initialized'
          ),
          mnemonicStoreResult: null,
        };
      }

      const health = options?.health || (await refreshPhonePilotHealth());
      if (!health) {
        return {
          success: false,
          suiteResult: createFailureSuiteResult(
            'deviceFlow',
            'Device Flow',
            'PhonePilot health check failed before scenario preparation'
          ),
          mnemonicStoreResult: null,
        };
      }

      if (!health.sequenceIds.includes(scenario.phonePilotSequenceId)) {
        const driftMessage = `sequence drift: ${scenario.phonePilotSequenceId} is not present in PhonePilot /health sequenceIds`;
        addLog(driftMessage);
        return {
          success: false,
          suiteResult: createFailureSuiteResult('deviceFlow', 'Device Flow', driftMessage),
          mnemonicStoreResult: null,
        };
      }

      if (scenario.flowType === 'create' && !health.ocrReady) {
        const ocrMessage = `OCR not ready: ${
          health.ocr.message || health.message || 'missing OCR dependency or model'
        }`;
        addLog(ocrMessage);
        return {
          success: false,
          suiteResult: createFailureSuiteResult('deviceFlow', 'Device Flow', ocrMessage),
          mnemonicStoreResult: null,
        };
      }

      const startAt = Date.now();

      if (options?.clearMnemonicStore !== false) {
        try {
          await clientRef.current.mnemonicStoreClear();
        } catch (error) {
          addLog(`Mnemonic store clear ignored: ${error}`);
        }
      }

      try {
        const result = await executePhonePilotSequence(scenario.phonePilotSequenceId);

        if (!result.success) {
          return {
            success: false,
            suiteResult: createFailureSuiteResult('deviceFlow', 'Device Flow', result.message),
            mnemonicStoreResult: null,
          };
        }

        addLog(`Sequence completed, waiting ${POST_SEQUENCE_SETTLE_MS}ms for device to settle...`);
        await delay(POST_SEQUENCE_SETTLE_MS);

        let mnemonicStoreResult: MnemonicStoreResult | null = null;
        if (scenario.flowType === 'create' && clientRef.current) {
          mnemonicStoreResult = await clientRef.current.mnemonicStoreGet();
          if (mnemonicStoreResult.success) {
            const shareInfo =
              typeof mnemonicStoreResult.shareCount === 'number'
                ? `, shares=${mnemonicStoreResult.shares?.length || 0}/${
                    mnemonicStoreResult.shareCount
                  }, threshold=${mnemonicStoreResult.threshold || 0}`
                : '';
            addLog(`Mnemonic captured: ${mnemonicStoreResult.wordCount || 0} words${shareInfo}`);
          } else {
            addLog(`Mnemonic store unavailable after create flow: ${mnemonicStoreResult.message}`);
          }
        }

        const duration = Date.now() - startAt;
        return {
          success: true,
          suiteResult: createSuiteResult(
            'deviceFlow',
            'Device Flow',
            [
              {
                title: scenario.title,
                expected: 'PhonePilot sequence success',
                actual: result.message,
                passed: true,
                duration,
                metadata: {
                  sequenceId: result.sequenceId || scenario.phonePilotSequenceId,
                  steps: `${result.stepsCompleted || 0}/${result.totalSteps || 0}`,
                },
              },
            ],
            duration
          ),
          mnemonicStoreResult,
        };
      } catch (error) {
        return {
          success: false,
          suiteResult: createFailureSuiteResult(
            'deviceFlow',
            'Device Flow',
            error instanceof Error ? error.message : String(error)
          ),
          mnemonicStoreResult: null,
        };
      }
    },
    [addLog, executePhonePilotSequence, refreshPhonePilotHealth, setProgress, updateSuiteProgress]
  );

  const refreshDeviceId = useCallback(async (sdk: CoreApi, connectId: string): Promise<string> => {
    const featuresResult = await getProtocolAwareFeatures(sdk, connectId);
    if (!featuresResult.success) {
      throw new Error('Failed to get device features');
    }
    const features = featuresResult.payload;
    if (features?.initialized === false) {
      throw new Error(
        'Device is not initialized (factory reset state). Please create or import a wallet first, or switch to "完整流程" / "跳过重置" mode.'
      );
    }
    deviceFeaturesRef.current = features as Record<string, unknown> | undefined;
    return features?.device_id ?? '';
  }, []);

  /**
   * Ensure device passphrase_protection matches the need, then obtain passphraseState.
   * - When passphrase is non-empty: enable passphrase_protection if off, open a hidden wallet
   * - When passphrase is empty/undefined: disable passphrase_protection if on, return undefined
   *
   * Pattern from SLIP39AddressValidation.tsx lines 616-639.
   */
  /**
   * Passphrase state management — follows the exact same pattern as SLIP39BatchAddressTest.
   *
   * @param features - device features obtained BEFORE the passphrase loop (not from a fresh getFeatures call)
   */
  const ensurePassphraseState = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      features: Record<string, unknown> | undefined,
      passphrase: string | undefined,
      label: string
    ): Promise<string | undefined> => {
      // Step 1: Toggle passphrase_protection — exact same logic as SLIP39BatchAddressTest
      if (isPassphraseProtectionEnabled(features) && passphrase == null) {
        addLog(`[${label}] Disabling passphrase_protection for normal wallet`);
        await sdk.deviceSettings(connectId, { usePassphrase: false });
      }
      if (!isPassphraseProtectionEnabled(features) && passphrase != null) {
        addLog(`[${label}] Enabling passphrase_protection for passphrase wallet`);
        await sdk.deviceSettings(connectId, { usePassphrase: true });
      }

      // Step 2: Get passphraseState — only when passphrase != null
      if (passphrase != null) {
        addLog(`[${label}] Getting passphraseState for 「${passphrase}」`);
        const emptyPassphrase = passphrase.length === 0;
        const walletSessionRes = await sdk.openWalletSession(connectId, {
          mode: emptyPassphrase
            ? OpenWalletSessionMode.Standard
            : OpenWalletSessionMode.SelectHidden,
        });

        const expectedWalletType = emptyPassphrase ? 'standard' : 'hidden';
        if (
          !walletSessionRes.success ||
          walletSessionRes.payload.walletType !== expectedWalletType
        ) {
          throw new Error(`openWalletSession failed for passphrase 「${passphrase}」`);
        }

        if (walletSessionRes.payload.walletType === 'standard') {
          return undefined;
        }

        addLog(`[${label}] Got passphraseState: "${walletSessionRes.payload.passphraseState}"`);
        return walletSessionRes.payload.passphraseState;
      }

      return undefined;
    },
    [addLog]
  );

  /**
   * Common passphrase iteration setup — sets ref, updates progress, calls ensurePassphraseState.
   * Returns passphraseState on success, or null + pushes error result on failure.
   */
  const preparePassphraseIteration = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      deviceFeatures: Record<string, unknown> | undefined,
      passphrase: string | undefined,
      label: string,
      results: TestCaseResult[],
      suiteType: TestSuiteType,
      suiteName: string
    ): Promise<{ ok: true; passphraseState: string | undefined } | { ok: false }> => {
      const passphraseDisplay = formatPassphraseDisplay(passphrase);
      currentPassphraseRef.current = passphrase ?? '';
      setProgress(prev => ({
        ...prev,
        currentPassphrase: passphraseDisplay,
      }));

      try {
        const passphraseState = await ensurePassphraseState(
          sdk,
          connectId,
          deviceFeatures,
          passphrase,
          label
        );
        return { ok: true, passphraseState };
      } catch (error) {
        addLog(`[ERROR] ensurePassphraseState failed: ${error}`);
        results.push({
          title: `passphraseState for 「${passphraseDisplay}」`,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
        });
        notifyLiveCaseUpdate(suiteType, suiteName, results);
        return { ok: false };
      }
    },
    [addLog, ensurePassphraseState, notifyLiveCaseUpdate, setProgress]
  );

  const prepareStandaloneMainWallet = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      suiteLabel: 'SecurityCheck' | 'ChainMethodBatch'
    ): Promise<{ forceUseEmptyPassphrase: boolean }> => {
      const featuresBefore = await fetchDeviceFeatures(sdk, connectId);
      let featuresAfter = featuresBefore;

      if (isPassphraseProtectionEnabled(featuresBefore)) {
        addLog(`[${suiteLabel}] Disabling passphrase_protection`);
        await sdk.deviceSettings(connectId, { usePassphrase: false });
        featuresAfter = await fetchDeviceFeatures(sdk, connectId);
      }

      const forceUseEmptyPassphrase = isPassphraseProtectionEnabled(featuresAfter);
      if (forceUseEmptyPassphrase) {
        addLog(
          `[${suiteLabel}] passphrase_protection is still enabled; forcing useEmptyPassphrase for main-wallet SDK calls`
        );
      }

      return { forceUseEmptyPassphrase };
    },
    [addLog]
  );

  const cleanupPassphraseLoop = useCallback(() => {
    // Flush any pending live update before closing the suite
    flushLiveUpdate();
    liveUpdatePendingRef.current = null;
    currentPassphraseRef.current = '';
    setProgress(prev => ({
      ...prev,
      currentPassphrase: null,
    }));
  }, [setProgress, flushLiveUpdate]);

  const readMnemonicStoreContext = useCallback(async (): Promise<MnemonicStoreResult | null> => {
    if (!clientRef.current) {
      return null;
    }

    try {
      return await clientRef.current.mnemonicStoreGet();
    } catch (error) {
      addLog(`Mnemonic store get failed: ${error}`);
      return null;
    }
  }, [addLog]);

  const getCurrentDeviceEvmAddress = useCallback(
    async (sdk: CoreApi, connectId: string, deviceId: string): Promise<string> => {
      const result = await runWithRetry('evmGetAddress:current-wallet', () =>
        executeProtocolAwareMethod({
          sdk,
          method: 'evmGetAddress',
          connectId,
          deviceId,
          protocol: selectedDevice?.connectProtocol,
          params: {
            path: EVM_ADDRESS_PATH,
            showOnOneKey: false,
            useEmptyPassphrase: true,
          },
        })
      );

      if (!result.success) {
        throw new Error(
          (result.payload as { error?: string } | undefined)?.error ||
            'Failed to get current wallet EVM address'
        );
      }

      return extractComparisonValue(result.payload, 'address', 'evmGetAddress');
    },
    [runWithRetry, selectedDevice?.connectProtocol]
  );

  const runSdkMethodCase = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      scenario: AutomationScenario,
      slip39Case: SLIP39TestCaseData,
      methodData: SLIP39MethodData,
      expectedPath: string,
      caseType: 'address' | 'pubkey',
      passphraseState?: string
    ): Promise<TestCaseResult> => {
      const startedAt = Date.now();
      const expected = extractComparisonValue(
        caseType === 'address'
          ? methodData.expectedAddress?.[expectedPath]
          : methodData.expectedPublicKey?.[expectedPath],
        caseType,
        methodData.method,
        methodData.name
      );

      try {
        const params: Record<string, unknown> = {
          ...(methodData.params || {}),
          path: expectedPath,
          showOnOneKey: false,
          passphraseState,
          useEmptyPassphrase: !slip39Case.passphrase,
        };
        addLog(
          `[SDK_CALL] ${methodData.method} path=${expectedPath} passphraseState=${
            passphraseState != null ? `"${passphraseState}"` : 'undefined'
          } hasPS=${!!params.passphraseState}`
        );
        const result = (await runWithRetry(`${methodData.method}:${expectedPath}`, () =>
          executeProtocolAwareMethod({
            sdk,
            method: methodData.method,
            connectId,
            deviceId,
            params,
            protocol: getFeaturesProtocol(deviceFeaturesRef.current),
          })
        )) as { success: boolean; payload?: unknown };

        if (!result.success) {
          const errorMsg =
            (result.payload as { error?: string } | undefined)?.error || 'Unknown error';
          // Check device compatibility: if expected=false, treat failure as expected
          if (deviceFeaturesRef.current) {
            const expectedOverride = compatibilityManager.getExpectedOverride(
              deviceFeaturesRef.current,
              methodData.method,
              expectedPath
            );
            if (expectedOverride === false) {
              addLog(`[EXPECTED_FAIL] ${methodData.method} — device does not support this method`);
              return {
                title: `${slip39Case.id} / ${
                  methodData.name || methodData.method
                } / ${expectedPath}`,
                method: methodData.method,
                expected: '(expected failure)',
                actual: errorMsg,
                passed: true,
                duration: Date.now() - startedAt,
                metadata: {
                  scenario: scenario.title,
                  passphrase: formatPassphraseDisplay(slip39Case.passphrase),
                  deviceCompat: 'expected failure',
                },
              };
            }
          }
          return {
            title: `${slip39Case.id} / ${methodData.name || methodData.method} / ${expectedPath}`,
            method: methodData.method,
            expected,
            actual: '',
            passed: false,
            error: errorMsg,
            duration: Date.now() - startedAt,
          };
        }

        const actual = extractComparisonValue(
          result.payload,
          caseType,
          methodData.method,
          methodData.name
        );

        const passed = actual === expected;
        if (!passed) {
          addLog(`[MISMATCH] ${slip39Case.id} / ${methodData.name || methodData.method}`);
          addLog(`  expected: ${expected}`);
          addLog(`  actual:   ${actual}`);
        }

        return {
          title: `${slip39Case.id} / ${methodData.name || methodData.method} / ${expectedPath}`,
          method: methodData.method,
          expected,
          actual,
          passed,
          duration: Date.now() - startedAt,
          metadata: {
            scenario: scenario.title,
            passphrase: formatPassphraseDisplay(slip39Case.passphrase),
          },
        };
      } catch (error) {
        return {
          title: `${slip39Case.id} / ${methodData.name || methodData.method} / ${expectedPath}`,
          method: methodData.method,
          expected,
          actual: '',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startedAt,
        };
      }
    },
    [runWithRetry, addLog]
  );

  const runSlip39SdkSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[],
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      updateSuiteProgress(suiteType, scenario);
      const startedAt = Date.now();
      const caseType = suiteType === 'sdkAddressBatch' ? 'address' : 'pubkey';
      const slip39Cases = resolveSlip39SdkCases(scenario, selectedPassphraseVariants, caseType);

      if (slip39Cases.length === 0) {
        return createSkippedSuiteResult(
          suiteType,
          suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
          'No matched SLIP39 SDK cases for selected passphrase variants'
        );
      }

      const suiteName = getSuiteName(suiteType);
      const expectedTotal =
        filterTitles?.size ?? countSdkCasePaths(scenario, suiteType, selectedPassphraseVariants);
      const results: TestCaseResult[] = [];
      for (const slip39Case of slip39Cases) {
        if (hasMatchingRetryTitle(filterTitles, title => title.startsWith(`${slip39Case.id} / `))) {
          // Fetch fresh features per iteration to avoid stale passphrase_protection state
          const deviceFeatures = await fetchDeviceFeatures(sdk, connectId);
          const ppResult = await preparePassphraseIteration(
            sdk,
            connectId,
            deviceFeatures,
            slip39Case.passphrase,
            'SLIP39',
            results,
            suiteType,
            suiteName
          );
          if (ppResult.ok) {
            const { passphraseState } = ppResult;

            for (const methodData of slip39Case.data) {
              const expectedMap =
                caseType === 'address' ? methodData.expectedAddress : methodData.expectedPublicKey;
              const expectedPaths = Object.keys(expectedMap || {});

              for (const expectedPath of expectedPaths) {
                if (!runningRef.current) {
                  break;
                }
                const caseTitle = `${slip39Case.id} / ${
                  methodData.name || methodData.method
                } / ${expectedPath}`;
                if (!filterTitles || filterTitles.has(caseTitle)) {
                  const caseResult = await runSdkMethodCase(
                    sdk,
                    connectId,
                    deviceId,
                    scenario,
                    slip39Case,
                    methodData,
                    expectedPath,
                    caseType,
                    passphraseState
                  );
                  results.push(caseResult);
                  incrementCompletedTests();
                  notifyLiveCaseUpdate(suiteType, suiteName, results, expectedTotal);
                  await delay(SDK_CASE_DELAY_MS);
                }
              }
            }
          }
        }
      }

      cleanupPassphraseLoop();

      return createSuiteResult(suiteType, suiteName, results, Date.now() - startedAt);
    },
    [
      runSdkMethodCase,
      preparePassphraseIteration,
      cleanupPassphraseLoop,
      updateSuiteProgress,
      incrementCompletedTests,
      notifyLiveCaseUpdate,
    ]
  );

  const runAutomationSdkBatchCase = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      scenario: AutomationScenario,
      sdkCase: AutomationSdkCase,
      methodCase: AutomationSdkMethodCase,
      expectedPath: string,
      caseType: 'address' | 'pubkey',
      passphraseState?: string
    ): Promise<TestCaseResult> => {
      const startedAt = Date.now();
      const expected = extractExpectedByPath(
        methodCase.expectedByPath,
        expectedPath,
        caseType,
        methodCase.method,
        methodCase.name
      );

      try {
        const params = buildSdkParamsForPath(methodCase, expectedPath);
        params.passphraseState = passphraseState;
        params.useEmptyPassphrase = !sdkCase.passphrase;
        const result = (await runWithRetry(`${methodCase.method}:${expectedPath}`, () =>
          executeProtocolAwareMethod({
            sdk,
            method: methodCase.method,
            connectId,
            deviceId,
            params,
            protocol: getFeaturesProtocol(deviceFeaturesRef.current),
          })
        )) as { success: boolean; payload?: unknown };

        if (!result.success) {
          const errorMsg =
            (result.payload as { error?: string } | undefined)?.error || 'Unknown error';
          // Check device compatibility: if expected=false, treat failure as expected
          if (deviceFeaturesRef.current) {
            const expectedOverride = compatibilityManager.getExpectedOverride(
              deviceFeaturesRef.current,
              methodCase.method,
              expectedPath
            );
            if (expectedOverride === false) {
              addLog(`[EXPECTED_FAIL] ${methodCase.method} — device does not support this method`);
              return {
                title: `${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`,
                method: methodCase.method,
                expected: '(expected failure)',
                actual: errorMsg,
                passed: true,
                duration: Date.now() - startedAt,
                metadata: {
                  scenario: scenario.title,
                  passphrase: formatPassphraseDisplay(sdkCase.passphrase),
                  deviceCompat: 'expected failure',
                },
              };
            }
          }
          return {
            title: `${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`,
            method: methodCase.method,
            expected,
            actual: '',
            passed: false,
            error: errorMsg,
            duration: Date.now() - startedAt,
          };
        }

        const actual = extractComparisonValue(
          result.payload,
          caseType,
          methodCase.method,
          methodCase.name
        );

        const passed = actual === expected;
        if (!passed) {
          addLog(
            `[MISMATCH] ${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`
          );
          addLog(`  expected: ${expected}`);
          addLog(`  actual:   ${actual}`);
        }
        return {
          title: `${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`,
          method: methodCase.method,
          expected,
          actual,
          passed,
          duration: Date.now() - startedAt,
          metadata: {
            scenario: scenario.title,
            passphrase: formatPassphraseDisplay(sdkCase.passphrase),
            source: scenario.phonePilotSequenceId,
          },
        };
      } catch (error) {
        return {
          title: `${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`,
          method: methodCase.method,
          expected,
          actual: '',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startedAt,
        };
      }
    },
    [runWithRetry, addLog]
  );

  const runBip39ImportSdkSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[],
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      updateSuiteProgress(suiteType, scenario);
      const startedAt = Date.now();
      const caseType = suiteType === 'sdkAddressBatch' ? 'address' : 'pubkey';
      const bip39Cases = resolveBip39ImportSdkCases(scenario, selectedPassphraseVariants, caseType);

      if (bip39Cases.length === 0) {
        return createSkippedSuiteResult(
          suiteType,
          getSuiteName(suiteType),
          'No matched BIP39 SDK cases for selected passphrase variants'
        );
      }

      const suiteName = getSuiteName(suiteType);
      const expectedTotal =
        filterTitles?.size ?? countSdkCasePaths(scenario, suiteType, selectedPassphraseVariants);

      const results: TestCaseResult[] = [];
      for (const bip39Case of bip39Cases) {
        if (hasMatchingRetryTitle(filterTitles, title => title.startsWith(`${bip39Case.id} / `))) {
          // Fetch fresh features per iteration to avoid stale passphrase_protection state
          const deviceFeatures2 = await fetchDeviceFeatures(sdk, connectId);
          const ppResult = await preparePassphraseIteration(
            sdk,
            connectId,
            deviceFeatures2,
            bip39Case.passphrase,
            'BIP39_IMPORT',
            results,
            suiteType,
            suiteName
          );
          if (ppResult.ok) {
            const { passphraseState } = ppResult;

            for (const methodCase of bip39Case.data) {
              const expectedPaths = Object.keys(methodCase.expectedByPath || {});
              for (const expectedPath of expectedPaths) {
                if (!runningRef.current) {
                  break;
                }
                const caseTitle = `${bip39Case.id} / ${
                  methodCase.name || methodCase.method
                } / ${expectedPath}`;
                if (!filterTitles || filterTitles.has(caseTitle)) {
                  const caseResult = await runAutomationSdkBatchCase(
                    sdk,
                    connectId,
                    deviceId,
                    scenario,
                    bip39Case,
                    methodCase,
                    expectedPath,
                    caseType,
                    passphraseState
                  );
                  results.push(caseResult);
                  incrementCompletedTests();
                  notifyLiveCaseUpdate(suiteType, suiteName, results, expectedTotal);
                  await delay(SDK_CASE_DELAY_MS);
                }
              }
            }
          }
        }
      }

      cleanupPassphraseLoop();

      return createSuiteResult(suiteType, suiteName, results, Date.now() - startedAt);
    },
    [
      runAutomationSdkBatchCase,
      preparePassphraseIteration,
      cleanupPassphraseLoop,
      updateSuiteProgress,
      incrementCompletedTests,
      notifyLiveCaseUpdate,
    ]
  );

  const runBip39CreateDynamicSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[],
      mnemonicStoreResult: MnemonicStoreResult | null,
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      updateSuiteProgress(suiteType, scenario);
      const startedAt = Date.now();
      const caseType = suiteType === 'sdkAddressBatch' ? 'address' : 'pubkey';
      const mnemonicWords = normalizeMnemonicWords(mnemonicStoreResult?.words);

      if (mnemonicWords.length === 0) {
        return createFailureSuiteResult(
          suiteType,
          getSuiteName(suiteType),
          `No BIP39 mnemonic words available for ${caseType} verification`
        );
      }

      const probes =
        suiteType === 'sdkAddressBatch'
          ? [{ method: 'evmGetAddress', caseName: 'evmGetAddress', path: EVM_ADDRESS_PATH }]
          : BIP39_CREATE_PUBKEY_PROBES;

      const suiteName = getSuiteName(suiteType);
      const expectedTotal =
        filterTitles?.size ?? countSdkCasePaths(scenario, suiteType, selectedPassphraseVariants);

      const results: TestCaseResult[] = [];
      for (const variantId of selectedPassphraseVariants) {
        if (!runningRef.current) {
          break;
        }
        if (hasMatchingRetryTitle(filterTitles, title => title.endsWith(` / ${variantId}`))) {
          const passphraseLiteral = getScenarioPassphraseLiteral(scenario, variantId);
          // Fetch fresh features per iteration to avoid stale passphrase_protection state
          const deviceFeatures3 = await fetchDeviceFeatures(sdk, connectId);
          const ppResult = await preparePassphraseIteration(
            sdk,
            connectId,
            deviceFeatures3,
            passphraseLiteral,
            'BIP39_CREATE',
            results,
            suiteType,
            suiteName
          );
          if (ppResult.ok) {
            const { passphraseState } = ppResult;

            const passphraseDisplay = formatPassphraseDisplay(passphraseLiteral);
            const seed = mnemonicToSeed(mnemonicWords.join(' '), passphraseLiteral);
            for (const probe of probes) {
              const caseTitle = `${scenario.id} / ${probe.caseName} / ${probe.path} / ${variantId}`;
              if (!filterTitles || filterTitles.has(caseTitle)) {
                const startedAtCase = Date.now();
                let expected = '';

                try {
                  expected = buildBip39CreateExpectedValue(
                    probe.method,
                    probe.caseName,
                    seed,
                    probe.path
                  );
                  if (!expected) {
                    throw new Error(`Missing expected ${caseType} value for ${probe.caseName}`);
                  }

                  const sdkParams: Record<string, unknown> = {
                    path: probe.path,
                    showOnOneKey: false,
                    passphraseState,
                    useEmptyPassphrase: !passphraseLiteral,
                  };

                  const result = (await runWithRetry(`${probe.method}:${probe.path}`, () =>
                    executeProtocolAwareMethod({
                      sdk,
                      method: probe.method,
                      connectId,
                      deviceId,
                      params: sdkParams,
                      protocol: selectedDevice?.connectProtocol,
                    })
                  )) as { success: boolean; payload?: unknown };

                  if (!result.success) {
                    results.push({
                      title: caseTitle,
                      method: probe.method,
                      expected,
                      actual: '',
                      passed: false,
                      error:
                        (result.payload as { error?: string } | undefined)?.error ||
                        'Unknown error',
                      duration: Date.now() - startedAtCase,
                      metadata: {
                        path: probe.path,
                        passphrase: passphraseDisplay,
                      },
                    });
                  } else {
                    const actual = extractComparisonValue(
                      result.payload,
                      caseType,
                      probe.method,
                      probe.caseName
                    );
                    const passed = actual === expected;
                    if (!passed) {
                      addLog(
                        `[MISMATCH] ${scenario.id} / ${probe.caseName} / ${probe.path} / ${variantId}`
                      );
                      addLog(`  expected: ${expected}`);
                      addLog(`  actual:   ${actual}`);
                    }
                    results.push({
                      title: caseTitle,
                      method: probe.method,
                      expected,
                      actual,
                      passed,
                      duration: Date.now() - startedAtCase,
                      metadata: {
                        path: probe.path,
                        passphrase: passphraseDisplay,
                        source: mnemonicStoreResult?.sequenceId || scenario.phonePilotSequenceId,
                      },
                    });
                  }
                } catch (error) {
                  results.push({
                    title: caseTitle,
                    method: probe.method,
                    expected,
                    actual: '',
                    passed: false,
                    error: error instanceof Error ? error.message : String(error),
                    duration: Date.now() - startedAtCase,
                    metadata: {
                      path: probe.path,
                      passphrase: passphraseDisplay,
                    },
                  });
                }

                incrementCompletedTests();
                notifyLiveCaseUpdate(suiteType, suiteName, results, expectedTotal);
                await delay(SDK_CASE_DELAY_MS);
              }
            }
          }
        }
      }

      cleanupPassphraseLoop();

      return createSuiteResult(suiteType, suiteName, results, Date.now() - startedAt);
    },
    [
      runWithRetry,
      preparePassphraseIteration,
      cleanupPassphraseLoop,
      addLog,
      updateSuiteProgress,
      incrementCompletedTests,
      notifyLiveCaseUpdate,
      selectedDevice?.connectProtocol,
    ]
  );

  const runSlip39CreateDynamicSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[],
      mnemonicStoreResult: MnemonicStoreResult | null,
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      updateSuiteProgress(suiteType, scenario);
      const startedAt = Date.now();
      const caseType = suiteType === 'sdkAddressBatch' ? 'address' : 'pubkey';
      const templateCase = getSlip39CreateTemplateCase(caseType);
      const shareMnemonics = normalizeSlip39Shares(mnemonicStoreResult?.shares);
      const variantIds = selectedPassphraseVariants.filter(variantId =>
        SLIP39_CREATE_ALLOWED_VARIANTS.includes(variantId)
      );

      if (!templateCase) {
        return createFailureSuiteResult(
          suiteType,
          suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
          'SLIP39 create template case is missing'
        );
      }

      if (variantIds.length === 0) {
        return createSkippedSuiteResult(
          suiteType,
          suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
          'SLIP39 create v1 only validates normal and passphrase_2'
        );
      }

      if (shareMnemonics.length === 0) {
        return createFailureSuiteResult(
          suiteType,
          suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
          'No SLIP39 shares captured from PhonePilot mnemonic-store'
        );
      }

      // Pre-validate shares before running all cases — if OCR produced invalid words,
      // fail fast with a single descriptive result rather than N identical errors.
      try {
        await generateMultiChainAddressFromSLIP39({
          shares: shareMnemonics,
          passphrase: undefined,
          method: 'evmGetAddress',
          params: { path: EVM_ADDRESS_PATH },
        });
      } catch (validationError) {
        const reason = `Shares validation failed (possible OCR error): ${
          validationError instanceof Error ? validationError.message : String(validationError)
        }`;
        addLog(`[SLIP39_CREATE] ${reason}`);
        return createFailureSuiteResult(
          suiteType,
          suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
          reason
        );
      }

      const suiteName = getSuiteName(suiteType);
      const expectedTotal =
        filterTitles?.size ?? countSdkCasePaths(scenario, suiteType, variantIds);

      const results: TestCaseResult[] = [];
      for (const variantId of variantIds) {
        if (!runningRef.current) {
          break;
        }
        if (hasMatchingRetryTitle(filterTitles, title => title.includes(` / ${variantId} / `))) {
          const passphraseLiteral = getScenarioPassphraseLiteral(scenario, variantId);
          // Fetch fresh features per iteration to avoid stale passphrase_protection state
          const deviceFeatures4 = await fetchDeviceFeatures(sdk, connectId);
          const ppResult = await preparePassphraseIteration(
            sdk,
            connectId,
            deviceFeatures4,
            passphraseLiteral,
            'SLIP39_CREATE',
            results,
            suiteType,
            suiteName
          );
          if (ppResult.ok) {
            const { passphraseState } = ppResult;

            const passphraseDisplay = formatPassphraseDisplay(passphraseLiteral);
            for (const methodData of templateCase.data) {
              const expectedMap =
                caseType === 'address' ? methodData.expectedAddress : methodData.expectedPublicKey;
              const expectedPaths = Object.keys(expectedMap || {});

              for (const expectedPath of expectedPaths) {
                if (!runningRef.current) {
                  break;
                }
                const caseTitle = `${scenario.id} / ${
                  methodData.name || methodData.method
                } / ${variantId} / ${expectedPath}`;
                if (!filterTitles || filterTitles.has(caseTitle)) {
                  const startedAtCase = Date.now();
                  let expected = '';

                  try {
                    const generatorParams = {
                      ...(methodData.params || {}),
                      path: expectedPath,
                    };
                    const generatorResult =
                      caseType === 'address'
                        ? await generateMultiChainAddressFromSLIP39({
                            shares: shareMnemonics,
                            passphrase: passphraseLiteral,
                            method: methodData.method,
                            params: generatorParams,
                          })
                        : await generateMultiChainPublicKeyFromSLIP39({
                            shares: shareMnemonics,
                            passphrase: passphraseLiteral,
                            method: methodData.method,
                            params: generatorParams,
                          });

                    if (!generatorResult.success) {
                      throw new Error(
                        generatorResult.error ||
                          'Failed to generate expected value from SLIP39 shares'
                      );
                    }

                    expected = extractComparisonValue(
                      generatorResult.payload,
                      caseType,
                      methodData.method,
                      methodData.name
                    );
                    if (!expected) {
                      throw new Error('Generated expected value is empty');
                    }

                    const sdkMethodParams: Record<string, unknown> = {
                      ...(methodData.params || {}),
                      path: expectedPath,
                      showOnOneKey: false,
                      passphraseState,
                      useEmptyPassphrase: !passphraseLiteral,
                    };

                    const sdkResult = (await runWithRetry(
                      `${methodData.method}:${expectedPath}`,
                      () =>
                        executeProtocolAwareMethod({
                          sdk,
                          method: methodData.method,
                          connectId,
                          deviceId,
                          params: sdkMethodParams,
                          protocol: selectedDevice?.connectProtocol,
                        })
                    )) as { success: boolean; payload?: unknown };

                    if (!sdkResult.success) {
                      results.push({
                        title: caseTitle,
                        method: methodData.method,
                        expected,
                        actual: '',
                        passed: false,
                        error:
                          (sdkResult.payload as { error?: string } | undefined)?.error ||
                          'Unknown error',
                        duration: Date.now() - startedAtCase,
                        metadata: {
                          passphrase: passphraseDisplay,
                          shares: String(shareMnemonics.length),
                        },
                      });
                    } else {
                      const actual = extractComparisonValue(
                        sdkResult.payload,
                        caseType,
                        methodData.method,
                        methodData.name
                      );
                      const passed = actual === expected;
                      if (!passed) {
                        addLog(
                          `[MISMATCH] ${scenario.id} / ${
                            methodData.name || methodData.method
                          } / ${variantId} / ${expectedPath}`
                        );
                        addLog(`  expected: ${expected}`);
                        addLog(`  actual:   ${actual}`);
                      }
                      results.push({
                        title: caseTitle,
                        method: methodData.method,
                        expected,
                        actual,
                        passed,
                        duration: Date.now() - startedAtCase,
                        metadata: {
                          passphrase: passphraseDisplay,
                          shares: String(shareMnemonics.length),
                          threshold: String(
                            mnemonicStoreResult?.threshold || scenario.threshold || 0
                          ),
                        },
                      });
                    }
                  } catch (error) {
                    results.push({
                      title: caseTitle,
                      method: methodData.method,
                      expected,
                      actual: '',
                      passed: false,
                      error: error instanceof Error ? error.message : String(error),
                      duration: Date.now() - startedAtCase,
                      metadata: {
                        passphrase: passphraseDisplay,
                        shares: String(shareMnemonics.length),
                      },
                    });
                  }

                  incrementCompletedTests();
                  notifyLiveCaseUpdate(suiteType, suiteName, results, expectedTotal);
                  await delay(SDK_CASE_DELAY_MS);
                }
              }
            }
          }
        }
      }

      cleanupPassphraseLoop();

      return createSuiteResult(suiteType, suiteName, results, Date.now() - startedAt);
    },
    [
      runWithRetry,
      preparePassphraseIteration,
      cleanupPassphraseLoop,
      addLog,
      updateSuiteProgress,
      incrementCompletedTests,
      notifyLiveCaseUpdate,
      selectedDevice?.connectProtocol,
    ]
  );

  const runSpecialPassphraseSuite = useCallback(
    async (
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      updateSuiteProgress('specialPassphrase', scenario);
      const startedAt = Date.now();
      const results: TestCaseResult[] = [];

      const specialPassphrases = [
        'Aa0!)_+맪Ӎ¬}¨¥ϸΔѭЧゞく6鼵',
        '¥Øÿ',
        'P@sswôrd€',
        ' My Passphrase ',
        '私のパスワード',
        'myسياسةpassphrase',
        '你好passphrase',
        'mi política de frase de contraseña',
        String.fromCharCode(...Array.from({ length: 25 }, (_, i) => i + 96)),
      ];

      const SPECIAL_PASSPHRASE_METHOD_PATHS: Record<string, string> = {
        btcGetAddress: "m/44'/0'/0'/0/0",
        evmGetAddress: "m/44'/60'/0'/0/0",
        dnxGetAddress: "m/44'/29538'/0'/0/0",
      };
      const methods = Object.keys(SPECIAL_PASSPHRASE_METHOD_PATHS);
      const mnemonic = scenario.bip39ImportMnemonicWords?.join(' ');

      if (!mnemonic) {
        return createSkippedSuiteResult(
          'specialPassphrase',
          'Special Passphrase',
          'No mnemonic words available for special passphrase test (import scenario required)'
        );
      }

      try {
        const { default: mockDevice } = await import('../../utils/mockDevice');

        // Ensure passphrase_protection is enabled before running special passphrase tests
        const spFeatures = await fetchDeviceFeatures(sdk, connectId);
        if (!isPassphraseProtectionEnabled(spFeatures)) {
          addLog('[SpecialPassphrase] Enabling passphrase_protection');
          await sdk.deviceSettings(connectId, { usePassphrase: true });
        }

        for (const passphrase of specialPassphrases) {
          if (hasMatchingRetryTitle(filterTitles, title => title.endsWith(`「${passphrase}」`))) {
            currentPassphraseRef.current = passphrase;
            addLog(`Testing special passphrase: 「${passphrase}」`);

            const psResult = await runWithRetry(`openWalletSession:special`, () =>
              sdk.openWalletSession(connectId, {
                mode: OpenWalletSessionMode.SelectHidden,
              })
            );

            if (!psResult.success || psResult.payload.walletType !== 'hidden') {
              results.push({
                title: `openWalletSession for 「${passphrase}」`,
                passed: false,
                error: 'openWalletSession failed',
                duration: Date.now() - startedAt,
              });
              notifyLiveCaseUpdate('specialPassphrase', 'Special Passphrase', results);
            } else {
              const { passphraseState } = psResult.payload;

              for (const method of methods) {
                if (!runningRef.current) {
                  break;
                }

                const caseTitle = `${method} / 「${passphrase}」`;
                if (!filterTitles || filterTitles.has(caseTitle)) {
                  const caseStart = Date.now();
                  try {
                    const mockFn = (mockDevice as Record<string, unknown>)[method];
                    if (typeof mockFn !== 'function') {
                      results.push({
                        title: caseTitle,
                        method,
                        passed: false,
                        error: `mockDevice.${method} not found`,
                        duration: Date.now() - caseStart,
                      });
                      notifyLiveCaseUpdate('specialPassphrase', 'Special Passphrase', results);
                    } else {
                      const mockRes = (await mockFn('', '', {
                        path: SPECIAL_PASSPHRASE_METHOD_PATHS[method],
                        mnemonic: mnemonic.trim(),
                        passphrase,
                      })) as { payload?: { address?: string } };

                      const expected = mockRes?.payload?.address || '';

                      const sdkResult = (await runWithRetry(`${method}:special`, () =>
                        executeProtocolAwareMethod({
                          sdk,
                          method,
                          connectId,
                          deviceId,
                          params: {
                            path: SPECIAL_PASSPHRASE_METHOD_PATHS[method],
                            showOnOneKey: false,
                            passphraseState,
                            useEmptyPassphrase: false,
                          },
                          protocol: getFeaturesProtocol(deviceFeaturesRef.current),
                        })
                      )) as { success: boolean; payload?: { address?: string; error?: string } };

                      if (!sdkResult.success) {
                        // Check device compatibility
                        let handledAsExpectedFail = false;
                        if (deviceFeaturesRef.current) {
                          const expectedOverride = compatibilityManager.getExpectedOverride(
                            deviceFeaturesRef.current,
                            method,
                            SPECIAL_PASSPHRASE_METHOD_PATHS[method]
                          );
                          if (expectedOverride === false) {
                            addLog(
                              `[EXPECTED_FAIL] ${method} / 「${passphrase}」 — device does not support this method`
                            );
                            results.push({
                              title: caseTitle,
                              method,
                              expected: '(expected failure)',
                              actual: sdkResult.payload?.error || 'SDK call failed',
                              passed: true,
                              duration: Date.now() - caseStart,
                              metadata: { passphrase, deviceCompat: 'expected failure' },
                            });
                            notifyLiveCaseUpdate(
                              'specialPassphrase',
                              'Special Passphrase',
                              results
                            );
                            handledAsExpectedFail = true;
                          }
                        }
                        if (!handledAsExpectedFail) {
                          results.push({
                            title: caseTitle,
                            method,
                            expected,
                            passed: false,
                            error: sdkResult.payload?.error || 'SDK call failed',
                            duration: Date.now() - caseStart,
                            metadata: { passphrase },
                          });
                          notifyLiveCaseUpdate('specialPassphrase', 'Special Passphrase', results);
                        }
                      } else {
                        const actual = sdkResult.payload?.address || '';
                        const passed = actual.toLowerCase() === expected.toLowerCase();
                        if (!passed) {
                          addLog(`[MISMATCH] ${method} / 「${passphrase}」`);
                          addLog(`  expected: ${expected}`);
                          addLog(`  actual:   ${actual}`);
                        }

                        results.push({
                          title: caseTitle,
                          method,
                          expected,
                          actual,
                          passed,
                          duration: Date.now() - caseStart,
                          metadata: { passphrase },
                        });
                      }
                    }
                  } catch (error) {
                    results.push({
                      title: caseTitle,
                      method,
                      passed: false,
                      error: error instanceof Error ? error.message : String(error),
                      duration: Date.now() - caseStart,
                    });
                  }

                  incrementCompletedTests();
                  notifyLiveCaseUpdate('specialPassphrase', 'Special Passphrase', results);
                  await delay(SDK_CASE_DELAY_MS);
                }
              } // end else (!psResult.success)
            }
          }
        }
      } catch (error) {
        results.push({
          title: 'specialPassphrase unexpected error',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startedAt,
        });
      }

      currentPassphraseRef.current = '';
      return createSuiteResult(
        'specialPassphrase',
        'Special Passphrase',
        results,
        Date.now() - startedAt
      );
    },
    [addLog, runWithRetry, updateSuiteProgress, incrementCompletedTests, notifyLiveCaseUpdate]
  );

  const prepareSingleSdkRun = useCallback(
    async (
      suiteType: 'securityCheck' | 'chainMethodBatch',
      caseTitle: string
    ): Promise<{ connectId: string; deviceId: string } | null> => {
      if (runningRef.current) {
        addLog('Automation is already running');
        return null;
      }

      if (!SDK || !selectedDevice?.connectId) {
        addLog('SDK or selected device is not available');
        return null;
      }

      if (connectionState !== 'connected') {
        addLog('PhonePilot not connected, connecting...');
        const connected = await connectPhonePilot();
        if (!connected) {
          addLog('Failed to connect to PhonePilot');
          return null;
        }
      }

      const health = await refreshPhonePilotHealth();
      if (!health) {
        addLog('PhonePilot health check failed before single SDK test');
        return null;
      }

      runningRef.current = true;
      pendingUiActionRef.current = null;
      clearLogs();
      resetProgress();
      setReport(null);
      setLiveReport(null);
      currentPassphraseRef.current = '';

      const startTime = Date.now();
      initLiveReport({ totalScenarios: 1, startTime });
      setProgress({
        currentScenarioId: STANDALONE_MODULE_SCENARIO_ID,
        currentScenarioTitle: caseTitle,
        currentPassphrase: null,
        currentTestSuite: suiteType,
        currentTestIndex: 0,
        totalTests: 1,
        completedTests: 0,
        completedScenarios: 0,
        totalScenarios: 1,
        completedSuites: 0,
        totalSuites: 1,
        status: 'running',
      });

      try {
        const { connectId } = selectedDevice;
        const deviceId = await refreshDeviceId(SDK, connectId);
        addLog(`Device ID updated: ${deviceId}`);
        return { connectId, deviceId };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addLog(`Single SDK test setup failed: ${message}`);
        setProgress(prev => ({
          ...prev,
          status: 'error',
          errorMessage: message,
        }));
        runningRef.current = false;
        return null;
      }
    },
    [
      SDK,
      addLog,
      clearLogs,
      connectPhonePilot,
      connectionState,
      initLiveReport,
      refreshDeviceId,
      refreshPhonePilotHealth,
      resetProgress,
      selectedDevice,
      setLiveReport,
      setProgress,
      setReport,
    ]
  );

  const finalizeSingleSdkRun = useCallback(
    (
      suiteType: 'securityCheck' | 'chainMethodBatch',
      suiteName: string,
      caseTitle: string,
      results: TestCaseResult[],
      startTime: number
    ) => {
      const suiteResult = createSuiteResult(suiteType, suiteName, results, Date.now() - startTime);
      const scenario = getAutomationScenario(STANDALONE_MODULE_SCENARIO_ID);
      const scenarioReport = buildScenarioReport(scenario, [suiteResult], Date.now() - startTime);
      const endTime = Date.now();
      const report: TestReport = {
        startTime,
        endTime,
        duration: endTime - startTime,
        totalScenarios: 1,
        passedScenarios: scenarioReport.status === 'passed' ? 1 : 0,
        failedScenarios: scenarioReport.status === 'failed' ? 1 : 0,
        skippedScenarios: scenarioReport.status === 'skipped' ? 1 : 0,
        scenarioResults: [scenarioReport],
      };

      setReport(report);
      setLiveReport(report);
      setProgress(prev => ({
        ...prev,
        currentScenarioTitle: caseTitle,
        completedTests: results.length,
        completedSuites: 1,
        completedScenarios: 1,
        status: 'done',
        errorMessage: undefined,
      }));
      runningRef.current = false;
    },
    [setLiveReport, setProgress, setReport]
  );

  const runSecurityCheckSuite = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      const startedAt = Date.now();
      const results: TestCaseResult[] = [];
      addLog('[SecurityCheck] Starting blind signature security check suite');
      setupUIListener(sdk, executeNextPendingUiAction);

      try {
        const { forceUseEmptyPassphrase } = await prepareStandaloneMainWallet(
          sdk,
          connectId,
          'SecurityCheck'
        );
        if (selectedDevice?.connectProtocol === 'V2') {
          addLog('[SecurityCheck] Protocol V2 safety checks are managed on the device');
        } else {
          setPendingUiActions('deviceSettings', 'disable safety checks', ['confirm']);
          await sdk.deviceSettings(connectId, { safetyChecks: 0 });
          addLog('[SecurityCheck] safetyChecks set to strict (0)');
        }

        const testCases = convertTestData(securityCheckData).data;
        addLog(`[SecurityCheck] Running ${testCases.length} test cases`);

        for (const testCase of testCases) {
          if (!filterTitles || filterTitles.has(testCase.title)) {
            const caseStart = Date.now();
            const { method, params, expect: expectedResult, title } = testCase;

            try {
              const sdkMethod = (sdk as Record<string, unknown>)[method];
              if (typeof sdkMethod !== 'function') {
                results.push({
                  title,
                  method,
                  passed: false,
                  error: `SDK method ${method} not found`,
                  duration: Date.now() - caseStart,
                });
                incrementCompletedTests();
                notifyLiveCaseUpdate('securityCheck', 'Security Check', results);
              } else {
                setPendingUiActions(
                  'securityCheck',
                  title,
                  expectedResult
                    ? [
                        ...Array<DeviceUiAction>(testCase.confirmCount ?? 1).fill('confirm'),
                        ...(testCase.noSlide ? [] : (['slide'] as DeviceUiAction[])),
                      ]
                    : []
                );

                let sdkResult: { success: boolean; payload?: { error?: string } };
                try {
                  const resultOrTimeout = await Promise.race([
                    executeProtocolAwareMethod({
                      sdk,
                      method,
                      connectId,
                      deviceId,
                      params: withMainWalletCommonParams(params, forceUseEmptyPassphrase),
                      protocol: selectedDevice?.connectProtocol,
                    }),
                    new Promise<'timeout'>(resolve => {
                      setTimeout(() => {
                        resolve('timeout');
                      }, 45_000);
                    }),
                  ]);
                  if (resultOrTimeout === 'timeout') {
                    sdk.cancel(connectId);
                    await getProtocolAwareFeatures(sdk, connectId, { retryCount: 1 });
                    sdkResult = { success: false, payload: { error: 'timeout after 45s' } };
                  } else {
                    sdkResult = resultOrTimeout as typeof sdkResult;
                  }
                } catch (callError) {
                  sdkResult = {
                    success: false,
                    payload: {
                      error: callError instanceof Error ? callError.message : String(callError),
                    },
                  };
                }

                // Allow device-specific overrides (e.g. Pro doesn't support DNX)
                const coinType = (() => {
                  const path: string =
                    ((params as Record<string, unknown>)?.path as string) ??
                    ((
                      (params as Record<string, unknown>)?.inputs as Array<Record<string, unknown>>
                    )?.[0]?.path as string) ??
                    '';
                  return path.split('/')[2]?.replace(/'/g, '') ?? '';
                })();
                const deviceFeats = deviceFeaturesRef.current ?? {};
                const expected = getDeviceExpected(deviceFeats, method, coinType, expectedResult, {
                  securityChecksDisabled: false,
                });

                const actualSuccess = sdkResult.success;
                const passed = expected ? actualSuccess : !actualSuccess;
                const expectedLabel = expected ? 'success' : 'failure';
                const actualLabel = actualSuccess
                  ? 'success'
                  : `failure(${sdkResult.payload?.error ?? ''})`;

                results.push({
                  title,
                  method,
                  expected: expectedLabel,
                  actual: actualLabel,
                  passed,
                  duration: Date.now() - caseStart,
                });
              } // end else (typeof sdkMethod !== 'function')
            } catch (error) {
              results.push({
                title,
                method,
                passed: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - caseStart,
              });
            } finally {
              clearPendingUiActions();
            }

            incrementCompletedTests();
            notifyLiveCaseUpdate('securityCheck', 'Security Check', results);
            await delay(SDK_CASE_DELAY_MS);
          }
        }
      } catch (error) {
        results.push({
          title: 'securityCheck unexpected error',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startedAt,
        });
      } finally {
        clearPendingUiActions();
        setupUIListener(sdk);
      }

      return createSuiteResult('securityCheck', 'Security Check', results, Date.now() - startedAt);
    },
    [
      addLog,
      clearPendingUiActions,
      executeNextPendingUiAction,
      incrementCompletedTests,
      notifyLiveCaseUpdate,
      prepareStandaloneMainWallet,
      selectedDevice?.connectProtocol,
      setPendingUiActions,
      setupUIListener,
    ]
  );

  const runChainMethodBatchSuite = useCallback(
    async (
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      filterTitles?: Set<string>
    ): Promise<TestSuiteResult> => {
      const startedAt = Date.now();
      const results: TestCaseResult[] = [];
      addLog('[ChainMethodBatch] Starting chain method batch suite');
      setupUIListener(sdk, executeNextPendingUiAction);

      try {
        const { forceUseEmptyPassphrase } = await prepareStandaloneMainWallet(
          sdk,
          connectId,
          'ChainMethodBatch'
        );
        for (const chain of chainTestData) {
          for (const entry of chain.data) {
            for (const presuppose of entry.presupposes ?? []) {
              const caseStart = Date.now();
              const caseTitle = `${chain.symbol} / ${entry.method} / ${presuppose.title}`;
              if (!filterTitles || filterTitles.has(caseTitle)) {
                setPendingUiActions('chainMethodBatch', caseTitle, [
                  ...Array<DeviceUiAction>(entry.confirmCount ?? 0).fill('confirm'),
                  ...(entry.noSlide || !entry.confirmCount ? [] : (['slide'] as DeviceUiAction[])),
                ]);
                try {
                  const sdkMethod = (sdk as Record<string, unknown>)[entry.method];
                  if (typeof sdkMethod !== 'function') {
                    results.push({
                      title: caseTitle,
                      method: entry.method,
                      passed: false,
                      error: `SDK method ${entry.method} not found`,
                      duration: Date.now() - caseStart,
                    });
                    incrementCompletedTests();
                    notifyLiveCaseUpdate('chainMethodBatch', 'Chain Method Batch', results);
                  } else {
                    const sdkResult = await executeProtocolAwareMethod({
                      sdk,
                      method: entry.method,
                      connectId,
                      deviceId,
                      params: withMainWalletCommonParams(presuppose.value, forceUseEmptyPassphrase),
                      protocol: selectedDevice?.connectProtocol,
                    });

                    if (sdkResult.success) {
                      results.push({
                        title: caseTitle,
                        method: entry.method,
                        passed: true,
                        duration: Date.now() - caseStart,
                      });
                    } else {
                      results.push({
                        title: caseTitle,
                        method: entry.method,
                        passed: false,
                        error: sdkResult.payload?.error ?? 'unknown error',
                        duration: Date.now() - caseStart,
                      });
                    }
                  }
                } catch (err) {
                  results.push({
                    title: caseTitle,
                    method: entry.method,
                    passed: false,
                    error: err instanceof Error ? err.message : String(err),
                    duration: Date.now() - caseStart,
                  });
                } finally {
                  clearPendingUiActions();
                }

                incrementCompletedTests();
                notifyLiveCaseUpdate('chainMethodBatch', 'Chain Method Batch', results);
                await delay(SDK_CASE_DELAY_MS);
              }
            }
          }
        }
      } catch (error) {
        results.push({
          title: 'chainMethodBatch unexpected error',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startedAt,
        });
      } finally {
        clearPendingUiActions();
        setupUIListener(sdk);
      }

      return createSuiteResult(
        'chainMethodBatch',
        'Chain Method Batch',
        results,
        Date.now() - startedAt
      );
    },
    [
      addLog,
      clearPendingUiActions,
      executeNextPendingUiAction,
      incrementCompletedTests,
      notifyLiveCaseUpdate,
      prepareStandaloneMainWallet,
      selectedDevice?.connectProtocol,
      setPendingUiActions,
      setupUIListener,
    ]
  );

  const runSingleSecurityCheckCase = useCallback(
    async (testCase: SingleSecurityCheckCaseInput): Promise<void> => {
      const ctx = await prepareSingleSdkRun('securityCheck', testCase.title);
      if (!ctx || !SDK) {
        return;
      }

      const startTime = Date.now();
      const results: TestCaseResult[] = [];
      setupUIListener(SDK, executeNextPendingUiAction);
      addLog(`[Single][SecurityCheck] ${testCase.title}`);

      try {
        const preparedContext = singleSecurityCheckPreparedRef.current;
        const canReusePreparation =
          preparedContext?.connectId === ctx.connectId && preparedContext.deviceId === ctx.deviceId;
        let forceUseEmptyPassphrase = false;

        if (canReusePreparation) {
          addLog('[SecurityCheck] Reusing existing single-case device preparation');
          const featuresAfterPreparation = await fetchDeviceFeatures(SDK, ctx.connectId);
          forceUseEmptyPassphrase = isPassphraseProtectionEnabled(featuresAfterPreparation);
          if (forceUseEmptyPassphrase) {
            addLog(
              '[SecurityCheck] passphrase_protection remains enabled; forcing useEmptyPassphrase for this case'
            );
          }
        } else {
          const preparation = await prepareStandaloneMainWallet(
            SDK,
            ctx.connectId,
            'SecurityCheck'
          );
          forceUseEmptyPassphrase = preparation.forceUseEmptyPassphrase;

          if (selectedDevice?.connectProtocol === 'V2') {
            addLog('[SecurityCheck] Protocol V2 safety checks are managed on the device');
          } else {
            setPendingUiActions('deviceSettings', 'disable safety checks', ['confirm']);
            await SDK.deviceSettings(ctx.connectId, { safetyChecks: 0 });
            addLog('[SecurityCheck] safetyChecks set to strict (0)');
          }
          singleSecurityCheckPreparedRef.current = {
            connectId: ctx.connectId,
            deviceId: ctx.deviceId,
          };
        }

        setPendingUiActions(
          'securityCheck',
          testCase.title,
          testCase.expectedResult
            ? [
                ...Array<DeviceUiAction>(testCase.confirmCount).fill('confirm'),
                ...Array<DeviceUiAction>(testCase.slideCount).fill('slide'),
              ]
            : []
        );

        const sdkMethod = (SDK as Record<string, unknown>)[testCase.method];
        if (typeof sdkMethod !== 'function') {
          results.push({
            title: testCase.title,
            method: testCase.method,
            passed: false,
            error: `SDK method ${testCase.method} not found`,
            duration: Date.now() - startTime,
          });
        } else {
          let sdkResult: { success: boolean; payload?: { error?: string } };
          try {
            const resultOrTimeout = await Promise.race([
              executeProtocolAwareMethod({
                sdk: SDK,
                method: testCase.method,
                connectId: ctx.connectId,
                deviceId: ctx.deviceId,
                params: withMainWalletCommonParams(testCase.params, forceUseEmptyPassphrase),
                protocol: selectedDevice?.connectProtocol,
              }),
              new Promise<'timeout'>(resolve => {
                setTimeout(() => {
                  resolve('timeout');
                }, 45_000);
              }),
            ]);
            if (resultOrTimeout === 'timeout') {
              SDK.cancel(ctx.connectId);
              await getProtocolAwareFeatures(SDK, ctx.connectId, { retryCount: 1 });
              sdkResult = { success: false, payload: { error: 'timeout after 45s' } };
            } else {
              sdkResult = resultOrTimeout as { success: boolean; payload?: { error?: string } };
            }
          } catch (callError) {
            sdkResult = {
              success: false,
              payload: {
                error: callError instanceof Error ? callError.message : String(callError),
              },
            };
          }

          const path =
            (typeof testCase.params.path === 'string' && testCase.params.path) ||
            (Array.isArray(testCase.params.inputs) &&
            typeof testCase.params.inputs[0]?.path === 'string'
              ? testCase.params.inputs[0].path
              : '');
          const coinType = path.split('/')[2]?.replace(/'/g, '') ?? '';
          const deviceFeats = deviceFeaturesRef.current ?? {};
          const expected = getDeviceExpected(
            deviceFeats,
            testCase.method,
            coinType,
            testCase.expectedResult,
            {
              securityChecksDisabled: false,
            }
          );

          const actualSuccess = sdkResult.success;
          results.push({
            title: testCase.title,
            method: testCase.method,
            expected: expected ? 'success' : 'failure',
            actual: actualSuccess ? 'success' : `failure(${sdkResult.payload?.error ?? ''})`,
            passed: expected ? actualSuccess : !actualSuccess,
            duration: Date.now() - startTime,
          });
        }
      } catch (error) {
        results.push({
          title: testCase.title,
          method: testCase.method,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
      } finally {
        clearPendingUiActions();
        setupUIListener(SDK);
      }

      finalizeSingleSdkRun('securityCheck', 'Security Check', testCase.title, results, startTime);
    },
    [
      SDK,
      addLog,
      clearPendingUiActions,
      executeNextPendingUiAction,
      finalizeSingleSdkRun,
      prepareStandaloneMainWallet,
      prepareSingleSdkRun,
      selectedDevice?.connectProtocol,
      setPendingUiActions,
      setupUIListener,
    ]
  );

  const runSingleChainMethodCase = useCallback(
    async (testCase: SingleChainMethodCaseInput): Promise<void> => {
      const ctx = await prepareSingleSdkRun('chainMethodBatch', testCase.title);
      if (!ctx || !SDK) {
        return;
      }

      const startTime = Date.now();
      const results: TestCaseResult[] = [];
      setupUIListener(SDK, executeNextPendingUiAction);
      addLog(`[Single][ChainMethodBatch] ${testCase.title}`);

      try {
        const { forceUseEmptyPassphrase } = await prepareStandaloneMainWallet(
          SDK,
          ctx.connectId,
          'ChainMethodBatch'
        );
        setPendingUiActions('chainMethodBatch', testCase.title, [
          ...Array<DeviceUiAction>(testCase.confirmCount).fill('confirm'),
          ...Array<DeviceUiAction>(testCase.slideCount).fill('slide'),
        ]);
        const sdkMethod = (SDK as Record<string, unknown>)[testCase.method];
        if (typeof sdkMethod !== 'function') {
          results.push({
            title: testCase.title,
            method: testCase.method,
            passed: false,
            error: `SDK method ${testCase.method} not found`,
            duration: Date.now() - startTime,
          });
        } else {
          const sdkResult = await executeProtocolAwareMethod({
            sdk: SDK,
            method: testCase.method,
            connectId: ctx.connectId,
            deviceId: ctx.deviceId,
            params: withMainWalletCommonParams(testCase.params, forceUseEmptyPassphrase),
            protocol: selectedDevice?.connectProtocol,
          });

          results.push({
            title: testCase.title,
            method: testCase.method,
            passed: sdkResult.success,
            error: sdkResult.success ? undefined : sdkResult.payload?.error ?? 'unknown error',
            duration: Date.now() - startTime,
          });
        }
      } catch (error) {
        results.push({
          title: testCase.title,
          method: testCase.method,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
      } finally {
        clearPendingUiActions();
        setupUIListener(SDK);
      }

      finalizeSingleSdkRun(
        'chainMethodBatch',
        'Chain Method Batch',
        testCase.title,
        results,
        startTime
      );
    },
    [
      SDK,
      addLog,
      clearPendingUiActions,
      executeNextPendingUiAction,
      finalizeSingleSdkRun,
      prepareStandaloneMainWallet,
      prepareSingleSdkRun,
      selectedDevice?.connectProtocol,
      setPendingUiActions,
      setupUIListener,
    ]
  );

  const runSelectedSdkSuites = useCallback(
    async (
      scenario: AutomationScenario,
      selectedSuites: TestSuiteType[],
      suiteResults: TestSuiteResult[],
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      mnemonicStoreResult: MnemonicStoreResult | null,
      retrySelection?: RetryCaseSelection
    ): Promise<TestSuiteResult[]> => {
      const nextSuiteResults = [...suiteResults];
      const runSdkBatchSuite = async (
        suiteType: Extract<TestSuiteType, 'sdkAddressBatch' | 'sdkPubkeyBatch'>
      ) => {
        const retrySuiteFilter = getRetrySuiteFilter(retrySelection, scenario.id, suiteType);

        if (scenario.walletType === 'bip39') {
          if (scenario.flowType === 'import') {
            return runBip39ImportSdkSuite(
              suiteType,
              scenario,
              sdk,
              connectId,
              deviceId,
              config.passphraseVariants,
              retrySuiteFilter
            );
          }

          return runBip39CreateDynamicSuite(
            suiteType,
            scenario,
            sdk,
            connectId,
            deviceId,
            config.passphraseVariants,
            mnemonicStoreResult,
            retrySuiteFilter
          );
        }

        if (scenario.flowType === 'create') {
          return runSlip39CreateDynamicSuite(
            suiteType,
            scenario,
            sdk,
            connectId,
            deviceId,
            config.passphraseVariants,
            mnemonicStoreResult,
            retrySuiteFilter
          );
        }

        return runSlip39SdkSuite(
          suiteType,
          scenario,
          sdk,
          connectId,
          deviceId,
          config.passphraseVariants,
          retrySuiteFilter
        );
      };

      if (
        selectedSuites.includes('sdkAddressBatch') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const sdkAddressResult = await runSdkBatchSuite('sdkAddressBatch');
        nextSuiteResults.push(sdkAddressResult);
        if (liveScenarioCtxRef.current) {
          liveScenarioCtxRef.current.completedSuiteResults = [...nextSuiteResults];
        }
        markSuiteCompleted();
      }

      if (
        selectedSuites.includes('sdkPubkeyBatch') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const sdkPubkeyResult = await runSdkBatchSuite('sdkPubkeyBatch');
        nextSuiteResults.push(sdkPubkeyResult);
        if (liveScenarioCtxRef.current) {
          liveScenarioCtxRef.current.completedSuiteResults = [...nextSuiteResults];
        }
        markSuiteCompleted();
      }

      if (
        selectedSuites.includes('specialPassphrase') &&
        scenario.supportedSuites.includes('specialPassphrase') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const specialPassphraseResult = await runSpecialPassphraseSuite(
          scenario,
          sdk,
          connectId,
          deviceId,
          getRetrySuiteFilter(retrySelection, scenario.id, 'specialPassphrase')
        );
        nextSuiteResults.push(specialPassphraseResult);
        if (liveScenarioCtxRef.current) {
          liveScenarioCtxRef.current.completedSuiteResults = [...nextSuiteResults];
        }
        markSuiteCompleted();
      }

      if (
        selectedSuites.includes('securityCheck') &&
        scenario.supportedSuites.includes('securityCheck') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const securityCheckResult = await runSecurityCheckSuite(
          sdk,
          connectId,
          deviceId,
          getRetrySuiteFilter(retrySelection, scenario.id, 'securityCheck')
        );
        nextSuiteResults.push(securityCheckResult);
        if (liveScenarioCtxRef.current) {
          liveScenarioCtxRef.current.completedSuiteResults = [...nextSuiteResults];
        }
        markSuiteCompleted();
      }

      if (
        selectedSuites.includes('chainMethodBatch') &&
        scenario.supportedSuites.includes('chainMethodBatch') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const chainMethodBatchResult = await runChainMethodBatchSuite(
          sdk,
          connectId,
          deviceId,
          getRetrySuiteFilter(retrySelection, scenario.id, 'chainMethodBatch')
        );
        nextSuiteResults.push(chainMethodBatchResult);
        if (liveScenarioCtxRef.current) {
          liveScenarioCtxRef.current.completedSuiteResults = [...nextSuiteResults];
        }
        markSuiteCompleted();
      }

      return nextSuiteResults;
    },
    [
      config.passphraseVariants,
      config.stopOnFirstError,
      markSuiteCompleted,
      runBip39CreateDynamicSuite,
      runBip39ImportSdkSuite,
      runSlip39CreateDynamicSuite,
      runSlip39SdkSuite,
      runSpecialPassphraseSuite,
      runSecurityCheckSuite,
      runChainMethodBatchSuite,
    ]
  );

  const executeResetPreparation = useCallback(
    async (
      features: Record<string, unknown>,
      health: HealthCheckResponse
    ): Promise<PreparationResult> => {
      const isUnlocked = features.unlocked === true;
      const resetSequenceId = isUnlocked ? RESET_SEQUENCE_UNLOCKED : RESET_SEQUENCE_LOCKED;

      if (!health.sequenceIds.includes(resetSequenceId)) {
        const reason = `sequence drift: ${resetSequenceId} is not present in PhonePilot /health sequenceIds`;
        addLog(reason);
        return {
          success: false,
          suiteResult: createFailureSuiteResult('deviceFlow', 'Device Flow', reason),
          mnemonicStoreResult: null,
        };
      }

      addLog(`Resetting wallet via ${resetSequenceId}`);

      try {
        const result = await executePhonePilotSequence(resetSequenceId);
        if (!result.success) {
          return {
            success: false,
            suiteResult: createFailureSuiteResult(
              'deviceFlow',
              'Device Flow',
              `Reset wallet failed via ${resetSequenceId}: ${result.message}`
            ),
            mnemonicStoreResult: null,
          };
        }

        addLog(`Reset completed, waiting ${POST_SEQUENCE_SETTLE_MS}ms for device to settle...`);
        await delay(POST_SEQUENCE_SETTLE_MS);

        return {
          success: true,
          suiteResult: createSuiteResult(
            'deviceFlow',
            'Device Flow',
            [
              {
                title: `Reset via ${resetSequenceId}`,
                expected: 'PhonePilot reset sequence success',
                actual: result.message,
                passed: true,
                duration: 0,
                metadata: {
                  sequenceId: result.sequenceId || resetSequenceId,
                  steps: `${result.stepsCompleted || 0}/${result.totalSteps || 0}`,
                },
              },
            ],
            0
          ),
          mnemonicStoreResult: null,
        };
      } catch (error) {
        return {
          success: false,
          suiteResult: createFailureSuiteResult(
            'deviceFlow',
            'Device Flow',
            `Reset wallet failed via ${resetSequenceId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          ),
          mnemonicStoreResult: null,
        };
      }
    },
    [addLog, executePhonePilotSequence]
  );

  const resolveDebugRunContext = useCallback(
    async (
      selectedScenarios: AutomationScenario[],
      connectId: string
    ): Promise<DebugRunContext> => {
      const sdk = SDK;
      if (!sdk) {
        throw new Error('SDK is not available');
      }

      const scenarioDecisions = new Map<string, DebugScenarioDecision>();
      const selectedSdkScenarios = selectedScenarios.filter(scenario =>
        buildSelectedSuites(scenario, config.testSuites).some(
          suiteType => suiteType !== 'deviceFlow'
        )
      );

      let deviceId = '';
      if (selectedSdkScenarios.length > 0) {
        deviceId = await refreshDeviceId(sdk, connectId);
        addLog(`Device ID updated: ${deviceId}`);
      }

      let currentEvmAddress = '';
      const importScenarios = selectedSdkScenarios.filter(
        scenario => scenario.flowType === 'import'
      );
      if (importScenarios.length > 0 && deviceId) {
        try {
          currentEvmAddress = await getCurrentDeviceEvmAddress(sdk, connectId, deviceId);
          addLog(`Current wallet EVM address: ${currentEvmAddress}`);
        } catch (error) {
          addLog(
            `Current wallet probe failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const needCreateContext = selectedSdkScenarios.some(
        scenario => scenario.flowType === 'create'
      );
      const mnemonicStoreResult = needCreateContext ? await readMnemonicStoreContext() : null;
      if (mnemonicStoreResult?.success) {
        addLog(
          `Debug mnemonic context: ${mnemonicStoreResult.walletType || 'unknown'} ${
            mnemonicStoreResult.flowType || 'unknown'
          } (${mnemonicStoreResult.sequenceId || 'no-sequence'})`
        );
      } else if (needCreateContext && mnemonicStoreResult) {
        addLog(`Debug mnemonic context unavailable: ${mnemonicStoreResult.message}`);
      }

      for (const scenario of selectedScenarios) {
        const selectedSuites = buildSelectedSuites(scenario, config.testSuites);
        const hasSdkSuites = selectedSuites.some(suiteType => suiteType !== 'deviceFlow');
        if (!hasSdkSuites) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: 'debug mode has no SDK suites to execute',
          });
        } else if (scenario.flowType === 'import') {
          const expectedAddress =
            scenario.walletType === 'bip39'
              ? getBip39ImportProbeAddress(scenario)
              : getSlip39ImportProbeAddress(scenario);

          addLog(
            `Debug import probe [${scenario.id}]: expected=${expectedAddress || '(none)'}, actual=${
              currentEvmAddress || '(none)'
            }`
          );

          if (!currentEvmAddress) {
            // EVM probe failed (device may require PIN/passphrase interaction).
            // In sdkOnly mode PhonePilot is not connected, so we can't automate device UI.
            // Run the scenario anyway — the user claims to have the correct wallet loaded.
            addLog(
              `[sdkOnly] EVM probe unavailable for ${scenario.id}, running without address match`
            );
            scenarioDecisions.set(scenario.id, { matched: true });
          } else if (!expectedAddress) {
            scenarioDecisions.set(scenario.id, {
              matched: false,
              reason: 'current wallet mismatch: missing expected probe address',
            });
          } else {
            const matched = currentEvmAddress.toLowerCase() === expectedAddress.toLowerCase();
            scenarioDecisions.set(scenario.id, {
              matched,
              reason: matched
                ? undefined
                : `current wallet mismatch: expected ${expectedAddress}, actual ${currentEvmAddress}`,
            });
          }
        } else if (!mnemonicStoreResult) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: 'missing create context: mnemonic-store unavailable',
          });
        } else if (!mnemonicStoreResult.success) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: ${mnemonicStoreResult.message}`,
          });
        } else if (mnemonicStoreResult.flowType !== 'create') {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: flowType=${mnemonicStoreResult.flowType || 'unknown'}`,
          });
        } else if (mnemonicStoreResult.walletType !== scenario.walletType) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: walletType=${
              mnemonicStoreResult.walletType || 'unknown'
            }`,
          });
        } else if (mnemonicStoreResult.sequenceId !== scenario.phonePilotSequenceId) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: expected sequence ${
              scenario.phonePilotSequenceId
            }, got ${mnemonicStoreResult.sequenceId || 'unknown'}`,
          });
        } else if (scenario.walletType === 'bip39') {
          const mnemonicWords = normalizeMnemonicWords(mnemonicStoreResult.words);
          scenarioDecisions.set(scenario.id, {
            matched: mnemonicWords.length > 0,
            reason:
              mnemonicWords.length > 0
                ? undefined
                : 'missing create context: no BIP39 mnemonic words captured',
          });
        } else {
          const shareMnemonics = normalizeSlip39Shares(mnemonicStoreResult.shares);
          scenarioDecisions.set(scenario.id, {
            matched: shareMnemonics.length > 0 && typeof mnemonicStoreResult.threshold === 'number',
            reason:
              shareMnemonics.length > 0 && typeof mnemonicStoreResult.threshold === 'number'
                ? undefined
                : 'missing create shares: shares or threshold unavailable',
          });
        }
      }

      const matchedCount = Array.from(scenarioDecisions.values()).filter(
        item => item.matched
      ).length;
      addLog(`Debug matched scenarios: ${matchedCount}/${selectedScenarios.length}`);

      addLog('--- Debug scenario match summary ---');
      for (const scenario of selectedScenarios) {
        const decision = scenarioDecisions.get(scenario.id);
        if (decision) {
          const symbol = decision.matched ? '✓' : '✗';
          const detail = decision.reason || 'matched';
          addLog(`  ${symbol} ${scenario.id}: ${detail}`);
        }
      }

      if (matchedCount === 0) {
        addLog('Debug mode found no matching scenarios; only skipped reports will be generated');
      }

      return {
        deviceId,
        currentEvmAddress,
        mnemonicStoreResult,
        scenarioDecisions,
      };
    },
    [
      SDK,
      addLog,
      config.testSuites,
      getCurrentDeviceEvmAddress,
      readMnemonicStoreContext,
      refreshDeviceId,
    ]
  );

  const runAutomation = useCallback(
    async (mode: AutomationRunMode, retrySelection?: RetryCaseSelection): Promise<void> => {
      if (runningRef.current) {
        addLog('Automation is already running');
        return;
      }

      if (!SDK || !selectedDevice?.connectId) {
        addLog('SDK or selected device is not available');
        return;
      }

      const needsPhonePilot = config.devicePreparationMode !== 'sdkOnly';
      // deviceFlowOnly: same as full but SDK suites will be skipped per-scenario

      if (needsPhonePilot && connectionState !== 'connected') {
        addLog('PhonePilot not connected, connecting...');
        const connected = await connectPhonePilot();
        if (!connected) {
          addLog('Failed to connect to PhonePilot');
          return;
        }
      }

      runningRef.current = true;
      singleSecurityCheckPreparedRef.current = null;
      pendingUiActionRef.current = null;
      clearLogs();
      resetProgress();
      setReport(null);
      currentPassphraseRef.current = '';

      setupUIListener(SDK);

      const effectiveRequestedSuites =
        config.devicePreparationMode === 'deviceFlowOnly'
          ? DEVICE_FLOW_ONLY_SUITES
          : config.testSuites;
      const selectedScenarios = retrySelection
        ? currentReport?.scenarioResults
            .filter(scenarioResult => retrySelection.has(scenarioResult.scenarioId))
            .map(scenarioResult => getAutomationScenario(scenarioResult.scenarioId)) || []
        : buildEffectiveSelectedScenarios(config.scenarioIds, effectiveRequestedSuites);
      const totalSuites = selectedScenarios.reduce(
        (sum, scenario) =>
          sum +
          (retrySelection
            ? Array.from(retrySelection.get(scenario.id)?.keys() || [])
            : buildSelectedSuites(scenario, effectiveRequestedSuites)
          ).length,
        0
      );
      const totalTests = retrySelection
        ? countRetrySelectionTests(retrySelection)
        : selectedScenarios.reduce(
            (sum, scenario) =>
              sum +
              countScenarioTotalTests(
                scenario,
                buildSelectedSuites(scenario, effectiveRequestedSuites),
                config.passphraseVariants
              ),
            0
          );
      const { connectId } = selectedDevice;
      const startTime = Date.now();
      initLiveReport({ totalScenarios: selectedScenarios.length, startTime });
      const scenarioResults: ScenarioReportResult[] = [];
      let fatalErrorMessage = '';
      let cumulativeExpectedTests = 0;

      let health: HealthCheckResponse | null = null;
      if (needsPhonePilot) {
        health = await refreshPhonePilotHealth();
        if (!health) {
          runningRef.current = false;
          setProgress(prev => ({
            ...prev,
            status: 'error',
            errorMessage: 'PhonePilot health check failed before automation start',
          }));
          addLog('PhonePilot health check failed before automation start');
          return;
        }
      }

      const startLogMessage = retrySelection
        ? '=== Retry Failed Cases Started ==='
        : '=== Automation Test Started ===';
      addLog(
        mode === 'debug' && !retrySelection
          ? '=== Automation Debug Test Started ==='
          : startLogMessage
      );
      addLog(`Scenario count: ${selectedScenarios.length}`);
      if (retrySelection) {
        addLog(`Retry failed cases: ${totalTests}`);
      }
      addLog(`Device preparation mode: ${config.devicePreparationMode}`);
      if (health) {
        addLog(`PhonePilot MCP ready: ${health.mcpReady ? 'yes' : 'no'}`);
        addLog(`PhonePilot OCR ready: ${health.ocrReady ? 'yes' : 'no'}`);
        if (health.message) {
          addLog(`PhonePilot health message: ${health.message}`);
        }
      }
      if (mode === 'debug') {
        addLog(
          'Debug mode enabled: skip reset-wallet and execute-sequence, run SDK validation only'
        );
      }

      let debugRunContext: DebugRunContext | null = null;
      if (mode === 'debug') {
        try {
          debugRunContext = await resolveDebugRunContext(selectedScenarios, connectId);
        } catch (error) {
          fatalErrorMessage = error instanceof Error ? error.message : String(error);
          addLog(`Debug context initialization failed: ${fatalErrorMessage}`);
        }
      }

      setProgress({
        currentScenarioId: null,
        currentScenarioTitle: null,
        currentPassphrase: null,
        currentTestSuite: null,
        currentTestIndex: 0,
        totalTests,
        completedTests: 0,
        completedScenarios: 0,
        totalScenarios: selectedScenarios.length,
        completedSuites: 0,
        totalSuites,
        status: 'running',
      });

      try {
        for (let scenarioIndex = 0; scenarioIndex < selectedScenarios.length; scenarioIndex += 1) {
          const scenario = selectedScenarios[scenarioIndex];
          if (!runningRef.current || fatalErrorMessage) {
            if (!fatalErrorMessage) {
              addLog('Test stopped by user');
            }
            break;
          }

          addLog(
            `\n--- Scenario ${scenarioIndex + 1}/${selectedScenarios.length}: ${scenario.title} ---`
          );
          // deviceFlowOnly: only run deviceFlow suite regardless of testSuites config
          const selectedSuites = retrySelection
            ? Array.from(retrySelection.get(scenario.id)?.keys() || [])
            : buildSelectedSuites(scenario, effectiveRequestedSuites);
          const scenarioStartedAt = Date.now();
          liveScenarioCtxRef.current = {
            scenario,
            startedAt: scenarioStartedAt,
            completedSuiteResults: [],
          };
          let suiteResults: TestSuiteResult[] = [];
          let scenarioReport: ScenarioReportResult;

          if (selectedSuites.length === 0) {
            scenarioReport = buildScenarioReport(scenario, [], 0, 'skipped');
          } else if (mode === 'debug') {
            if (selectedSuites.includes('deviceFlow')) {
              suiteResults.push(
                createSkippedSuiteResult('deviceFlow', 'Device Flow', DEBUG_SKIP_DEVICE_FLOW_REASON)
              );
              markSuiteCompleted();
            }

            const sdkSuites = selectedSuites.filter(suiteType => suiteType !== 'deviceFlow');
            const decision = debugRunContext?.scenarioDecisions.get(scenario.id) || {
              matched: false,
              reason: 'current wallet mismatch: debug context unavailable',
            };

            if (sdkSuites.length === 0) {
              scenarioReport = buildScenarioReport(
                scenario,
                suiteResults,
                Date.now() - scenarioStartedAt,
                'skipped'
              );
            } else if (!decision.matched || !debugRunContext?.deviceId) {
              const reason =
                decision.reason ||
                (debugRunContext?.deviceId
                  ? 'current wallet mismatch'
                  : 'current wallet mismatch: device ID unavailable');
              sdkSuites.forEach(suiteType => {
                suiteResults.push(
                  createSkippedSuiteResult(suiteType, getSuiteName(suiteType), reason)
                );
                markSuiteCompleted();
              });
              scenarioReport = buildScenarioReport(
                scenario,
                suiteResults,
                Date.now() - scenarioStartedAt,
                'skipped'
              );
            } else {
              suiteResults = await runSelectedSdkSuites(
                scenario,
                sdkSuites,
                suiteResults,
                SDK,
                connectId,
                debugRunContext.deviceId,
                debugRunContext.mnemonicStoreResult,
                retrySelection
              );
              scenarioReport = buildScenarioReport(
                scenario,
                suiteResults,
                Date.now() - scenarioStartedAt
              );
            }
          } else {
            const scenarioHealth = await refreshPhonePilotHealth();
            if (!scenarioHealth) {
              if (selectedSuites.includes('deviceFlow')) {
                suiteResults.push(
                  createFailureSuiteResult(
                    'deviceFlow',
                    'Device Flow',
                    'PhonePilot health check failed before scenario preparation'
                  )
                );
                markSuiteCompleted();
              }
              selectedSuites
                .filter(suiteType => suiteType !== 'deviceFlow')
                .forEach(suiteType => {
                  suiteResults.push(
                    createSkippedSuiteResult(
                      suiteType,
                      getSuiteName(suiteType),
                      'Skipped because device preparation failed'
                    )
                  );
                  markSuiteCompleted();
                });
              scenarioReport = buildScenarioReport(
                scenario,
                suiteResults,
                Date.now() - scenarioStartedAt,
                'failed'
              );
            } else {
              // Fetch device features to determine reset strategy
              addLog('Fetching device features to determine reset strategy...');
              const deviceFeatures = await fetchDeviceFeatures(SDK, connectId);
              addLog(
                `Device features: initialized=${deviceFeatures?.initialized}, unlocked=${deviceFeatures?.unlocked}`
              );
              const isInitialized = deviceFeatures?.initialized !== false;
              const shouldSkipReset = !isInitialized;

              if (!isInitialized) {
                addLog('Device is not initialized (factory state) — skipping reset step');
              }

              if (!shouldSkipReset && !deviceFeatures) {
                throw new Error(
                  'Failed to fetch device features — cannot determine reset strategy. Check device connection.'
                );
              }
              const resetPreparation = shouldSkipReset
                ? {
                    success: true,
                    suiteResult: createSkippedSuiteResult(
                      'deviceFlow',
                      'Device Reset',
                      !isInitialized
                        ? 'Skipped: device already in factory reset state (initialized=false)'
                        : 'Skipped by config (auto-detected)'
                    ),
                    mnemonicStoreResult: null,
                  }
                : await executeResetPreparation(deviceFeatures, scenarioHealth);
              if (!resetPreparation.success) {
                if (selectedSuites.includes('deviceFlow')) {
                  suiteResults.push(resetPreparation.suiteResult);
                  markSuiteCompleted();
                }
                selectedSuites
                  .filter(suiteType => suiteType !== 'deviceFlow')
                  .forEach(suiteType => {
                    suiteResults.push(
                      createSkippedSuiteResult(
                        suiteType,
                        getSuiteName(suiteType),
                        'Skipped because device preparation failed'
                      )
                    );
                    markSuiteCompleted();
                  });
                scenarioReport = buildScenarioReport(
                  scenario,
                  suiteResults,
                  Date.now() - scenarioStartedAt,
                  'failed'
                );
              } else {
                const preparation = await executeScenarioPreparation(scenario, {
                  health: scenarioHealth,
                  clearMnemonicStore: true,
                });

                if (selectedSuites.includes('deviceFlow')) {
                  suiteResults.push(preparation.suiteResult);
                  markSuiteCompleted();
                }

                if (!preparation.success) {
                  selectedSuites
                    .filter(suiteType => suiteType !== 'deviceFlow')
                    .forEach(suiteType => {
                      suiteResults.push(
                        createSkippedSuiteResult(
                          suiteType,
                          getSuiteName(suiteType),
                          'Skipped because device preparation failed'
                        )
                      );
                      markSuiteCompleted();
                    });

                  scenarioReport = buildScenarioReport(
                    scenario,
                    suiteResults,
                    Date.now() - scenarioStartedAt,
                    'failed'
                  );
                } else {
                  let deviceId = '';
                  const shouldRunSdkSuites =
                    !shouldStopBySuiteFailure(config.stopOnFirstError, suiteResults) &&
                    selectedSuites.some(suiteType => suiteType !== 'deviceFlow');

                  if (shouldRunSdkSuites) {
                    try {
                      addLog(
                        `Waiting ${PRE_SDK_SETTLE_MS}ms before SDK tests to let device settle...`
                      );
                      await delay(PRE_SDK_SETTLE_MS);
                      deviceId = await refreshDeviceId(SDK, connectId);
                      addLog(`Device ID updated: ${deviceId}`);
                    } catch (error) {
                      const reason = error instanceof Error ? error.message : String(error);
                      selectedSuites
                        .filter(suiteType => suiteType !== 'deviceFlow')
                        .forEach(suiteType => {
                          suiteResults.push(
                            createFailureSuiteResult(suiteType, getSuiteName(suiteType), reason)
                          );
                          markSuiteCompleted();
                        });
                    }
                  }

                  if (shouldRunSdkSuites && deviceId) {
                    suiteResults = await runSelectedSdkSuites(
                      scenario,
                      selectedSuites.filter(suiteType => suiteType !== 'deviceFlow'),
                      suiteResults,
                      SDK,
                      connectId,
                      deviceId,
                      preparation.mnemonicStoreResult,
                      retrySelection
                    );
                  }

                  scenarioReport = buildScenarioReport(
                    scenario,
                    suiteResults,
                    Date.now() - scenarioStartedAt
                  );
                }
              }
            }
          }

          scenarioResults.push(scenarioReport);
          updateLiveScenario(scenarioReport);
          // Sync completedTests: count actual test cases from all completed scenarios
          cumulativeExpectedTests += scenarioReport.suiteResults.reduce(
            (sum, s) => sum + s.results.length,
            0
          );
          const snapshot = cumulativeExpectedTests;
          setProgress(prev => ({
            ...prev,
            completedTests: Math.min(Math.max(prev.completedTests, snapshot), prev.totalTests),
          }));
          markScenarioCompleted();

          if (shouldStopBySuiteFailure(config.stopOnFirstError, scenarioReport.suiteResults)) {
            addLog(`Stop on first error triggered at scenario: ${scenario.title}`);
            break;
          }

          if (scenarioIndex < selectedScenarios.length - 1) {
            await delay(config.delayBetweenTests);
          }
        }
      } catch (error) {
        fatalErrorMessage = error instanceof Error ? error.message : String(error);
        addLog(`Automation aborted by unexpected error: ${fatalErrorMessage}`);
      } finally {
        if (uiListenerRef.current) {
          SDK.off(UI_EVENT, uiListenerRef.current);
          uiListenerRef.current = null;
        }
        runningRef.current = false;
      }

      const endTime = Date.now();
      const report: TestReport = {
        startTime,
        endTime,
        duration: endTime - startTime,
        totalScenarios: scenarioResults.length,
        passedScenarios: scenarioResults.filter(item => item.status === 'passed').length,
        failedScenarios: scenarioResults.filter(item => item.status === 'failed').length,
        skippedScenarios: scenarioResults.filter(item => item.status === 'skipped').length,
        scenarioResults,
      };

      setReport(report);
      setLiveReport(report);
      setProgress(prev => ({
        ...prev,
        status: fatalErrorMessage ? 'error' : 'done',
        errorMessage: fatalErrorMessage || undefined,
        currentPassphrase: null,
      }));

      const completedLogMessage = retrySelection
        ? '=== Retry Failed Cases Completed ==='
        : '=== Automation Test Completed ===';
      addLog(
        mode === 'debug' && !retrySelection
          ? '=== Automation Debug Test Completed ==='
          : completedLogMessage
      );
      addLog(`Passed scenarios: ${report.passedScenarios}/${report.totalScenarios}`);
      addLog(`Failed scenarios: ${report.failedScenarios}`);
      if (fatalErrorMessage) {
        addLog(`Fatal error: ${fatalErrorMessage}`);
      }
    },
    [
      SDK,
      addLog,
      clearLogs,
      config,
      connectPhonePilot,
      connectionState,
      executeResetPreparation,
      executeScenarioPreparation,
      markScenarioCompleted,
      markSuiteCompleted,
      currentReport,
      refreshDeviceId,
      refreshPhonePilotHealth,
      resetProgress,
      resolveDebugRunContext,
      runSelectedSdkSuites,
      selectedDevice,
      initLiveReport,
      setLiveReport,
      setProgress,
      setReport,
      setupUIListener,
      updateLiveScenario,
    ]
  );

  const startAutomation = useCallback(async (): Promise<void> => {
    if (config.devicePreparationMode === 'sdkOnly') {
      await runAutomation('debug');
    } else {
      await runAutomation('full');
    }
  }, [config.devicePreparationMode, runAutomation]);
  // Note: deviceFlowOnly uses 'full' run mode — SDK suites are skipped inside runAutomation

  const retryFailedCases = useCallback(async (): Promise<void> => {
    if (!currentReport) {
      addLog('No report available for retry');
      return;
    }

    const retrySelection = buildFailedCaseSelection(currentReport);
    if (retrySelection.size === 0) {
      addLog('No failed cases to retry');
      return;
    }

    if (config.devicePreparationMode === 'sdkOnly') {
      await runAutomation('debug', retrySelection);
    } else {
      await runAutomation('full', retrySelection);
    }
  }, [addLog, config.devicePreparationMode, currentReport, runAutomation]);

  const stopAutomation = useCallback(async () => {
    runningRef.current = false;
    currentPassphraseRef.current = '';
    pendingUiActionRef.current = null;
    setProgress(prev => ({ ...prev, status: 'paused' }));
    addLog('Stopping automation test...');

    if (clientRef.current) {
      try {
        await clientRef.current.stopSequence();
        addLog('Stop signal sent to PhonePilot');
      } catch (error) {
        console.error('Failed to stop PhonePilot sequence:', error);
      }
    }

    SDK?.cancel();
  }, [SDK, addLog, setProgress]);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!clientRef.current || connectionState !== 'connected') {
      return null;
    }

    try {
      const result = await clientRef.current.captureFrame();
      if (result.frame) {
        setCameraFrame(result.frame);
        return result.frame;
      }
    } catch (error) {
      addLog(`Capture frame failed: ${error}`);
    }
    return null;
  }, [addLog, connectionState, setCameraFrame]);

  return {
    connectionState,
    progress,
    logs,
    scenarios: getAllAutomationScenarios().filter(
      scenario => scenario.id !== STANDALONE_MODULE_SCENARIO_ID
    ),
    connectPhonePilot,
    disconnectPhonePilot,
    startAutomation,
    retryFailedCases,
    stopAutomation,
    captureFrame,
    runSingleSecurityCheckCase,
    runSingleChainMethodCase,
  };
}
