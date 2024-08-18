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
import { SwitchInput } from '../../../components/SwitchInput';

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
  const { openDialog } = useHardwareInputPinDialog();

  const [resetDevice, setResetDevice] = useState(false);

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
        title: '检测 Device Lock',
        method: 'deviceLock',
        params: {},
        type: 'lock',
        expect: true,
      });

      currentTestCases.push({
        $key: 'test-unlock',
        id: 'test-unlock',
        title: '检测 Device Unlock',
        method: 'evmGetAddress',
        params: {
          path: "m/44'/60'/0'/0/0",
          showOnOneKey: false,
        },
        type: 'unlock',
        expect: true,
      });

      currentTestCases.push({
        $key: 'test-use-passphrase',
        id: 'test-use-passphrase',
        title: '检测 Device Passphrase 打开',
        method: 'deviceSettings',
        params: {
          usePassphrase: true,
        },
        type: 'passphraseOpened',
        expect: true,
      });

      currentTestCases.push({
        $key: 'test-no-use-passphrase',
        id: 'test-no-use-passphrase',
        title: '检测 Device Passphrase 关闭',
        method: 'deviceSettings',
        params: {
          usePassphrase: false,
        },
        type: 'passphraseClosed',
        expect: true,
      });

      if (resetDevice) {
        currentTestCases.push({
          $key: 'test-reset',
          id: 'test-reset',
          title: '设备擦除（忽略结果）',
          method: 'deviceWipe',
          params: {},
          type: 'reset',
          expect: true,
        });
      }

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

      if (!res.success) {
        return Promise.resolve({
          payload: res,
        });
      }

      const features = await sdk.getFeatures(connectId);

      return Promise.resolve({
        payload: features,
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

      if (item.type === 'lock') {
        if (payload.unlocked === true) {
          return Promise.resolve({
            error: `actual: ${payload.unlocked}, 预期: 设备未解锁`,
          });
        }
      } else if (item.type === 'unlock') {
        if (payload.unlocked !== true) {
          return Promise.resolve({
            error: `actual: ${payload.unlocked}, 预期: 设备未解锁`,
          });
        }
        if (payload.pin_protection === false) {
          return Promise.resolve({
            error: `actual: ${payload.pin_protection}, 预期: pin 已设置`,
          });
        }
        if (payload.initialized === false) {
          return Promise.resolve({
            error: `actual: ${payload.initialized}, 预期: 设备已初始化`,
          });
        }
        if (payload.bootloader_mode === false) {
          return Promise.resolve({
            error: `actual: ${payload.bootloader_mode}, 预期: 非 bootloader 模式`,
          });
        }
      } else if (item.type === 'passphraseOpened') {
        if (payload.passphrase_protection !== true) {
          return Promise.resolve({
            error: `actual: ${payload.passphrase_protection}, 预期: Passphrase 启用`,
          });
        }
      } else if (item.type === 'passphraseClosed') {
        if (payload.passphrase_protection !== false) {
          return Promise.resolve({
            error: `actual: ${payload.passphrase_protection}, 预期: Passphrase 未启用`,
          });
        }
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
            测试没有初始化的设备状态是否正常，确保设备已经导入过助记词。\n 主要检测 Pin
            码状态，锁屏状态。Passphrase 状态。
          </Text>
        </YStack>

        <Stack flexDirection="row" flexWrap="wrap" gap="$2">
          <SwitchInput
            label={intl.formatMessage({ id: 'label__wipe_device' })}
            value={!!resetDevice}
            onToggle={setResetDevice}
          />
          <XStack flexWrap="wrap">
            <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
            <ExportReportView />
          </XStack>
        </Stack>
      </YStack>
    ),
    [beginTest, intl, resetDevice, stopTest]
  );

  return contentMemo;
}

export function LockDeviceTest() {
  return (
    <TestRunnerView<LockDeviceTestCase['data']>
      title="测试初始化过的设备状态是否正常"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
