import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';

import { useContextSelector } from 'use-context-selector';
import { batchTestCases } from './data';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { PubkeyBatchTestCase } from './types';
import { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import passphraseTestCase from './data/count24_two/passphrase_empty';
import { fullPath } from './data/utils';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import { TestRunnerContext } from '../../components/BaseTestRunner/Context/TestRunnerProvider';
import { TestRunnerVerifyContext } from '../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import { getDeviceInfo } from '../../components/BaseTestRunner/utils';

type TestCaseDataType = PubkeyBatchTestCase['data'][0];
type ResultViewProps = { item: TestCaseDataWithKey<TestCaseDataType> };

function ExportReportView() {
  const runnerInfo = useContextSelector(TestRunnerContext, v => v);
  const runnerVerify = useContextSelector(TestRunnerVerifyContext, v => v);

  const exportReport = () => {
    const {
      runnerTestCaseTitle,
      timestampBeginTest,
      timestampEndTest,
      itemValues,
      runningDeviceFeatures,
    } = runnerInfo;

    const { itemVerifyState } = runnerVerify;

    if (!itemVerifyState) return;
    if (!timestampBeginTest) return;
    if (!timestampEndTest) return;
    if (!runningDeviceFeatures) return;

    const beginTime = new Date(timestampBeginTest).toLocaleString();
    const endTime = new Date(timestampEndTest).toLocaleString();

    const allSuccess = itemValues.every(item => {
      const caseItem = item as TestCaseDataWithKey<TestCaseDataType>;
      const { $key } = caseItem;
      const state = itemVerifyState?.[$key].verify;
      return state === 'success';
    });

    const markdown = [];
    markdown.push(`# Batch Pubkey Test Report (${runnerTestCaseTitle})`);
    markdown.push(`Status: ${allSuccess ? 'Success' : 'Fail'}\n`);
    markdown.push(`Begin Time: ${beginTime}\n`);
    markdown.push(`End Time: ${endTime}\n`);
    markdown.push(``);

    markdown.push(`## Device Info`);
    const deviceInfo = getDeviceInfo(runningDeviceFeatures);
    markdown.push(`| Key | Value |`);
    markdown.push(`| --- | --- |`);
    Object.keys(deviceInfo).forEach(key => {
      // @ts-expect-error
      const value = deviceInfo[key];
      if (value) {
        markdown.push(`| ${key} | ${value} |`);
      }
    });
    markdown.push(``);

    markdown.push(`## Test Case`);
    markdown.push(`| Status | Title | Pubkey |`);
    markdown.push(`| --- | --- | --- |`);
    itemValues.forEach(item => {
      const caseItem = item as TestCaseDataWithKey<TestCaseDataType>;
      const { result, $key } = caseItem;
      const title = caseItem?.name || caseItem?.title || caseItem?.method;
      const state = itemVerifyState?.[$key].verify;

      const runnerResult =
        state === 'fail' ? itemVerifyState?.[$key].error : JSON.stringify(result);
      markdown.push(`| ${state} | ${title} | ${runnerResult} |`);
    });

    const testCaseTitle = runnerTestCaseTitle?.replace(/-/g, '_');
    const formatTime = new Date(timestampBeginTest).toLocaleString().replace(/[-: ]/g, '_');
    const fileName = `BatchPubkeyTestReport(${testCaseTitle})${formatTime}.md`;

    const element = document.createElement('a');
    const file = new Blob([markdown.join('\n').toString()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (runnerInfo.runnerDone) {
    return <Button title="Export Report" onPress={exportReport} />;
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
        <Text key={currentKey}>
          {currentKey}: {value?.toString()}
        </Text>
      );
    })}
  </>
);

function ResultView({ item }: ResultViewProps) {
  const title = item?.title || item?.method;

  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <Text>{title}</Text>
      </View>
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
          const path = fullOriginData.data[index].params?.path;
          let indexKey = key;
          if (path) {
            indexKey = extractIndex(path, key);
          }

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

function validateFields(payload: any, result: any, prefix = '') {
  let error = '';
  for (const fieldKey of Object.keys(result)) {
    const fullPath = prefix ? `${prefix}.${fieldKey}` : fieldKey;

    if (result[fieldKey] === undefined) break;
    if (typeof result[fieldKey] === 'string') {
      if (fieldKey && payload?.[fieldKey] !== result[fieldKey]) {
        error += `${fullPath}: actual: ${payload?.[fieldKey]}, expected: ${result[fieldKey]}\n`;
      }
    } else {
      error += validateFields(payload[fieldKey], result[fieldKey], fullPath);
    }
  }
  return error;
}

function extractIndex(template: string, actual: string) {
  const escapedTemplate = template.replace(/[-\\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escapedTemplate.replace('\\$\\$INDEX\\$\\$', '(\\d+)');

  const regex = new RegExp(regexPattern);
  const match = actual.match(regex);

  if (match && match.length > 1) {
    return match[1];
  }

  return actual;
}

function ExecuteView() {
  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<PubkeyBatchTestCase>();
  const [testDescription, setTestDescription] = useState<string>();
  const [passphrase, setPassphrase] = useState<string>();

  function findTestCase(name: string) {
    const testCase = batchTestCases.find(testCase => testCase.name === name);
    return testCase;
  }

  useEffect(() => {
    const testCaseList: string[] = [];
    batchTestCases.forEach(testCase => {
      testCaseList.push(testCase.name);
    });
    setTestCaseList(testCaseList);
    setCurrentTestCase(findTestCase(testCaseList[0]));
  }, []);

  useEffect(() => {
    const testCase = currentTestCase;
    if (!testCase) return;

    setTestDescription(testCase.description);
    setPassphrase(testCase.extra?.passphrase);
  }, [currentTestCase]);

  const currentPassphrase = useRef<string | undefined>('');
  const fullOriginDataRef = useRef(passphraseTestCase);
  const originDataRef = useRef(passphraseTestCase);

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
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
      sdk.on(UI_EVENT, (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });
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
      });
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
    generateRequestParams: item => {
      const { params } = item;
      const requestParams = {
        ...params,
        passphraseState: currentTestCase?.extra?.passphraseState,
        useEmptyPassphrase: !currentTestCase?.extra?.passphrase,
      };
      return Promise.resolve({
        method: item.method,
        params: requestParams,
      });
    },
    processResponse: (res, item, itemIndex) => {
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

        // 测试数据
        originDataRef.current = setTestData(
          originDataRef.current,
          fullOriginDataRef.current,
          itemIndex,
          address,
          item.result[key],
          key
        );

        error += validateFields(address, item.result[key]);
      }

      return Promise.resolve({
        error,
      });
    },
    processRunnerDone: () => {
      console.log('=====>>> Success Data:\n', JSON.stringify(originDataRef.current, null, 2));
    },
  });

  const contentMemo = useMemo(
    () => (
      <>
        <Text style={{ fontSize: 14, paddingTop: 8, paddingBottom: 8 }}>{testDescription}</Text>
        {!!passphrase && (
          <Text style={{ fontSize: 14, paddingTop: 8, paddingBottom: 8 }}>
            Passphrase:「{passphrase}」
          </Text>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Picker
            selectedValue={currentTestCase?.name}
            onValueChange={itemValue => setCurrentTestCase(findTestCase(itemValue))}
          >
            {testCaseList.map((testCase, index) => (
              <Picker.Item key={`${index}`} label={testCase} value={testCase} />
            ))}
          </Picker>
          <Button title="Start Test" onPress={beginTest} />
          <Button title="Stop Test" onPress={stopTest} />
          <ExportReportView />
        </View>
      </>
    ),
    [beginTest, currentTestCase, passphrase, stopTest, testCaseList, testDescription]
  );

  return contentMemo;
}

export function TestBatchPubkey() {
  return (
    <TestRunnerView<PubkeyBatchTestCase['data']>
      title="Batch Pubkey Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={item => <ResultView item={item} />}
    />
  );
}
