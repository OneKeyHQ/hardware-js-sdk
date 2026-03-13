/**
 * useAutomationTest Hook
 */

import { useCallback, useContext, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { getAllAutomationScenarios, getAutomationScenario } from './scenarioCatalog';
import {
  resolveBip39ImportSdkCases,
  type AutomationSdkCase,
  type AutomationSdkMethodCase,
  getScenarioPassphraseLiteral,
  getSlip39CreateTemplateCase,
  resolveSlip39SdkCases,
} from './scenarioResolver';
import { PhonePilotClient } from '../../services/phonePilotMcp';
import {
  addLogAtom,
  automationConfigAtom,
  automationLogsAtom,
  automationProgressAtom,
  automationReportAtom,
  cameraFrameAtom,
  clearLogsAtom,
  phonePilotConnectionStateAtom,
  phonePilotHealthAtom,
  resetProgressAtom,
} from '../../atoms/automationAtoms';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { deriveKeyPairWithPath, mnemonicToSeed } from '../../utils/mockDevice/helper';
import { generateAptosPublicKeyFromSeed } from '../../utils/mockDevice/method/aptosGetPublicKey';
import { generateEvmAddressFromSeed } from '../../utils/mockDevice/method/evmGetAddress';
import {
  generateMultiChainAddressFromSLIP39,
  generateMultiChainPublicKeyFromSLIP39,
} from '../slip39Test/slip39Utils';

import type {
  AutomationScenario,
  HealthCheckResponse,
  MnemonicStoreResult,
  PassphraseVariantId,
  ScenarioReportResult,
  TestCaseResult,
  TestReport,
  TestSuiteResult,
  TestSuiteType,
} from '../../services/phonePilotMcp/types';
import type { CoreApi } from '@onekeyfe/hd-core';
import type { SLIP39MethodData, SLIP39TestCaseData } from '../slip39Test/types';

const SUITE_EXECUTION_ORDER: TestSuiteType[] = [
  'deviceFlow',
  'sdkAddressBatch',
  'sdkPubkeyBatch',
  'specialPassphrase',
];
const EVM_ADDRESS_PATH = "m/44'/60'/0'/0/0";
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

type AutomationRunMode = 'full' | 'debug';

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
    if (method === 'evmGetPublicKey' && !lowerCaseName.includes('xpub') && !value.startsWith('0x')) {
      return `0x${value}`;
    }
    if (method === 'suiGetPublicKey' && !value.startsWith('00')) {
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
      throw new Error(`Missing bundle params for ${methodCase.name || methodCase.method} / ${expectedPath}`);
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
  };
  return names[suiteType] || suiteType;
}

function getBip39ImportProbeAddress(scenario: AutomationScenario): string {
  const sdkCase = resolveBip39ImportSdkCases(scenario, ['normal'], 'address')[0];
  if (!sdkCase) {
    return '';
  }

  for (const methodData of sdkCase.data) {
    if (methodData.method !== 'evmGetAddress') {
      continue;
    }
    return extractExpectedByPath(
      methodData.expectedByPath,
      EVM_ADDRESS_PATH,
      'address',
      methodData.method,
      methodData.name
    );
  }

  return '';
}

