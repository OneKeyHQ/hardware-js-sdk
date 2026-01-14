import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { Stack, Text, XStack } from 'tamagui';
import { useIntl } from 'react-intl';

import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { SwitchInput } from '../../components/SwitchInput';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';
import { stripHexPrefix } from '../../utils/hexstring';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import {
  checkCompatibilityInParams,
  handleSkipInRequest,
  handleSkipInResponse,
} from '../deviceCompatibility';
import { useDevice } from '../../provider/DeviceProvider';
import { SkippedTestItem } from '../../components/BaseTestRunner/SkippedTestItem';

import type { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import type { CoreMessage } from '@onekeyfe/hd-core';
import type { PubkeyTestCase } from './types';

type TestCaseDataType = PubkeyTestCase['data'][0];
type ResultViewProps = {
  item: TestCaseDataWithKey<PubkeyTestCase['data'][0]>;
  itemVerifyState: { verify: string; error?: string };
};

function ExportReportView() {
  const intl = useIntl();

  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'SinglePubkeyTestReport',
    reportTitle: 'Single Pubkey Test Report',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Title | Path | Pubkey |`);
      markdown.push(`| --- | --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { result, $key } = caseItem;
        const title = caseItem?.name || caseItem?.title || caseItem?.method;
        const state = itemVerifyState?.[$key].verify;
        const path = caseItem?.params?.path;

        const runnerResult =
          state === 'fail' ? itemVerifyState?.[$key].error : JSON.stringify(result);
        markdown.push(`| ${state} | ${title} | ${path} | ${runnerResult} |`);
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

const RenderNestedObject = ({ obj, parentKey = '' }: { obj: any; parentKey?: string }) => (
  <>
    {Object.entries(obj).map(([key, value]) => {
      const currentKey = parentKey ? `${parentKey}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return <RenderNestedObject key={currentKey} obj={value} parentKey={currentKey} />;
      }

      return (
        <Text fontSize={14} key={currentKey}>
          {currentKey}: {value?.toString()}
        </Text>
      );
    })}
  </>
);

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const title = item?.title || item?.method;

  // 🎯 检查测试状态 - 如果是 skip 状态，显示跳过信息
  if (itemVerifyState?.verify === 'skip') {
    return <SkippedTestItem title={title} reason={itemVerifyState?.error} />;
  }

  return (
    <>
      <XStack>
        <Text>{title}</Text>
      </XStack>
      <RenderNestedObject obj={item.result} />
    </>
  );
}

function validateFields(payload: any, result: any, prefix = '') {
  let error = '';
  for (const fieldKey of Object.keys(result)) {
    const fullPath = prefix ? `${prefix}.${fieldKey}` : fieldKey;

    if (result[fieldKey] === undefined) break;
    if (typeof result[fieldKey] === 'string') {
      const expected = stripHexPrefix(result?.[fieldKey]);
      const actual = stripHexPrefix(payload?.[fieldKey]);
      if (fieldKey && expected !== actual) {
        error += `${fullPath}: actual: ${payload?.[fieldKey]}, expected: ${result[fieldKey]}\n`;
      }
    } else {
      error += validateFields(payload[fieldKey], result[fieldKey], fullPath);
    }
  }
  return error;
}

let hardwareUiEventListener: any | undefined;
function ExecuteView({ testCases }: { testCases: PubkeyTestCase[] }) {
  const intl = useIntl();
  const { openDialog } = useHardwareInputPinDialog();
  const { selectedDevice } = useDevice();

  const [showOnOneKey, setShowOnOneKey] = useState<boolean>(false);
  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<PubkeyTestCase>();
  const [testDescription, setTestDescription] = useState<string>();
  const [passphrase, setPassphrase] = useState<string>();

  const findTestCase = useCallback(
    (name: string) => {
      const testCase = testCases.find(testCase => testCase.name === name);
      return testCase;
    },
    [testCases]
  );

  useEffect(() => {
    const testCaseList: string[] = [];
    testCases.forEach(testCase => {
      testCaseList.push(testCase.name);
    });
    setTestCaseList(testCaseList);
    setCurrentTestCase(findTestCase(testCaseList[0]));

    // 🎯 当 testCases 改变时，清除所有测试结果
    // Note: clearTestResults 不在 useRunnerTest 的返回值中，所以这里不调用
  }, [findTestCase, testCases]);

  useEffect(() => {
    const testCase = currentTestCase;
    if (!testCase) return;

    setTestDescription(testCase.description);
    setPassphrase(testCase.extra?.passphrase);
  }, [currentTestCase]);

  const currentPassphrase = useRef<string | undefined>('');

  const { stopTest, beginTest, retryFailedTasks } = useRunnerTest<TestCaseDataType>({
    initTestCase: () => {
      const testCase = currentTestCase;

      const currentTestCases = testCase?.data?.map((item, index) => {
        const key = `${item.method}-${index}`;

        return {
          ...item,
          $key: key,
        } as unknown as TestCaseDataWithKey<TestCaseDataType>;
      });
      if (testCase && currentTestCases) {
        return Promise.resolve({
          title: testCase.name,
          data: currentTestCases,
        });
      }
      return Promise.resolve(undefined);
    },
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
                value: currentPassphrase.current ?? '',
              },
            });
          }, 200);
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => {
      const testCase = currentTestCase;

      if (features?.passphrase_protection === true && testCase?.extra?.passphrase == null) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: false,
        });
      }
      if (!features?.passphrase_protection && testCase?.extra?.passphrase != null) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: true,
        });
      }

      currentPassphrase.current = testCase?.extra?.passphrase;
    },
    generateRequestParams: item => {
      const { params } = item;
      const requestParams = {
        ...params,
        showOnOneKey,
        passphraseState: currentTestCase?.extra?.passphraseState,
        useEmptyPassphrase: !currentTestCase?.extra?.passphrase,
      };

      // 🎯 使用 helper 检查兼容性
      return Promise.resolve(
        checkCompatibilityInParams(selectedDevice?.features || {}, item.method, requestParams)
      );
    },
    processRequest: async (SDK, method, connectId, deviceId, requestParams) =>
      // 🎯 使用 helper 处理跳过逻辑
      handleSkipInRequest(SDK, method, connectId, deviceId, requestParams),
    processResponse: (res, item, itemIndex) => {
      // 🎯 使用 helper 检查跳过状态
      const skipCheck = handleSkipInResponse(res, item);
      if (skipCheck.shouldReturn && skipCheck.result) {
        return Promise.resolve(skipCheck.result);
      }

      const error = validateFields(res, item.result);

      return Promise.resolve({
        error,
      });
    },
  });

  const contentMemo = useMemo(
    () => (
      <>
        <Text fontSize={13} paddingVertical="$2">
          {testDescription}
        </Text>
        {!!passphrase && <Text paddingVertical="$2">Passphrase:「{passphrase}」</Text>}

        <Stack flex={1} flexDirection="row" flexWrap="wrap" gap="$2">
          <Picker
            style={{ width: 200 }}
            selectedValue={currentTestCase?.name}
            onValueChange={itemValue => setCurrentTestCase(findTestCase(itemValue))}
          >
            {testCaseList.map((testCase, index) => (
              <Picker.Item key={`${index}`} label={testCase} value={testCase} />
            ))}
          </Picker>
          <SwitchInput
            label={intl.formatMessage({ id: 'label__show_on_onekey' })}
            value={showOnOneKey}
            onToggle={setShowOnOneKey}
            vertical
          />

          <TestRunnerOptionButtons
            onStop={stopTest}
            onStart={beginTest}
            onRetryFailed={retryFailedTasks}
          />
          <ExportReportView />
        </Stack>
      </>
    ),
    [
      testDescription,
      passphrase,
      currentTestCase?.name,
      testCaseList,
      intl,
      showOnOneKey,
      stopTest,
      beginTest,
      retryFailedTasks,
      findTestCase,
    ]
  );

  return contentMemo;
}

export function TestSinglePubkey({
  title,
  testCases,
}: {
  title: string;
  testCases: PubkeyTestCase[];
}) {
  // 🎯 使用 testCases 数组的第一个元素的 name 作为 key
  // 当 testCases 改变时，强制 TestRunnerView 完全重新挂载，清除所有状态
  const testKey = testCases[0]?.name || title;

  return (
    <TestRunnerView<PubkeyTestCase['data']>
      key={testKey}
      title={title}
      renderExecuteView={() => <ExecuteView testCases={testCases} />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
