import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OpenWalletSessionMode, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { Separator, Stack, Text, View, YStack } from 'tamagui';
import { useIntl } from 'react-intl';

import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import { type Slip39StateManager, slip39StateInstances } from './slip39StateManager';
import { convertToBundleFormat } from './utils';
import { batchAddressTests } from './addressData';
import { isPassphraseProtectionEnabled } from '../../utils/protocolAwareFeatures';

import type { CoreMessage } from '@onekeyfe/hd-core';
import type { TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import type { SLIP39BatchTestCase } from './types';

type TestCaseDataType = SLIP39BatchTestCase['data'][0];
type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState?: any; // 验证状态
};

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const title = item?.title || item?.method;
  const resultKeys = Object.keys(item?.result || {});
  const testType = item?.testType || 'address';

  // Calculate overall status
  const allMatches = resultKeys.every(key => {
    const expected =
      testType === 'address' ? item?.expectedAddress?.[key] : item?.expectedPublicKey?.[key];
    const actual =
      testType === 'address' ? item?.result[key]?.address : item?.result[key]?.publicKey;
    return expected && actual && expected.toLowerCase() === actual.toLowerCase();
  });

  const hasResults =
    resultKeys.length > 0 &&
    resultKeys.some(key =>
      testType === 'address' ? item?.result[key]?.address : item?.result[key]?.publicKey
    );
  const hasExpected = resultKeys.some(key =>
    testType === 'address' ? item?.expectedAddress?.[key] : item?.expectedPublicKey?.[key]
  );

  // Format value for display (address or public key)
  const formatValue = (value: string | undefined) => {
    if (!value) return 'N/A';
    if (value.includes('PLACEHOLDER') || value.includes('GENERATION_FAILED')) {
      return value;
    }
    return value.length > 42
      ? `${value.substring(0, 20)}...${value.substring(value.length - 16)}`
      : value;
  };

  // Avoid nested ternary expressions for backgroundColor and borderColor
  let viewBackgroundColor = '$gray1';
  if (hasResults) {
    viewBackgroundColor = allMatches ? '$green1' : '$red1';
  }

  let viewBorderColor = '$gray6';
  if (hasResults) {
    viewBorderColor = allMatches ? '$green6' : '$red6';
  }

  return (
    <View
      backgroundColor={viewBackgroundColor}
      borderRadius="$2"
      padding="$3"
      borderWidth={1}
      borderColor={viewBorderColor}
    >
      {/* Header with method and overall status */}
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$2"
      >
        <Text fontSize={15} fontWeight="600" color="$gray12">
          {title}
        </Text>
        <View flexDirection="row" alignItems="center" gap="$2">
          <Text
            fontSize={11}
            color="$gray10"
            backgroundColor="$gray4"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$1"
          >
            {resultKeys.length} paths (Bundle)
          </Text>

          {/* 显示测试运行器的验证状态 */}
          {itemVerifyState?.verify === 'pending' && (
            <Text fontSize={12} color="$blue11" fontWeight="bold">
              🔄 Testing...
            </Text>
          )}
          {itemVerifyState?.verify === 'success' && hasResults && allMatches && (
            <Text fontSize={12} color="$green11" fontWeight="bold">
              ✅ All Match
            </Text>
          )}
          {itemVerifyState?.verify === 'success' && hasResults && !allMatches && (
            <Text fontSize={12} color="$orange11" fontWeight="bold">
              ⚠️ Some Mismatch
            </Text>
          )}
          {itemVerifyState?.verify === 'fail' && (
            <Text fontSize={12} color="$red11" fontWeight="bold">
              ❌ Test Failed
            </Text>
          )}
          {(!itemVerifyState?.verify || itemVerifyState?.verify === 'none') &&
            !hasResults &&
            hasExpected && (
              <Text fontSize={12} color="$gray10">
                ⏳ Pending
              </Text>
            )}
        </View>
      </View>

      <Separator marginBottom="$2" />

      {/* Value comparisons for each path */}
      <YStack gap="$3">
        {resultKeys.map(key => {
          const expectedValue =
            testType === 'address' ? item?.expectedAddress?.[key] : item?.expectedPublicKey?.[key];
          const actualValue =
            testType === 'address' ? item?.result[key]?.address : item?.result[key]?.publicKey;
          const isMatch =
            expectedValue &&
            actualValue &&
            expectedValue.toLowerCase() === actualValue.toLowerCase();
          const isPlaceholder =
            expectedValue?.includes('PLACEHOLDER') || expectedValue?.includes('GENERATION_FAILED');
          const isPending = !actualValue && !isPlaceholder;

          return (
            <View key={key} backgroundColor="$gray2" padding="$2" borderRadius="$2">
              {/* Path header */}
              <View
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                marginBottom="$2"
              >
                <Text fontSize={12} color="$blue11" fontWeight="500">
                  Path: {key}
                </Text>
                {isMatch && (
                  <Text fontSize={11} color="$green11" fontWeight="bold">
                    ✅ Match
                  </Text>
                )}
                {!isMatch && !isPending && !isPlaceholder && actualValue && (
                  <Text fontSize={11} color="$red11" fontWeight="bold">
                    ❌ Mismatch
                  </Text>
                )}
                {isPending && (
                  <Text fontSize={11} color="$gray10">
                    ⏳ Pending
                  </Text>
                )}
                {isPlaceholder && (
                  <Text fontSize={11} color="$orange11">
                    ⚠️ Placeholder
                  </Text>
                )}
              </View>

              {/* Expected value */}
              <View marginBottom="$1">
                <Text fontSize={10} color="$gray10" marginBottom="$1">
                  Expected:
                </Text>
                <Text
                  fontSize={11}
                  fontFamily="monospace"
                  color={isPlaceholder ? '$orange11' : '$gray12'}
                  backgroundColor={isPlaceholder ? '$orange2' : '$gray3'}
                  padding="$1"
                  borderRadius="$1"
                >
                  {formatValue(expectedValue)}
                </Text>
              </View>

              {/* Hardware value */}
              <View>
                <Text fontSize={10} color="$gray10" marginBottom="$1">
                  Hardware:
                </Text>
                <Text
                  fontSize={11}
                  fontFamily="monospace"
                  color={actualValue ? '$gray12' : '$gray8'}
                  backgroundColor={actualValue ? '$gray3' : '$gray2'}
                  padding="$1"
                  borderRadius="$1"
                >
                  {formatValue(actualValue)}
                </Text>
              </View>
            </View>
          );
        })}
      </YStack>

      {/* Summary for multiple paths */}
      {resultKeys.length > 1 && (
        <View
          marginTop="$2"
          padding="$2"
          backgroundColor={allMatches ? '$green3' : '$blue3'}
          borderRadius="$1"
        >
          <Text fontSize={11} color={allMatches ? '$green11' : '$blue11'}>
            {allMatches
              ? `✅ Bundle请求：所有 ${resultKeys.length} 个${
                  testType === 'address' ? '地址' : '公钥'
                }都匹配期望值`
              : `📋 Bundle请求：正在测试 ${resultKeys.length} 个派生路径的${
                  testType === 'address' ? '地址' : '公钥'
                }`}
          </Text>
        </View>
      )}
    </View>
  );
}

