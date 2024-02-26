import { useCallback, useContext, useRef } from 'react';
import { UI_EVENT, getDeviceType } from '@onekeyfe/hd-core';
import { isEmpty } from 'lodash';
import type { CoreApi, Features, Success, Unsuccessful } from '@onekeyfe/hd-core';

import { useSetAtom } from 'jotai';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import type { TestCaseDataWithKey, VerifyState } from './types';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import {
  clearItemVerifyStateAtom,
  setItemVerifyStateAtom,
} from './Context/TestRunnerVerifyProvider';

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
  ) => Promise<Unsuccessful | Success<any>>;
  processResponse: (
    response: any,
    item: TestCaseDataWithKey<T>,
    itemIndex: number,
    res: Unsuccessful | Success<any>
  ) => Promise<{
    error: string | undefined;
    verifyState?: VerifyState;
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

  const {
    setRunnerTestCaseTitle,
    setTimestampBeginTest,
    setTimestampEndTest,
    setRunnerDone,
    setRunningDeviceFeatures,
    setItemValues,
  } = useContext(TestRunnerContext);

  const setItemVerifyState = useSetAtom(setItemVerifyStateAtom);
  const clearItemVerifyState = useSetAtom(clearItemVerifyStateAtom);

  const running = useRef<boolean>(false);

  const stopTest = useCallback(() => {
    running.current = false;
    setItemValues?.([]);
    clearItemVerifyState?.();
    setRunnerDone?.(false);
    if (SDK) {
      SDK.cancel();
      removeHardwareListener?.(SDK);
    }
  }, [setItemValues, clearItemVerifyState, setRunnerDone, SDK, removeHardwareListener]);

  const endTestRunner = useCallback(() => {
    removeHardwareListener?.(SDK);
    setTimestampEndTest?.(Date.now());
    setRunnerDone?.(true);
    processRunnerDone?.();
  }, [SDK, processRunnerDone, removeHardwareListener, setRunnerDone, setTimestampEndTest]);

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
    const deviceFeatures = featuresRes.payload;

    await prepareRunner?.(connectId, deviceId, deviceFeatures, SDK);

    for (let itemIndex = 0; itemIndex < currentTestCases.length; itemIndex++) {
      const item = currentTestCases[itemIndex];

      await prepareRunnerTestCase?.(SDK, connectId, item);
      const delayTime = await prepareRunnerTestCaseDelay?.();
      if (delayTime) {
        await delay(delayTime);
      } else {
        const deviceType = getDeviceType(deviceFeatures);
        if (deviceType === 'classic1s') {
          await delay(200);
        } else if (deviceType === 'pro') {
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
          const result = await processRequest(
            SDK,
            method,
            connectId,
            deviceId,
            requestParams,
            item
          );
          res = result.payload;
          skipVerify = result.skipVerify ?? false;
        } else {
          // @ts-expect-error
          res = await SDK[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);
        }

        if (!running.current) return;
        let verifyState: VerifyState = 'none';
        let error: string | undefined = '';

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
          },
        });
      } catch (e) {
        setItemVerifyState?.({
          key: item.$key,
          newState: {
            verify: 'fail',
            // @ts-expect-error
            error: e?.message ?? '',
          },
        });
      }
    }
    endTestRunner();
  }, [
    SDK,
    initTestCase,
    setRunnerTestCaseTitle,
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
    prepareRunnerTestCaseDelay,
    generateRequestParams,
    setItemVerifyState,
    processRequest,
    processResponse,
  ]);

  return { beginTest, stopTest };
}

function delay(time: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(true), time);
  });
}
