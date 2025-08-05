import {
  createDeferred,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  HardwareErrorCodeMessage,
} from '@onekeyfe/hd-shared';
import type {
  AllNetworkAddress,
  AllNetworkGetAddressParamsByLoop,
} from '../../types/api/allNetworkGetAddress';

import { IFRAME } from '../../events';
import AllNetworkGetAddressBase from './AllNetworkGetAddressBase';
import { Unsuccessful } from '../../types';

export default class AllNetworkGetAddressByLoop extends AllNetworkGetAddressBase {
  async getAllNetworkAddress() {
    const { callbackId, callbackIdFinish } = this.payload as AllNetworkGetAddressParamsByLoop;
    if (!callbackId) {
      throw new Error('callbackId is required');
    }
    if (!callbackIdFinish) {
      throw new Error('callbackIdFinish is required');
    }

    const bundle = this.payload.bundle || [this.payload];

    // process callbacks in background
    const callbackPromise = this.processCallbacksInBackground(bundle, callbackId, callbackIdFinish);
    this.device.pendingCallbackPromise = createDeferred(callbackPromise);

    // register to context for scheduling management
    if (this.context && this.payload.connectId) {
      this.context.registerCallbackTask(this.payload.connectId, this.device.pendingCallbackPromise);
    }

    // return empty array immediately
    return Promise.resolve([]);
  }

  private async processCallbacksInBackground(
    bundle: any[],
    callbackId: string,
    callbackIdFinish: string
  ): Promise<void> {
    try {
      const allResults: AllNetworkAddress[] = [];

      for (let i = 0; i < bundle.length; i++) {
        const item = bundle[i];

        if (this.abortController?.signal.aborted) {
          throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
        }

        const methodParams = this.generateMethodName({
          network: item.network,
          payload: item,
          originalIndex: i,
        });

        const singleMethodParams = {
          bundle: [methodParams.params],
        };

        const response = await this.callMethod(methodParams.methodName, singleMethodParams);

        if (this.abortController?.signal.aborted) {
          throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
        }

        const singleResult = {
          ...item,
          ...response[0],
        };
        allResults.push(singleResult);

        this.sendItemCallback(callbackId, singleResult, i);
      }

      this.sendFinishCallback({
        callbackId: callbackIdFinish,
        data: allResults,
      });
    } catch (error: any) {
      let errorCode = error.errorCode || error.code;
      let errorMessage = error.message;

      if (error instanceof HardwareError) {
        errorCode = error.errorCode;
        errorMessage = error.message;
      } else if (error.message === HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]) {
        errorCode = HardwareErrorCode.RepeatUnlocking;
        errorMessage = error.message;
      } else {
        const hardwareError = ERRORS.TypedError(HardwareErrorCode.RuntimeError, error.message);
        errorCode = hardwareError.errorCode;
        errorMessage = hardwareError.message;
      }

      this.sendFinishCallback({
        callbackId: callbackIdFinish,
        error: {
          success: false,
          payload: {
            error: errorMessage,
            code: errorCode,
          },
        },
      });
    } finally {
      this.context?.cancelCallbackTasks(this.payload.connectId);
      this.abortController = null;
    }
  }

  private sendFinishCallback({
    callbackId,
    data,
    error,
  }: {
    callbackId: string;
    data?: AllNetworkAddress[];
    error?: Unsuccessful;
  }) {
    this.postMessage({
      event: IFRAME.CALLBACK,
      type: IFRAME.CALLBACK,
      payload: {
        callbackId,
        data,
        error,
      },
    });
  }

  private sendItemCallback(callbackId: string, data: any, itemIndex: number) {
    this.postMessage({
      event: IFRAME.CALLBACK,
      type: IFRAME.CALLBACK,
      payload: {
        callbackId,
        data: {
          ...data,
          index: itemIndex,
        },
      },
    });
  }
}
