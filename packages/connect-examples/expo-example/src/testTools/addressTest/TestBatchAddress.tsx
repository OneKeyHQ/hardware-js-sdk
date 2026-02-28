import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { Stack, Text, View } from 'tamagui';
import { useIntl } from 'react-intl';

import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import passphraseTestCase from './data/count24_two/passphrase_empty';
import { fullPath, replaceTemplate } from './data/utils';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';

import type { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import type { CoreMessage } from '@onekeyfe/hd-core';
import type { AddressBatchTestCase } from './types';

type TestCaseDataType = AddressBatchTestCase['data'][0];

type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState: { verify: string; error?: string };
};

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const title = item?.title || item?.method;

  return (
    <>
      <View flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </View>
      {Object.keys(item?.result || {}).map(key => (
        <Text fontSize={14} key={key}>
          {key}: {item?.result[key]?.address || 'N/A'}
        </Text>
      ))}
    </>
  );
}

function ExportReportView() {
  const intl = useIntl();
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
    return (
      <Button variant="primary" onPress={exportReport}>
        {intl.formatMessage({ id: 'action__export_report' })}
      </Button>
    );
  }

  return null;
}

let hardwareUiEventListener: any | undefined;
function ExecuteView({ batchTestCases }: { batchTestCases: AddressBatchTestCase[] }) {
  const { openDialog } = useHardwareInputPinDialog();

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

  const { stopTest, beginTest, retryFailedTasks, clearTestResults } =
    useRunnerTest<TestCaseDataType>({
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
      prepareRunner: async (connectId, _deviceId, features, sdk) => {
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
        const requestParams = {
          ...item.params,
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
          serializedPath: string;
        }[];

        let error = '';

        for (const key of Object.keys(item.result)) {
          const address = response?.find(
            account => account.path === key || account.serializedPath === key
          );

          if (!address) {
            console.log(`⚠️ 未找到路径 ${key} 的响应数据`);
          } else {
            // 🎯 检查预期结果是否为空对象
            const expectedFields = Object.keys(item.result[key] || {});
            if (expectedFields.length === 0) {
              console.warn(`⚠️ 路径 ${key} 的预期结果为空，跳过验证`);
              error += `(${key}) 预期结果为空，无法验证\n`;
            } else {
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

              for (const verifyField of expectedFields) {
                if (
                  // @ts-expect-error
                  address[verifyField] !== item.result[key][verifyField]
                ) {
                  // @ts-expect-error
                  error += `(${key}) actual: ${address[verifyField]}, expected: ${item.result[key][verifyField]}\n`;
                }
              }
            }
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

  // Additional effect to handle test case switching
  // This ensures that when users switch test cases, any running tests are properly stopped
  // and all previous test results are cleared for a clean state
  const prevTestCaseRef = useRef<AddressBatchTestCase | undefined>();
  useEffect(() => {
    if (
      prevTestCaseRef.current &&
      currentTestCase &&
      prevTestCaseRef.current.name !== currentTestCase.name
    ) {
      // Test case changed - stop any running tests and clear all results
      stopTest();
      clearTestResults();
    }
    prevTestCaseRef.current = currentTestCase;
  }, [currentTestCase, stopTest, clearTestResults]);

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
            onValueChange={itemValue => {
              setCurrentTestCase(findTestCase(itemValue));
            }}
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
        </Stack>
      </>
    ),
    [
      beginTest,
      currentTestCase?.name,
      findTestCase,
      passphrase,
      retryFailedTasks,
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
  // 🎯 使用 testCases 数组的第一个元素的 name 作为 key
  // 当 testCases 改变时，强制 TestRunnerView 完全重新挂载，清除所有状态
  const testKey = testCases[0]?.name || title;

  return (
    <TestRunnerView<AddressBatchTestCase['data']>
      key={testKey}
      title={title}
      renderExecuteView={() => <ExecuteView batchTestCases={testCases} />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