function getSlip39ImportProbeAddress(scenario: AutomationScenario): string {
  const slip39Cases = resolveSlip39SdkCases(scenario, ['normal'], 'address');
  for (const slip39Case of slip39Cases) {
    for (const methodData of slip39Case.data) {
      if (methodData.method !== 'evmGetAddress') {
        continue;
      }
      const expected = methodData.expectedAddress?.[EVM_ADDRESS_PATH];
      if (expected) {
        return expected;
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
  return SUITE_EXECUTION_ORDER.filter(
    suiteType => selectedSuites.includes(suiteType) && scenario.supportedSuites.includes(suiteType)
  );
}

function shouldStopBySuiteFailure(
  stopOnFirstError: boolean,
  suiteResults: TestSuiteResult[]
): boolean {
  return stopOnFirstError && suiteResults.some(item => item.status === 'failed');
}

export function useAutomationTest() {
  const [connectionState, setConnectionState] = useAtom(phonePilotConnectionStateAtom);
  const config = useAtomValue(automationConfigAtom);
  const [progress, setProgress] = useAtom(automationProgressAtom);
  const setReport = useSetAtom(automationReportAtom);
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

  const updateHealthState = useCallback(
    (health: HealthCheckResponse | null) => {
      phonePilotHealthRef.current = health;
      setPhonePilotHealth(health);
    },
    [setPhonePilotHealth]
  );

  useEffect(() => {
    if (!clientRef.current || lastUrlRef.current !== config.phonePilotUrl) {
      if (clientRef.current && lastUrlRef.current !== config.phonePilotUrl) {
        clientRef.current.disconnect();
      }
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

    const success = await client.connect();
    addLog(success ? 'PhonePilot connected' : 'PhonePilot connection failed');
    return success;
  }, [
    addLog,
    config.phonePilotUrl,
    refreshPhonePilotHealth,
    setConnectionState,
    updateHealthState,
  ]);

  const disconnectPhonePilot = useCallback(async (): Promise<void> => {
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

  const uiListenerRef = useRef<((message: { type: string }) => void) | null>(null);

  const setupUIListener = useCallback(
    (sdk: CoreApi) => {
      if (uiListenerRef.current) {
        sdk.off(UI_EVENT, uiListenerRef.current);
      }

      const listener = async (message: { type: string }) => {
        addLog(`UI Event: ${message.type}`);

        switch (message.type) {
          case UI_REQUEST.REQUEST_BUTTON:
            if (clientRef.current) {
              try {
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
                await clientRef.current.inputPin('1111');
                sdk.uiResponse({
                  type: UI_RESPONSE.RECEIVE_PIN,
                  payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
                });
                addLog('PIN input via PhonePilot');
              } catch (error) {
                addLog(`PIN input failed: ${error}`);
              }
            }
            break;
          case UI_REQUEST.REQUEST_PASSPHRASE:
            addLog(
              `Device requesting passphrase, sending via SDK: "${
                currentPassphraseRef.current || '(empty)'
              }"`
            );
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: { value: currentPassphraseRef.current || '' },
            });
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
    [
      addLog,
      executePhonePilotSequence,
      refreshPhonePilotHealth,
      setProgress,
      updateSuiteProgress,
    ]
  );

  const refreshDeviceId = useCallback(async (sdk: CoreApi, connectId: string): Promise<string> => {
    const featuresResult = await sdk.getFeatures(connectId);
    if (!featuresResult.success) {
      throw new Error('Failed to get device features');
    }
    return featuresResult.payload?.device_id ?? '';
  }, []);

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
      const result = (await runWithRetry('evmGetAddress:current-wallet', () =>
        sdk.evmGetAddress(connectId, deviceId, {
          path: EVM_ADDRESS_PATH,
          showOnOneKey: false,
        })
      )) as { success: boolean; payload?: unknown };

      if (!result.success) {
        throw new Error(
          (result.payload as { error?: string } | undefined)?.error ||
            'Failed to get current wallet EVM address'
        );
      }

      return extractComparisonValue(result.payload, 'address', 'evmGetAddress');
    },
    [runWithRetry]
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
      caseType: 'address' | 'pubkey'
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
        const params = {
          ...(methodData.params || {}),
          path: expectedPath,
          showOnOneKey: false,
        };
        const result = (await runWithRetry(`${methodData.method}:${expectedPath}`, () => {
          const method = (sdk as Record<string, unknown>)[methodData.method];
          if (typeof method !== 'function') {
            throw new Error(`SDK method not found: ${methodData.method}`);
          }
          return (method as (...args: unknown[]) => Promise<unknown>)(connectId, deviceId, params);
        })) as { success: boolean; payload?: unknown };

        if (!result.success) {
          return {
            title: `${slip39Case.id} / ${methodData.name || methodData.method} / ${expectedPath}`,
            method: methodData.method,
            expected,
            actual: '',
            passed: false,
            error: (result.payload as { error?: string } | undefined)?.error || 'Unknown error',
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
    [runWithRetry]
  );

  const runSlip39SdkSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[]
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

      const results: TestCaseResult[] = [];
      for (const slip39Case of slip39Cases) {
        currentPassphraseRef.current = slip39Case.passphrase || '';
        const passphraseDisplay = formatPassphraseDisplay(slip39Case.passphrase);
        setProgress(prev => ({
          ...prev,
          currentPassphrase: passphraseDisplay,
        }));

        for (const methodData of slip39Case.data) {
          const expectedMap =
            caseType === 'address' ? methodData.expectedAddress : methodData.expectedPublicKey;
          const expectedPaths = Object.keys(expectedMap || {});

          for (const expectedPath of expectedPaths) {
            if (!runningRef.current) {
              break;
            }
            const caseResult = await runSdkMethodCase(
              sdk,
              connectId,
              deviceId,
              scenario,
              slip39Case,
              methodData,
              expectedPath,
              caseType
            );
            results.push(caseResult);
            await delay(80);
          }
        }
      }

      currentPassphraseRef.current = '';
      setProgress(prev => ({
        ...prev,
        currentPassphrase: null,
      }));

      return createSuiteResult(
        suiteType,
        suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
        results,
        Date.now() - startedAt
      );
    },
    [runSdkMethodCase, setProgress, updateSuiteProgress]
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
      caseType: 'address' | 'pubkey'
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
        const result = (await runWithRetry(`${methodCase.method}:${expectedPath}`, () => {
          const method = (sdk as Record<string, unknown>)[methodCase.method];
          if (typeof method !== 'function') {
            throw new Error(`SDK method not found: ${methodCase.method}`);
          }
          return (method as (...args: unknown[]) => Promise<unknown>)(connectId, deviceId, params);
        })) as { success: boolean; payload?: unknown };

        if (!result.success) {
          return {
            title: `${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`,
            method: methodCase.method,
            expected,
            actual: '',
            passed: false,
            error: (result.payload as { error?: string } | undefined)?.error || 'Unknown error',
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
          addLog(`[MISMATCH] ${sdkCase.id} / ${methodCase.name || methodCase.method} / ${expectedPath}`);
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
    [runWithRetry]
  );

  const runBip39ImportSdkSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[]
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

      const results: TestCaseResult[] = [];
      for (const bip39Case of bip39Cases) {
        currentPassphraseRef.current = bip39Case.passphrase || '';
        const passphraseDisplay = formatPassphraseDisplay(bip39Case.passphrase);
        setProgress(prev => ({
          ...prev,
          currentPassphrase: passphraseDisplay,
        }));

        for (const methodCase of bip39Case.data) {
          const expectedPaths = Object.keys(methodCase.expectedByPath || {});
          for (const expectedPath of expectedPaths) {
            if (!runningRef.current) {
              break;
            }
            const caseResult = await runAutomationSdkBatchCase(
              sdk,
              connectId,
              deviceId,
              scenario,
              bip39Case,
              methodCase,
              expectedPath,
              caseType
            );
            results.push(caseResult);
            await delay(80);
          }
        }
      }

      currentPassphraseRef.current = '';
      setProgress(prev => ({
        ...prev,
        currentPassphrase: null,
      }));

      return createSuiteResult(suiteType, getSuiteName(suiteType), results, Date.now() - startedAt);
    },
    [runAutomationSdkBatchCase, setProgress, updateSuiteProgress]
  );

  const runBip39CreateDynamicSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[],
      mnemonicStoreResult: MnemonicStoreResult | null
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

      const results: TestCaseResult[] = [];
      for (const variantId of selectedPassphraseVariants) {
        if (!runningRef.current) {
          break;
        }

        const passphraseLiteral = getScenarioPassphraseLiteral(scenario, variantId);
        const passphraseDisplay = formatPassphraseDisplay(passphraseLiteral);
        currentPassphraseRef.current = passphraseLiteral || '';
        setProgress(prev => ({
          ...prev,
          currentPassphrase: passphraseDisplay,
        }));

        const seed = mnemonicToSeed(mnemonicWords.join(' '), passphraseLiteral);
        for (const probe of probes) {
          const startedAtCase = Date.now();
          let expected = '';

          try {
            expected = buildBip39CreateExpectedValue(probe.method, probe.caseName, seed, probe.path);
            if (!expected) {
              throw new Error(`Missing expected ${caseType} value for ${probe.caseName}`);
            }

            const result = (await runWithRetry(`${probe.method}:${probe.path}`, () => {
              const method = (sdk as Record<string, unknown>)[probe.method];
              if (typeof method !== 'function') {
                throw new Error(`SDK method not found: ${probe.method}`);
              }
              return (method as (...args: unknown[]) => Promise<unknown>)(connectId, deviceId, {
                path: probe.path,
                showOnOneKey: false,
              });
            })) as { success: boolean; payload?: unknown };

            if (!result.success) {
              results.push({
                title: `${scenario.id} / ${probe.caseName} / ${probe.path} / ${variantId}`,
                method: probe.method,
                expected,
                actual: '',
                passed: false,
                error: (result.payload as { error?: string } | undefined)?.error || 'Unknown error',
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
                addLog(`[MISMATCH] ${scenario.id} / ${probe.caseName} / ${probe.path} / ${variantId}`);
                addLog(`  expected: ${expected}`);
                addLog(`  actual:   ${actual}`);
              }
              results.push({
                title: `${scenario.id} / ${probe.caseName} / ${probe.path} / ${variantId}`,
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
              title: `${scenario.id} / ${probe.caseName} / ${probe.path} / ${variantId}`,
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

          await delay(80);
        }
      }

      currentPassphraseRef.current = '';
      setProgress(prev => ({
        ...prev,
        currentPassphrase: null,
      }));

      return createSuiteResult(suiteType, getSuiteName(suiteType), results, Date.now() - startedAt);
    },
    [runWithRetry, setProgress, updateSuiteProgress]
  );

  const runSlip39CreateDynamicSuite = useCallback(
    async (
      suiteType: 'sdkAddressBatch' | 'sdkPubkeyBatch',
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      selectedPassphraseVariants: PassphraseVariantId[],
      mnemonicStoreResult: MnemonicStoreResult | null
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

      const results: TestCaseResult[] = [];
      for (const variantId of variantIds) {
        if (!runningRef.current) {
          break;
        }

        const passphraseLiteral = getScenarioPassphraseLiteral(scenario, variantId);
        const passphraseDisplay = formatPassphraseDisplay(passphraseLiteral);
        currentPassphraseRef.current = passphraseLiteral || '';
        setProgress(prev => ({
          ...prev,
          currentPassphrase: passphraseDisplay,
        }));

        for (const methodData of templateCase.data) {
          const expectedMap =
            caseType === 'address' ? methodData.expectedAddress : methodData.expectedPublicKey;
          const expectedPaths = Object.keys(expectedMap || {});

          for (const expectedPath of expectedPaths) {
            if (!runningRef.current) {
              break;
            }

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
                  generatorResult.error || 'Failed to generate expected value from SLIP39 shares'
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

              const sdkResult = (await runWithRetry(`${methodData.method}:${expectedPath}`, () => {
                const method = (sdk as Record<string, unknown>)[methodData.method];
                if (typeof method !== 'function') {
                  throw new Error(`SDK method not found: ${methodData.method}`);
                }
                return (method as (...args: unknown[]) => Promise<unknown>)(connectId, deviceId, {
                  ...(methodData.params || {}),
                  path: expectedPath,
                  showOnOneKey: false,
                });
              })) as { success: boolean; payload?: unknown };

              if (!sdkResult.success) {
                results.push({
                  title: `${scenario.id} / ${
                    methodData.name || methodData.method
                  } / ${variantId} / ${expectedPath}`,
                  method: methodData.method,
                  expected,
                  actual: '',
                  passed: false,
                  error:
                    (sdkResult.payload as { error?: string } | undefined)?.error || 'Unknown error',
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
                  addLog(`[MISMATCH] ${scenario.id} / ${methodData.name || methodData.method} / ${variantId} / ${expectedPath}`);
                  addLog(`  expected: ${expected}`);
                  addLog(`  actual:   ${actual}`);
                }
                results.push({
                  title: `${scenario.id} / ${
                    methodData.name || methodData.method
                  } / ${variantId} / ${expectedPath}`,
                  method: methodData.method,
                  expected,
                  actual,
                  passed,
                  duration: Date.now() - startedAtCase,
                  metadata: {
                    passphrase: passphraseDisplay,
                    shares: String(shareMnemonics.length),
                    threshold: String(mnemonicStoreResult?.threshold || scenario.threshold || 0),
                  },
                });
              }
            } catch (error) {
              results.push({
                title: `${scenario.id} / ${
                  methodData.name || methodData.method
                } / ${variantId} / ${expectedPath}`,
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

            await delay(80);
          }
        }
      }

      currentPassphraseRef.current = '';
      setProgress(prev => ({
        ...prev,
        currentPassphrase: null,
      }));

      return createSuiteResult(
        suiteType,
        suiteType === 'sdkAddressBatch' ? 'SDK Address Batch' : 'SDK Pubkey Batch',
        results,
        Date.now() - startedAt
      );
    },
    [runWithRetry, setProgress, updateSuiteProgress]
  );


  const runSpecialPassphraseSuite = useCallback(
    async (
      scenario: AutomationScenario,
      sdk: CoreApi,
      connectId: string,
      deviceId: string
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

        for (const passphrase of specialPassphrases) {
          currentPassphraseRef.current = passphrase;
          addLog(`Testing special passphrase: 「${passphrase}」`);

          const psResult = (await runWithRetry(`getPassphraseState:special`, () =>
            sdk.getPassphraseState(connectId, {
              initSession: true,
              useEmptyPassphrase: false,
            })
          )) as { success: boolean; payload?: string };

          if (!psResult.success) {
            results.push({
              title: `getPassphraseState for 「${passphrase}」`,
              passed: false,
              error: 'getPassphraseState failed',
              duration: Date.now() - startedAt,
            });
            continue;
          }

          const passphraseState = psResult.payload || '';

          for (const method of methods) {
            if (!runningRef.current) {
              break;
            }

            const caseStart = Date.now();
            try {
              const mockFn = (mockDevice as Record<string, unknown>)[method];
              if (typeof mockFn !== 'function') {
                results.push({
                  title: `${method} / 「${passphrase}」`,
                  method,
                  passed: false,
                  error: `mockDevice.${method} not found`,
                  duration: Date.now() - caseStart,
                });
                continue;
              }

              const mockRes = (await mockFn('', '', {
                path: SPECIAL_PASSPHRASE_METHOD_PATHS[method],
                mnemonic: mnemonic.trim(),
                passphrase,
              })) as { payload?: { address?: string } };

              const expected = mockRes?.payload?.address || '';

              const sdkMethod = (sdk as Record<string, unknown>)[method];
              if (typeof sdkMethod !== 'function') {
                results.push({
                  title: `${method} / 「${passphrase}」`,
                  method,
                  expected,
                  passed: false,
                  error: `SDK method ${method} not found`,
                  duration: Date.now() - caseStart,
                });
                continue;
              }

              const sdkResult = (await runWithRetry(`${method}:special`, () =>
                (sdkMethod as (...args: unknown[]) => Promise<unknown>)(connectId, deviceId, {
                  path: SPECIAL_PASSPHRASE_METHOD_PATHS[method],
                  showOnOneKey: false,
                  passphraseState,
                  useEmptyPassphrase: false,
                })
              )) as { success: boolean; payload?: { address?: string } };

              const actual = sdkResult.payload?.address || '';
              const passed = actual.toLowerCase() === expected.toLowerCase();
              if (!passed) {
                addLog(`[MISMATCH] ${method} / 「${passphrase}」`);
                addLog(`  expected: ${expected}`);
                addLog(`  actual:   ${actual}`);
              }

              results.push({
                title: `${method} / 「${passphrase}」`,
                method,
                expected,
                actual,
                passed,
                duration: Date.now() - caseStart,
                metadata: { passphrase },
              });
            } catch (error) {
              results.push({
                title: `${method} / 「${passphrase}」`,
                method,
                passed: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - caseStart,
              });
            }

            await delay(80);
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
    [addLog, runWithRetry, updateSuiteProgress]
  );

  const runSelectedSdkSuites = useCallback(
    async (
      scenario: AutomationScenario,
      selectedSuites: TestSuiteType[],
      suiteResults: TestSuiteResult[],
      sdk: CoreApi,
      connectId: string,
      deviceId: string,
      mnemonicStoreResult: MnemonicStoreResult | null
    ): Promise<TestSuiteResult[]> => {
      const nextSuiteResults = [...suiteResults];

      if (
        selectedSuites.includes('sdkAddressBatch') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const sdkAddressResult =
          scenario.walletType === 'bip39'
            ? scenario.flowType === 'import'
              ? await runBip39ImportSdkSuite(
                  'sdkAddressBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants
                )
              : await runBip39CreateDynamicSuite(
                  'sdkAddressBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants,
                  mnemonicStoreResult
                )
            : scenario.flowType === 'create'
              ? await runSlip39CreateDynamicSuite(
                  'sdkAddressBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants,
                  mnemonicStoreResult
                )
              : await runSlip39SdkSuite(
                  'sdkAddressBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants
                );
        nextSuiteResults.push(sdkAddressResult);
        markSuiteCompleted();
      }

      if (
        selectedSuites.includes('sdkPubkeyBatch') &&
        !shouldStopBySuiteFailure(config.stopOnFirstError, nextSuiteResults)
      ) {
        const sdkPubkeyResult =
          scenario.walletType === 'bip39'
            ? scenario.flowType === 'import'
              ? await runBip39ImportSdkSuite(
                  'sdkPubkeyBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants
                )
              : await runBip39CreateDynamicSuite(
                  'sdkPubkeyBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants,
                  mnemonicStoreResult
                )
            : scenario.flowType === 'create'
              ? await runSlip39CreateDynamicSuite(
                  'sdkPubkeyBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants,
                  mnemonicStoreResult
                )
              : await runSlip39SdkSuite(
                  'sdkPubkeyBatch',
                  scenario,
                  sdk,
                  connectId,
                  deviceId,
                  config.passphraseVariants
                );
        nextSuiteResults.push(sdkPubkeyResult);
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
          deviceId
        );
        nextSuiteResults.push(specialPassphraseResult);
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
    ]
  );

  const executeResetPreparation = useCallback(
    async (scenarioIndex: number, health: HealthCheckResponse): Promise<PreparationResult> => {
      const resetSequenceId =
        scenarioIndex === 0 ? RESET_SEQUENCE_LOCKED : RESET_SEQUENCE_UNLOCKED;

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
    async (selectedScenarios: AutomationScenario[], connectId: string): Promise<DebugRunContext> => {
      const sdk = SDK;
      if (!sdk) {
        throw new Error('SDK is not available');
      }

      const scenarioDecisions = new Map<string, DebugScenarioDecision>();
      const selectedSdkScenarios = selectedScenarios.filter(scenario =>
        buildSelectedSuites(scenario, config.testSuites).some(suiteType => suiteType !== 'deviceFlow')
      );

      let deviceId = '';
      if (selectedSdkScenarios.length > 0) {
        deviceId = await refreshDeviceId(sdk, connectId);
        addLog(`Device ID updated: ${deviceId}`);
      }

      let currentEvmAddress = '';
      const importScenarios = selectedSdkScenarios.filter(scenario => scenario.flowType === 'import');
      if (importScenarios.length > 0 && deviceId) {
        try {
          currentEvmAddress = await getCurrentDeviceEvmAddress(sdk, connectId, deviceId);
          addLog(`Current wallet EVM address: ${currentEvmAddress}`);
        } catch (error) {
          addLog(`Current wallet probe failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const needCreateContext = selectedSdkScenarios.some(scenario => scenario.flowType === 'create');
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
          continue;
        }

        if (scenario.flowType === 'import') {
          const expectedAddress =
            scenario.walletType === 'bip39'
              ? getBip39ImportProbeAddress(scenario)
              : getSlip39ImportProbeAddress(scenario);

          if (!currentEvmAddress) {
            scenarioDecisions.set(scenario.id, {
              matched: false,
              reason: 'current wallet mismatch: current wallet probe unavailable',
            });
            continue;
          }

          if (!expectedAddress) {
            scenarioDecisions.set(scenario.id, {
              matched: false,
              reason: 'current wallet mismatch: missing expected probe address',
            });
            continue;
          }

          const matched = currentEvmAddress.toLowerCase() === expectedAddress.toLowerCase();
          scenarioDecisions.set(scenario.id, {
            matched,
            reason: matched
              ? undefined
              : `current wallet mismatch: expected ${expectedAddress}, actual ${currentEvmAddress}`,
          });
          continue;
        }

        if (!mnemonicStoreResult) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: 'missing create context: mnemonic-store unavailable',
          });
          continue;
        }

        if (!mnemonicStoreResult.success) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: ${mnemonicStoreResult.message}`,
          });
          continue;
        }

        if (mnemonicStoreResult.flowType !== 'create') {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: flowType=${mnemonicStoreResult.flowType || 'unknown'}`,
          });
          continue;
        }

        if (mnemonicStoreResult.walletType !== scenario.walletType) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: walletType=${
              mnemonicStoreResult.walletType || 'unknown'
            }`,
          });
          continue;
        }

        if (mnemonicStoreResult.sequenceId !== scenario.phonePilotSequenceId) {
          scenarioDecisions.set(scenario.id, {
            matched: false,
            reason: `missing create context: expected sequence ${
              scenario.phonePilotSequenceId
            }, got ${mnemonicStoreResult.sequenceId || 'unknown'}`,
          });
          continue;
        }

        if (scenario.walletType === 'bip39') {
          const mnemonicWords = normalizeMnemonicWords(mnemonicStoreResult.words);
          scenarioDecisions.set(scenario.id, {
            matched: mnemonicWords.length > 0,
            reason:
              mnemonicWords.length > 0
                ? undefined
                : 'missing create context: no BIP39 mnemonic words captured',
          });
          continue;
        }

        const shareMnemonics = normalizeSlip39Shares(mnemonicStoreResult.shares);
        scenarioDecisions.set(scenario.id, {
          matched: shareMnemonics.length > 0 && typeof mnemonicStoreResult.threshold === 'number',
          reason:
            shareMnemonics.length > 0 && typeof mnemonicStoreResult.threshold === 'number'
              ? undefined
              : 'missing create shares: shares or threshold unavailable',
        });
      }

      const matchedCount = Array.from(scenarioDecisions.values()).filter(item => item.matched).length;
      addLog(`Debug matched scenarios: ${matchedCount}/${selectedScenarios.length}`);
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
    async (mode: AutomationRunMode): Promise<void> => {
      if (runningRef.current) {
        addLog('Automation is already running');
        return;
      }

      if (!SDK || !selectedDevice?.connectId) {
        addLog('SDK or selected device is not available');
        return;
      }

      if (connectionState !== 'connected') {
        addLog('PhonePilot not connected, connecting...');
        const connected = await connectPhonePilot();
        if (!connected) {
          addLog('Failed to connect to PhonePilot');
          return;
        }
      }

      runningRef.current = true;
      clearLogs();
      resetProgress();
      setReport(null);
      currentPassphraseRef.current = '';

      setupUIListener(SDK);

      const selectedScenarios = config.scenarioIds.map(id => getAutomationScenario(id));
      const totalSuites = selectedScenarios.reduce(
        (sum, scenario) => sum + buildSelectedSuites(scenario, config.testSuites).length,
        0
      );
      const { connectId } = selectedDevice;
      const startTime = Date.now();
      const scenarioResults: ScenarioReportResult[] = [];
      let fatalErrorMessage = '';

      const health = await refreshPhonePilotHealth();
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

      addLog(
        mode === 'debug' ? '=== Automation Debug Test Started ===' : '=== Automation Test Started ==='
      );
      addLog(`Scenario count: ${selectedScenarios.length}`);
      addLog(`PhonePilot MCP ready: ${health.mcpReady ? 'yes' : 'no'}`);
      addLog(`PhonePilot OCR ready: ${health.ocrReady ? 'yes' : 'no'}`);
      if (health.message) {
        addLog(`PhonePilot health message: ${health.message}`);
      }
      if (mode === 'debug') {
        addLog('Debug mode enabled: skip reset-wallet and execute-sequence, run SDK validation only');
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
        totalTests: totalSuites,
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
          const selectedSuites = buildSelectedSuites(scenario, config.testSuites);
          const scenarioStartedAt = Date.now();
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
                suiteResults.push(createSkippedSuiteResult(suiteType, getSuiteName(suiteType), reason));
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
                debugRunContext.mnemonicStoreResult
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
              const resetPreparation = await executeResetPreparation(scenarioIndex, scenarioHealth);
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
                      preparation.mnemonicStoreResult
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
      setProgress(prev => ({
        ...prev,
        status: fatalErrorMessage ? 'error' : 'done',
        errorMessage: fatalErrorMessage || undefined,
        currentPassphrase: null,
      }));

      addLog(
        mode === 'debug'
          ? '=== Automation Debug Test Completed ==='
          : '=== Automation Test Completed ==='
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
      refreshDeviceId,
      refreshPhonePilotHealth,
      resetProgress,
      resolveDebugRunContext,
      runSelectedSdkSuites,
      selectedDevice,
      setProgress,
      setReport,
      setupUIListener,
    ]
  );

  const startAutomation = useCallback(async (): Promise<void> => {
    await runAutomation('full');
  }, [runAutomation]);

  const startDebugAutomation = useCallback(async (): Promise<void> => {
    await runAutomation('debug');
  }, [runAutomation]);

  const stopAutomation = useCallback(async () => {
    runningRef.current = false;
    currentPassphraseRef.current = '';
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
    scenarios: getAllAutomationScenarios(),
    connectPhonePilot,
    disconnectPhonePilot,
    startAutomation,
    startDebugAutomation,
    stopAutomation,
    captureFrame,
  };
}
