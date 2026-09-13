import { HardwareErrorCode, HardwareErrorCodeMessage } from '@onekeyfe/hd-shared';

import { createUiMessage } from '../../events';
import { UI_REQUEST } from '../../constants/ui-request';
import AllNetworkGetAddressBase from './AllNetworkGetAddressBase';

import type { CoreApi } from '../../types';
import type {
  AllNetworkAddress,
  AllNetworkAddressParams,
  AllNetworkGetAddressParams,
} from '../../types/api/allNetworkGetAddress';

type MethodParams = {
  methodName: keyof CoreApi;
  params: Parameters<CoreApi[keyof CoreApi]>[0];
  _originRequestParams: AllNetworkAddressParams;
  _originalIndex: number;
};

export default class AllNetworkGetAddress extends AllNetworkGetAddressBase {
  async getAllNetworkAddress(rootFingerprint: number) {
    const responses: AllNetworkAddress[] = [];
    const resultMap: Record<string, AllNetworkAddress> = {};
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
      const methodCallParams = {
        bundle: params.map(param => ({
          ...param.params,
        })),
      };

      if (this.abortController?.signal.aborted) {
        throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
      }
      const response = await this.callMethod(methodName, methodCallParams, rootFingerprint);

      if (this.abortController?.signal.aborted) {
        throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
      }

      for (let index = 0; index < params.length; index++) {
        const { _originRequestParams, _originalIndex } = params[index];
        resultMap[`${_originalIndex}`] = {
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

    for (let i = 0; i < bundle.length; i++) {
      responses.push(resultMap[i]);
    }

    this.abortController = null;
    return Promise.resolve(responses);
  }
}
