/**
 * useAutomationTest Hook
 *
 * Integrates PhonePilot MCP with the existing test framework for automated testing.
 * Handles device preparation, UI request interception, and test execution flow.
 */

import { useCallback, useContext, useRef, useEffect } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { PhonePilotClient } from '../../services/phonePilotMcp';
import {
  phonePilotConnectionStateAtom,
  phonePilotUrlAtom,
  automationConfigAtom,
  automationProgressAtom,
  automationReportAtom,
  automationLogsAtom,
  addLogAtom,
  clearLogsAtom,
  resetProgressAtom,
  cameraFrameAtom,
} from '../../atoms/automationAtoms';
import { getMnemonicGroup, getFilteredPassphraseVariants } from './mnemonicGroups';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';

import type {
  TestProgress,
  TestReport,
  TestSuiteResult,
  TestCaseResult,
  MnemonicGroupId,
  PassphraseVariant,
} from '../../services/phonePilotMcp/types';
import type { CoreApi } from '@onekeyfe/hd-core';

/**
 * Automation Test Hook
 *
 * Provides methods to control automated test execution with PhonePilot integration.
 */
export function useAutomationTest() {
  // Atoms
  const [connectionState, setConnectionState] = useAtom(phonePilotConnectionStateAtom);
  const phonePilotUrl = useAtomValue(phonePilotUrlAtom);
  const config = useAtomValue(automationConfigAtom);
  const [progress, setProgress] = useAtom(automationProgressAtom);
  const setReport = useSetAtom(automationReportAtom);
  const logs = useAtomValue(automationLogsAtom);
  const addLog = useSetAtom(addLogAtom);
  const clearLogs = useSetAtom(clearLogsAtom);
  const resetProgress = useSetAtom(resetProgressAtom);
  const setCameraFrame = useSetAtom(cameraFrameAtom);

  // Context
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  // Refs
  const clientRef = useRef<PhonePilotClient | null>(null);
  const runningRef = useRef<boolean>(false);
  const currentPassphraseRef = useRef<string>('');

  // Track URL for client recreation
  const lastUrlRef = useRef<string>(phonePilotUrl);

  // Initialize PhonePilot client (recreate if URL changes)
  useEffect(() => {
    // Recreate client if URL changed or not initialized
    if (!clientRef.current || lastUrlRef.current !== phonePilotUrl) {
      // Disconnect old client if exists
      if (clientRef.current && lastUrlRef.current !== phonePilotUrl) {
        clientRef.current.disconnect();
      }
      clientRef.current = new PhonePilotClient(phonePilotUrl);
      clientRef.current.setOnStateChange(setConnectionState);
      lastUrlRef.current = phonePilotUrl;
    }
    return () => {
      clientRef.current?.disconnect();
    };
  }, [phonePilotUrl, setConnectionState]);

  /**
   * Connect to PhonePilot MCP server
   */
  const connectPhonePilot = useCallback(async (): Promise<boolean> => {
    // Always disconnect old connection first to ensure fresh connection
    if (clientRef.current) {
      await clientRef.current.disconnect();
    }

    // Create new client
    clientRef.current = new PhonePilotClient(phonePilotUrl);
    clientRef.current.setOnStateChange(setConnectionState);
    lastUrlRef.current = phonePilotUrl;

    addLog(`Connecting to PhonePilot at ${phonePilotUrl}...`);
    const success = await clientRef.current.connect();

    if (success) {
      addLog('PhonePilot connected successfully');
      // Also connect to mechanical arm
      try {
        const armResult = await clientRef.current.armConnect();
        if (armResult.success) {
          addLog(`Arm connected: handle=${armResult.handle}`);
        } else {
          addLog(`Arm connection failed: ${armResult.message}`);
        }
      } catch (error) {
        addLog(`Arm connection error: ${error}`);
      }
    } else {
      addLog('PhonePilot connection failed');
    }

    return success;
  }, [phonePilotUrl, setConnectionState, addLog]);

  /**
   * Disconnect from PhonePilot
   */
  const disconnectPhonePilot = useCallback(async (): Promise<void> => {
    if (clientRef.current) {
      try {
        await clientRef.current.armDisconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
      await clientRef.current.disconnect();
      addLog('PhonePilot disconnected');
    }
  }, [addLog]);

  /**
   * Setup SDK UI event listener for physical operations
   */
  const setupUIListener = useCallback(
    (sdk: CoreApi) => {
      sdk.removeAllListeners(UI_EVENT);

      sdk.on(UI_EVENT, async (message: { type: string; payload?: unknown }) => {
        addLog(`UI Event: ${message.type}`);

        switch (message.type) {
          case UI_REQUEST.REQUEST_BUTTON:
            // Device needs physical confirmation
            addLog('Device requesting button confirmation...');
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
            // Device needs PIN input
            addLog('Device requesting PIN...');
            if (clientRef.current) {
              try {
                await clientRef.current.inputPin('1111'); // Default test PIN
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
            // Passphrase is sent directly via SDK, no physical input needed
            const passphrase = currentPassphraseRef.current;
            addLog(`Device requesting passphrase, sending via SDK: "${passphrase || '(empty)'}"...`);
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: { value: passphrase || '' },
            });
            addLog('Passphrase sent via SDK');
            break;

          default:
            addLog(`Unhandled UI event: ${message.type}`);
        }
      });
    },
    [addLog]
  );

  /**
   * Prepare device with mnemonic using PhonePilot
   */
  const prepareDevice = useCallback(
    async (mnemonicGroupId: MnemonicGroupId): Promise<boolean> => {
      if (!clientRef.current) {
        addLog('PhonePilot client not initialized');
        return false;
      }

      // Check if actually connected (not just state)
      if (clientRef.current.getConnectionState() !== 'connected') {
        addLog('PhonePilot not connected, attempting to connect...');
        const connected = await connectPhonePilot();
        if (!connected) {
          addLog('Failed to connect to PhonePilot');
          return false;
        }
      }

      const group = getMnemonicGroup(mnemonicGroupId);
      addLog(`Preparing device with ${group.name}...`);

      setProgress((prev) => ({
        ...prev,
        status: 'preparing-device',
        currentMnemonicGroup: mnemonicGroupId,
      }));

      try {
        // First reset the device
        addLog('Resetting device...');
        const resetResult = await clientRef.current.executeSequence('reset-wallet');
        if (!resetResult.success) {
          throw new Error(`Reset failed: ${resetResult.message}`);
        }
        addLog('Device reset complete');

        // Check if stopped
        if (!runningRef.current) {
          addLog('Test stopped by user during device preparation');
          return false;
        }

        // Wait a bit for device to restart
        await delay(5000);

        // Check again before restore
        if (!runningRef.current) {
          addLog('Test stopped by user during device preparation');
          return false;
        }

        // Then restore with the mnemonic
        addLog(`Restoring with sequence: ${group.phonePilotSequenceId}...`);
        const restoreResult = await clientRef.current.executeSequence(group.phonePilotSequenceId);
        if (!restoreResult.success) {
          throw new Error(`Mnemonic restoration failed: ${restoreResult.message}`);
        }
        addLog('Mnemonic restoration complete');

        // Capture a frame to verify
        const frameResult = await clientRef.current.captureFrame();
        if (frameResult.frame) {
          setCameraFrame(frameResult.frame);
        }

        return true;
      } catch (error) {
        addLog(`Device preparation failed: ${error}`);
        return false;
      }
    },
    [addLog, setProgress, setCameraFrame, connectPhonePilot]
  );

  /**
   * Load test cases based on mnemonic group and passphrase variant
   */
  const loadTestCases = useCallback(
    async (mnemonicGroupId: MnemonicGroupId, variant: PassphraseVariant) => {
      // Dynamic import test data based on mnemonic group
      try {
        // Import the index file which contains all converted test cases for this mnemonic group
        const testDataModule = await import(`../addressTest/dataVariant/${mnemonicGroupId}/index.ts`);

        // Get the singleAddressTest array from the module
        // The naming convention is: singleAddressTestCount24One, singleAddressTestCount12Two, etc.
        const camelCaseName = mnemonicGroupId
          .split('_')
          .map((word, index) =>
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join('');
        const arrayKey = `singleAddressTest${camelCaseName.charAt(0).toUpperCase()}${camelCaseName.slice(1)}`;
        const testCasesArray = testDataModule[arrayKey];

        if (!testCasesArray) {
          addLog(`No test data array found for ${mnemonicGroupId} (key: ${arrayKey})`);
          return null;
        }

        // Find the test case that matches the variant's passphrase and passphraseState
        // Each converted test case has an 'extra' field with passphrase and passphraseState
        const matchingTestCase = testCasesArray.find((testCase: any) => {
          if (!testCase.extra) return false;

          // Match based on passphrase and passphraseState
          const passphraseMatches = (testCase.extra.passphrase || '') === variant.passphrase;
          const stateMatches = (testCase.extra.passphraseState || '') === variant.passphraseState;

          return passphraseMatches && stateMatches;
        });

        if (!matchingTestCase) {
          addLog(`No matching test case found for ${mnemonicGroupId}/${variant.name} (passphrase: "${variant.passphrase}", state: "${variant.passphraseState}")`);
          return null;
        }

        return matchingTestCase;
      } catch (error) {
        addLog(`Failed to load test data for ${mnemonicGroupId}/${variant.name}: ${error}`);
        return null;
      }
    },
    [addLog]
  );

  /**
   * Run a single test case
   */
  const runTestCase = useCallback(
    async (
      testCase: any,
      sdk: CoreApi,
      connectId: string,
      deviceId: string
    ): Promise<TestCaseResult> => {
      const testStartTime = Date.now();
      const method = testCase.method;
      const params = testCase.params || {};

      try {
        addLog(`Running ${testCase.id || method}...`);

        // Call SDK method
        const result = await (sdk as any)[method](connectId, deviceId, {
          ...params,
          showOnOneKey: false, // Don't show on device for batch testing
        });

        if (result.success) {
          const actualAddress = result.payload?.address || result.payload;
          const expectedAddress = testCase.address || testCase.expected;

          const passed = !expectedAddress || actualAddress === expectedAddress;

          if (passed) {
            addLog(`✅ ${testCase.id || method}: ${actualAddress}`);
          } else {
            addLog(`❌ ${testCase.id || method}: Expected ${expectedAddress}, got ${actualAddress}`);
          }

          return {
            testName: testCase.id || method,
            method,
            expected: expectedAddress || 'any valid address',
            actual: String(actualAddress),
            passed,
            duration: Date.now() - testStartTime,
          };
        } else {
          addLog(`❌ ${testCase.id || method} failed: ${result.payload?.error || 'Unknown error'}`);
          return {
            testName: testCase.id || method,
            method,
            expected: testCase.address || testCase.expected || 'success',
            actual: '',
            passed: false,
            error: result.payload?.error || 'Unknown error',
            duration: Date.now() - testStartTime,
          };
        }
      } catch (error) {
        addLog(`❌ ${testCase.id || method} error: ${error}`);
        return {
          testName: testCase.id || method,
          method,
          expected: testCase.address || testCase.expected || 'success',
          actual: '',
          passed: false,
          error: String(error),
          duration: Date.now() - testStartTime,
        };
      }
    },
    [addLog]
  );

  /**
   * Run tests for a specific mnemonic group and passphrase variant
   */
  const runTestsForVariant = useCallback(
    async (
      mnemonicGroupId: MnemonicGroupId,
      variant: PassphraseVariant,
      sdk: CoreApi,
      connectId: string,
      _deviceId: string
    ): Promise<TestSuiteResult> => {
      const results: TestCaseResult[] = [];
      const startTime = Date.now();

      currentPassphraseRef.current = variant.passphrase;
      addLog(`Testing with passphrase variant: ${variant.name}`);

      setProgress((prev) => ({
        ...prev,
        currentPassphrase: variant.name,
      }));

      // Load test data for this combination
      const testData = await loadTestCases(mnemonicGroupId, variant);

      if (!testData) {
        addLog(`No test data available for ${mnemonicGroupId}/${variant.name}`);
        return {
          suiteName: `${mnemonicGroupId}/${variant.name}`,
          mnemonicGroup: mnemonicGroupId,
          passphrase: variant.passphrase,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          duration: Date.now() - startTime,
          results: [],
        };
      }

      // Run all test cases from loaded data
      const testCases = Array.isArray(testData) ? testData : [testData];

      for (const testCase of testCases) {
        if (!runningRef.current) break;

        // Handle nested test case data
        const cases = testCase.data || [testCase];

        for (const singleCase of cases) {
          if (!runningRef.current) break;

          const result = await runTestCase(singleCase, sdk, connectId, _deviceId);
          results.push(result);

          // Small delay between tests
          await delay(100);
        }
      }

      return {
        suiteName: `${mnemonicGroupId}/${variant.name}`,
        mnemonicGroup: mnemonicGroupId,
        passphrase: variant.passphrase,
        totalTests: results.length,
        passedTests: results.filter((r) => r.passed).length,
        failedTests: results.filter((r) => !r.passed).length,
        skippedTests: 0,
        duration: Date.now() - startTime,
        results,
      };
    },
    [addLog, setProgress, loadTestCases, runTestCase]
  );

  /**
   * Start automation test
   */
  const startAutomation = useCallback(async (): Promise<void> => {
    if (!SDK || !selectedDevice?.connectId) {
      addLog('SDK or device not available');
      return;
    }

    if (connectionState !== 'connected') {
      addLog('PhonePilot not connected, connecting...');
      const connected = await connectPhonePilot();
      if (!connected) {
        addLog('Failed to connect to PhonePilot, aborting test');
        return;
      }
    }

    runningRef.current = true;
    clearLogs();
    resetProgress();

    const connectId = selectedDevice.connectId;
    const featuresRes = await SDK.getFeatures(connectId);
    if (!featuresRes.success) {
      addLog('Failed to get device features');
      return;
    }
    const deviceId = featuresRes.payload?.device_id ?? '';

    // Setup UI listener
    setupUIListener(SDK);

    const startTime = Date.now();
    const suiteResults: TestSuiteResult[] = [];

    setProgress({
      currentMnemonicGroup: null,
      currentPassphrase: null,
      currentTestSuite: null,
      currentTestIndex: 0,
      totalTests: config.mnemonicGroups.length * 4, // Rough estimate
      completedMnemonicGroups: 0,
      totalMnemonicGroups: config.mnemonicGroups.length,
      status: 'running',
    });

    addLog('=== Automation Test Started ===');
    addLog(`Testing ${config.mnemonicGroups.length} mnemonic groups`);
    addLog(`Passphrase variants: ${config.passphraseVariants.join(', ')}`);
    addLog(`Test suites: ${config.testSuites.join(', ')}`);

    // Process each mnemonic group
    for (let groupIndex = 0; groupIndex < config.mnemonicGroups.length; groupIndex++) {
      if (!runningRef.current) {
        addLog('Test stopped by user');
        break;
      }

      const mnemonicGroupId = config.mnemonicGroups[groupIndex];
      const variants = getFilteredPassphraseVariants(mnemonicGroupId, config.passphraseVariants);

      addLog(`\n--- Mnemonic Group ${groupIndex + 1}/${config.mnemonicGroups.length}: ${mnemonicGroupId} ---`);

      // Skip if no matching passphrase variants for this mnemonic
      if (variants.length === 0) {
        addLog(`No matching passphrase variants for ${mnemonicGroupId}, skipping...`);
        setProgress((prev) => ({
          ...prev,
          completedMnemonicGroups: groupIndex + 1,
        }));
        continue;
      }

      addLog(`Testing ${variants.length} passphrase variant(s): ${variants.map((v) => v.name).join(', ')}`);

      // Prepare device for this mnemonic (only once per mnemonic)
      const prepared = await prepareDevice(mnemonicGroupId);
      if (!prepared) {
        addLog(`Failed to prepare device for ${mnemonicGroupId}, skipping...`);
        continue;
      }

      // After device reset/restore, device_id changes - need to re-fetch features
      addLog('Re-fetching device features after reset/restore...');
      const newFeaturesRes = await SDK.getFeatures(connectId);
      if (!newFeaturesRes.success) {
        addLog('Failed to get device features after reset/restore, skipping...');
        continue;
      }
      const newDeviceId = newFeaturesRes.payload?.device_id ?? '';
      addLog(`Device ID updated: ${newDeviceId}`);

      // Run tests for each passphrase variant (no device reset needed)
      for (const variant of variants) {
        if (!runningRef.current) break;

        const result = await runTestsForVariant(mnemonicGroupId, variant, SDK, connectId, newDeviceId);
        suiteResults.push(result);

        // Delay between variants
        await delay(config.delayBetweenTests);
      }

      setProgress((prev) => ({
        ...prev,
        completedMnemonicGroups: groupIndex + 1,
      }));
    }

    // Generate report
    const endTime = Date.now();
    const report: TestReport = {
      startTime,
      endTime,
      duration: endTime - startTime,
      totalSuites: suiteResults.length,
      totalTests: suiteResults.reduce((sum, s) => sum + s.totalTests, 0),
      passedTests: suiteResults.reduce((sum, s) => sum + s.passedTests, 0),
      failedTests: suiteResults.reduce((sum, s) => sum + s.failedTests, 0),
      skippedTests: suiteResults.reduce((sum, s) => sum + s.skippedTests, 0),
      suiteResults,
    };

    setReport(report);
    setProgress((prev) => ({ ...prev, status: 'done' }));

    addLog('\n=== Automation Test Completed ===');
    addLog(`Duration: ${Math.round(report.duration / 1000)}s`);
    addLog(`Passed: ${report.passedTests}/${report.totalTests}`);
    addLog(`Failed: ${report.failedTests}`);

    // Cleanup
    SDK.removeAllListeners(UI_EVENT);
    runningRef.current = false;
  }, [
    SDK,
    selectedDevice,
    connectionState,
    config,
    addLog,
    clearLogs,
    resetProgress,
    connectPhonePilot,
    setupUIListener,
    prepareDevice,
    runTestsForVariant,
    setProgress,
    setReport,
  ]);

  /**
   * Stop automation test
   */
  const stopAutomation = useCallback(async () => {
    runningRef.current = false;
    setProgress((prev) => ({ ...prev, status: 'idle' }));
    addLog('Stopping automation test...');

    // Stop PhonePilot sequence execution
    if (clientRef.current) {
      try {
        await clientRef.current.stopSequence();
        addLog('Stop signal sent to PhonePilot');
      } catch (error) {
        console.error('Failed to stop PhonePilot sequence:', error);
      }
    }

    SDK?.cancel();
  }, [SDK, setProgress, addLog]);

  /**
   * Capture current camera frame
   */
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
  }, [connectionState, setCameraFrame, addLog]);

  return {
    // State
    connectionState,
    progress,
    logs,

    // Actions
    connectPhonePilot,
    disconnectPhonePilot,
    startAutomation,
    stopAutomation,
    captureFrame,
    prepareDevice,
  };
}

// Helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
