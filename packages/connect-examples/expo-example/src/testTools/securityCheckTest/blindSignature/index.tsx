import { useMemo, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Input, Label, Stack, Text, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { TestRunnerView } from '../../../components/BaseTestRunner/TestRunnerView';
import { TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';
import { SwitchInput } from '../../../components/SwitchInput';
import { useRunnerTest } from '../../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../../components/BaseTestRunner/useExportReport';
import { Button } from '../../../components/ui/Button';
import TestRunnerOptionButtons from '../../../components/BaseTestRunner/TestRunnerOptionButtons';
import type { SecurityCheckTestCase, ResultViewProps, TestCaseDataType } from './types';
import { convertTestData } from './utils';
import data from './data';

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const intl = useIntl();
  const title = `${item?.method} ${item.path}`;

  return (
    <>
      <Stack flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </Stack>

      <Text fontSize={14}>
        {intl.formatMessage({ id: 'label__expected' })} {item?.expect ? 'success' : 'invalid path'}
      </Text>
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
function ExecuteView() {
  const intl = useIntl();

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      hardwareUiEventListener = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => {
      if (features?.passphrase_protection) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: false,
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
      // @ts-expect-error
      const res = await sdk[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);

      const newRes = {
        payload: res,
        skipVerify: true,
      };

      return Promise.resolve(newRes);
    },
    processResponse: (_, item, __, res) => {
      const error = '';

      const responseError = get(res, 'payload.error', '');
      const expected = item.expect;

      if (expected === true && !res.success) {
        return Promise.resolve({
          error: `actual: ${responseError}, expected: success`,
        });
      }
      if (expected === false) {
        if (
          !res.success &&
          (responseError.toLowerCase()?.indexOf('invalid path') !== -1 ||
            responseError.toLowerCase()?.indexOf('forbidden key path') !== -1 ||
            responseError.toLowerCase()?.indexOf('invalid address path') !== -1)
        ) {
          return Promise.resolve({
            error: '',
          });
        }
        if (res.success) {
          return Promise.resolve({
            error: `actual: success, expected: invalid path`,
          });
        }
        return Promise.resolve({
          error: `actual: ${responseError}, expected: invalid path`,
        });
      }

      return Promise.resolve({
        error,
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
          <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
          <ExportReportView />
        </XStack>
      </YStack>
    ),
    [beginTest, intl, stopTest]
  );

  return contentMemo;
}

export function BlindSignatureChainCheck() {
  return (
    <TestRunnerView<SecurityCheckTestCase['data']>
      title="Blind Signature Security Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
