import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { isEmpty, isNil } from 'lodash';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { useRunnerState } from '../../components/BaseTestRunner/useRunnerState';

import { testCases } from './data';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { AddressCaseData, AddressTestCase } from './types';
import { TestCaseDataWithKey, VerifyState } from '../../components/BaseTestRunner/types';
import { SwitchInput } from '../../components/SwitchInput';

type ResultViewProps = { item: TestCaseDataWithKey<AddressCaseData> };

function ResultView({ item }: ResultViewProps) {
  const title = item?.title || item?.method;

  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <Text>{title}</Text>
      </View>

      <Text>Expected: {item?.result.address}</Text>
    </>
  );
}

function ExecuteView() {
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [showOnOneKey, setShowOnOneKey] = useState<boolean>(false);
  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<string>();
  const [testDescription, setTestDescription] = useState<string>();
  const [passphrase, setPassphrase] = useState<string>();

  useEffect(() => {
    const testCaseList: string[] = [];
    testCases.forEach(testCase => {
      testCaseList.push(testCase.name);
    });
    setTestCaseList(testCaseList);
    setCurrentTestCase(testCaseList[0]);
  }, []);

  useEffect(() => {
    const testCase = testCases.find(testCase => testCase.name === currentTestCase);
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

    const testCase = testCases.find(testCase => testCase.name === currentTestCase);
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
      } as unknown as TestCaseDataWithKey<AddressCaseData>;
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

    for (const item of currentTestCases) {
      try {
        // await 300
        await new Promise(resolve => {
          setTimeout(() => resolve(true), 300);
        });
        if (isNil(item.result.address) || isEmpty(item.result.address)) {
          setItemVerifyState?.(item.$key, {
            verify: 'skip',
          });
        } else {
          const { method, params } = item;

          const requestParams = {
            ...params,
            passphraseState,
            useEmptyPassphrase: !passphraseState,
            retryCount: 1,
            showOnOneKey,
          };
          setItemVerifyState?.(item.$key, {
            verify: 'pending',
          });

          // @ts-expect-error
          const res = await SDK[`${method}` as keyof typeof sdk](
            connectId,
            deviceId,
            requestParams
          );

          if (!running.current) return;
          let verifyState: VerifyState = 'none';
          let error: string | undefined;

          if (!res.success) {
            if (res.payload?.code === 802 || res.payload?.code === 803) {
              verifyState = 'skip';
            } else {
              verifyState = 'fail';
              error = res.payload?.error;
            }
          } else if (res.payload?.address === item.result.address) {
            verifyState = 'success';
          } else {
            verifyState = 'fail';
            error = `actual: ${res.payload?.address}, expected: ${item.result.address}`;
          }

          setItemVerifyState?.(item.$key, {
            verify: verifyState,
            error,
          });
        }
      } catch (e) {
        setItemVerifyState?.(item.$key, {
          verify: 'fail',
          // @ts-expect-error
          error: e?.message ?? '',
        });
      }
    }

    SDK.removeAllListeners(UI_EVENT);
  }, [
    SDK,
    clearItemVerifyState,
    currentTestCase,
    selectedDevice?.connectId,
    setItemValues,
    setItemVerifyState,
    showOnOneKey,
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
          <SwitchInput label="Show on OneKey" value={showOnOneKey} onToggle={setShowOnOneKey} />
          <Button title="Start Test" onPress={beginTest} />
          <Button title="Stop Test" onPress={stopTest} />
        </View>
      </>
    ),
    [beginTest, currentTestCase, passphrase, showOnOneKey, stopTest, testCaseList, testDescription]
  );

  return contentMemo;
}

export function TestSingleAddress() {
  return (
    <TestRunnerView<AddressTestCase['data']>
      title="Address Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={item => <ResultView item={item} />}
    />
  );
}
