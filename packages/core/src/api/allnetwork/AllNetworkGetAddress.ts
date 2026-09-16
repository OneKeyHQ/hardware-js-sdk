import { HardwareErrorCode, HardwareErrorCodeMessage } from '@onekeyfe/hd-shared';

import { createUiMessage } from '../../events';
import { UI_REQUEST } from '../../constants/ui-request';
import AllNetworkGetAddressBase from './AllNetworkGetAddressBase';

import type { CoreApi } from '../../types';
import type {
  AllNetworkAddress,
  AllNetworkGetAddressParams,
} from '../../types/api/allNetworkGetAddress';

type MethodParams = ReturnType<AllNetworkGetAddressBase['generateMethodName']>;

export default class AllNetworkGetAddress extends AllNetworkGetAddressBase {
  private checkAborted() {
    if (this.abortController?.signal.aborted) {
      throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
    }
  }

  private async callAddressGroup(
    methodName: keyof CoreApi,
    params: MethodParams[],
    rootFingerprint: number
  ): Promise<AllNetworkAddress[]> {
    const methodCallParams = { bundle: params.map(param => ({ ...param.params })) };
    if (!this.device.isProtocolV2() || params.length === 1) {
      return this.callMethod(methodName, methodCallParams, rootFingerprint);
    }

    const postedAddressCounts = new Map<string, number>();
    let runningIndividually = false;
    const postMessage: typeof this.postMessage = message => {
      if (message.type === UI_REQUEST.PREVIOUS_ADDRESS_RESULT) {
        const { path, address } = message.payload.data;
        const key = JSON.stringify([path, address]);
        const count = postedAddressCounts.get(key) ?? 0;
        if (runningIndividually && count > 0) {
          postedAddressCounts.set(key, count - 1);
          return;
        }
        if (!runningIndividually) postedAddressCounts.set(key, count + 1);
      }
      this.postMessage(message);
    };

    // Only silent reads may be replayed. Forward their notifications immediately,
    // then suppress matching retry copies by count so repeated inputs still emit.
    if (params.every(param => param._originRequestParams.showOnOneKey === false)) {
      const response = await this.callMethod(
        methodName,
        methodCallParams,
        rootFingerprint,
        postMessage
      );
      // Skippable errors become failed items; link, cancellation and wallet errors throw.
      if (response.some(item => item.success)) return response;
    }

    runningIndividually = true;
    const responses: AllNetworkAddress[] = [];
    for (const param of params) {
      this.checkAborted();
      const response = await this.callMethod(
        methodName,
        { bundle: [{ ...param.params }] },
        rootFingerprint,
        postMessage
      );
      responses.push(...response);
    }
    return responses;
  }

  async getAllNetworkAddress(rootFingerprint: number) {
    const responses: AllNetworkAddress[] = [];
    const { bundle } = this.payload as AllNetworkGetAddressParams;

    const methodParams = bundle.map((param, index) =>
      this.generateMethodName({
        network: param.network,
        payload: param,
        originalIndex: index,
      })
    );
    // Protocol V2 DeviceSessionGet is the Initialize(session_id) equivalent: the
    // SE wallet stays selected until the next Ask/Get or lock. Nested chain
    // methods still resume once in callMethod; same-method addresses can share
    // that session the way Protocol V1 bundles do.
    const methodGroups = methodParams.reduce((groups, param) => {
      const group = groups.get(param.methodName) ?? [];
      group.push(param);
      groups.set(param.methodName, group);
      return groups;
    }, new Map<keyof CoreApi, MethodParams[]>());

    let processed = 0;
    for (const [methodName, params] of methodGroups.entries()) {
      this.checkAborted();
      const response = await this.callAddressGroup(methodName, params, rootFingerprint);
      this.checkAborted();

      for (let index = 0; index < params.length; index++) {
        const { _originRequestParams, _originalIndex } = params[index];
        responses[_originalIndex] = {
          ..._originRequestParams,
          ...response[index],
        };
      }

      processed += params.length;
      if (bundle.length > 1) {
        const progress = Math.round((processed / bundle.length) * 100);
        this.postMessage(createUiMessage(UI_REQUEST.DEVICE_PROGRESS, { progress }));
      }
    }

    this.abortController = null;
    return responses;
  }
}
