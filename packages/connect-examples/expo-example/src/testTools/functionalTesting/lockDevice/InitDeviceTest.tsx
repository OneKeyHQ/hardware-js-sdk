import { useMemo, useState } from 'react';

import { CoreMessage, Features, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Stack, Text, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { TestRunnerView } from '../../../components/BaseTestRunner/TestRunnerView';
import { TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';
import { useRunnerTest } from '../../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../../components/BaseTestRunner/useExportReport';
import { Button } from '../../../components/ui/Button';
import TestRunnerOptionButtons from '../../../components/BaseTestRunner/TestRunnerOptionButtons';
import type { LockDeviceTestCase, ResultViewProps, TestCaseDataType } from './types';

import { useHardwareInputPinDialog } from '../../../provider/HardwareInputPinProvider';

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const intl = useIntl();
  const title = `${item?.title}`;

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
    fileName: 'LockDeviceTest',
    reportTitle: 'LockDeviceTestReport',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Method | Result |`);
      markdown.push(`| --- | --- | --- | --- |`);
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
        if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          setTimeout(() => {
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: '',
                passphraseOnDevice: true,
                save: false,
              },
            });
          }, 200);
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    initTestCase: async (context, sdk) => {
      const currentTestCases: TestCaseDataWithKey<TestCaseDataType>[] = [];
      currentTestCases.push({
        $key: 'test-lock',
        id: 'test-lock',
        title: '检测 Device Info',
        method: 'getFeatures',
        params: {},
        type: 'lock',
        expect: true,
      });

      return Promise.resolve({
        title: 'testDevice',
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
      let res: any;
      if (method.startsWith('device')) {
        // @ts-ignore
        res = await sdk[`${method}`](connectId, requestParams);
      } else {
        // @ts-ignore
        res = await sdk[`${method}`](connectId, deviceId, requestParams);
      }

      return Promise.resolve({
        payload: res,
      });
    },
    processResponse: (_, item, __, res) => {
      const error = '';

      const responseError = get(res, 'payload.error', '');

      if (!res.success) {
        return Promise.resolve({
          error: `actual: ${responseError}, expected: success`,
        });
      }

      const payload = res.payload as Features;

      if (payload.unlocked !== true) {
        return Promise.resolve({
          error: `actual: ${payload.unlocked}, 预期: 设备未解锁`,
        });
      }
      if (payload.passphrase_protection !== false) {
        return Promise.resolve({
          error: `actual: ${payload.passphrase_protection}, 预期: Passphrase 未启用`,
        });
      }
      if (payload.initialized !== false) {
        return Promise.resolve({
          error: `actual: ${payload.initialized}, 预期: 设备未初始化`,
        });
      }
      if (payload.pin_protection !== false) {
        return Promise.resolve({
          error: `actual: ${payload.pin_protection}, 预期: pin 未设置`,
        });
      }

      return Promise.resolve({
        error: '',
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
            测试没有初始化的设备状态是否正常，确保设备没有导入过助记词，导入过助记词可以擦除后测试
          </Text>
        </YStack>

        <Stack flexDirection="row" flexWrap="wrap" gap="$2">
          <XStack flexWrap="wrap">
            <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
            <ExportReportView />
          </XStack>
        </Stack>
      </YStack>
    ),
    [beginTest, stopTest]
  );

  return contentMemo;
}

export function InitDeviceTest() {
  return (
    <Stack paddingTop="$6">
      <TestRunnerView<LockDeviceTestCase['data']>
        title="测试没有初始化的设备状态是否正常"
        renderExecuteView={() => <ExecuteView />}
        renderResultView={(item, itemVerifyState) => (
          <ResultView item={item} itemVerifyState={itemVerifyState} />
        )}
      />
    </Stack>
  );
}
