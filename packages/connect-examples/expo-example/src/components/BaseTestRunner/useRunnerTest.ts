import { useCallback, useContext, useRef, useMemo } from 'react';
import { UI_EVENT, getDeviceType } from '@onekeyfe/hd-core';
import { isEmpty } from 'lodash';
import type { CoreApi, Features, Success, Unsuccessful } from '@onekeyfe/hd-core';

import { useSetAtom, useStore } from 'jotai';
import { EDeviceType } from '@onekeyfe/hd-shared';
import type { OnekeyFeatures } from '@onekeyfe/hd-transport';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import type { TestCaseDataWithKey, VerifyState } from './types';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import {
  clearItemVerifyStateAtom,
  getFailedTasksAtom,
  setFailedTasksAtom,
  setItemVerifyStateAtom,
  itemVerifyStateAtom,
} from './Context/TestRunnerVerifyProvider';

type RunnerContext = {
  deviceFeatures: Features;
  deviceId: string | undefined;
  connectId: string;
  printLog: (log: string) => void;
};

type RunnerConfig<T> = {
  initHardwareListener?: (sdk: CoreApi) => Promise<void>;
  prepareRunner?: (
    connectId: string,
    deviceId: string,
    features: Features,
    sdk: CoreApi
  ) => Promise<void>;
  initTestCase: (
    context: RunnerContext,
    sdk: CoreApi
  ) => Promise<
    | {
        title: string;
        data: TestCaseDataWithKey<T>[];
      }
    | undefined
  >;
  prepareRunnerTestCase?: (
    sdk: CoreApi,
    connectId: string,
    item: TestCaseDataWithKey<T>
  ) => Promise<void>;
  prepareRunnerTestCaseDelay?: () => Promise<number>;
  generateRequestParams: (item: TestCaseDataWithKey<T>) => Promise<{
    method: string;
    params: any;
  }>;
  processRequest?: (
    sdk: CoreApi,
    method: string,
    connectId: string,
    deviceId: string,
    requestParams: any,
    item: TestCaseDataWithKey<T>
  ) => Promise<{
    payload: Unsuccessful | Success<any>;
    skipVerify?: boolean;
  }>;
  processResponse: (
    response: any,
    item: TestCaseDataWithKey<T>,
    itemIndex: number,
    res: Unsuccessful | Success<any>
  ) => Promise<{
    error: string | undefined;
    verifyState?: VerifyState;
    ext?: any;
  }>;
  processRunnerDone?: () => void;
  removeHardwareListener?: (sdk: CoreApi) => Promise<void>;
};

