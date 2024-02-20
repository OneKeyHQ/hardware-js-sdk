import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';

import { Text, XStack } from 'tamagui';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { PubkeyBatchTestCase } from './types';
import { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import passphraseTestCase from './data/count24_two/passphrase_empty';
import { fullPath, replaceTemplate } from './data/utils';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';

type TestCaseDataType = PubkeyBatchTestCase['data'][0];
type ResultViewProps = { item: TestCaseDataWithKey<TestCaseDataType> };

function ExportReportView() {
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
        Export Report
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

function ResultView({ item }: ResultViewProps) {
  const title = item?.title || item?.method;

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
      if (fieldKey && payload?.[fieldKey] !== result[fieldKey]) {
        error += `(${key}) ${fullPath}: actual: ${payload?.[fieldKey]}, expected: ${result[fieldKey]}\n`;
      }
    } else {
      error += validateFields(key, payload[fieldKey], result[fieldKey], fullPath);
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

function ExecuteView({ testCases }: { testCases: PubkeyBatchTestCase[] }) {
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

        error += validateFields(key, address, item.result[key]);
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
        <Text paddingVertical="$2">{testDescription}</Text>
        {!!passphrase && <Text paddingVertical="$2">Passphrase:「{passphrase}」</Text>}
        <XStack flexWrap="wrap" gap="$2">
          <Picker
            selectedValue={currentTestCase?.name}
            onValueChange={itemValue => setCurrentTestCase(findTestCase(itemValue))}
          >
            {testCaseList.map((testCase, index) => (
              <Picker.Item key={`${index}`} label={testCase} value={testCase} />
            ))}
          </Picker>
          <Button variant="primary" onPress={beginTest}>
            Start Test
          </Button>
          <Button variant="destructive" onPress={stopTest}>
            Stop Test
          </Button>
          <ExportReportView />
        </XStack>
      </>
    ),
    [
      beginTest,
      currentTestCase?.name,
      findTestCase,
      passphrase,
      stopTest,
      testCaseList,
      testDescription,
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
  return (
    <TestRunnerView<PubkeyBatchTestCase['data']>
      title={title}
      renderExecuteView={() => <ExecuteView testCases={testCases} />}
      renderResultView={item => <ResultView item={item} />}
    />
  );
}
