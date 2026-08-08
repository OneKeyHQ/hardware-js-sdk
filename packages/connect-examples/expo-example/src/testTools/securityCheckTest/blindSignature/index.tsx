import { useMemo, useState } from 'react';
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Stack, Text, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';

import { TestRunnerView } from '../../../components/BaseTestRunner/TestRunnerView';
import { useRunnerTest } from '../../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../../components/BaseTestRunner/useExportReport';
import { Button } from '../../../components/ui/Button';
import TestRunnerOptionButtons from '../../../components/BaseTestRunner/TestRunnerOptionButtons';
import { convertTestData, getDeviceExpected } from './utils';
import data from './data';
import { useHardwareInputPinDialog } from '../../../provider/HardwareInputPinProvider';
import { SwitchInput } from '../../../components/SwitchInput';
import { useDevice } from '../../../provider/DeviceProvider';
import {
  getProtocolAwareFeatures,
  isPassphraseProtectionEnabled,
} from '../../../utils/protocolAwareFeatures';
import { executeProtocolAwareMethod } from '../../../utils/protocolAwareMethod';

import type { CoreMessage } from '@onekeyfe/hd-core';
import type { TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';
import type {
  BlindSignatureVerifyExt,
  ResultViewProps,
  SecurityCheckTestCase,
  TestCaseDataType,
} from './types';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<'timeout'>(resolve => {
    timeoutHandle = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).then(result => {
    clearTimeout(timeoutHandle);
    return result;
  });
}

function extractCoinTypeFromPath(path?: string): string {
  const pathParts = path?.split('/') || [];
  const coinTypePart = pathParts[2] || '';
  return coinTypePart.replace(/'/g, '');
}

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error == null) {
    return '';
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function ResultView({
  item,
  itemVerifyState,
  disableSecurityCheck,
}: ResultViewProps & { disableSecurityCheck: boolean }) {
  const intl = useIntl();
  const { selectedDevice } = useDevice();
  const protocol =
    selectedDevice?.connectProtocol ??
    (selectedDevice?.features?.protocol === 'V1' || selectedDevice?.features?.protocol === 'V2'
      ? selectedDevice.features.protocol
      : undefined);
  const canConfigureSafetyChecks = protocol !== 'V2';
  const effectiveDisableSecurityCheck = canConfigureSafetyChecks && disableSecurityCheck;
  const title = `${item?.method} ${item.path}`;
  const verifyExt = itemVerifyState.ext;
  const securityChecksDisabled = verifyExt?.securityChecksDisabled ?? effectiveDisableSecurityCheck;

  const coinType = extractCoinTypeFromPath(item.path);
  const expected = getDeviceExpected(
    selectedDevice?.features || {},
    item.method,
    coinType,
    item.expect,
    {
      securityChecksDisabled,
    }
  );
  const actualError = verifyExt?.actualError;

  return (
    <>
      <Stack flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </Stack>

      <Text fontSize={14}>
        {intl.formatMessage({ id: 'label__expected' })} {expected ? 'success' : 'failure'}
      </Text>
      {!expected && actualError ? <Text fontSize={14}>actual error: {actualError}</Text> : null}
    </>
  );
}

function ExportReportView() {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'BlindSignatureSecurityTest',
    reportTitle: 'BlindSignatureSecurityTestReport',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Method | Path | Result |`);
      markdown.push(`| --- | --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { $key, method, path } = caseItem;

        const state = itemVerifyState?.[$key].verify;

        const runnerResult = state === 'fail' ? itemVerifyState?.[$key].error : 'success';
        markdown.push(`| ${state} | ${method} | ${path} | ${runnerResult} |`);
      });

      return Promise.resolve(markdown);
    },
  });

  if (showExportReport) {
    return (
      <Button variant="primary" onPress={exportReport}>
        {intl.formatMessage({ id: 'action__export_report' })}
      </Button>
    );
  }

  return null;
}

