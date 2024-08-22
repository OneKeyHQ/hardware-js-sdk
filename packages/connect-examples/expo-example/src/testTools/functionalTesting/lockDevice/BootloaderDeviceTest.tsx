import { useMemo, useState } from 'react';

import {
  CoreMessage,
  Features,
  getDeviceUUID,
  UI_EVENT,
  UI_REQUEST,
  UI_RESPONSE,
} from '@onekeyfe/hd-core';

import { Stack, Text, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get, isEmpty } from 'lodash';
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
    fileName: 'BootloaderDeviceTest',
    reportTitle: 'BootloaderDeviceTestReport',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Method  | Result |`);
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
        title: '检测 Boot Device Info',
        method: 'deviceUpdateReboot',
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

      if (res.success) {
        // eslint-disable-next-line no-promise-executor-return
        await new Promise(resolve => setTimeout(resolve, 15 * 1000));
      }
      const feature = await sdk.getFeatures(connectId);

      return Promise.resolve({
        payload: feature,
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

      if (payload.vendor !== 'onekey.so') {
        return Promise.resolve({
          error: `actual: ${payload.vendor}, 预期: onekey.so`,
        });
      }
      if (payload.bootloader_mode !== true) {
        return Promise.resolve({
          error: `actual: ${payload.bootloader_mode}, 预期: bootloader 模式`,
        });
      }
      const uuid = getDeviceUUID(payload);
      if (isEmpty(uuid)) {
        return Promise.resolve({
          error: `actual: ${uuid}, 预期: 成功读取设备序列号`,
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
          <Text fontSize={14}>测试 Boot 的设备状态是否正常。</Text>
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

export function BootDeviceTest() {
  return (
    <Stack paddingTop="$6">
      <TestRunnerView<LockDeviceTestCase['data']>
        title="测试 Boot 模式设备状态是否正常"
        renderExecuteView={() => <ExecuteView />}
        renderResultView={(item, itemVerifyState) => (
          <ResultView item={item} itemVerifyState={itemVerifyState} />
        )}
      />
    </Stack>
  );
}
