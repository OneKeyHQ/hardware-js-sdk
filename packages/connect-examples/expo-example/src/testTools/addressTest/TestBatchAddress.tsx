import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';

import { Stack, Text, View } from 'tamagui';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { AddressBatchTestCase } from './types';
import { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';

import passphraseTestCase from './data/count24_two/passphrase_empty';
import { fullPath, replaceTemplate } from './data/utils';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';

type TestCaseDataType = AddressBatchTestCase['data'][0];
type ResultViewProps = { item: TestCaseDataWithKey<TestCaseDataType> };

function ResultView({ item }: ResultViewProps) {
  const title = item?.title || item?.method;

  return (
    <>
      <View flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </View>
      {Object.keys(item?.result).map(key => (
        <Text fontSize={14} key={key}>
          {key}: {item?.result[key].address}
        </Text>
      ))}
    </>
  );
}

function ExportReportView() {
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'BatchAddressTestReport',
    reportTitle: 'Batch Address Test Report',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Title | Address |`);
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
    <Button variant="primary" onPress={exportReport}>
      Export Report
    </Button>;
  }

  return null;
}

function ExecuteView({ batchTestCases }: { batchTestCases: AddressBatchTestCase[] }) {
  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<AddressBatchTestCase>();

  const [testDescription, setTestDescription] = useState<string>();
  const [passphrase, setPassphrase] = useState<string>();

  const findTestCase = useCallback(
    (name: string) => {
      const testCase = batchTestCases.find(testCase => testCase.name === name);
      return testCase;
    },
    [batchTestCases]
  );

  useEffect(() => {
    const testCaseList: string[] = [];
    batchTestCases.forEach(testCase => {
      testCaseList.push(testCase.name);
    });
    setTestCaseList(testCaseList);
    setCurrentTestCase(findTestCase(testCaseList[0]));
  }, [batchTestCases, findTestCase]);

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
        originDataRef.current = {
          ...originDataRef.current,
          data: [
            ...originDataRef.current.data.map((item, index) => {
              if (index === itemIndex) {
                const originParams = fullOriginDataRef.current.data[index].params;
                const template = originParams?.addressParameters?.path || originParams?.path;

                const originKey = Object.keys(item.expectedAddress).find(key => {
                  const path = replaceTemplate(key, template);
                  const resultPath = address?.serializedPath || address?.path;
                  if (path === resultPath) {
                    return key;
                  }
                  return false;
                });

                const indexKey = originKey || key;
                return {
                  ...item,
                  expectedAddress: {
                    ...item.expectedAddress,
                    [indexKey]: address?.address,
                  },
                };
              }
              return item;
            }),
          ],
        };

        for (const verifyField of Object.keys(item.result[key])) {
          if (
            // @ts-expect-error
            address[verifyField] !== item.result[key][verifyField]
          ) {
            // @ts-expect-error
            error += `(${key}) actual: ${address[verifyField]}, expected: ${item.result[key][verifyField]}\n`;
          }
        }
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
        <Stack flexDirection="row" flexWrap="wrap" gap="$2">
          <Picker
            selectedValue={currentTestCase?.name}
            onValueChange={itemValue => {
              setCurrentTestCase(findTestCase(itemValue));
            }}
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
        </Stack>
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

export function TestBatchAddress({
  title,
  testCases,
}: {
  title: string;
  testCases: AddressBatchTestCase[];
}) {
  return (
    <TestRunnerView<AddressBatchTestCase['data']>
      title={title}
      renderExecuteView={() => <ExecuteView batchTestCases={testCases} />}
      renderResultView={item => <ResultView item={item} />}
    />
  );
}
