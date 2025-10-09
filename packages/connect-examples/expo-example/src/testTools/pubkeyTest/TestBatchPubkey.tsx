import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';

import { Text, XStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { PubkeyBatchTestCase } from './types';
import { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import passphraseTestCase from './data/count24_two/passphrase_empty';
import { fullPath, replaceTemplate } from './data/utils';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';
import { stripHexPrefix } from '../../utils/hexstring';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import {
  checkBatchCompatibility,
  handleSkipInRequest,
  handleSkipInResponse,
} from '../deviceCompatibility';
import { useDevice } from '../../provider/DeviceProvider';
import { SkippedTestItem } from '../../components/BaseTestRunner/SkippedTestItem';

type TestCaseDataType = PubkeyBatchTestCase['data'][0];
type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState: { verify: string; error?: string };
};

function ExportReportView() {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'BatchPubkeyTestReport',
    reportTitle: 'Batch Pubkey Test Report',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| Status | Title | Pubkey |`);
      markdown.push(`| --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { result, $key } = caseItem;
        const title = caseItem?.name || caseItem?.title || caseItem?.method;
        const state = itemVerifyState?.[$key].verify;

        const runnerResult =
          state === 'fail' ? itemVerifyState?.[$key].error : JSON.stringify(result);
        markdown.push(`| ${state} | ${title} | ${runnerResult} |`);
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

function setTestData(
  originData: any,
  fullOriginData: any,
  dataIndex: number,
  payload: any,
  result: any,
  key: string
) {
  const resultData = {};
  for (const fieldKey of Object.keys(result)) {
    if (result[fieldKey] === undefined) break;
    if (typeof result[fieldKey] === 'string') {
      // @ts-expect-error
      resultData[fieldKey] = payload[fieldKey];
    } else {
      // @ts-expect-error
      if (!resultData[fieldKey]) {
        // @ts-expect-error
        resultData[fieldKey] = {};
      }
      for (const subFieldKey of Object.keys(result[fieldKey])) {
        // @ts-expect-error
        resultData[fieldKey][subFieldKey] = payload[fieldKey][subFieldKey];
      }
    }
  }
  return {
    ...originData,
    data: [
      // @ts-expect-error
      ...originData.data.map((item, index) => {
        if (index === dataIndex) {
          const template = fullOriginData.data[index].params?.path;

          const originKey = Object.keys(item.result).find(key => {
            const path = replaceTemplate(key, template);
            const resultPath = payload?.serializedPath || payload?.path;
            if (path === resultPath) {
              return key;
            }
            return false;
          });

          const indexKey = originKey || key;

          return {
            ...item,
            result: {
              ...item.result,
              [indexKey]: resultData,
            },
          };
        }
        return item;
      }),
    ],
  };
}

function validateFields(key: string, payload: any, result: any, prefix = '') {
  let error = '';
  for (const fieldKey of Object.keys(result)) {
    const fullPath = prefix ? `${prefix}.${fieldKey}` : fieldKey;

    if (result[fieldKey] === undefined) break;
    if (typeof result[fieldKey] === 'string') {
      const expected = stripHexPrefix(result?.[fieldKey]);
      const actual = stripHexPrefix(payload?.[fieldKey]);
      if (key.includes("m/44'/60'/") && fieldKey === 'xpub' && actual == null) {
        // ignore evm xpub
      } else if (fieldKey && expected !== actual) {
        error += `(${key}) ${fullPath}: actual: ${payload?.[fieldKey]}, expected: ${result[fieldKey]}\n`;
      }
    } else {
      error += validateFields(key, payload[fieldKey], result[fieldKey], fullPath);
    }
  }
  return error;
}

let hardwareUiEventListener: any | undefined;
function ExecuteView({ testCases }: { testCases: PubkeyBatchTestCase[] }) {
  const { openDialog } = useHardwareInputPinDialog();
  const { selectedDevice } = useDevice();

  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<PubkeyBatchTestCase>();
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
  }, [findTestCase, testCases]);

  useEffect(() => {
    const testCase = currentTestCase;
    if (!testCase) return;

    setTestDescription(testCase.description);
    setPassphrase(testCase.extra?.passphrase);
  }, [currentTestCase]);

  const currentPassphrase = useRef<string | undefined>('');
  const fullOriginDataRef = useRef(passphraseTestCase);
  const originDataRef = useRef(passphraseTestCase);

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

      fullOriginDataRef.current = fullPath(passphraseTestCase);
      originDataRef.current = passphraseTestCase;
    },
    generateRequestParams: item =>
      // 🎯 使用批量兼容性检查 helper
      Promise.resolve(
        checkBatchCompatibility(selectedDevice?.features || {}, item, {
          passphraseState: currentTestCase?.extra?.passphraseState,
          useEmptyPassphrase: !currentTestCase?.extra?.passphrase,
        })
      ),
    processRequest: async (SDK, method, connectId, deviceId, requestParams) =>
      // 🎯 使用 helper 处理跳过逻辑
      handleSkipInRequest(SDK, method, connectId, deviceId, requestParams),
    processResponse: (res, item, itemIndex) => {
      // 🎯 使用 helper 检查跳过状态
      const skipCheck = handleSkipInResponse(res, item);
      if (skipCheck.shouldReturn && skipCheck.result) {
        return Promise.resolve(skipCheck.result);
      }
      const response = res as {
        path: string;
        address: string;
        // ada
        serializedPath: string;
      }[];

      let error = '';

      for (const key of Object.keys(item.result)) {
        const address = response?.find(
          account => account.path === key || account.serializedPath === key
        );

        // 🎯 检查预期结果是否为空对象
        const expectedFields = Object.keys(item.result[key] || {});
        if (expectedFields.length === 0) {
          console.warn(`⚠️ 路径 ${key} 的预期结果为空，跳过验证`);
          error += `(${key}) 预期结果为空，无法验证\n`;
        } else {
          // 测试数据
          originDataRef.current = setTestData(
            originDataRef.current,
            fullOriginDataRef.current,
            itemIndex,
            address,
            item.result[key],
            key
          );

          error += validateFields(key, address, item.result[key]);
        }
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
    processRunnerDone: () => {
      console.log('=====>>> Success Data:\n', JSON.stringify(originDataRef.current, null, 2));
    },
  });

  const contentMemo = useMemo(
    () => (
      <>
        <Text fontSize={13} paddingVertical="$2">
          {testDescription}
        </Text>
        {!!passphrase && <Text paddingVertical="$2">Passphrase:「{passphrase}」</Text>}
        <XStack flexWrap="wrap" gap="$2">
          <Picker
            style={{ width: 200 }}
            selectedValue={currentTestCase?.name}
            onValueChange={itemValue => setCurrentTestCase(findTestCase(itemValue))}
          >
            {testCaseList.map((testCase, index) => (
              <Picker.Item key={`${index}`} label={testCase} value={testCase} />
            ))}
          </Picker>
          <TestRunnerOptionButtons
            onStop={stopTest}
            onStart={beginTest}
            onRetryFailed={retryFailedTasks}
          />
          <ExportReportView />
        </XStack>
      </>
    ),
    [
      testDescription,
      passphrase,
      currentTestCase?.name,
      testCaseList,
      stopTest,
      beginTest,
      retryFailedTasks,
      findTestCase,
    ]
  );

  return contentMemo;
}

export function TestBatchPubkey({
  title,
  testCases,
}: {
  title: string;
  testCases: PubkeyBatchTestCase[];
}) {
  // 🎯 使用 testCases 数组的第一个元素的 name 作为 key
  // 当 testCases 改变时，强制 TestRunnerView 完全重新挂载，清除所有状态
  const testKey = testCases[0]?.name || title;

  return (
    <TestRunnerView<PubkeyBatchTestCase['data']>
      key={testKey}
      title={title}
      renderExecuteView={() => <ExecuteView testCases={testCases} />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
