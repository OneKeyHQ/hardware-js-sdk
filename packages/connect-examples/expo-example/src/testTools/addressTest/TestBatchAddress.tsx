import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { isEmpty } from 'lodash';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { useRunnerState } from '../../components/BaseTestRunner/useRunnerState';

import { batchTestCases } from './data';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { AddressBatchTestCase } from './types';
import { TestCaseDataWithKey, VerifyState } from '../../components/BaseTestRunner/types';
import passphraseTestCase from './data/count24_two/passphrase_empty';
import { fullPath } from './data/utils';

type ResultViewProps = { item: TestCaseDataWithKey<AddressBatchTestCase['data'][0]> };

function ResultView({ item }: ResultViewProps) {
  const title = item?.title || item?.method;

  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <Text>{title}</Text>
      </View>
      {Object.keys(item?.result).map(key => (
        <Text key={key}>
          {key}: {item?.result[key].address}
        </Text>
      ))}
    </>
  );
}

function extractIndex(template: string, actual: string) {
  const escapedTemplate = template.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regexPattern = escapedTemplate.replace('\\$\\$INDEX\\$\\$', '(\\d+)');
  const regex = new RegExp(regexPattern);
  const match = actual.match(regex);

  if (match && match.length > 1) {
    return match[1];
  }

  return actual;
}

function ExecuteView() {
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<string>();
  const [testDescription, setTestDescription] = useState<string>();
  const [passphrase, setPassphrase] = useState<string>();

  useEffect(() => {
    const testCaseList: string[] = [];
    batchTestCases.forEach(testCase => {
      testCaseList.push(testCase.name);
    });
    setTestCaseList(testCaseList);
    setCurrentTestCase(testCaseList[0]);
  }, []);

  useEffect(() => {
    const testCase = batchTestCases.find(testCase => testCase.name === currentTestCase);
    if (!testCase) return;

    setTestDescription(testCase.description);
    setPassphrase(testCase.extra?.passphrase);
  }, [currentTestCase]);

  const { setItemValues, setItemVerifyState, clearItemVerifyState } = useRunnerState();

  const running = useRef<boolean>(false);

  const currentPassphrase = useRef<string | undefined>('');

  const stopTest = useCallback(() => {
    running.current = false;
    setItemValues?.([]);
    clearItemVerifyState?.();
    if (SDK) {
      SDK.cancel();
      SDK.removeAllListeners(UI_EVENT);
    }
  }, [SDK, setItemValues, clearItemVerifyState]);

  const beginTest = useCallback(async () => {
    if (!SDK) return;
    SDK.removeAllListeners(UI_EVENT);

    const testCase = batchTestCases.find(testCase => testCase.name === currentTestCase);
    if (!testCase) return;

    SDK.on(UI_EVENT, (message: CoreMessage) => {
      console.log('TopLEVEL EVENT ===>>>>: ', message);
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
      }
      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        setTimeout(() => {
          SDK.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: currentPassphrase.current ?? '',
            },
          });
        }, 200);
      }
    });

    const currentTestCases = testCase?.data?.map((item, index) => {
      const key = `${item.method}-${index}`;

      return {
        ...item,
        $key: key,
      } as unknown as TestCaseDataWithKey<AddressBatchTestCase['data'][0]>;
    });
    setItemValues?.(currentTestCases);
    clearItemVerifyState?.();
    running.current = true;

    const connectId = selectedDevice?.connectId ?? '';
    const featuresRes = await SDK.getFeatures(connectId);
    const deviceId = featuresRes.payload?.device_id ?? '';

    if (featuresRes.payload?.passphrase_protection === true && testCase.extra?.passphrase == null) {
      await SDK.deviceSettings(connectId, {
        usePassphrase: false,
      });
    }
    if (!featuresRes.payload?.passphrase_protection && testCase.extra?.passphrase != null) {
      await SDK.deviceSettings(connectId, {
        usePassphrase: true,
      });
    }

    currentPassphrase.current = testCase.extra?.passphrase;
    const passphraseState = testCase.extra?.passphraseState;

    const fullOriginData = fullPath(passphraseTestCase);
    let originData = passphraseTestCase;

    for (let dataIndex = 0; dataIndex < currentTestCases.length; dataIndex++) {
      const item = currentTestCases[dataIndex];

      try {
        // await 300
        await new Promise(resolve => {
          setTimeout(() => resolve(true), 300);
        });

        const { method, params } = item;

        const requestParams = {
          ...params,
          passphraseState,
          useEmptyPassphrase: !passphraseState,
          retryCount: 1,
        };
        setItemVerifyState?.(item.$key, {
          verify: 'pending',
        });

        const res: {
          success: boolean;
          payload?: {
            path: string;
            address: string;
            // ada
            serializedPath: string;
          }[];
          // @ts-expect-error
        } = await SDK[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);

        if (!running.current) return;
        let verifyState: VerifyState = 'none';
        let error: string | undefined = '';

        if (!res.success) {
          // @ts-expect-error
          if (res.payload?.code === 802 || res.payload?.code === 803) {
            verifyState = 'skip';
          } else {
            verifyState = 'fail';
            // @ts-expect-error
            error = res.payload?.error;
          }
        } else {
          for (const key of Object.keys(item.result)) {
            const address = res.payload?.find(
              item => item.path === key || item.serializedPath === key
            );

            // 测试数据
            originData = {
              ...originData,
              data: [
                ...originData.data.map((item, index) => {
                  if (index === dataIndex) {
                    const path = fullOriginData.data[index].params?.path;
                    let indexKey = key;
                    if (path) {
                      indexKey = extractIndex(path, key);
                    }

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
                error += `actual: ${address[verifyField]}, expected: ${item.result[key][verifyField]}\n`;
              }
            }

            // if (address?.address !== item.result[key].address) {
            //   error += `actual: ${address}, expected: ${item.result[key].address}\n`;
            // }
          }

          if (isEmpty(error)) {
            verifyState = 'success';
          } else {
            verifyState = 'fail';
          }
        }

        setItemVerifyState?.(item.$key, {
          verify: verifyState,
          error,
        });
      } catch (e) {
        setItemVerifyState?.(item.$key, {
          verify: 'fail',
          // @ts-expect-error
          error: e?.message ?? '',
        });
      }
    }

    console.log('=====>>>', JSON.stringify(originData, null, 2));

    SDK.removeAllListeners(UI_EVENT);
  }, [
    SDK,
    clearItemVerifyState,
    currentTestCase,
    selectedDevice?.connectId,
    setItemValues,
    setItemVerifyState,
  ]);

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
            selectedValue={currentTestCase}
            onValueChange={itemValue => setCurrentTestCase(itemValue)}
          >
            {testCaseList.map((testCase, index) => (
              <Picker.Item key={`${index}`} label={testCase} value={testCase} />
            ))}
          </Picker>
          <Button title="Start Test" onPress={beginTest} />
          <Button title="Stop Test" onPress={stopTest} />
        </View>
      </>
    ),
    [beginTest, currentTestCase, passphrase, stopTest, testCaseList, testDescription]
  );

  return contentMemo;
}

export function TestBatchAddress() {
  return (
    <TestRunnerView<AddressBatchTestCase['data']>
      title="Batch Address Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={item => <ResultView item={item} />}
    />
  );
}
