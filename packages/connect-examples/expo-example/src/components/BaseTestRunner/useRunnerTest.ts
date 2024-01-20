import { useCallback, useContext, useRef } from 'react';
import { UI_EVENT } from '@onekeyfe/hd-core';
import { isEmpty } from 'lodash';
import type { CoreApi, Features, Success, Unsuccessful } from '@onekeyfe/hd-core';

import { useContextSelector } from 'use-context-selector';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import type { TestCaseDataWithKey, VerifyState } from './types';
import { TestRunnerVerifyContext } from './Context/TestRunnerVerifyProvider';
import { TestRunnerContext } from './Context/TestRunnerProvider';

type RunnerConfig<T> = {
  initTestCase: () => Promise<
    | {
        title: string;
        data: TestCaseDataWithKey<T>[];
      }
    | undefined
  >;
  initHardwareListener?: (sdk: CoreApi) => Promise<void>;
  prepareRunner?: (
    connectId: string,
    deviceId: string,
    features: Features,
    sdk: CoreApi
  ) => Promise<void>;
  prepareRunnerTestCase?: (item: TestCaseDataWithKey<T>) => Promise<void>;
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
  ) => Promise<Unsuccessful | Success<any>>;
  processResponse: (
    response: any,
    item: TestCaseDataWithKey<T>,
    itemIndex: number
  ) => Promise<{
    error: string | undefined;
  }>;
  processRunnerDone?: () => void;
};

export function useRunnerTest<T>(config: RunnerConfig<T>) {
  const {
    initTestCase,
    initHardwareListener,
    prepareRunner,
    prepareRunnerTestCase,
    generateRequestParams,
    processRequest,
    processResponse,
    processRunnerDone,
  } = config;

  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const setRunnerTestCaseTitle = useContextSelector(
    TestRunnerContext,
    v => v.setRunnerTestCaseTitle
  );
  const setTimestampBeginTest = useContextSelector(TestRunnerContext, v => v.setTimestampBeginTest);
  const setTimestampEndTest = useContextSelector(TestRunnerContext, v => v.setTimestampEndTest);
  const setRunnerDone = useContextSelector(TestRunnerContext, v => v.setRunnerDone);
  const setRunningDeviceFeatures = useContextSelector(
    TestRunnerContext,
    v => v.setRunningDeviceFeatures
  );

  const setItemValues = useContextSelector(TestRunnerContext, v => v.setItemValues);

  const setItemVerifyState = useContextSelector(TestRunnerVerifyContext, v => v.setItemVerifyState);
  const clearItemVerifyState = useContextSelector(
    TestRunnerVerifyContext,
    v => v.clearItemVerifyState
  );

  const running = useRef<boolean>(false);

  const stopTest = useCallback(() => {
    running.current = false;
    setItemValues?.([]);
    clearItemVerifyState?.();
    if (SDK) {
      SDK.cancel();
      SDK.removeAllListeners(UI_EVENT);
    }
  }, [SDK, setItemValues, clearItemVerifyState]);

  const endTestRunner = useCallback(() => {
    if (SDK) {
      SDK.removeAllListeners(UI_EVENT);
    }

    setTimestampEndTest?.(Date.now());
    setRunnerDone?.(true);
    processRunnerDone?.();
  }, [SDK, processRunnerDone, setRunnerDone, setTimestampEndTest]);

  const beginTest = useCallback(async () => {
    if (!SDK) return;
    SDK.removeAllListeners(UI_EVENT);

    // init test cases
    const initTestCaseRes = await initTestCase();
    if (!initTestCaseRes) return;

    const { title, data: currentTestCases } = initTestCaseRes;
    setRunnerTestCaseTitle?.(title);
    setItemValues?.(currentTestCases);
    clearItemVerifyState?.();

    // init SDK listeners
    await initHardwareListener?.(SDK);

    // begin test
    running.current = true;
    setRunnerDone?.(false);
    setTimestampBeginTest?.(Date.now());

    const connectId = selectedDevice?.connectId ?? '';
    const featuresRes = await SDK.getFeatures(connectId);
    if (!featuresRes.success) {
      endTestRunner();
      return;
    }
    const deviceId = featuresRes.payload?.device_id ?? '';
    setRunningDeviceFeatures?.(featuresRes.payload);

    await prepareRunner?.(connectId, deviceId, featuresRes.payload, SDK);

    for (let itemIndex = 0; itemIndex < currentTestCases.length; itemIndex++) {
      const item = currentTestCases[itemIndex];

      prepareRunnerTestCase?.(item);

      try {
        await new Promise(resolve => {
          setTimeout(() => resolve(true), 200);
        });

        const { method, params } = await generateRequestParams(item);
        const requestParams = {
          retryCount: 1,
          ...params,
        };

        setItemVerifyState?.(item.$key, {
          verify: 'pending',
        });

        let res: Unsuccessful | Success<any>;
        if (processRequest) {
          res = await processRequest(SDK, method, connectId, deviceId, requestParams, item);
        } else {
          // @ts-expect-error
          res = await SDK[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);
        }

        if (!running.current) return;
        let verifyState: VerifyState = 'none';
        let error: string | undefined = '';

        if (!res.success) {
          if (res.payload?.code === 802 || res.payload?.code === 803) {
            verifyState = 'skip';
          } else {
            verifyState = 'fail';
            error = res.payload?.error;
          }
        } else {
          const result = await processResponse(res.payload, item, itemIndex);
          error = result.error;

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
    endTestRunner();
  }, [
    SDK,
    setRunnerTestCaseTitle,
    initTestCase,
    setItemValues,
    clearItemVerifyState,
    initHardwareListener,
    setRunnerDone,
    setTimestampBeginTest,
    selectedDevice?.connectId,
    setRunningDeviceFeatures,
    prepareRunner,
    endTestRunner,
    prepareRunnerTestCase,
    generateRequestParams,
    setItemVerifyState,
    processRequest,
    processResponse,
  ]);

  return { beginTest, stopTest };
}
