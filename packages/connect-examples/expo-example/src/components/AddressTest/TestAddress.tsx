import { Text, View, Button, StyleSheet } from 'react-native';
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { isEmpty, isNil } from 'lodash';
import { createContext, useContextSelector } from 'use-context-selector';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { baseChainParams, testCases } from './data';
import { TestCaseData } from './data/types';

type VerifyState = 'none' | 'pending' | 'skip' | 'success' | 'fail';
type TestCaseDataWithKey = TestCaseData & { $key: string };

const TestAddressContext = createContext<{
  itemValues: TestCaseDataWithKey[];
  setItemValues?: React.Dispatch<React.SetStateAction<TestCaseDataWithKey[]>>;
}>({
  itemValues: [],
});

function TestAddressProvider({ children }: { children: React.ReactNode }) {
  const [itemValues, setItemValues] = useState<TestCaseDataWithKey[]>([]);

  const value = useMemo(
    () => ({
      itemValues,
      setItemValues,
    }),
    [itemValues]
  );

  return <TestAddressContext.Provider value={value}>{children}</TestAddressContext.Provider>;
}

const TestAddressVerifyContext = createContext<{
  setItemVerifyState: (key: string, newState: { verify: VerifyState; error?: string }) => void;
  itemVerifyState: { [key: string]: { verify: VerifyState; error?: string } };
  clearItemVerifyState: () => void;
}>({
  setItemVerifyState: () => {},
  itemVerifyState: {},
  clearItemVerifyState: () => {},
});

function TestAddressVerifyProvider({ children }: { children: React.ReactNode }) {
  const [itemVerifyState, setItemVerifyStateInternal] = useState<{
    [key: string]: { verify: VerifyState; error?: string };
  }>({});

  const setItemVerifyState = useCallback(
    (key: string, newState: { verify: VerifyState; error?: string }) => {
      setItemVerifyStateInternal(prevState => ({
        ...prevState,
        [key]: newState,
      }));
    },
    []
  );

  const clearItemVerifyState = useCallback(() => {
    setItemVerifyStateInternal({});
  }, []);

  const value = useMemo(
    () => ({
      setItemVerifyState,
      clearItemVerifyState,
      itemVerifyState,
    }),
    [clearItemVerifyState, itemVerifyState, setItemVerifyState]
  );

  return (
    <TestAddressVerifyContext.Provider value={value}>{children}</TestAddressVerifyContext.Provider>
  );
}

const TestItemView = ({ item }: { item: TestCaseDataWithKey }) => {
  const itemVerifyState = useContextSelector(
    TestAddressVerifyContext,
    v => v.itemVerifyState?.[item.$key]
  );

  const verifyState = useMemo(() => itemVerifyState?.verify ?? 'none', [itemVerifyState]);
  const errorState = useMemo(() => itemVerifyState?.error ?? '', [itemVerifyState]);

  const errorStateViewMemo = useMemo(() => {
    if (!errorState) return null;
    return <Text style={{ color: 'red' }}>error: {errorState}</Text>;
  }, [errorState]);

  const verifyStateViewMemo = useMemo(() => {
    let color = 'gray';
    if (verifyState === 'pending') {
      color = 'blue';
    } else if (verifyState === 'skip') {
      color = 'gray';
    } else if (verifyState === 'success') {
      color = 'green';
    } else if (verifyState === 'fail') {
      color = 'red';
    }

    return (
      <Text
        style={{
          width: 80,
          color,
          fontWeight: 'bold',
        }}
      >
        {verifyState}
      </Text>
    );
  }, [verifyState]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 8,
        gap: 8,
        borderColor: '#E0E0E0',
        borderWidth: 1,
      }}
    >
      {verifyStateViewMemo}
      <View>
        <Text>{item.method}</Text>
        <Text>Expected:{item.expectedAddress}</Text>
        {errorStateViewMemo}
      </View>
    </View>
  );
};

const TestItemViewMemo = memo(TestItemView);

function OptionsView() {
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<string>();
  const [testDescription, setTestDescription] = useState<string>();
  const [passphrase, setPassphrase] = useState<string>();

  const setItemValues = useContextSelector(TestAddressContext, v => v.setItemValues);
  const setItemVerifyState = useContextSelector(
    TestAddressVerifyContext,
    v => v.setItemVerifyState
  );
  const clearItemVerifyState = useContextSelector(
    TestAddressVerifyContext,
    v => v.clearItemVerifyState
  );

  const running = useRef<boolean>(false);

  const currentPassphrase = useRef<string | undefined>('');

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
    setPassphrase(testCase.passphrase);
  }, [currentTestCase]);

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

    const currentTestCases = testCase?.data?.map((item, index) => {
      const key = `${item.method}-${index}`;

      return {
        ...item,
        $key: key,
      } as unknown as TestCaseDataWithKey;
    });

    setItemValues?.(currentTestCases);
    clearItemVerifyState?.();
    running.current = true;

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

    const connectId = selectedDevice?.connectId ?? '';
    const featuresRes = await SDK.getFeatures(connectId);
    const deviceId = featuresRes.payload?.device_id ?? '';

    if (featuresRes.payload?.passphrase_protection === true && testCase.passphrase == null) {
      await SDK.deviceSettings(connectId, {
        usePassphrase: false,
      });
    }
    if (!featuresRes.payload?.passphrase_protection && testCase.passphrase != null) {
      await SDK.deviceSettings(connectId, {
        usePassphrase: true,
      });
    }

    currentPassphrase.current = testCase.passphrase;
    const { passphraseState } = testCase;

    for (const item of currentTestCases) {
      try {
        // await 300
        await new Promise(resolve => {
          setTimeout(() => resolve(true), 300);
        });
        if (isNil(item.expectedAddress) || isEmpty(item.expectedAddress)) {
          setItemVerifyState?.(item.$key, {
            verify: 'skip',
          });
        } else {
          const { method, params } = item;
          // @ts-expect-error
          const commonParams = baseChainParams[method];
          const requestParams = {
            ...commonParams,
            ...params,
            passphraseState,
            useEmptyPassphrase: !passphraseState,
            retryCount: 1,
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
          } else if (res.payload?.address === item.expectedAddress) {
            verifyState = 'success';
          } else {
            verifyState = 'fail';
            error = `actual: ${res.payload?.address}, expected: ${item.expectedAddress}`;
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
    setItemValues,
    clearItemVerifyState,
    selectedDevice?.connectId,
    currentTestCase,
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
            {testCaseList.map(testCase => (
              <Picker.Item label={testCase} value={testCase} />
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

function ResultView() {
  const itemValues = useContextSelector(TestAddressContext, v => v.itemValues);

  const resultViewMemo = useMemo(
    () => (
      <View style={styles.fullItem}>
        {itemValues.map(item => (
          <TestItemViewMemo key={item.$key} item={item} />
        ))}
      </View>
    ),
    [itemValues]
  );

  return resultViewMemo;
}

export default function TestAddressView() {
  return (
    <TestAddressProvider>
      <TestAddressVerifyProvider>
        <View style={styles.subContainer}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Passphrase Session Test</Text>
          <OptionsView />
          <ResultView />
        </View>
      </TestAddressVerifyProvider>
    </TestAddressProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  subContainer: {
    width: '100%',
    marginTop: 16,
    padding: 10,
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
  },
  fullItem: {
    width: '100%',
  },
});
