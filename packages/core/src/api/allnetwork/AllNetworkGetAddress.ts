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
    const groupedMethodParams = methodParams.reduce((groups, param) => {
      const group = groups.get(param.methodName) ?? [];
      group.push(param);
      groups.set(param.methodName, group);
      return groups;
    }, new Map<keyof CoreApi, MethodParams[]>());
    const requiresProtocolV2WalletHandoff =
      this.device.isProtocolV2() &&
      (this.payload.useEmptyPassphrase === true || !!this.payload.passphraseState);
    const methodGroups: [keyof CoreApi, MethodParams[]][] = requiresProtocolV2WalletHandoff
      ? methodParams.map(param => [param.methodName, [param]])
      : Array.from(groupedMethodParams.entries());

    let i = 0;
    for (const [methodName, params] of methodGroups) {
      const methodParams = {
        bundle: params.map(param => ({
          ...param.params,
        })),
      };

      if (this.abortController?.signal.aborted) {
        throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
      }
      // call method
      const response = await this.callMethod(methodName, methodParams, rootFingerprint);

      if (this.abortController?.signal.aborted) {
        throw new Error(HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]);
      }

      for (let i = 0; i < params.length; i++) {
        const { _originRequestParams, _originalIndex } = params[i];
        const responseKey = `${_originalIndex}`;
        resultMap[responseKey] = {
          ..._originRequestParams,
          ...response[i],
        };
      }

      if (this.payload?.bundle?.length > 1) {
        const progress = Math.round(((i + 1) / this.payload.bundle.length) * 100);
        this.postMessage(createUiMessage(UI_REQUEST.DEVICE_PROGRESS, { progress }));
      }
      i++;
    }

    for (let i = 0; i < bundle.length; i++) {
      responses.push(resultMap[i]);
    }

    this.abortController = null;
    return Promise.resolve(responses);
  }
}