let hardwareUiEventListener: any | undefined;
function ExecuteView({
  disableSecurityCheck,
  setDisableSecurityCheck,
}: {
  disableSecurityCheck: boolean;
  setDisableSecurityCheck: (value: boolean) => void;
}) {
  const intl = useIntl();
  const { openDialog } = useHardwareInputPinDialog();
  const { selectedDevice } = useDevice();
  const protocol =
    selectedDevice?.connectProtocol ??
    (selectedDevice?.features?.protocol === 'V1' || selectedDevice?.features?.protocol === 'V2'
      ? selectedDevice.features.protocol
      : undefined);
  const canConfigureSafetyChecks = protocol !== 'V2';
  const effectiveDisableSecurityCheck = canConfigureSafetyChecks && disableSecurityCheck;

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType, BlindSignatureVerifyExt>({
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      hardwareUiEventListener = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(sdk, message.payload.device.features, message);
          // sdk.uiResponse({
          //   type: UI_RESPONSE.RECEIVE_PIN,
          //   payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          // });
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => {
      if (isPassphraseProtectionEnabled(features)) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: false,
        });
      }
      if (features.protocol === 'V2') {
        return;
      }
      if (effectiveDisableSecurityCheck) {
        await sdk.deviceSettings(connectId, {
          // 0: Strict, 1: PromptTemporarily, 2: Off
          safetyChecks: 2,
        });
      } else {
        await sdk.deviceSettings(connectId, {
          safetyChecks: 0,
        });
      }
    },
    initTestCase: async (context, sdk) => {
      const testData = convertTestData(data);

      const currentTestCases = testData.data.map((item, index) => {
        const key = `${item.method}-${index}`;

        return {
          ...item,
          $key: key,
        } as unknown as TestCaseDataWithKey<TestCaseDataType>;
      });

      return Promise.resolve({
        title: testData.id,
        data: currentTestCases,
      });
    },
    generateRequestParams: item => {
      const { params } = item;
      const requestParams = {
        ...params,
      };

      return Promise.resolve({
        method: item.method,
        params: requestParams,
      });
    },
    processRequest: async (sdk, method, connectId, deviceId, requestParams, item) => {
      const sdkPromise = async () => {
        try {
          const res = await executeProtocolAwareMethod({
            sdk,
            method,
            connectId,
            deviceId,
            params: requestParams,
            protocol,
          });
          return { payload: res, skipVerify: true };
        } catch (error) {
          console.log('=====>>>>> processRequest error: ', error);
          return {
            payload: {
              success: false,
              payload: {
                code: 800,
                error: normalizeErrorMessage(error),
              },
            },
            skipVerify: true,
          };
        }
      };

      const result = await withTimeout(sdkPromise(), 45 * 1000);

      if (result === 'timeout') {
        // clean up device
        sdk.cancel(connectId);
        await getProtocolAwareFeatures(sdk, connectId, { retryCount: 1 });
        await getProtocolAwareFeatures(sdk, connectId, { retryCount: 1 });
        return {
          payload: {
            success: false,
            payload: {
              code: 'timeout',
              error: 'Operation timed out after 45 seconds',
            },
          },
          skipVerify: true,
        };
      }

      return Promise.resolve(result);
    },
    processResponse: (_, item, __, res) => {
      const baseExt: BlindSignatureVerifyExt = {
        securityChecksDisabled: effectiveDisableSecurityCheck,
      };

      const error = '';

      const responseError = normalizeErrorMessage(get(res, 'payload.error', ''));

      // Extract coinType from path for device-specific expected result
      // Path format: m/44'/60'/0' -> coinType = 60
      const coinType = extractCoinTypeFromPath(item.path);

      // Use device-specific expected value (if override configured)
      const expected = getDeviceExpected(
        selectedDevice?.features || {},
        item.method,
        coinType,
        item.expect,
        {
          securityChecksDisabled: effectiveDisableSecurityCheck,
        }
      );

      if (expected === true && !res.success) {
        return Promise.resolve({
          error: `actual: ${responseError}, expected: success`,
          ext: baseExt,
        });
      }
      if (expected === false) {
        const failureExt: BlindSignatureVerifyExt = {
          ...baseExt,
          actualError: responseError,
        };
        if (!res.success) {
          return Promise.resolve({
            error: '',
            ext: failureExt,
          });
        }
        if (res.success) {
          return Promise.resolve({
            error: `actual: success, expected: failure`,
            ext: failureExt,
          });
        }
        return Promise.resolve({
          error: `actual: ${responseError}, expected: failure`,
          ext: failureExt,
        });
      }

      return Promise.resolve({
        error,
        ext: baseExt,
      });
    },
    removeHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      return Promise.resolve();
    },
  });

  const contentMemo = useMemo(
    () => (
      <YStack flexWrap="wrap" gap="$2">
        <YStack>
          <Text fontSize={14}>
            {intl.formatMessage({ id: 'message__test_blind_signature_security_check_describe' })}
          </Text>
        </YStack>

        <XStack flexWrap="wrap">
          <SwitchInput
            label={`${intl.formatMessage({
              id: 'label__turn_off_security_check',
            })}${canConfigureSafetyChecks ? '' : '（Protocol V2 需在设备端管理）'}`}
            value={effectiveDisableSecurityCheck}
            onToggle={setDisableSecurityCheck}
            disabled={!canConfigureSafetyChecks}
          />
          <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
          <ExportReportView />
        </XStack>
      </YStack>
    ),
    [
      beginTest,
      canConfigureSafetyChecks,
      effectiveDisableSecurityCheck,
      intl,
      setDisableSecurityCheck,
      stopTest,
    ]
  );

  return contentMemo;
}

export function BlindSignatureChainCheck() {
  const [disableSecurityCheck, setDisableSecurityCheck] = useState(true);

  return (
    <TestRunnerView<TestCaseDataType, BlindSignatureVerifyExt>
      title="Blind Signature Security Test"
      renderExecuteView={() => (
        <ExecuteView
          disableSecurityCheck={disableSecurityCheck}
          setDisableSecurityCheck={setDisableSecurityCheck}
        />
      )}
      renderResultView={(item, itemVerifyState) => (
        <ResultView
          item={item}
          itemVerifyState={itemVerifyState}
          disableSecurityCheck={disableSecurityCheck}
        />
      )}
    />
  );
}
