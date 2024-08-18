import { useMemo, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Stack, Text, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { TestRunnerView } from '../../../components/BaseTestRunner/TestRunnerView';
import { TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';
import { useRunnerTest } from '../../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../../components/BaseTestRunner/useExportReport';
import { Button } from '../../../components/ui/Button';
import TestRunnerOptionButtons from '../../../components/BaseTestRunner/TestRunnerOptionButtons';
import type { InitDurationTestCase, ResultViewProps, TestCaseDataType } from './types';

import { useHardwareInputPinDialog } from '../../../provider/HardwareInputPinProvider';
import { CommonInput } from '../../../components/CommonInput';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<'timeout'>(resolve => {
    timeoutHandle = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).then(result => {
    clearTimeout(timeoutHandle); // 清除超时计时器
    return result;
  });
}

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const intl = useIntl();
  const title = `${item?.method}`;

  return (
    <>
      <Stack flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </Stack>
      <Stack flexDirection="row">
        <Text fontSize={14}>
          {intl.formatMessage({ id: 'label__expected' })}{' '}
          {item?.expect ? 'success' : 'invalid path'}
        </Text>
        {itemVerifyState.ext && (
          <Text fontSize={14} paddingLeft="$2">{`${itemVerifyState.ext} ms`}</Text>
        )}
      </Stack>
    </>
  );
}

function ExportReportView() {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'InitDurationTest',
    reportTitle: 'InitDurationTestReport',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Method | Result |`);
      markdown.push(`| --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { $key, method } = caseItem;

        const state = itemVerifyState?.[$key].verify;

        const runnerResult = state === 'fail' ? itemVerifyState?.[$key].error : 'success';
        markdown.push(`| ${state} | ${method} | ${runnerResult} |`);
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
  const { openDialog } = useHardwareInputPinDialog();

  const [intervalTime, setIntervalTime] = useState(1000);
  const [testCount, setTestCount] = useState(10);

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      hardwareUiEventListener = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(sdk, message.payload.device.features);
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    initTestCase: async (context, sdk) => {
      const currentTestCases = Array.from({ length: testCount }, (_, index) => {
        const key = `test-${index}`;

        return {
          $key: key,
          title: `test-${index}`,
          method: 'testInitializeDeviceDuration',
          expect: true,
        } as unknown as TestCaseDataWithKey<TestCaseDataType>;
      });

      return Promise.resolve({
        title: 'testInitializeDeviceDuration',
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
      // eslint-disable-next-line no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, intervalTime));
      const sdkPromise = async () => {
        try {
          const res = await sdk[`${method}` as keyof typeof sdk](connectId, requestParams);
          return { payload: res, skipVerify: true };
        } catch (error) {
          console.log('=====>>>>> processRequest error: ', error);
          return {
            payload: {
              success: false,
              payload: {
                code: 800,
                error,
              },
            },
            skipVerify: true,
          };
        }
      };

      return sdkPromise();
    },
    processResponse: (_, item, __, res) => {
      const error = '';

      const responseError = get(res, 'payload.error', '');

      if (!res.success) {
        return Promise.resolve({
          error: `actual: ${responseError}, expected: success`,
        });
      }
      return Promise.resolve({
        error: undefined,
        verifyState: res.payload > 600 ? 'warning' : 'success',
        ext: `time: ${res.payload}`,
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
          <Text fontSize={14}>测试初始化设备耗时</Text>
        </YStack>

        <Stack flexDirection="row" flexWrap="wrap" gap="$2">
          <CommonInput
            type="number"
            label={intl.formatMessage({ id: 'label__test_interval_time' })}
            value={intervalTime.toString()}
            onChange={number => setIntervalTime(parseInt(number))}
          />
          <CommonInput
            type="number"
            label={intl.formatMessage({ id: 'label__test_count' })}
            value={testCount.toString()}
            onChange={number => setTestCount(parseInt(number))}
          />

          <XStack flexWrap="wrap">
            <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
            <ExportReportView />
          </XStack>
        </Stack>
      </YStack>
    ),
    [beginTest, intervalTime, intl, stopTest, testCount]
  );

  return contentMemo;
}

export function InitDurationTest() {
  return (
    <TestRunnerView<InitDurationTestCase['data']>
      title="Device init duration Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
