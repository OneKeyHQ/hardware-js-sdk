import { CoreApi } from '../../types';

import type {
  AllNetworkAddress,
  AllNetworkAddressParams,
  AllNetworkGetAddressParams,
} from '../../types/api/allNetworkGetAddress';
import { createUiMessage } from '../../events';
import { UI_REQUEST } from '../../constants/ui-request';
import AllNetworkGetAddressBase from './AllNetworkGetAddressBase';

type MethodParams = {
  methodName: keyof CoreApi;
  params: Parameters<CoreApi[keyof CoreApi]>[0];
  _originRequestParams: AllNetworkAddressParams;
  _originalIndex: number;
};

export default class AllNetworkGetAddress extends AllNetworkGetAddressBase {
  async getAllNetworkAddress() {
    const responses: AllNetworkAddress[] = [];
    const resultMap: Record<string, AllNetworkAddress> = {};
    const { bundle } = this.payload as AllNetworkGetAddressParams;

    const methodGroups = bundle
      .map((param, index) =>
        this.generateMethodName({
          network: param.network,
          payload: param,
          originalIndex: index,
        })
      )
      .reduce((acc, cur) => {
        if (!acc[cur.methodName]) {
          acc[cur.methodName] = [];
        }
        acc[cur.methodName].push(cur);
        return acc;
      }, {} as Record<keyof CoreApi, MethodParams[]>);

    let i = 0;
    for (const [methodName, params] of Object.entries(methodGroups)) {
      const methodParams = {
        bundle: params.map(param => ({
          ...param.params,
        })),
      };

      // call method
      const response = await this.callMethod(methodName as keyof CoreApi, methodParams);

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

    return Promise.resolve(responses);
  }
}