export function useRunnerTest<T>(config: RunnerConfig<T>) {
  const {
    initTestCase,
    initHardwareListener,
    prepareRunner,
    prepareRunnerTestCase,
    prepareRunnerTestCaseDelay,
    generateRequestParams,
    processRequest,
    processResponse,
    removeHardwareListener,
    processRunnerDone,
  } = config;

  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const contextValue = useContext(TestRunnerContext);
  const stableContext = useMemo(
    () => ({
      setRunnerTestCaseTitle: contextValue.setRunnerTestCaseTitle,
      setTimestampBeginTest: contextValue.setTimestampBeginTest,
      setTimestampEndTest: contextValue.setTimestampEndTest,
      setRunnerState: contextValue.setRunnerState,
      setRunningDeviceFeatures: contextValue.setRunningDeviceFeatures,
      setRunningOneKeyDeviceFeatures: contextValue.setRunningOneKeyDeviceFeatures,
      setItemValues: contextValue.setItemValues,
      setRunnerLogs: contextValue.setRunnerLogs,
      callbacks: contextValue.callbacks,
    }),
    [
      contextValue.setRunnerTestCaseTitle,
      contextValue.setTimestampBeginTest,
      contextValue.setTimestampEndTest,
      contextValue.setRunnerState,
      contextValue.setRunningDeviceFeatures,
      contextValue.setRunningOneKeyDeviceFeatures,
      contextValue.setItemValues,
      contextValue.setRunnerLogs,
      contextValue.callbacks,
    ]
  );

  const setItemVerifyState = useSetAtom(setItemVerifyStateAtom);
  const clearItemVerifyState = useSetAtom(clearItemVerifyStateAtom);
  const setFailedTasks = useSetAtom(setFailedTasksAtom);
  const store = useStore();

  const running = useRef<boolean>(false);

  const configRef = useRef(config);
  configRef.current = config;

  const stopTest = useCallback(() => {
    running.current = false;

    stableContext.setRunnerState?.('stopped');
    stableContext.callbacks?.onRunnerStateChange?.('stopped');

    clearItemVerifyState?.();
    stableContext.setItemValues?.([]);
    if (SDK) {
      SDK.cancel();
      removeHardwareListener?.(SDK);
    }
  }, [stableContext, clearItemVerifyState, SDK, removeHardwareListener]);

  const endTestRunner = useCallback(() => {
    running.current = false;
    if (SDK) {
      removeHardwareListener?.(SDK);
    }
    stableContext.setTimestampEndTest?.(Date.now());

    stableContext.setRunnerState?.('done');
    stableContext.callbacks?.onRunnerStateChange?.('done');

    processRunnerDone?.();
  }, [SDK, stableContext, processRunnerDone, removeHardwareListener]);

  const testExecutionRef = useRef<Promise<void> | null>(null);

  const beginTest = useCallback(
    async (retryFailedOnly = false) => {
      if (testExecutionRef.current) {
        console.log('测试正在执行中，忽略重复请求');
        return;
      }

      testExecutionRef.current = (async () => {
        try {
          if (!retryFailedOnly) {
            setFailedTasks?.([]);
            clearItemVerifyState?.();
          }
          stableContext.setRunnerLogs?.([]);
          if (!SDK) return;
          SDK.removeAllListeners(UI_EVENT);

          await initHardwareListener?.(SDK);

          running.current = true;
          stableContext.setRunnerState?.('running');
          stableContext.callbacks?.onRunnerStateChange?.('running');

          const connectId = selectedDevice?.connectId ?? '';
          const featuresRes = await SDK.getFeatures(connectId);
          if (!featuresRes.success) {
            endTestRunner();
            return;
          }

          const deviceId = featuresRes.payload?.device_id ?? '';
          stableContext.setRunningDeviceFeatures?.(featuresRes.payload);
          const deviceFeatures = featuresRes.payload;

          try {
            const onekeyFeatures = await SDK.getOnekeyFeatures(connectId);
            stableContext.setRunningOneKeyDeviceFeatures?.(
              onekeyFeatures.payload as OnekeyFeatures
            );
          } catch (error) {
            // ignore
          }

          const context = {
            printLog: (log: string) => {
              stableContext.setRunnerLogs?.(prev => [...prev, log]);
            },
            deviceFeatures,
            deviceId,
            connectId,
          };

          await prepareRunner?.(connectId, deviceId, deviceFeatures, SDK);
          stableContext.setTimestampBeginTest?.(Date.now());

          let initTestCaseRes = await initTestCase(context, SDK);

          const failedTasks = store.get(getFailedTasksAtom);
          if (retryFailedOnly && failedTasks && failedTasks.length > 0) {
            initTestCaseRes = {
              title: `${initTestCaseRes?.title || 'Test'} - 重试失败任务`,
              data: failedTasks,
            };
          }

          if (!initTestCaseRes) return;

          const { title, data: currentTestCases } = initTestCaseRes;
          stableContext.setRunnerTestCaseTitle?.(title);
          stableContext.setItemValues?.(currentTestCases);
          clearItemVerifyState?.();

          for (let itemIndex = 0; itemIndex < currentTestCases.length; itemIndex++) {
            const item = currentTestCases[itemIndex];

            if (!running.current) return;

            await prepareRunnerTestCase?.(SDK, connectId, item);
            const delayTime = await prepareRunnerTestCaseDelay?.();
            if (delayTime) {
              await delay(delayTime);
            } else {
              const deviceType = getDeviceType(deviceFeatures);
              if (deviceType === EDeviceType.Classic1s || deviceType === EDeviceType.Pro) {
                await delay(200);
              }
            }

            try {
              await new Promise(resolve => {
                setTimeout(() => resolve(true), 200);
              });

              const { method, params } = await generateRequestParams(item);
              const requestParams = {
                retryCount: 1,
                ...params,
              };

              setItemVerifyState?.({
                key: item.$key,
                newState: {
                  verify: 'pending',
                },
              });

              let res: Unsuccessful | Success<any>;
              let skipVerify = false;

              if (processRequest) {
                const response = await processRequest(
                  SDK,
                  method,
                  connectId,
                  deviceId,
                  requestParams,
                  item
                );
                res = response.payload;
                skipVerify = response.skipVerify ?? false;
              } else {
                // @ts-ignore
                res = await SDK[`${method}` as keyof typeof sdk](
                  connectId,
                  deviceId,
                  requestParams
                );
              }

              if (!running.current) return;

              let verifyState: VerifyState = 'none';
              let error: string | undefined = '';
              let ext: any;

              if (!res.success && !skipVerify) {
                if (res.payload?.code === 802 || res.payload?.code === 803) {
                  verifyState = 'skip';
                } else {
                  verifyState = 'fail';
                  error = res.payload?.error;
                }
              } else {
                const result = await processResponse(res.payload, item, itemIndex, res);
                error = result.error;
                ext = result.ext;

                if (result.verifyState) {
                  verifyState = result.verifyState;
                } else if (isEmpty(error)) {
                  verifyState = 'success';
                } else {
                  verifyState = 'fail';
                }
              }

              setItemVerifyState?.({
                key: item.$key,
                newState: {
                  verify: verifyState,
                  error,
                  ext,
                },
              });
            } catch (e) {
              setItemVerifyState?.({
                key: item.$key,
                newState: {
                  verify: 'fail',
                  error: e instanceof Error ? e.message : '',
                },
              });
            }
          }

          if (currentTestCases && currentTestCases.length > 0) {
            const failedItems: TestCaseDataWithKey<T>[] = [];
            const itemVerifyStates = store.get(itemVerifyStateAtom);

            currentTestCases.forEach(item => {
              const verifyState = itemVerifyStates[item.$key];
              if (verifyState && verifyState.verify === 'fail') {
                failedItems.push(item);
              }
            });

            setFailedTasks?.(failedItems);
            console.log(`收集到 ${failedItems.length} 个失败任务`);
          }

          endTestRunner();
        } catch (e) {
          console.log('error', e);
          stopTest();
        } finally {
          testExecutionRef.current = null;
        }
      })();

      return testExecutionRef.current;
    },
    [
      stableContext,
      SDK,
      initHardwareListener,
      selectedDevice?.connectId,
      prepareRunner,
      initTestCase,
      store,
      clearItemVerifyState,
      endTestRunner,
      setFailedTasks,
      prepareRunnerTestCase,
      prepareRunnerTestCaseDelay,
      generateRequestParams,
      setItemVerifyState,
      processRequest,
      processResponse,
      stopTest,
    ]
  );

  const retryFailedTasks = useCallback(() => {
    beginTest(true);
  }, [beginTest]);

  return {
    beginTest,
    stopTest,
    retryFailedTasks,
  };
}

function delay(time: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(true), time);
  });
}
