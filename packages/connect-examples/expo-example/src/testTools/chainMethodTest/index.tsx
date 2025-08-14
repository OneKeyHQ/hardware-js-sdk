import React, { useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { Text, H3, ScrollView, View, Group, XStack, YStack } from 'tamagui';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { useCommonParams } from '../../provider/CommonParamsProvider';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import { Button } from '../../components/ui/Button';
import AutoWrapperTextArea from '../../components/ui/AutoWrapperTextArea';
import { chainTestData } from './data';

interface TestCase {
  id: string;
  chainName: string;
  chainSymbol: string;
  method: string;
  testCaseTitle: string;
  params: any;
  status: 'pending' | 'running' | 'success' | 'error';
  response?: any;
  error?: string;
  duration?: number;
}

// 自定义链选择器组件
const ChainSelector = ({
  selectedChain,
  onChainChange,
  disabled,
}: {
  selectedChain: string;
  onChainChange: (value: string) => void;
  disabled: boolean;
}) => (
  <YStack gap="$2">
    <Text fontSize={16} fontWeight="bold">
      Select Chain:
    </Text>
    <Group orientation="horizontal" flexWrap="wrap">
      <Group.Item>
        <Button
          variant={selectedChain === 'all' ? 'primary' : 'secondary'}
          onPress={() => onChainChange('all')}
          disabled={disabled}
          size="small"
        >
          All Chains
        </Button>
      </Group.Item>
      {chainTestData.map(chain => (
        <Group.Item key={chain.symbol}>
          <Button
            variant={selectedChain === chain.name ? 'primary' : 'secondary'}
            onPress={() => onChainChange(chain.name)}
            disabled={disabled}
            size="small"
          >
            {chain.symbol}
          </Button>
        </Group.Item>
      ))}
    </Group>
  </YStack>
);

let hardwareUiEventListener: any | undefined;

export default function ChainMethodTest() {
  const { sdk } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();
  const { commonParams } = useCommonParams();
  const { openDialog } = useHardwareInputPinDialog();

  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunningIndex, setCurrentRunningIndex] = useState<number>(-1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentPassphraseRef = useRef<string>('');

  // 生成所有测试用例列表
  const generateTestCases = useCallback((chainFilter: string): TestCase[] => {
    const cases: TestCase[] = [];

    chainTestData
      .filter(chain => chainFilter === 'all' || chain.name === chainFilter)
      .forEach(chain => {
        chain.data.forEach(method => {
          method.presupposes?.forEach((testCase: any, index: number) => {
            cases.push({
              id: `${chain.symbol}-${method.method}-${index}`,
              chainName: chain.name,
              chainSymbol: chain.symbol,
              method: method.method,
              testCaseTitle: testCase.title,
              params: testCase.value,
              status: 'pending',
            });
          });
        });
      });

    return cases;
  }, []);

  // 初始化硬件事件监听器
  const initHardwareListener = useCallback(() => {
    if (!sdk) return;

    if (hardwareUiEventListener) {
      sdk.off(UI_EVENT, hardwareUiEventListener);
    }

    hardwareUiEventListener = (message: CoreMessage) => {
      console.log('Hardware UI Event:', message);

      if (message.type === UI_REQUEST.REQUEST_PIN) {
        openDialog(sdk, message.payload.device.features);
      }

      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        setTimeout(() => {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: currentPassphraseRef.current ?? '',
            },
          });
        }, 200);
      }
    };

    sdk.on(UI_EVENT, hardwareUiEventListener);
  }, [sdk, openDialog]);

  // 移除硬件事件监听器
  const removeHardwareListener = useCallback(() => {
    if (sdk && hardwareUiEventListener) {
      sdk.off(UI_EVENT, hardwareUiEventListener);
      hardwareUiEventListener = undefined;
    }
  }, [sdk]);

  // 组件挂载时初始化
  useEffect(() => {
    initHardwareListener();
    // 默认初始化所有链的测试用例
    const initialTestCases = generateTestCases('all');
    setTestCases(initialTestCases);

    return () => {
      removeHardwareListener();
    };
  }, [initHardwareListener, removeHardwareListener, generateTestCases]);

  // 链选择变化时自动初始化测试用例
  const handleChainChange = useCallback(
    (value: string) => {
      if (isRunning) return; // 运行时不允许切换

      setSelectedChain(value);
      const newTestCases = generateTestCases(value);
      setTestCases(newTestCases);
    },
    [isRunning, generateTestCases]
  );

  // 执行单个测试用例
  const executeTestCase = useCallback(
    async (testCase: TestCase, abortSignal: AbortSignal): Promise<TestCase> => {
      const startTime = Date.now();

      try {
        if (abortSignal.aborted) {
          throw new Error('Test aborted');
        }

        if (!sdk || !selectedDevice) {
          throw new Error('SDK or device not ready');
        }

        const connectId = selectedDevice?.connectId ?? '';
        const deviceId = (selectedDevice?.features as any)?.deviceId ?? '';

        const requestParams = {
          ...commonParams,
          retryCount: 1,
          useEmptyPassphrase: true,
          ...testCase.params,
        };

        // 设置当前passphrase（如果需要）
        currentPassphraseRef.current = '';

        let response;
        const method = chainTestData
          .find(c => c.name === testCase.chainName)
          ?.data.find(m => m.method === testCase.method);

        if (method?.noConnIdReq) {
          response = await (sdk as any)[testCase.method]();
        } else if (method?.noDeviceIdReq) {
          response = await (sdk as any)[testCase.method](connectId, requestParams);
        } else {
          response = await (sdk as any)[testCase.method](connectId, deviceId, requestParams);
        }

        const duration = Date.now() - startTime;

        return {
          ...testCase,
          status: 'success',
          response,
          duration,
        };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        return {
          ...testCase,
          status: 'error',
          error: error.message || 'Unknown error',
          duration,
        };
      }
    },
    [sdk, selectedDevice, commonParams]
  );

  // 开始批量测试
  const startBatchTest = useCallback(async () => {
    if (!sdk || !selectedDevice) {
      alert('Please connect to a device first');
      return;
    }

    if (testCases.length === 0) {
      alert('No test cases to run');
      return;
    }

    setIsRunning(true);
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    try {
      for (let i = 0; i < testCases.length; i++) {
        if (abortSignal.aborted) break;

        const currentCase = testCases[i];

        // 跳过已成功的测试用例
        if (currentCase.status === 'success') {
          // eslint-disable-next-line no-continue
          continue;
        }

        setCurrentRunningIndex(i);

        // 更新当前用例状态为运行中
        setTestCases(prev =>
          prev.map((tc, index) => (index === i ? { ...tc, status: 'running' } : tc))
        );

        // 执行测试用例
        const result = await executeTestCase(currentCase, abortSignal);

        // 更新结果
        setTestCases(prev => prev.map((tc, index) => (index === i ? result : tc)));

        // 测试之间的间隔
        if (!abortSignal.aborted && i < testCases.length - 1) {
          await new Promise(resolve => {
            setTimeout(resolve, 500);
          });
        }
      }
    } catch (error: any) {
      console.error('Batch test error:', error);
    } finally {
      setIsRunning(false);
      setCurrentRunningIndex(-1);
      abortControllerRef.current = null;
    }
  }, [testCases, executeTestCase, sdk, selectedDevice]);

  // 停止测试
  const stopTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setCurrentRunningIndex(-1);
  }, []);

  // 重试失败的测试
  const retryFailedTests = useCallback(async () => {
    if (!sdk || !selectedDevice) {
      alert('Please connect to a device first');
      return;
    }

    const failedCases = testCases
      .map((tc, index) => ({ ...tc, originalIndex: index }))
      .filter(tc => tc.status === 'error');

    if (failedCases.length === 0) {
      alert('No failed tests to retry');
      return;
    }

    setIsRunning(true);
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    try {
      for (const failedCase of failedCases) {
        if (abortSignal.aborted) break;

        setCurrentRunningIndex(failedCase.originalIndex);

        // 更新当前用例状态为运行中
        setTestCases(prev =>
          prev.map((tc, index) =>
            index === failedCase.originalIndex ? { ...tc, status: 'running' } : tc
          )
        );

        // 执行测试用例
        const result = await executeTestCase(failedCase, abortSignal);

        // 更新结果
        setTestCases(prev =>
          prev.map((tc, index) => (index === failedCase.originalIndex ? result : tc))
        );

        // 测试之间的间隔
        await new Promise(resolve => {
          setTimeout(resolve, 500);
        });
      }
    } catch (error: any) {
      console.error('Retry failed tests error:', error);
    } finally {
      setIsRunning(false);
      setCurrentRunningIndex(-1);
      abortControllerRef.current = null;
    }
  }, [testCases, executeTestCase, sdk, selectedDevice]);

  // 获取状态统计
  const statistics = useMemo(() => {
    const total = testCases.length;
    const success = testCases.filter(tc => tc.status === 'success').length;
    const error = testCases.filter(tc => tc.status === 'error').length;
    const pending = testCases.filter(tc => tc.status === 'pending').length;

    return { total, success, error, pending };
  }, [testCases]);

  // 渲染测试用例表格行
  const renderTestCaseRow = useCallback(
    (testCase: TestCase, index: number) => {
      const isCurrentRunning = currentRunningIndex === index;

      let statusColor = '$gray10';
      let statusText = 'PENDING';
      let statusBg = '$gray2';

      switch (testCase.status) {
        case 'running':
          statusColor = '$blue10';
          statusText = 'RUNNING';
          statusBg = '$blue2';
          break;
        case 'success':
          statusColor = '$green10';
          statusText = 'SUCCESS';
          statusBg = '$green2';
          break;
        case 'error':
          statusColor = '$red10';
          statusText = 'ERROR';
          statusBg = '$red2';
          break;
        default:
          // pending case is already handled by initial values
          break;
      }

      return (
        <View
          key={testCase.id}
          borderWidth={1}
          borderColor={isCurrentRunning ? '$blue8' : '$borderColor'}
          borderRadius="$2"
          backgroundColor={isCurrentRunning ? '$blue1' : '$background'}
          marginBottom="$2"
          overflow="hidden"
        >
          {/* Header Row */}
          <XStack
            padding="$3"
            backgroundColor={statusBg}
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack flex={1} alignItems="center" gap="$3">
              <View width={80}>
                <Text fontSize={11} fontWeight="bold" color={statusColor}>
                  {statusText}
                </Text>
                {testCase.duration && (
                  <Text fontSize={10} color="$gray11">
                    {testCase.duration}ms
                  </Text>
                )}
              </View>

              <View flex={1}>
                <Text fontSize={14} fontWeight="bold">
                  [{testCase.chainSymbol}] {testCase.method}
                </Text>
                <Text fontSize={12} color="$gray11">
                  {testCase.testCaseTitle}
                </Text>
              </View>
            </XStack>
          </XStack>

          {/* Content Rows */}
          <YStack padding="$3" gap="$2">
            {/* Request Parameters */}
            <YStack>
              <Text fontSize={12} fontWeight="bold" color="$gray12" marginBottom="$1">
                Request Parameters:
              </Text>
              <AutoWrapperTextArea
                value={JSON.stringify(testCase.params, null, 2)}
                editable={false}
                fontSize={10}
                minHeight={40}
                maxHeight={120}
                backgroundColor="$gray1"
                padding="$2"
                borderRadius="$2"
              />
            </YStack>

            {/* Response/Error */}
            <YStack>
              <Text fontSize={12} fontWeight="bold" color="$gray12" marginBottom="$1">
                {testCase.status === 'error' ? 'Error:' : 'Response:'}
              </Text>
              <AutoWrapperTextArea
                value={(() => {
                  if (testCase.status === 'pending') return 'N/A';
                  if (testCase.status === 'running') return 'Running...';
                  if (testCase.status === 'error') return testCase.error || 'Unknown error';
                  return JSON.stringify(testCase.response, null, 2);
                })()}
                editable={false}
                fontSize={10}
                minHeight={40}
                maxHeight={150}
                backgroundColor={(() => {
                  if (testCase.status === 'pending' || testCase.status === 'running')
                    return '$gray1';
                  if (testCase.status === 'error') return '$red1';
                  return '$green1';
                })()}
                padding="$2"
                borderRadius="$2"
              />
            </YStack>
          </YStack>
        </View>
      );
    },
    [currentRunningIndex]
  );

  return (
    <ScrollView flex={1} padding="$4">
      <H3 textAlign="center" marginBottom="$4">
        Chain Method Batch Test
      </H3>

      {/* 链选择器和控制按钮 */}
      <YStack gap="$3" marginBottom="$4">
        <ChainSelector
          selectedChain={selectedChain}
          onChainChange={handleChainChange}
          disabled={isRunning}
        />

        {/* 控制按钮 */}
        <XStack gap="$2" flexWrap="wrap">
          <Button
            variant="primary"
            onPress={startBatchTest}
            disabled={isRunning || testCases.length === 0}
            flex={1}
          >
            {isRunning ? 'Running...' : 'Start Tests'}
          </Button>

          <Button variant="secondary" onPress={stopTest} disabled={!isRunning} flex={1}>
            Stop Tests
          </Button>

          <Button
            variant="tertiary"
            onPress={retryFailedTests}
            disabled={isRunning || statistics.error === 0}
            flex={1}
          >
            Retry Failed ({statistics.error})
          </Button>
        </XStack>

        {/* 统计信息 */}
        {testCases.length > 0 && (
          <XStack
            padding="$3"
            backgroundColor="$gray2"
            borderRadius="$3"
            justifyContent="space-around"
            flexWrap="wrap"
            gap="$2"
          >
            <View alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$gray12">
                {statistics.total}
              </Text>
              <Text fontSize={12} color="$gray11">
                Total
              </Text>
            </View>
            <View alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$green10">
                {statistics.success}
              </Text>
              <Text fontSize={12} color="$gray11">
                Success
              </Text>
            </View>
            <View alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$red10">
                {statistics.error}
              </Text>
              <Text fontSize={12} color="$gray11">
                Error
              </Text>
            </View>
            <View alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$gray10">
                {statistics.pending}
              </Text>
              <Text fontSize={12} color="$gray11">
                Pending
              </Text>
            </View>
          </XStack>
        )}
      </YStack>

      {/* 测试用例列表 */}
      {testCases.length > 0 ? (
        <YStack>
          <Text fontSize={16} fontWeight="bold" marginBottom="$3" color="$gray12">
            Test Cases ({statistics.success}/{statistics.total} completed)
          </Text>
          {testCases.map((testCase, index) => renderTestCaseRow(testCase, index))}
        </YStack>
      ) : (
        <View padding="$4" backgroundColor="$gray2" borderRadius="$3">
          <Text fontSize={16} fontWeight="bold" marginBottom="$3" color="$gray12">
            Quick Start Guide:
          </Text>
          <YStack gap="$2">
            <Text fontSize={14} color="$gray11">
              • Connect your OneKey device first
            </Text>
            <Text fontSize={14} color="$gray11">
              • Select a blockchain or "All Chains" to test
            </Text>
            <Text fontSize={14} color="$gray11">
              • Test cases will load automatically
            </Text>
            <Text fontSize={14} color="$gray11">
              • Click "Start Tests" for sequential execution
            </Text>
            <Text fontSize={14} color="$gray11">
              • View real-time results in the flat layout below
            </Text>
          </YStack>
        </View>
      )}
    </ScrollView>
  );
}