function ExportReportView() {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'SLIP39BundleAddressTestReport',
    reportTitle: 'SLIP39 Bundle Address Test Report',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Method | Path | Expected | Hardware | Match |`);
      markdown.push(`| --- | --- | --- | --- | --- | --- |`);

      items.forEach(item => {
        const caseItem = item;
        const { result, expectedAddress, $key, method } = caseItem;
        const state = itemVerifyState?.[$key].verify;

        Object.keys(result || {}).forEach(path => {
          const expected = expectedAddress?.[path] || 'N/A';
          const hardware = result[path]?.address || 'N/A';
          const match = expected.toLowerCase() === hardware.toLowerCase() ? '✅' : '❌';

          markdown.push(
            `| ${state} | ${method} (Bundle) | ${path} | ${expected} | ${hardware} | ${match} |`
          );
        });
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
function ExecuteView({
  batchTestCases,
  title: componentTitle,
  stateManager = slip39StateInstances.batchAddress,
}: {
  batchTestCases: SLIP39BatchTestCase[];
  title?: string;
  stateManager?: Slip39StateManager;
}) {
  const { openDialog } = useHardwareInputPinDialog();

  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<SLIP39BatchTestCase>();

  const [testDescription, setTestDescription] = useState<string>();

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
  }, [currentTestCase]);

  const currentPassphrase = useRef<string | undefined>('');
  const currentPassphraseState = useRef<string | undefined>('');

  const { stopTest, beginTest, retryFailedTasks } = useRunnerTest<TestCaseDataType>({
    stateManager,
    initTestCase: () => {
      const testCase = currentTestCase;

      if (!testCase?.data || testCase.data.length === 0) {
        console.error('SLIP39 Bundle Test Error: Test case has no data defined');
        return Promise.resolve(undefined);
      }

      // Use test case data directly - bundle format
      const currentTestCases = testCase.data.map((item, index) => ({
        ...item,
        $key: `${item.method}-${item.id}-${index}`,
      })) as TestCaseDataWithKey<TestCaseDataType>[];

      if (currentTestCases.length > 0) {
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
        // Only log errors and PIN/passphrase requests
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(sdk, message.payload.device.features, message);
        }
        if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          setTimeout(() => {
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: currentPassphrase.current ?? '',
              },
              ...(message.payload.responseCorrelation ?? {}),
            });
          }, 200);
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, _deviceId, features, sdk) => {
      const testCase = currentTestCase;

      // Bundle tests don't require SLIP39 shares validation - they compare hardware vs expected addresses
      const passphrase = testCase?.extra?.passphrase || '';
      currentPassphrase.current = passphrase;

      // Handle passphrase protection following addressTest pattern
      const deviceFeatures = features as any;
      if (isPassphraseProtectionEnabled(deviceFeatures) && testCase?.extra?.passphrase == null) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: false,
        });
      }
      if (!isPassphraseProtectionEnabled(deviceFeatures) && testCase?.extra?.passphrase != null) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: true,
        });
      }

      if (testCase?.extra?.passphrase != null) {
        const emptyPassphrase = testCase.extra.passphrase.length === 0;
        const walletSessionRes = await sdk.openWalletSession(connectId, {
          mode: emptyPassphrase
            ? OpenWalletSessionMode.Standard
            : OpenWalletSessionMode.SelectHidden,
        });

        const expectedWalletType = emptyPassphrase ? 'standard' : 'hidden';
        if (
          !walletSessionRes.success ||
          walletSessionRes.payload.walletType !== expectedWalletType
        ) {
          console.error('SLIP39 Bundle Test Error: Failed to get passphraseState');
          return Promise.reject();
        }

        currentPassphraseState.current =
          walletSessionRes.payload.walletType === 'hidden'
            ? walletSessionRes.payload.passphraseState
            : undefined;
      }
    },
    generateRequestParams: item => {
      // Bundle方式：直接使用bundle参数，类似addressTest的实现
      const requestParams = {
        ...item.params,
        passphraseState: currentPassphraseState.current,
        useEmptyPassphrase: !currentTestCase?.extra?.passphrase,
      };
      return Promise.resolve({
        method: item.method,
        params: requestParams,
      });
    },
    processResponse: (res, item, _itemIndex) => {
      // Bundle响应处理：期望收到数组格式的响应
      const response = res as Array<{
        path?: string;
        serializedPath?: string;
        address?: string;
        publicKey?: string;
        pub?: string;
        publickey?: string;
        node?: { public_key: string };
        xpub?: string;
        [key: string]: any;
      }>;

      let error = '';
      const testType = item.testType || 'address';

      // Build result object from bundle response (handle both array and single object)
      const resultObj: { [key: string]: { address?: string; publicKey?: string } } = {};

      // Normalize response to array
      const responseArray = Array.isArray(response) ? response : [response];

      responseArray.forEach(responseItem => {
        const path = responseItem.serializedPath || responseItem.path;

        // Extract public key from response based on different hardware method formats
        let publicKey = '';
        if (responseItem?.publicKey) {
          // Standard publicKey field (aptosGetPublicKey, evmGetPublicKey, etc.)
          publicKey = responseItem.publicKey;
        } else if (responseItem?.pub) {
          // Alternative pub field
          publicKey = responseItem.pub;
        } else if (responseItem?.publickey) {
          // Alternative publickey field (lowercase)
          publicKey = responseItem.publickey;
        } else if ((responseItem as any)?.node?.public_key) {
          // BTC format: node.public_key (btcGetPublicKey)
          publicKey = (responseItem as any).node.public_key;
        } else if ((responseItem as any)?.xpub) {
          // Extended public key format
          publicKey = (responseItem as any).xpub;
        } else if (typeof responseItem === 'string') {
          // Direct string response
          publicKey = responseItem;
        }

        // Normalize public key format based on method
        const { method } = item;
        if (method === 'evmGetPublicKey' && publicKey && !publicKey.startsWith('0x')) {
          publicKey = `0x${publicKey}`;
        } else if (method === 'suiGetPublicKey' && publicKey && publicKey.length === 64) {
          publicKey = `00${publicKey}`;
        }

        // Use full path as key to match expected keys
        if (path) {
          resultObj[path] = {
            address: responseItem.address,
            publicKey,
          };
        }
      });

      item.result = resultObj;

      // Compare with expected results if available
      const expectedData = testType === 'address' ? item.expectedAddress : item.expectedPublicKey;
      if (expectedData != null) {
        Object.keys(expectedData).forEach(key => {
          const expectedValue = expectedData[key];
          const actualValue =
            testType === 'address' ? item.result?.[key]?.address : item.result?.[key]?.publicKey;

          if (
            expectedValue &&
            !expectedValue.includes('PLACEHOLDER') &&
            !expectedValue.includes('GENERATION_FAILED') &&
            expectedValue !== actualValue
          ) {
            error += `Path ${key}: expected ${expectedValue}, got ${actualValue || 'undefined'}; `;
          } else if (expectedValue?.includes('PLACEHOLDER')) {
            // Silent success - no need to log
          }
        });
      }

      return Promise.resolve({
        error: error.trim(),
      });
    },
    removeHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      return Promise.resolve();
    },
  });

  // Additional effect to handle test case switching
  // This ensures that when users switch test cases, any running tests are properly stopped
  const prevTestCaseRef = useRef<SLIP39BatchTestCase | undefined>();
  useEffect(() => {
    if (
      prevTestCaseRef.current &&
      currentTestCase &&
      prevTestCaseRef.current.name !== currentTestCase.name
    ) {
      // Test case changed - stop any running tests to ensure clean state
      stopTest();
    }
    prevTestCaseRef.current = currentTestCase;
  }, [currentTestCase, stopTest]);

  const contentMemo = useMemo(
    () => (
      <>
        {/* Main title */}
        {componentTitle && (
          <Text fontSize={16} fontWeight="bold" paddingBottom="$2">
            {componentTitle}
          </Text>
        )}

        <Text fontSize={13} paddingVertical="$2" color="$gray10">
          {testDescription || componentTitle}
        </Text>

        {/* Test case selection and info */}
        <View backgroundColor="$gray2" padding="$3" borderRadius="$3" marginBottom="$3">
          <Text fontSize={14} fontWeight="600" marginBottom="$2" color="$gray12">
            测试用例配置 (Bundle模式)
          </Text>

          <Stack flexDirection="row" flexWrap="wrap" gap="$3" alignItems="flex-start">
            {/* Picker section */}
            <View minWidth={220}>
              <Text fontSize={12} color="$gray10" marginBottom="$1">
                选择测试用例:
              </Text>
              <Picker
                style={{
                  backgroundColor: 'white',
                  borderRadius: 6,
                  height: 40,
                  minWidth: 220,
                }}
                selectedValue={currentTestCase?.name}
                onValueChange={itemValue => {
                  setCurrentTestCase(findTestCase(itemValue));
                }}
              >
                {testCaseList.map((testCase, index) => (
                  <Picker.Item key={`${index}`} label={testCase} value={testCase} />
                ))}
              </Picker>
            </View>

            {/* Test case info */}
            {currentTestCase && (
              <View flex={1} gap="$2">
                <View flexDirection="row" alignItems="center" gap="$2">
                  <Text
                    fontSize={12}
                    color="$blue11"
                    backgroundColor="$blue3"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$1"
                  >
                    📦 {currentTestCase.data?.length || 0} 个Bundle请求
                  </Text>

                  {currentTestCase.extra?.passphrase && (
                    <Text
                      fontSize={12}
                      color="$orange11"
                      backgroundColor="$orange3"
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      borderRadius="$1"
                    >
                      🔒 密码短语: "{currentTestCase.extra.passphrase}"
                    </Text>
                  )}

                  {!currentTestCase.extra?.passphrase && (
                    <Text
                      fontSize={12}
                      color="$green11"
                      backgroundColor="$green3"
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      borderRadius="$1"
                    >
                      🔓 无密码短语
                    </Text>
                  )}
                </View>

                <Text fontSize={11} color="$gray10" maxWidth={400}>
                  {currentTestCase.description ||
                    'Bundle批量地址测试 - 使用bundle参数一次性获取多个地址，提高效率'}
                </Text>
              </View>
            )}
          </Stack>
        </View>

        {/* Control buttons */}
        <Stack
          flexDirection="row"
          flexWrap="wrap"
          gap="$2"
          alignItems="center"
          justifyContent="space-between"
        >
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
      componentTitle,
      beginTest,
      currentTestCase,
      findTestCase,
      retryFailedTasks,
      stopTest,
      testCaseList,
      testDescription,
    ]
  );

  return contentMemo;
}

// Convert SLIP39TestCaseData to SLIP39BatchTestCase using bundle format
const convertedBundleAddressTests = batchAddressTests.map(testCase =>
  convertToBundleFormat(testCase, 'address')
);

export function SLIP39BatchAddressTest({
  title = 'SLIP39 批量地址测试',
  testCases = convertedBundleAddressTests,
  stateManager = slip39StateInstances.batchAddress,
}: {
  title?: string;
  testCases?: SLIP39BatchTestCase[];
  stateManager?: Slip39StateManager;
} = {}) {
  return (
    <TestRunnerView
      isShowLogDetail={false}
      stateManager={stateManager}
      renderExecuteView={() => (
        <ExecuteView batchTestCases={testCases} title={title} stateManager={stateManager} />
      )}
      renderResultView={(item: TestCaseDataWithKey<TestCaseDataType>, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
