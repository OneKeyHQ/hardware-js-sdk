import { createDeferred } from '@onekeyfe/hd-shared';
import type {
  AllNetworkAddress,
  AllNetworkGetAddressParamsByLoop,
} from '../../types/api/allNetworkGetAddress';

import { IFRAME } from '../../events';
import AllNetworkGetAddressBase from './AllNetworkGetAddressBase';

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

        try {
          const methodParams = this.generateMethodName({
            network: item.network,
            payload: item,
            originalIndex: i,
          });

          const singleMethodParams = {
            bundle: [methodParams.params],
          };

          const response = await this.callMethod(methodParams.methodName, singleMethodParams);

          const singleResult = {
            ...item,
            ...response[0],
          };
          allResults.push(singleResult);

          this.sendItemCallback(callbackId, singleResult, null, i);
        } catch (error: any) {
          this.sendItemCallback(callbackId, null, error, i);
          // continue to process other items, do not throw error
          console.error(`Error processing item ${i}:`, error);
        }
      }

      this.sendFinishCallback(callbackIdFinish, allResults);
    } finally {
      this.context?.cancelCallbackTasks(this.payload.connectId);
    }
  }

  private sendFinishCallback(callbackId: string, data: AllNetworkAddress[]) {
    this.postMessage({
      event: IFRAME.CALLBACK,
      type: IFRAME.CALLBACK,
      payload: {
        callbackId,
        data,
      },
    });
  }

  private sendItemCallback(callbackId: string, data: any, error: any, itemIndex: number) {
    this.postMessage({
      event: IFRAME.CALLBACK,
      type: IFRAME.CALLBACK,
      payload: {
        callbackId,
        data: {
          ...data,
          index: itemIndex,
        },
        error: error ? { message: error.message, code: error.code } : null,
      },
    });
  }
}
